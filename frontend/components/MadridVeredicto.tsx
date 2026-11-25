'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Download,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { VeredictoResponse, VeredictoEstado, VeredictoModalidad } from '../types/veredicto';
import './MadridVeredicto.css';
import { apiFetch, apiUrl } from '../lib/api';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { PRICE_ANALYSIS_LABEL } from '../lib/product-copy';
import ZoneSearch, { ZoneSearchOption } from './ZoneSearch';

export default function MadridVeredicto() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const sessionIdParam = searchParams.get('session_id');

  const [modalidad, setModalidad] = useState<VeredictoModalidad>('comprar');
  const operacion: 'Venta' | 'Alquiler' = modalidad === 'alquiler' ? 'Alquiler' : 'Venta';

  // Campos del formulario
  const [precioInput, setPrecioInput] = useState('');
  const [metrosInput, setMetrosInput] = useState('');
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [barrioItems, setBarrioItems] = useState<Array<{ name: string; district: string; id?: number | string }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('Todos');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Todos');

  // Píldoras rápidas opcionales
  const [estadoInmueble, setEstadoInmueble] = useState<'A reformar' | 'Buen estado' | 'Reformado' | null>(null);
  const [ascensor, setAscensor] = useState<boolean | null>(null);

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
      if (!active) return;
      const districts = Array.isArray(data.districts) ? data.districts.filter((d: string) => d !== 'Todos') : [];
      setDistrictOptions(districts);
      const latest = data.latest_observed_period;
      const year = latest?.year || 2026;
      const month = latest?.month || 'Junio';
      return apiFetch(`/map?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&interest=Compra-venta`);
    }).then(res => {
      if (!res || !res.ok) return null;
      return res.json();
    }).then(mapData => {
      if (!active || !mapData) return;
      const list = Array.isArray(mapData.neighborhoods) ? mapData.neighborhoods : [];
      const parsed: Array<{ name: string; district: string; id?: number | string }> = [];
      const seen = new Set<string>();
      for (const item of list) {
        const name = String(item.barrio || item.nombre || item.name || '').trim();
        const district = String(item.distrito || item.district || '').trim();
        if (!name || !district) continue;
        const key = `${district.toLowerCase()}::${name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        parsed.push({ name, district, id: item.id_barrio });
      }
      setBarrioItems(parsed);
    }).catch(() => {
      if (active) setErrorMessage('No se pudieron cargar las zonas de Madrid. Recarga la página para intentarlo de nuevo.');
    });
    return () => { active = false; };
  }, []);

  const zoneSearchOptions = useMemo<ZoneSearchOption[]>(() => {
    const districts: ZoneSearchOption[] = districtOptions.map(name => ({
      id: `district:${name}`,
      name,
      kind: 'district'
    }));
    const barrios: ZoneSearchOption[] = barrioItems.map(b => ({
      id: `barrio:${b.id ?? `${b.district}:${b.name}`}`,
      name: b.name,
      district: b.district,
      kind: 'barrio'
    }));
    return [...districts, ...barrios];
  }, [districtOptions, barrioItems]);

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
    if (!selectedDistrict || selectedDistrict === 'Todos') {
      setErrorMessage('Selecciona un distrito o barrio en el buscador de zonas.');
      return;
    }

    const location = selectedNeighborhood !== 'Todos' ? selectedNeighborhood : selectedDistrict;
    await ejecutarEvaluacion(precio, metros, location, operacion, estadoInmueble, ascensor);
  };

  const ejecutarEvaluacion = async (
    precio: number,
    metros: number,
    barrio: string,
    op: string,
    nextEstado: 'A reformar' | 'Buen estado' | 'Reformado' | null = estadoInmueble,
    nextAscensor: boolean | null = ascensor
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: Record<string, any> = {
        precio,
        metros,
        barrio,
        operacion: op
      };
      if (nextEstado) payload.estado_inmueble = nextEstado;
      if (nextAscensor !== null) payload.ascensor = nextAscensor;

      const res = await apiFetch('/veredicto/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo completar la comparación del precio.');
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

  const reevaluarSiHayResultado = (
    nextOp: 'Venta' | 'Alquiler',
    nextEstado: 'A reformar' | 'Buen estado' | 'Reformado' | null,
    nextAscensor: boolean | null
  ) => {
    if (!resultado) return;
    const precio = parseFloat(precioInput);
    const metros = parseFloat(metrosInput);
    const location = selectedNeighborhood !== 'Todos' ? selectedNeighborhood : selectedDistrict;
    if (!isNaN(precio) && precio > 0 && !isNaN(metros) && metros > 0 && location && location !== 'Todos') {
      ejecutarEvaluacion(precio, metros, location, nextOp, nextEstado, nextAscensor);
    }
  };

  // Descargar Informe de Negociación gratuito en PDF
  const handleDescargarPdfGratis = () => {
    if (!resultado) return;
    const precio = parseFloat(precioInput) || resultado.precio_m2_inmueble * (parseFloat(metrosInput) || 80);
    const metros = parseFloat(metrosInput) || 80;
    const params = new URLSearchParams({
      precio: String(precio),
      metros: String(metros),
      barrio: resultado.barrio_nombre,
      operacion
    });
    if (estadoInmueble) params.set('estado_inmueble', estadoInmueble);
    if (ascensor !== null) params.set('ascensor', String(ascensor));
    const url = apiUrl(`/veredicto/descargar-dossier-gratis?${params.toString()}`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const badgeConfig: Record<VeredictoEstado, { label: string }> = {
    CARO: {
      label: 'POR ENCIMA DE LA REFERENCIA',
    },
    BARATO: {
      label: 'POR DEBAJO DE LA REFERENCIA',
    },
    EN_LINEA: {
      label: 'EN EL RANGO DE REFERENCIA',
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
            {PRICE_ANALYSIS_LABEL}
          </h1>
          <p className="veredicto-subtitle">
            Compara el precio anunciado con operaciones de cierre observadas en su zona. Es una referencia estadística informativa, no una tasación.
          </p>
        </div>

        {/* Selector de Modalidad (Alquiler / Comprar / Vender) */}
        <div className="veredicto-segmented-wrap">
          <div className="veredicto-segmented" role="tablist" aria-label="Modalidad de análisis">
            <button
              type="button"
              role="tab"
              aria-selected={modalidad === 'alquiler'}
              onClick={() => { setModalidad('alquiler'); reevaluarSiHayResultado('Alquiler', estadoInmueble, ascensor); }}
              className={`veredicto-segment-btn ${modalidad === 'alquiler' ? 'active' : ''}`}
            >
              Alquiler
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modalidad === 'comprar'}
              onClick={() => {
                const prevOp = operacion;
                setModalidad('comprar');
                if (prevOp !== 'Venta') reevaluarSiHayResultado('Venta', estadoInmueble, ascensor);
              }}
              className={`veredicto-segment-btn ${modalidad === 'comprar' ? 'active' : ''}`}
            >
              Comprar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modalidad === 'vender'}
              onClick={() => {
                const prevOp = operacion;
                setModalidad('vender');
                if (prevOp !== 'Venta') reevaluarSiHayResultado('Venta', estadoInmueble, ascensor);
              }}
              className={`veredicto-segment-btn ${modalidad === 'vender' ? 'active' : ''}`}
            >
              Vender
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

                  {/* Buscador inteligente de distrito o barrio */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <ZoneSearch
                      options={zoneSearchOptions}
                      district={selectedDistrict}
                      barrio={selectedNeighborhood}
                      title="Zona (Distrito o Barrio)"
                      formatName={(name) => name}
                      onSelect={({ district, barrio }) => {
                        setSelectedDistrict(district);
                        setSelectedNeighborhood(barrio);
                        setErrorMessage(null);
                      }}
                    />
                  </div>
                </div>

                {/* Píldoras rápidas opcionales: Estado + Ascensor */}
                <div className="veredicto-quick-pills-bar">
                  <div className="veredicto-pill-group">
                    <span className="veredicto-pill-label">Estado <small>(opcional)</small>:</span>
                    <div className="veredicto-pill-options">
                      {(['A reformar', 'Buen estado', 'Reformado'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`veredicto-quick-pill ${estadoInmueble === opt ? 'active' : ''}`}
                          onClick={() => {
                            const next = estadoInmueble === opt ? null : opt;
                            setEstadoInmueble(next);
                            reevaluarSiHayResultado(operacion, next, ascensor);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="veredicto-pill-group">
                    <span className="veredicto-pill-label">Ascensor <small>(opcional)</small>:</span>
                    <div className="veredicto-pill-options">
                      <button
                        type="button"
                        className={`veredicto-quick-pill ${ascensor === true ? 'active' : ''}`}
                        onClick={() => {
                          const next = ascensor === true ? null : true;
                          setAscensor(next);
                          reevaluarSiHayResultado(operacion, estadoInmueble, next);
                        }}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={`veredicto-quick-pill ${ascensor === false ? 'active' : ''}`}
                        onClick={() => {
                          const next = ascensor === false ? null : false;
                          setAscensor(next);
                          reevaluarSiHayResultado(operacion, estadoInmueble, next);
                        }}
                      >
                        No
                      </button>
                    </div>
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
                        <span>Calculando comparación...</span>
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

        {/* 3. Resultados del Veredicto (Nueva Ficha Paso 2 + Paso 4) */}
        {resultado && (() => {
          const isAlquilerRes = (resultado.operacion || operacion).toLowerCase() === 'alquiler';
          const unidadTotal = isAlquilerRes ? '€/mes' : '€';
          const fmtM2 = (v: number) => Number(v).toLocaleString('es-ES', {
            minimumFractionDigits: isAlquilerRes ? 2 : 0,
            maximumFractionDigits: isAlquilerRes ? 2 : 0
          });
          const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

          const vNorm = (resultado.veredicto || '').toLowerCase();
          const tone = vNorm.includes('debajo')
            ? 'bajo'
            : vNorm.includes('línea') || vNorm.includes('linea')
              ? 'linea'
              : vNorm.includes('muy por encima')
                ? 'muy_encima'
                : 'encima';

          const badgeMap: Record<string, string> = {
            bajo: 'Por debajo de la referencia',
            linea: 'En línea con la zona',
            encima: 'Por encima de la referencia',
            muy_encima: 'Muy por encima'
          };

          const phraseMap: Record<VeredictoModalidad, Record<string, string>> = {
            alquiler: {
              bajo: 'El alquiler indicado está por debajo del rango razonable para esta zona.',
              linea: 'El alquiler indicado está en línea con lo habitual para esta zona.',
              encima: 'El alquiler indicado está por encima del rango razonable para esta zona.',
              muy_encima: 'El alquiler indicado está muy por encima del rango razonable para esta zona.'
            },
            comprar: {
              bajo: 'El precio de compra es barato para pagar respecto a la referencia de la zona.',
              linea: 'El precio de compra es razonable para pagar, en línea con la zona.',
              encima: 'El precio de compra es caro para pagar respecto a la referencia de la zona.',
              muy_encima: 'El precio de compra es muy caro para pagar respecto a la referencia de la zona.'
            },
            vender: {
              bajo: 'El precio de venta es bajo para publicar respecto a la referencia de la zona.',
              linea: 'El precio de venta es ajustado para publicar, en línea con la zona.',
              encima: 'El precio de venta es alto para publicar respecto a la referencia de la zona.',
              muy_encima: 'El precio de venta es muy alto para publicar respecto a la referencia de la zona.'
            }
          };

          const mesesEs: Record<string, string> = {
            '01': 'enero', '02': 'febrero', '03': 'marzo', '04': 'abril',
            '05': 'mayo', '06': 'junio', '07': 'julio', '08': 'agosto',
            '09': 'septiembre', '10': 'octubre', '11': 'noviembre', '12': 'diciembre'
          };
          const periodoParts = (resultado.periodo_dato || resultado.fecha_cierre_referencia || '').split('-');
          const periodoTexto = periodoParts.length === 2
            ? `${mesesEs[periodoParts[1]] || periodoParts[1]} ${periodoParts[0]}`
            : (resultado.periodo_dato || resultado.fecha_cierre_referencia);

          const minScale = Math.min(resultado.rango_bajo, resultado.media_madrid, resultado.precio_m2_inmueble) * 0.85;
          const maxScale = Math.max(resultado.rango_alto, resultado.media_madrid, resultado.precio_m2_inmueble) * 1.15;
          const span = Math.max(1, maxScale - minScale);
          const pctPos = (val: number) => Math.max(2, Math.min(98, ((val - minScale) / span) * 100));

          const bandLeft = pctPos(resultado.rango_bajo);
          const bandRight = pctPos(resultado.rango_alto);
          const bandWidth = Math.max(4, bandRight - bandLeft);
          const userPos = pctPos(resultado.precio_m2_inmueble);
          const madridPos = pctPos(resultado.media_madrid);
          const metrosNum = parseFloat(metrosInput) || 80;

          return (
          <div className="veredicto-results">
            {/* Nueva Ficha Unificada de Veredicto */}
            <div className={`veredicto-result-hero veredicto-tone-${tone}`}>
              {/* 1. Veredicto en una frase + badge de color */}
              <div className="veredicto-hero-header">
                <div>
                  <span className={`veredicto-state-badge tone-${tone}`}>
                    {badgeMap[tone]}
                  </span>
                  <h2 className="veredicto-hero-title">
                    {phraseMap[modalidad][tone]}
                  </h2>
                </div>
                <div className="veredicto-zone-meta">
                  <p className="veredicto-zone-meta-label">Zona analizada</p>
                  <p className="veredicto-zone-meta-name">
                    {resultado.barrio_nombre === resultado.distrito_nombre ? `${resultado.distrito_nombre} (Distrito)` : `${resultado.barrio_nombre} (${resultado.distrito_nombre})`}
                  </p>
                </div>
              </div>

              {/* 2. Barra horizontal comparativa en €/m² */}
              <div className="veredicto-range-bar-wrap">
                <div className="veredicto-range-bar-legend">
                  <span>
                    <i className="dot-band" /> Rango de la zona: <strong>{fmtM2(resultado.rango_bajo)} – {fmtM2(resultado.rango_alto)} €/m²</strong>
                  </span>
                  <span>
                    <i className="dot-user" /> Tu inmueble: <strong>{fmtM2(resultado.precio_m2_inmueble)} €/m²</strong>
                  </span>
                  <span>
                    <i className="dot-madrid" /> Media Madrid: <strong>{fmtM2(resultado.media_madrid)} €/m²</strong>
                  </span>
                </div>

                <div className="veredicto-range-track" aria-label="Comparativa de precio por metro cuadrado">
                  <div
                    className="veredicto-range-band"
                    style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
                  />
                  <div
                    className="veredicto-marker-madrid"
                    style={{ left: `${madridPos}%` }}
                    title={`Media Madrid: ${fmtM2(resultado.media_madrid)} €/m²`}
                  >
                    <span className="marker-tag madrid">Madrid {fmtM2(resultado.media_madrid)}</span>
                  </div>
                  <div
                    className={`veredicto-marker-user tone-${tone}`}
                    style={{ left: `${userPos}%` }}
                    title={`Tu inmueble: ${fmtM2(resultado.precio_m2_inmueble)} €/m²`}
                  >
                    <span className="marker-tag user">{fmtM2(resultado.precio_m2_inmueble)} €/m²</span>
                  </div>
                </div>
              </div>

              {/* 3. Tabla de cálculo */}
              <div className="veredicto-calc-block">
                <h3 className="veredicto-calc-heading">Cómo leer esta comparación</h3>
                <div className="veredicto-calc-table-wrap">
                  <table className="veredicto-calc-table">
                    <tbody>
                      <tr>
                        <td>Referencia base ({resultado.barrio_nombre})</td>
                        <td className="num">{fmtM2(resultado.ref_base)} €/m²</td>
                      </tr>
                      <tr>
                        <td>Ajuste por estado ({resultado.ajustes?.estado?.valor === 'a_reformar' ? 'A reformar' : resultado.ajustes?.estado?.valor === 'reformado' ? 'Reformado' : resultado.ajustes?.estado?.valor === 'buen_estado' ? 'Buen estado' : 'No indicado'})</td>
                        <td className="num">{fmtPct(resultado.ajustes?.estado?.pct ?? 0)}</td>
                      </tr>
                      <tr>
                        <td>Ajuste por ascensor ({resultado.ajustes?.ascensor?.valor === 'si' ? 'Sí' : resultado.ajustes?.ascensor?.valor === 'no' ? 'No' : 'No indicado'})</td>
                        <td className="num">{fmtPct(resultado.ajustes?.ascensor?.pct ?? 0)}</td>
                      </tr>
                      <tr>
                        <td>Ajuste por tamaño (media zona {resultado.superficie_media} m²)</td>
                        <td className="num">{fmtPct(resultado.ajustes?.tamano?.pct ?? 0)}</td>
                      </tr>
                      <tr className="row-highlight">
                        <td>Referencia ajustada</td>
                        <td className="num">{fmtM2(resultado.ref_ajustada)} €/m²</td>
                      </tr>
                      <tr>
                        <td>Rango razonable</td>
                        <td className="num">{fmtM2(resultado.rango_bajo)} – {fmtM2(resultado.rango_alto)} €/m²</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="veredicto-calc-footnote">Ajustes orientativos, no medidos.</p>
              </div>

              {/* 4. Frase de rango total para la superficie */}
              <div className="veredicto-total-range-box">
                Para <strong>{metrosNum.toLocaleString('es-ES')} m²</strong>, lo razonable estaría entre{' '}
                <strong>{Math.round(resultado.rango_total_bajo).toLocaleString('es-ES')}</strong> y{' '}
                <strong>{Math.round(resultado.rango_total_alto).toLocaleString('es-ES')} {unidadTotal}</strong>.
              </div>

              {/* 5. Línea de confianza + 6. Aviso legal */}
              <div className="veredicto-confidence-footer">
                <p className="veredicto-confidence-line">
                  Confianza {resultado.confianza}
                  {resultado.confianza_indirecta ? ' (confianza estimada)' : ''}:{' '}
                  {resultado.num_transacciones !== null
                    ? `${resultado.num_transacciones.toLocaleString('es-ES')} transacciones en ${resultado.barrio_nombre} (${resultado.anio_transacciones})`
                    : `datos limitados en ${resultado.barrio_nombre}`}.
                  {' '}Datos de {periodoTexto}. No considera planta, orientación ni calidad concreta.
                </p>
                <p className="veredicto-legal-note">
                  No es una tasación ni una garantía de precio.
                </p>
              </div>
            </div>

            {/* SECCIÓN DE DESCARGA GRATUITA: Informe de Negociación DMIYC */}
            <div className="veredicto-dossier-card">
              <div style={{ maxWidth: '540px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: '#00F0FF',
                  background: 'rgba(0, 240, 255, 0.12)',
                  border: '1px solid rgba(0, 240, 255, 0.35)',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}>
                  Informe Gratuito DMIYC · Listo para compartir
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px 0' }}>
                  Descarga tu Informe de Negociación DMIYC en PDF
                </h3>
                <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                  Informe gratuito en 1 página A4 de DMIYC con el veredicto, tabla de ajustes, rango en €/m², gráfica comparativa y nivel de confianza para compartir con el propietario o agencia.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px' }}>
                <button
                  type="button"
                  onClick={handleDescargarPdfGratis}
                  className="veredicto-btn-primary"
                  style={{ width: '100%', padding: '14px 20px' }}
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                  <span>Descargar Informe de Negociación (PDF Gratis)</span>
                </button>
              </div>
            </div>
          </div>
          );
        })()}
      </main>

      {/* Footer Apple Dark */}
      <SiteFooter />
    </div>
  );
}
