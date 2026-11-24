'use client';

import React, { useState, useEffect } from 'react';
import { X, Database, BarChart3, Binary, ShieldCheck, Check, Compass } from 'lucide-react';

export interface MethodologySource {
  id: string;
  badge: string;
  freq: string;
  title: string;
  description: string;
  meta: string[];
  license?: string;
}

export const METHODOLOGY_SOURCES: MethodologySource[] = [
  {
    id: 'ayuntamiento',
    badge: 'DATOS MUNICIPALES',
    freq: 'Actualización periódica oficial',
    title: 'Banco de Datos Abiertos del Ayuntamiento de Madrid',
    description: 'Series mensuales del mercado inmobiliario y del alquiler por distrito y barrio censal. Registros de precios medios, contratos formalizados y evolución demográfica.',
    meta: ['Ámbito: 21 distritos / 131 barrios', 'Trazabilidad: 2018 - 2026'],
  },
  {
    id: 'registradores',
    badge: 'TRANSACCIONES REALES',
    freq: 'Registros oficiales',
    title: 'Colegio de Registradores de la Propiedad de España',
    description: 'Estadística Registral Inmobiliaria de precios reales de cierre en escritura pública notarial, excluyendo márgenes de negociación u ofertas desactualizadas, junto con importes de hipoteca media y tipos de interés efectivos.',
    meta: ['Validez jurídica de cierre', 'Transacciones de compra y venta'],
  },
  {
    id: 'osm',
    badge: 'INFRAESTRUCTURA URBANA',
    freq: 'Red OpenStreetMap (OSMnx)',
    title: 'OpenStreetMap (Equipamientos y Movilidad Urbana)',
    description: 'Cálculo geoespacial de distancias proyectadas a estaciones de Metro, cercanías, hospitales, colegios, universidades y parques, cuantificando el valor intrínseco de accesibilidad y bienestar residencial.',
    meta: ['Accesibilidad urbana multimodal', 'Proyección geoespacial UTM'],
    license: '© OpenStreetMap contributors · Licencia ODbL',
  },
  {
    id: 'ine',
    badge: 'DEMOGRAFÍA Y MACROECONOMÍA',
    freq: 'INE & Banco de España',
    title: 'Instituto Nacional de Estadística (INE) & Banco de España',
    description: 'Atlas de Distribución de Renta de los Hogares a nivel de sección censal, tasas de esfuerzo financiero real y series oficiales de tipos hipotecarios de referencia y Euribor.',
    meta: ['Renta neta media por hogar', 'Cálculo de esfuerzo de alquiler y compra'],
  },
  {
    id: 'catastro',
    badge: 'PARQUE EDIFICATORIO',
    freq: 'Dirección General del Catastro',
    title: 'Dirección General del Catastro',
    description: 'Antigüedad del parque residencial, superficies construidas medias y densidades edificatorias por zona, empleadas para la normalización rigurosa de superficies y precios unitarios (€/m²).',
    meta: ['Base física del inmueble', 'Homogeneización de tipologías'],
  },
];

const MONTHS_ORDER = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface MethodologyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  latestOfficialPeriod?: { month: string; year: string };
}

