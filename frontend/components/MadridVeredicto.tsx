'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Download,
  Building2,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { VeredictoResponse, VeredictoEstado } from '../types/veredicto';
import './MadridVeredicto.css';
import { apiFetch, apiUrl } from '../lib/api';

export default function MadridVeredicto() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  // Modo de entrada: 'url' o 'manual'
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [operacion, setOperacion] = useState<'Venta' | 'Alquiler'>('Venta');

  // Campos del formulario
  const [urlInput, setUrlInput] = useState('');
  const [precioInput, setPrecioInput] = useState('');
  const [metrosInput, setMetrosInput] = useState('');
  const [barrioInput, setBarrioInput] = useState('Goya');

  // Estados de carga y resultado
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VeredictoResponse | null>(null);

  // Estado para token de descarga directa si viene del checkout
  const [downloadToken, setDownloadToken] = useState<string | null>(tokenParam);

  // Lista de barrios sugeridos frecuentes
  const barriosSugeridos = [
    'Goya', 'Recoletos', 'Castellana', 'Almagro', 'Trafalgar', 'Justicia',
    'Cortes', 'Palacio', 'Embajadores', 'Universidad', 'Sol', 'Argüelles',
    'Vallehermoso', 'Prosperidad', 'El Viso', 'Hispanoamérica', 'Lista',
    'Ibiza', 'Jerónimos', 'Pacífico', 'Chamberí', 'Salamanca', 'Retiro', 'Centro'
  ];

  useEffect(() => {
    if (tokenParam) {
      setDownloadToken(tokenParam);
    }
  }, [tokenParam]);

  // Manejador para extraer datos desde la URL
  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage('Por favor, introduce una dirección web de Idealista o Fotocasa.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setInfoNotice(null);

    try {
      const res = await apiFetch('/veredicto/extraer-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      if (!res.ok) {
        throw new Error('No fue posible conectar con el servicio de extracción.');
      }

      const data = await res.json();

      if (data.precio) setPrecioInput(String(data.precio));
      if (data.metros) setMetrosInput(String(data.metros));
      if (data.barrio) setBarrioInput(data.barrio);
      if (data.operacion) setOperacion(data.operacion as 'Venta' | 'Alquiler');

      if (data.requiere_manual) {
        setInfoNotice(
          data.error_mensaje ||
          'El portal requiere verificación antibot o faltan datos. Revisa o completa los campos abajo para emitir el veredicto.'
        );
        setActiveTab('manual');
      } else {
        // Si todos los datos están completos, evaluar directamente
        await ejecutarEvaluacion(Number(data.precio), Number(data.metros), data.barrio, data.operacion);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el enlace. Puedes introducir los datos manualmente.');
      setActiveTab('manual');
    } finally {
      setIsExtracting(false);
    }
  };

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
    if (!barrioInput.trim()) {
      setErrorMessage('Indica el barrio o distrito de Madrid.');
      return;
    }

    await ejecutarEvaluacion(precio, metros, barrioInput.trim(), operacion);
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
        setActiveTab('manual');
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

  const badgeConfig: Record<VeredictoEstado, { label: string; bg: string; text: string; border: string }> = {
    CARO: {
      label: 'SOBREPRECIO DETECTADO',
      bg: 'bg-red-950/40',
      text: 'text-red-400',
      border: 'border-red-800/60'
    },
    BARATO: {
      label: 'OPORTUNIDAD DE PRECIO',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60'
    },
    EN_LINEA: {
      label: 'EN PRECIO DE MERCADO',
      bg: 'bg-blue-950/40',
      text: 'text-blue-400',
      border: 'border-blue-800/60'
    }
  };

  return (
    <div className="veredicto-root">
      {/* 1. Header de Navegación Apple Glass */}
      <nav className="veredicto-navbar">
        <div className="veredicto-nav-container">
          <Link href="/" className="veredicto-nav-brand">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span>Madrid Urban Intelligence</span>
          </Link>
          <div className="veredicto-nav-links">
            <Link href="/madrid" className="veredicto-nav-item">
              Dashboard Analítico
            </Link>
            <Link href="/madrid/veredicto" className="veredicto-nav-item active">
              El Veredicto
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Contenedor Principal */}
      <main className="veredicto-main">
        {/* Banner de descarga post-pago si viene de Stripe */}
        {downloadToken && (
          <div style={{
            marginBottom: '32px',
            padding: '20px',
            background: 'rgba(6, 78, 59, 0.35)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 style={{ width: '24px', height: '24px', color: '#34d399', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: '#a7f3d0', fontSize: '14px', margin: 0 }}>Pago verificado con éxito</p>
                <p style={{ fontSize: '12px', color: 'rgba(167, 243, 208, 0.8)', margin: '4px 0 0' }}>Tu Dossier Oficial de Negociación está generado y listo para descargar en PDF.</p>
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

        {/* Tarjeta Glass de Entrada (Pestañas: URL vs Manual) */}
        <div className="veredicto-card">
          <div className="veredicto-tabs">
            <button
              onClick={() => setActiveTab('url')}
              className={`veredicto-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            >
              <ExternalLink style={{ width: '16px', height: '16px' }} />
              <span>Pegar enlace (Idealista o Fotocasa)</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`veredicto-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              <span>Entrada manual (3 datos)</span>
            </button>
          </div>

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

            {/* PESTAÑA 1: Pegar URL */}
            {activeTab === 'url' ? (
              <form onSubmit={handleExtractUrl}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="veredicto-label">
                    Enlace de Idealista, Fotocasa o Habitaclia
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.idealista.com/inmueble/10543210/..."
                    className="veredicto-input"
                    disabled={isExtracting}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <span className="veredicto-helper-text">
                    Si el portal aplica protección antibot, podrás rellenar los datos manualmente sin esperas.
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isExtracting}
                      className="veredicto-btn-primary"
                    >
                      {isExtracting ? (
                        <>
                          <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <span>Analizando enlace...</span>
                        </>
                      ) : (
                        <>
                          <Search style={{ width: '16px', height: '16px' }} />
                          <span>Analizar Inmueble</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* PESTAÑA 2: Entrada Manual */
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

                  {/* Barrio */}
                  <div>
                    <label htmlFor="veredicto-barrio" className="veredicto-label">
                      Barrio o Distrito
                    </label>
                    <input
                      id="veredicto-barrio"
                      type="text"
                      list="barrios-list"
                      value={barrioInput}
                      onChange={(e) => { setBarrioInput(e.target.value); setErrorMessage(null); }}
                      placeholder="Ej. Goya, Almagro..."
                      className="veredicto-input"
                      required
                      aria-invalid={Boolean(errorMessage && !barrioInput.trim())}
                    />
                    <datalist id="barrios-list">
                      {barriosSugeridos.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
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
                        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
            )}
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
                    style={{
                      color: resultado.estado === 'CARO' ? '#f87171' : resultado.estado === 'BARATO' ? '#34d399' : '#60a5fa',
                      borderColor: resultado.estado === 'CARO' ? 'rgba(239, 68, 68, 0.4)' : resultado.estado === 'BARATO' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                    }}
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
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Zona analizada</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0' }}>{resultado.barrio_nombre} ({resultado.distrito_nombre})</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Datos de cierre: {resultado.fecha_cierre_referencia}</p>
                </div>
              </div>

              {/* Grid de 4 Indicadores Clave */}
              <div className="veredicto-kpi-grid">
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Inmueble analizado</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_inmueble.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: 'rgba(255,255,255,0.4)' }}>Ratio resultante</p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Media en {resultado.barrio_nombre}</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_barrio_medio.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: resultado.desviacion_pct_barrio > 0 ? '#f87171' : '#34d399' }}>
                    {resultado.desviacion_pct_barrio > 0 ? '+' : ''}{resultado.desviacion_pct_barrio.toFixed(1)}% vs barrio
                  </p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Media en Madrid</p>
                  <p className="veredicto-kpi-val">{resultado.precio_m2_madrid_medio.toLocaleString()} €/m²</p>
                  <p className="veredicto-kpi-sub" style={{ color: resultado.desviacion_pct_madrid > 0 ? '#f87171' : '#34d399' }}>
                    {resultado.desviacion_pct_madrid > 0 ? '+' : ''}{resultado.desviacion_pct_madrid.toFixed(1)}% vs Madrid
                  </p>
                </div>
                <div className="veredicto-kpi-tile">
                  <p className="veredicto-kpi-label">Margen de negociación</p>
                  <p className="veredicto-kpi-val" style={{ color: '#60a5fa' }}>
                    {resultado.margen_negociacion_estimado_eur > 0
                      ? `${resultado.margen_negociacion_estimado_eur.toLocaleString()} €`
                      : '0 € (En precio)'}
                  </p>
                  <p className="veredicto-kpi-sub" style={{ color: 'rgba(255,255,255,0.4)' }}>Descuento objetivo sugerido</p>
                </div>
              </div>
            </div>

            {/* Argumentos Tácticos para la Negociación */}
            <div className="veredicto-args-card">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
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
                  color: '#93c5fd',
                  background: 'rgba(30, 58, 138, 0.4)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}>
                  Documento Certificado para Negociación
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>
                  Descarga el Dossier Oficial de Negociación en PDF
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5, margin: 0 }}>
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
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.8)',
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
      <footer className="veredicto-footer">
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 500, color: 'rgba(255, 255, 255, 0.6)' }}>
            Madrid Urban Intelligence — Plataforma analítica de precios inmobiliarios y series oficiales.
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)' }}>
            Las estimaciones y veredictos se generan a partir de datos estadísticos públicos del Ayuntamiento de Madrid. No constituyen tasación pericial oficial conforme a la Orden ECO/805/2003.
          </p>
        </div>
      </footer>
    </div>
  );
}
