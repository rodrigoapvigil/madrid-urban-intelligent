'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Download,
  ShieldCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { VeredictoResponse, VeredictoEstado } from '../types/veredicto';
import './MadridVeredicto.css';
import { apiFetch, apiUrl } from '../lib/api';
import { SiteFooter, SiteHeader } from './SiteChrome';

export default function MadridVeredicto() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const sessionIdParam = searchParams.get('session_id');

  const [operacion, setOperacion] = useState<'Venta' | 'Alquiler'>('Venta');

  // Campos del formulario
  const [precioInput, setPrecioInput] = useState('');
  const [metrosInput, setMetrosInput] = useState('');
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);

  // Estados de carga y resultado
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VeredictoResponse | null>(null);

  // Estado para token de descarga directa si viene del checkout
  const [downloadToken, setDownloadToken] = useState<string | null>(tokenParam);

  useEffect(() => {
    let active = true;
    apiFetch('/filters').then(response => {
      if (!response.ok) throw new Error('No se pudieron cargar los distritos.');
      return response.json();
    }).then(data => {
      if (active) setDistrictOptions(Array.isArray(data.districts) ? data.districts : []);
    }).catch(() => {
      if (active) setErrorMessage('No se pudieron cargar los distritos de Madrid. Recarga la página para intentarlo de nuevo.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedDistrict) {
      setNeighborhoodOptions([]);
      setSelectedNeighborhood('');
      return;
    }
    let active = true;
    setIsLoadingNeighborhoods(true);
    setNeighborhoodOptions([]);
    setSelectedNeighborhood('');
    apiFetch(`/neighborhoods?district=${encodeURIComponent(selectedDistrict)}`).then(response => {
      if (!response.ok) throw new Error('No se pudieron cargar los barrios.');
      return response.json();
    }).then(data => {
      if (!active) return;
      const neighborhoods = Array.isArray(data) ? data : data.neighborhoods;
      const options = Array.isArray(neighborhoods) ? neighborhoods.filter((name: string) => name !== 'Todos') : [];
      setNeighborhoodOptions(options);
      setSelectedNeighborhood('Todos');
    }).catch(() => {
      if (active) setErrorMessage('No se pudieron cargar los barrios de este distrito. Vuelve a seleccionarlo para reintentar.');
    }).finally(() => {
      if (active) setIsLoadingNeighborhoods(false);
    });
    return () => { active = false; };
  }, [selectedDistrict]);

  useEffect(() => {
    if (tokenParam) {
      setDownloadToken(tokenParam);
    } else if (sessionIdParam) {
      // Si el usuario regresa de Stripe Checkout, validar la sesión y obtener el token firmado
      apiFetch(`/veredicto/confirmar-sesion?session_id=${encodeURIComponent(sessionIdParam)}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Pago aún no completado');
        })
        .then(data => {
          if (data.token) {
            setDownloadToken(data.token);
          }
        })
        .catch(() => {
          // Si aún no está listo, el usuario puede refrescar o contactar soporte
        });
    }
  }, [tokenParam, sessionIdParam]);

  // Manejador para evaluación manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(precioInput);
    const metros = parseFloat(metrosInput);

    if (isNaN(precio) || precio <= 0) {
      setErrorMessage('Introduce un precio válido mayor que cero.');
      return;
    }
    if (isNaN(metros) || metros <= 0) {
      setErrorMessage('Introduce una superficie en m² válida mayor que cero.');
      return;
    }
    if (!selectedDistrict || !selectedNeighborhood) {
      setErrorMessage('Selecciona un distrito y un barrio, o elige todo el distrito.');
      return;
    }

    const location = selectedNeighborhood === 'Todos' ? selectedDistrict : selectedNeighborhood;
    await ejecutarEvaluacion(precio, metros, location, operacion);
  };

  const ejecutarEvaluacion = async (precio: number, metros: number, barrio: string, op: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/veredicto/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precio,
          metros,
          barrio,
          operacion: op
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al calcular el veredicto del inmueble.');
      }

      if (data.requiere_manual) {
        setInfoNotice(data.mensaje);
      } else {
        setResultado(data as VeredictoResponse);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al evaluar el inmueble.');
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar pasarela de pago Stripe
  const handleComprarDossier = async (tipo: 'dossier' | 'suscripcion') => {
    if (!resultado) return;

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
      const res = await apiFetch('/veredicto/crear-sesion-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          datos_inmueble: {
            precio: resultado.precio_m2_inmueble * (parseFloat(metrosInput) || 80),
            metros: parseFloat(metrosInput) || 80,
            barrio: resultado.barrio_nombre,
            distrito: resultado.distrito_nombre,
            operacion
          },
          success_url: currentUrl,
          cancel_url: currentUrl
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Error iniciando la pasarela de pago. Por favor, inténtalo de nuevo.');
    }
  };

  const badgeConfig: Record<VeredictoEstado, { label: string }> = {
    CARO: {
      label: 'SOBREPRECIO DETECTADO',
    },
    BARATO: {
      label: 'OPORTUNIDAD DE PRECIO',
    },
    EN_LINEA: {
      label: 'EN PRECIO DE MERCADO',
    }
  };

  return (
    <div className="veredicto-root">
      {/* 1. Header de Navegación Apple Glass */}
      <SiteHeader activePath="/madrid/veredicto" />

      {/* 2. Contenedor Principal */}
      <main className="veredicto-main">
        {/* Banner de descarga post-pago si viene de Stripe */}
        {downloadToken && (
          <div style={{
            marginBottom: '32px',
            padding: '20px',
            background: 'color-mix(in srgb, var(--azul-noche-2) 35%, transparent)',
            border: '1px solid color-mix(in srgb, var(--precio-subida) 40%, transparent)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 style={{ width: '24px', height: '24px', color: 'var(--precio-subida)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--humo-2)', fontSize: '14px', margin: 0 }}>Pago verificado con éxito</p>
                <p style={{ fontSize: '12px', color: 'color-mix(in srgb, var(--humo-2) 80%, transparent)', margin: '4px 0 0' }}>Tu Dossier Oficial de Negociación está generado y listo para descargar en PDF.</p>
              </div>
            </div>
            <a
              href={apiUrl(`/veredicto/descargar-dossier?token=${encodeURIComponent(downloadToken)}`)}
              download
              className="veredicto-btn-primary"
              style={{ padding: '10px 18px', fontSize: '12px', flexShrink: 0 }}
            >
              <Download style={{ width: '16px', height: '16px' }} />
              <span>Descargar PDF</span>
            </a>
          </div>
        )}

        {/* Hero Section */}
        <div className="veredicto-hero">
          <div className="veredicto-badge-official">
            <ShieldCheck style={{ width: '14px', height: '14px' }} />
            <span>Auditoría basada en series oficiales de cierre del Ayuntamiento de Madrid</span>
          </div>
          <h1 className="veredicto-title">
            El Veredicto Inmobiliario
          </h1>
          <p className="veredicto-subtitle">
            Descubre si un piso tiene sobreprecio o es una oportunidad contrastándolo con las operaciones reales de cierre de su barrio.
          </p>
        </div>

        {/* Selector de Operación (Venta / Alquiler) */}
        <div className="veredicto-segmented-wrap">
          <div className="veredicto-segmented">
            <button
              type="button"
              onClick={() => setOperacion('Venta')}
              className={`veredicto-segment-btn ${operacion === 'Venta' ? 'active' : ''}`}
            >
              Comprar / Venta
            </button>
            <button
              type="button"
              onClick={() => setOperacion('Alquiler')}
              className={`veredicto-segment-btn ${operacion === 'Alquiler' ? 'active' : ''}`}
            >
              Alquiler
            </button>
          </div>
        </div>

        {/* Entrada directa de datos */}
        <div className="veredicto-card">
          <div className="veredicto-card-body">
            {errorMessage && (
              <div className="veredicto-alert-error">
                <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoNotice && (
              <div className="veredicto-alert-info">
                <Sparkles style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{infoNotice}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit}>
                <div className="veredicto-manual-grid">
                  {/* Precio */}
                  <div>
                    <label htmlFor="veredicto-precio" className="veredicto-label">
                      Precio ({operacion === 'Venta' ? '€' : '€/mes'})
                    </label>
                    <input
                      id="veredicto-precio"
                      type="number"
                      step="any"
                      value={precioInput}
                      onChange={(e) => { setPrecioInput(e.target.value); setErrorMessage(null); }}
                      placeholder={operacion === 'Venta' ? 'Ej. 380000' : 'Ej. 1400'}
                      className="veredicto-input"
                      required
                      min="0.01"
                      aria-invalid={Boolean(errorMessage && (!precioInput || Number(precioInput) <= 0))}
                    />
                  </div>

                  {/* Metros */}
                  <div>
                    <label htmlFor="veredicto-metros" className="veredicto-label">
                      Superficie (m²)
                    </label>
                    <input
                      id="veredicto-metros"
                      type="number"
                      step="any"
                      value={metrosInput}
                      onChange={(e) => { setMetrosInput(e.target.value); setErrorMessage(null); }}
                      placeholder="Ej. 75"
                      className="veredicto-input"
                      required
                      min="0.01"
                      aria-invalid={Boolean(errorMessage && (!metrosInput || Number(metrosInput) <= 0))}
                    />
                  </div>

                  {/* Distrito */}
                  <div>
                    <label htmlFor="veredicto-distrito" className="veredicto-label">
                      Distrito
                    </label>
                    <select id="veredicto-distrito" value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setErrorMessage(null); }} className="veredicto-input" required aria-invalid={Boolean(errorMessage && !selectedDistrict)}>
                      <option value="">Selecciona un distrito</option>
                      {districtOptions.map(district => <option key={district} value={district}>{district}</option>)}
                    </select>
                  </div>
                  {/* Barrio dependiente del distrito */}
                  <div>
                    <label htmlFor="veredicto-barrio" className="veredicto-label">Barrio</label>
                    <select id="veredicto-barrio" value={selectedNeighborhood} onChange={(e) => { setSelectedNeighborhood(e.target.value); setErrorMessage(null); }} className="veredicto-input" required disabled={!selectedDistrict || isLoadingNeighborhoods} aria-invalid={Boolean(errorMessage && !selectedNeighborhood)}>
                      <option value="">{!selectedDistrict ? 'Primero selecciona un distrito' : isLoadingNeighborhoods ? 'Cargando barrios…' : 'Selecciona un barrio'}</option>
                      {selectedDistrict && <option value="Todos">Todo el distrito</option>}
                      {neighborhoodOptions.map(neighborhood => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="veredicto-btn-primary"
                  >
                    {isLoading ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid color-mix(in srgb, var(--blanco-humo) 30%, transparent)', borderTopColor: 'var(--blanco-humo)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>Calculando veredicto...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                        <span>Obtener Veredicto Inmediato</span>
                      </>
                    )}
                  </button>
                </div>
            </form>
          </div>
        </div>

        {/* 3. Resultados del Veredicto */}
        {resultado && (
          <div className="veredicto-results">
            {/* Tarjeta de Veredicto Principal con Efecto Glass y Gradiente */}
            <div className={`veredicto-result-hero ${resultado.estado}`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span
                    className="veredicto-state-badge"
                  >
                    {badgeConfig[resultado.estado].label}
                  </span>
                  <h2 className="veredicto-hero-title">
                    {resultado.estado === 'CARO' && `Sobreprecio del +${resultado.desviacion_pct_barrio.toFixed(1)}%`}
                    {resultado.estado === 'BARATO' && `Descuento del ${resultado.desviacion_pct_barrio.toFixed(1)}%`}
                    {resultado.estado === 'EN_LINEA' && 'Alineado con el mercado oficial'}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: 'color-mix(in srgb, var(--blanco-humo) 50%, transparent)', margin: 0 }}>Zona analizada</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--blanco-humo)', margin: '2px 0 0' }}>{resultado.barrio_nombre} ({resultado.distrito_nombre})</p>
                  <p style={{ fontSize: '11px', color: 'color-mix(in srgb, var(--blanco-humo) 40%, transparent)', margin: '2px 0 0' }}>Datos de cierre: {resultado.fecha_cierre_referencia}</p>
                </div>
              </div>

              {/* Grid de 4 Indicadores Clave */}
              <div className="veredicto-kpi-grid">
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Inmueble analizado</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_inmueble.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: 'color-mix(in srgb, var(--blanco-humo) 40%, transparent)' }}>Ratio resultante</p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Media en {resultado.barrio_nombre}</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_barrio_medio.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: resultado.desviacion_pct_barrio > 0 ? 'var(--coral)' : 'var(--precio-subida)' }}>
                    {resultado.desviacion_pct_barrio > 0 ? '+' : ''}{resultado.desviacion_pct_barrio.toFixed(1)}% vs barrio
                  </p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Media en Madrid</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_madrid_medio.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: resultado.desviacion_pct_madrid > 0 ? 'var(--coral)' : 'var(--precio-subida)' }}>
                    {resultado.desviacion_pct_madrid > 0 ? '+' : ''}{resultado.desviacion_pct_madrid.toFixed(1)}% vs Madrid
                  </p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Margen de negociación</p>
                  <p className="veredicto-kpi-val" style={{ color: 'var(--precio-subida)' }}>
                    {resultado.margen_negociacion_estimado_eur > 0
                      ? `${resultado.margen_negociacion_estimado_eur.toLocaleString()} €`
                      : '0 € (En precio)'}
                  </p>
                  <p className="veredicto-kpi-sub" style={{ color: 'color-mix(in srgb, var(--blanco-humo) 40%, transparent)' }}>Descuento objetivo sugerido</p>
                </div>
              </div>
            </div>

            {/* Argumentos Tácticos para la Negociación */}
            <div className="veredicto-args-card">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--blanco-humo)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--precio-subida)' }} />
                <span>Argumentario para negociar con el vendedor o justificar ante el banco</span>
              </h3>
              <div>
                {resultado.resumen_argumentos.map((arg, idx) => (
                  <div key={idx} className="veredicto-arg-item">
                    <span className="veredicto-arg-num">
                      {idx + 1}
                    </span>
                    <span>{arg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN DE MONETIZACIÓN: Dossier Oficial (4,90 €) + Suscripción Pro */}
            <div className="veredicto-dossier-card">
              <div style={{ maxWidth: '540px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: 'var(--texto-secundario-azul)',
                  background: 'color-mix(in srgb, var(--azul-linea) 40%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--precio-subida) 40%, transparent)',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}>
                  Documento Certificado para Negociación
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--blanco-humo)', margin: '0 0 8px 0' }}>
                  Descarga el Dossier Oficial de Negociación en PDF
                </h3>
                <p style={{ fontSize: '13px', color: 'color-mix(in srgb, var(--blanco-humo) 70%, transparent)', lineHeight: 1.5, margin: 0 }}>
                  Informe imprimible de alta fidelidad con el histórico municipal de cierre del Ayuntamiento de Madrid, métricas de comparables en {resultado.barrio_nombre} y los 5 argumentos estructurados para presentar al propietario, agencia o departamento de riesgos de tu banco.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '260px' }}>
                <button
                  type="button"
                  onClick={() => handleComprarDossier('dossier')}
                  className="veredicto-btn-primary"
                  style={{ width: '100%', padding: '14px 20px' }}
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                  <span>Descargar Dossier Completo (4,90 €)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleComprarDossier('suscripcion')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'color-mix(in srgb, var(--azul-noche) 90%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--blanco-humo) 15%, transparent)',
                    borderRadius: '12px',
                    color: 'color-mix(in srgb, var(--blanco-humo) 80%, transparent)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Tarifa Pro Inversores: 19 €/mes (Análisis ilimitados)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Apple Dark */}
      <SiteFooter />
    </div>
  );
}