export const MethodologyDrawer: React.FC<MethodologyDrawerProps> = ({
  isOpen,
  onClose,
  latestOfficialPeriod,
}) => {
  const [activeTab, setActiveTab] = useState<'fuentes' | 'algoritmo' | 'metricas'>('fuentes');
  const drawerBodyRef = React.useRef<HTMLDivElement>(null);

  // Fechas dinámicas derivadas de la misma variable del selector/pastilla
  const officialMonth = latestOfficialPeriod?.month || 'Junio';
  const officialYear = latestOfficialPeriod?.year || '2026';
  const monthIdx = MONTHS_ORDER.indexOf(officialMonth);
  const nextMonthIdx = monthIdx >= 0 ? (monthIdx + 1) % 12 : 6;
  const nextYear = monthIdx === 11 ? Number(officialYear) + 1 : Number(officialYear);
  const nextMonth = MONTHS_ORDER[nextMonthIdx];

  const officialText = `${officialMonth.toLowerCase()} de ${officialYear}`;
  const projectionText = `${nextMonth.toLowerCase()} de ${nextYear}`;

  // Bloquear completamente el scroll tanto en html como en body y neutralizar eventos wheel/touch fuera del contenido del cajón
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const drawerBody = drawerBodyRef.current;
      if (!drawerBody) {
        e.preventDefault();
        return;
      }

      const isInsideDrawerBody = drawerBody.contains(e.target as Node);
      if (!isInsideDrawerBody) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = drawerBody;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;

      if (isScrollingUp && scrollTop <= 0) {
        e.preventDefault();
      } else if (isScrollingDown && scrollTop + clientHeight >= scrollHeight - 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const drawerBody = drawerBodyRef.current;
      if (!drawerBody || !drawerBody.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="v2-methodology-overlay" onClick={onClose} role="presentation">
      <div
        className="v2-methodology-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v2-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DRAWER HEADER */}
        <div className="v2-drawer-header">
          <div className="v2-drawer-title-group">
            <span className="v2-drawer-eyebrow">
              <Compass size={13} className="v2-drawer-compass-pulse" aria-hidden="true" />
              <span>FICHA TÉCNICA</span>
            </span>
            <h2 id="v2-drawer-title">Metodología y trazabilidad</h2>
          </div>
          <button
            type="button"
            className="v2-drawer-close-btn"
            onClick={onClose}
            aria-label="Cerrar ficha técnica"
          >
            <X size={18} />
          </button>
        </div>

        {/* DRAWER NAVIGATION TABS */}
        <div className="v2-drawer-tabs" role="tablist" aria-label="Secciones de la metodología">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fuentes'}
            className={`v2-drawer-tab ${activeTab === 'fuentes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('fuentes')}
          >
            <Database size={14} aria-hidden="true" />
            <span>Fuentes Oficiales</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'algoritmo'}
            className={`v2-drawer-tab ${activeTab === 'algoritmo' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('algoritmo')}
          >
            <Binary size={14} aria-hidden="true" />
            <span>Modelo Matemático</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'metricas'}
            className={`v2-drawer-tab ${activeTab === 'metricas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('metricas')}
          >
            <BarChart3 size={14} aria-hidden="true" />
            <span>Métricas de Ajuste</span>
          </button>
        </div>

        {/* DRAWER BODY CONTENT */}
        <div className="v2-drawer-body" ref={drawerBodyRef}>
          {/* TAB 1: FUENTES OFICIALES */}
          {activeTab === 'fuentes' && (
            <div className="v2-drawer-tab-content">
              <div className="v2-drawer-intro-card">
                <ShieldCheck size={22} className="v2-drawer-intro-icon" />
                <div>
                  <h4>Qué es dato oficial y qué es proyección</h4>
                  <p>
                    Hasta {officialText} los precios son los publicados por las fuentes. Desde {projectionText} son proyecciones del modelo DMIYC y se marcan siempre como «Proyección». En barrios con pocos registros se usa el modelo de distrito (ver pestaña Métricas de Ajuste).
                  </p>
                </div>
              </div>

              <div className="v2-sources-list">
                {METHODOLOGY_SOURCES.map((source) => (
                  <div key={source.id} className="v2-source-card">
                    <div className="v2-source-header">
                      <span className="v2-source-badge">{source.badge}</span>
                      <span className="v2-source-freq">{source.freq}</span>
                    </div>
                    <h3>{source.title}</h3>
                    <p>{source.description}</p>
                    <div className="v2-source-meta">
                      {source.meta.map((m, idx) => (
                        <span key={idx}>{m}</span>
                      ))}
                    </div>
                    {source.license && (
                      <div className="v2-source-license" style={{ fontSize: '11px', color: '#8fa8be', marginTop: '6px' }}>
                        {source.license}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MODELO MATEMÁTICO */}
          {activeTab === 'algoritmo' && (
            <div className="v2-drawer-tab-content">
              <div className="v2-math-block">
                <h4>Arquitectura Predictiva Híbrida y Trazabilidad Algorítmica</h4>
                <p>
                  El motor predictivo de DMIYC combina un <strong>modelo jerárquico híbrido</strong> con algoritmos de Gradient Boosting diferenciados por mercado (<strong>LightGBM para Alquiler</strong> y <strong>XGBoost para Venta</strong>), un router de fallback por densidad muestral y un modelo hedónico multivariante con dinámica temporal.
                </p>

                <div className="v2-formula-card">
                  <div className="v2-formula-badge">FORMULACIÓN HEDÓNICA Y DINÁMICA TEMPORAL</div>
                  <div className="v2-formula-code">
                    <code>{"P(i,t) = α_i + Σ [β_k · X(k,i,t)] + Σ [γ_m · Lag_m(P)] + w(t) · Shock_2025 + ε(i,t)"}</code>
                  </div>
                  <ul className="v2-formula-legend">
                    <li><strong>P(i,t)</strong>: Precio estimado por m² en la zona <em>i</em> y mes <em>t</em>.</li>
                    <li><strong>X(k,i,t)</strong>: Variables explicativas (distancias a transporte público/POIs, renta media censal, tipo de interés hipotecario, superficie media).</li>
                    <li><strong>Lag_m</strong>: Inercia histórica con retardos autorregresivos (1, 3 y 12 meses) y media móvil semestral (<em>rolling mean</em>).</li>
                    <li><strong>w(t) · Shock_2025</strong>: Ponderador de madurez temporal (<em>shock_weight</em>) con rampa lineal durante 2025 (de 0,083 a 1,0) y anclaje unitario para 2026, modelando la aceleración progresiva de precios.</li>
                    <li><strong>{"ε(i,t)"}</strong>: Término de error estocástico con regularización L1/L2 para blindar la generalización.</li>
                  </ul>
                </div>

                <div className="v2-sub-section">
                  <h5>Lógica Jerárquica Híbrida con Router de Fallback</h5>
                  <p>
                    Para resolver la heterogeneidad de volumen muestral entre zonas consolidadas y vecindarios periféricos, el sistema implementa un enrutador inteligente de dos niveles:
                  </p>
                  <ul className="v2-benchmarks-list" style={{ marginTop: '10px' }}>
                    <li>
                      <Check size={14} className="v2-check-icon" />
                      <span><strong>Modelo Granular de Barrio</strong> (para zonas con ≥ 20 observaciones de entrenamiento): Activo en el <strong>91 % de los barrios</strong> de Madrid, capturando identidades de precio hiperlocales (MAE de 111,99 €/m² en venta y 0,49 €/m² en alquiler).</span>
                    </li>
                    <li>
                      <Check size={14} className="v2-check-icon" />
                      <span><strong>Modelo Generalista de Distrito (Fallback Robusto)</strong>: Si un barrio tiene &lt; 20 observaciones históricas (zonas de baja rotación o periferia), el router deriva automáticamente al modelo de distrito, evitando sobreajustes y garantizando una base estadística sólida.</span>
                    </li>
                  </ul>
                </div>

                <div className="v2-sub-section">
                  <h5>Validación Temporal Estricta (Time-Series Split)</h5>
                  <p>
                    Para garantizar rigor científico y evitar fuga de información (<em>data leakage</em>), el modelo se evalúa exclusivamente en orden cronológico hacia adelante (<em>walk-forward validation</em>). Jamás una observación futura interviene en las proyecciones pasadas o presentes.
                  </p>
                </div>

                <div className="v2-sub-section">
                  <h5>Rango de Incertidumbre (95 %)</h5>
                  <div className="v2-formula-card v2-formula-card--secondary">
                    <div className="v2-formula-code">
                      <code>{"Rango(95 %) = P̂(i,t) ± 1,96 · σ̂_zona · √(1 + h/12)"}</code>
                    </div>
                    <p className="v2-formula-note">
                      El rango de incertidumbre se escala proporcionalmente a la volatilidad histórica de la zona y al horizonte temporal de proyección <em>h</em>, ampliándose gradualmente a mayor lejanía temporal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MÉTRICAS DE PRECISIÓN */}
          {activeTab === 'metricas' && (
            <div className="v2-drawer-tab-content">
              <div className="v2-metrics-summary">
                <h4>Validación Estadística del Modelo en Banco de Pruebas</h4>
                <p>
                  Métricas empíricas reales obtenidas sobre el conjunto de test fuera de muestra (<em>out-of-sample</em>) evaluando estimaciones frente a datos reales de transacciones:
                </p>

                <div className="v2-metric-bars">
                  {/* METRIC 1: R2 */}
                  <div className="v2-metric-bar-item">
                    <div className="v2-metric-bar-header">
                      <div>
                        <strong>R² Venta · Modelo Granular Barrio (XGBoost)</strong>
                        <span>Capacidad explicativa de la varianza territorial en compraventa</span>
                      </div>
                      <span className="v2-metric-value v2-metric-value--cyan">0,994 (99,4 %)</span>
                    </div>
                    <div className="v2-metric-track">
                      <div className="v2-metric-fill v2-metric-fill--cyan" style={{ width: '99.4%' }} />
                    </div>
                    <small>El modelo granular de venta explica el 99,44 % de la varianza de precios por barrio.</small>
                  </div>

                  {/* METRIC 2: R2 ALQUILER */}
                  <div className="v2-metric-bar-item">
                    <div className="v2-metric-bar-header">
                      <div>
                        <strong>R² Alquiler · Modelo Granular Barrio (LightGBM)</strong>
                        <span>Capacidad explicativa de la dispersión mensual de rentas</span>
                      </div>
                      <span className="v2-metric-value v2-metric-value--cyan">0,973 (97,3 %)</span>
                    </div>
                    <div className="v2-metric-track">
                      <div className="v2-metric-fill v2-metric-fill--cyan" style={{ width: '97.3%' }} />
                    </div>
                    <small>El modelo granular de alquiler explica el 97,33 % de la varianza de rentas por m².</small>
                  </div>

                  {/* METRIC 3: MAE / MAPE ALQUILER */}
                  <div className="v2-metric-bar-item">
                    <div className="v2-metric-bar-header">
                      <div>
                        <strong>MAE y MAPE en Alquiler Granular</strong>
                        <span>Error absoluto y relativo medio en el 91 % de los barrios</span>
                      </div>
                      <span className="v2-metric-value v2-metric-value--emerald">0,49 €/m² (MAPE 2,38 %)</span>
                    </div>
                    <div className="v2-metric-track">
                      <div className="v2-metric-fill v2-metric-fill--emerald" style={{ width: '97.62%' }} />
                    </div>
                    <small>El 100 % de las predicciones queda dentro de ±20 % del valor real (RMSE: 0,63 €/m²).</small>
                  </div>

                  {/* METRIC 4: MAE / MAPE VENTA */}
                  <div className="v2-metric-bar-item">
                    <div className="v2-metric-bar-header">
                      <div>
                        <strong>MAE y MAPE en Venta Granular</strong>
                        <span>Error absoluto y relativo medio en el 91 % de los barrios</span>
                      </div>
                      <span className="v2-metric-value v2-metric-value--emerald">111,99 €/m² (MAPE 2,09 %)</span>
                    </div>
                    <div className="v2-metric-track">
                      <div className="v2-metric-fill v2-metric-fill--emerald" style={{ width: '97.91%' }} />
                    </div>
                    <small>El 100 % de las predicciones queda dentro de ±20 % del valor real (RMSE: 155,15 €/m²).</small>
                  </div>
                </div>

                <div className="v2-benchmarks-card">
                  <h5>Transparencia en Zonas de Fallback (9 % Periferia / Baja Rotación)</h5>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#9cb2c4', lineHeight: '1.45' }}>
                    En barrios con menos de 20 transacciones históricas (como Barajas o tramos específicos de chalets en El Viso), el sistema activa el fallback generalista de distrito:
                  </p>
                  <ul className="v2-benchmarks-list">
                    <li>
                      <Check size={14} className="v2-check-icon" />
                      <span><strong>Fallback Alquiler Distrito</strong>: MAE de 2,86 €/m² y MAPE de 12,56 % (el 85,1 % de las predicciones queda dentro de ±20 %).</span>
                    </li>
                    <li>
                      <Check size={14} className="v2-check-icon" />
                      <span><strong>Fallback Venta Distrito</strong>: MAE de 1.277 €/m² y MAPE de 21,68 % (protección estadística frente a muestras vacías).</span>
                    </li>
                    <li>
                      <Check size={14} className="v2-check-icon" />
                      <span><strong>Diagnóstico de limitaciones</strong>: Efecto <em>Cold Start</em> en barrios incorporados a partir de 2024 (lags de 12 meses inactivos el primer año) y ausencia de mercado residencial en áreas logísticas.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DRAWER FOOTER */}
        <div className="v2-drawer-footer">
          <div className="v2-drawer-footer__copy">
            <strong>DMIYC · Sistema de Inteligencia Urbana de Madrid</strong>
            <small>Datos y licencias según cada fuente · Proyecciones: modelo DMIYC</small>
          </div>
        </div>
      </div>
    </div>
  );
};
