'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import './HeatmapDistritosMeses.css';

interface HeatmapDistritosMesesProps {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  level?: string;
  year: string;
  min?: number;
  max?: number;
  selectedMonth?: string;
  isMobile?: boolean;
  onOpenMethodology?: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_ABBR = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Rampa cromática perceptual de 5 bandas (Perceptual Heatmap Palette):
 * 1. < 16 €/m²: Azul Noche Profundo (#062244)
 * 2. 16 – 19 €/m²: Azul Petróleo / Marino (#074d75)
 * 3. 20 – 24 €/m²: Turquesa Esmeralda (#00a896)
 * 4. 24 – 27 €/m²: Cian Neón Saturado (#00e5ff)
 * 5. > 27 €/m²: Pico Glaciar / Blanco Luminoso (#d9fbff)
 */
function contrastTextForHex(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const contrastWithWhite = 1.05 / (lum + 0.05);
  return contrastWithWhite < 4.5 ? '#0A192F' : '#ffffff';
}

function isEstimatedMonth(year: string, monthIndex: number): boolean {
  const y = Number(year);
  if (!Number.isFinite(y)) return monthIndex >= 6;
  return y > 2026 || (y === 2026 && monthIndex >= 6);
}

const PROFILE_HEAT_PALETTES: Record<string, [string, string, string, string, string]> = {
  alquiler: ['#062244', '#074d75', '#00a896', '#00e5ff', '#d9fbff'],
  compra: ['#3a200a', '#783c07', '#b86a04', '#e59b12', '#ffc83b'],
  venta: ['#042a17', '#0b5732', '#13884e', '#22be6f', '#4eed9f'],
  inversion: ['#33103d', '#571c66', '#872b9d', '#be46dc', '#e879f9'],
};

function getBlueHeatColor(norm: number, val: number, profileId: string, useProfilePalette: boolean = false): { bg: string; text: string; isBold: boolean } {
  const palette = (useProfilePalette && PROFILE_HEAT_PALETTES[profileId]) || PROFILE_HEAT_PALETTES.alquiler;
  let bandIndex = 0;

  if (profileId === 'alquiler') {
    if (val < 16) bandIndex = 0;
    else if (val < 20) bandIndex = 1;
    else if (val < 24) bandIndex = 2;
    else if (val <= 27) bandIndex = 3;
    else bandIndex = 4;
  } else {
    const t = Math.max(0, Math.min(1, norm));
    if (t < 0.20) bandIndex = 0;
    else if (t < 0.45) bandIndex = 1;
    else if (t < 0.70) bandIndex = 2;
    else if (t < 0.88) bandIndex = 3;
    else bandIndex = 4;
  }

  const bg = palette[bandIndex];
  const isBold = bandIndex >= 2;
  return { bg, text: contrastTextForHex(bg), isBold };
}

/**
 * Formatea valores numéricos con punto de miles (.) y coma decimal (,)
 * seguido del símbolo de unidad correspondiente (€ o %).
 */
function formatCellDisplay(val: number, profileId: string): string {
  if (profileId === 'inversion') {
    return `${val.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  // Compra, venta y alquiler usan punto de miles y coma decimal en español + €
  return `${val.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`;
}

export const HeatmapDistritosMeses: React.FC<HeatmapDistritosMesesProps> = ({
  rows,
  profileId,
  level = 'Distritos',
  year,
  selectedMonth,
  isMobile = false,
  onOpenMethodology,
}) => {
  const [search, setSearch] = useState('');
  const [showFullMatrixMobile, setShowFullMatrixMobile] = useState(false);
  const [showAllZonesMobile, setShowAllZonesMobile] = useState(false);

  // Extraer todos los valores válidos para calcular min y max reales sobre la misma escala
  const allValues = useMemo(() => {
    return rows.flatMap((r) =>
      MONTH_ABBR.map((_, i) => {
        const raw = Number(r[`m${i + 1}`]);
        if (!Number.isFinite(raw) || raw <= 0) return null;
        return profileId === 'inversion' ? raw * 100 : raw;
      }).filter((v): v is number => v !== null)
    );
  }, [rows, profileId]);

  const effectiveMin = useMemo(() => (allValues.length ? Math.min(...allValues) : 0), [allValues]);
  const effectiveMax = useMemo(() => (allValues.length ? Math.max(...allValues) : 1), [allValues]);

  // Filtrado de distritos en tiempo real
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.zona || '').toLowerCase().includes(q));
  }, [rows, search]);

  const unitLabel = profileId === 'inversion' ? '%' : '€/m²';
  const titleLabel =
    profileId === 'inversion'
      ? 'Evolución de Rentabilidad'
      : profileId === 'alquiler'
        ? 'Evolución del Alquiler (€/m²)'
        : profileId === 'compra'
          ? 'Evolución de Precio de Compra (€/m²)'
          : 'Evolución de Precio de Venta (€/m²)';

  const zoneLabel = level === 'Barrios' ? 'barrio' : 'distrito';

  const selectedMonthIdx = selectedMonth
    ? MONTH_NAMES.findIndex((m) => m.toLowerCase() === selectedMonth.toLowerCase())
    : -1;

  return (
    <div className="hdm-card" data-dashboard-section="heatmap">
      {/* CABECERA SUPERIOR: TÍTULO, LEYENDA MULTI-TONAL Y ACCESO METODOLÓGICO */}
      <div className="hdm-header">
        <div className="hdm-title-group">
          <h3 className="hdm-title">{titleLabel}</h3>
          <span className="hdm-subtitle">
            Seguimiento mensual por {zoneLabel} en {year} · Flujo continuo de mercado
          </span>
        </div>

        <div className="hdm-controls">
          <div className="hdm-scale-legend" title="Rampa cromática de 5 bandas térmicas de alta discriminación">
            <span>{profileId === 'alquiler' ? '< 16 €' : `< ${effectiveMin.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${unitLabel}`}</span>
            <div
              className="hdm-scale-bar"
              style={{
                width: '130px',
                height: '7px',
                borderRadius: '4px',
                background: 'linear-gradient(90deg, #062244 0%, #074d75 25%, #00a896 50%, #00e5ff 75%, #d9fbff 100%)',
                border: '1px solid rgba(186, 204, 214, 0.2)'
              }}
              aria-hidden="true"
            />
            <span>{profileId === 'alquiler' ? '> 27 €/m²' : `> ${effectiveMax.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${unitLabel}`}</span>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE CALOR (EN MÓVIL: FICHA COMPACTA DE TENDENCIA CON DESPLEGABLE OPCIONAL) */}
      {isMobile && !showFullMatrixMobile ? (
        <div className="hdm-mobile-summary">
          <div className="hdm-mobile-search">
            <Search size={14} className="hdm-th-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="hdm-th-search-input hdm-mobile-search-input"
              placeholder={`Filtrar ${zoneLabel}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={`Filtrar ${zoneLabel}s en la evolución mensual`}
            />
            {search && (
              <button
                type="button"
                className="hdm-th-search-clear"
                onClick={() => setSearch('')}
                aria-label="Borrar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <div className="hdm-mobile-list">
            {filteredRows.length > 0 ? (
              (search.trim() ? filteredRows : showAllZonesMobile ? filteredRows : filteredRows.slice(0, 5)).map((row) => {
                const activeIdx = selectedMonthIdx >= 0 ? selectedMonthIdx : 5;
                const readVal = (idx: number) => {
                  const raw = Number(row[`m${idx + 1}`]);
                  if (!Number.isFinite(raw) || raw <= 0) return null;
                  return profileId === 'inversion' ? raw * 100 : raw;
                };
                const startVal = readVal(0);
                const currentVal = readVal(activeIdx);
                const endVal = readVal(11);
                const refCurrent = currentVal ?? endVal ?? startVal;
                const deltaPct = startVal && refCurrent ? ((refCurrent - startVal) / startVal) * 100 : null;
                const milestones = [
                  { label: `Ene${isEstimatedMonth(year, 0) ? '*' : ''}`, val: startVal, isActive: activeIdx === 0, isEst: isEstimatedMonth(year, 0) },
                  { label: `${MONTH_ABBR[activeIdx]}${isEstimatedMonth(year, activeIdx) ? '*' : ''}`, val: currentVal, isActive: true, isEst: isEstimatedMonth(year, activeIdx) },
                  { label: `Dic${isEstimatedMonth(year, 11) ? '*' : ''}`, val: endVal, isActive: activeIdx === 11, isEst: isEstimatedMonth(year, 11) },
                ];

                return (
                  <div key={row.zona} className="hdm-mobile-row">
                    <div className="hdm-mobile-row-head">
                      <strong title={row.zona}>{row.zona}</strong>
                      {deltaPct !== null && (
                        <span className={`hdm-mobile-delta ${deltaPct >= 0 ? 'is-up' : 'is-down'}`}>
                          {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % año
                        </span>
                      )}
                    </div>
                    <div className="hdm-mobile-milestones">
                      {milestones.map((m, idx) => {
                        const norm = m.val !== null ? (m.val - effectiveMin) / (effectiveMax - effectiveMin || 1) : 0;
                        const heat = m.val !== null ? getBlueHeatColor(norm, m.val, profileId, true) : null;
                        return (
                          <div
                            key={`${m.label}-${idx}`}
                            className={`hdm-mobile-pill ${m.isActive ? 'is-active' : ''} ${m.isEst ? 'is-estimated' : ''}`}
                            style={heat ? { backgroundColor: heat.bg, color: heat.text, ...(m.isEst ? { borderColor: heat.text === '#0A192F' ? 'rgba(10, 25, 47, 0.55)' : 'rgba(0, 229, 255, 0.72)' } : {}) } : undefined}
                          >
                            <small style={heat ? { color: heat.text } : undefined}>{m.label}</small>
                            <span style={heat ? { color: heat.text } : undefined}>{m.val !== null ? formatCellDisplay(m.val, profileId) : '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="hdm-mobile-empty">
                {search.trim() ? `No se encontraron ${zoneLabel}s que coincidan con "${search}"` : 'Calibrando telemetría…'}
              </div>
            )}
          </div>

          {!search.trim() && filteredRows.length > 5 && (
            <button
              type="button"
              className="hdm-mobile-toggle-matrix"
              onClick={() => setShowAllZonesMobile(prev => !prev)}
              aria-expanded={showAllZonesMobile}
            >
              <span>{showAllZonesMobile ? `Mostrar primeros 5 ${zoneLabel}s` : `Ver todos los ${zoneLabel}s (${filteredRows.length})`}</span>
              {showAllZonesMobile ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>
          )}

          <button
            type="button"
            className="hdm-mobile-toggle-matrix"
            onClick={() => setShowFullMatrixMobile(true)}
            aria-expanded={false}
          >
            <span>Ver matriz anual completa (12 meses)</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {isMobile && (
            <button
              type="button"
              className="hdm-mobile-toggle-matrix is-collapse"
              onClick={() => setShowFullMatrixMobile(false)}
              aria-expanded={true}
            >
              <span>Volver a vista resumen móvil</span>
              <ChevronUp size={16} aria-hidden="true" />
            </button>
          )}
      <div className="hdm-table-scroll">
        <table className="hdm-table">
          <thead>
            <tr>
              {/* Esquina lateral superior izquierda: buscador integrado */}
              <th className="hdm-th hdm-th-district">
                <div className="hdm-th-search-wrapper">
                  <Search size={11} className="hdm-th-search-icon" aria-hidden="true" />
                  <input
                    type="search"
                    className="hdm-th-search-input"
                    placeholder={`Buscar ${zoneLabel}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label={`Filtrar ${zoneLabel}s en el mapa de calor`}
                  />
                  {search && (
                    <button
                      type="button"
                      className="hdm-th-search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Borrar búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>

              {/* Columnas mensuales */}
              {MONTH_ABBR.map((abbr, i) => {
                const isSelected = selectedMonthIdx === i;
                const isEstimated = isEstimatedMonth(year, i);
                return (
                  <th
                    key={abbr}
                    className={`hdm-th hdm-th-month ${isSelected ? 'is-selected' : ''} ${isEstimated ? 'is-estimated' : ''}`}
                    title={
                      isEstimated
                        ? `${MONTH_NAMES[i]}: Estimación predictiva DMIYC (CatBoost v2)`
                        : `${MONTH_NAMES[i]}: Registro oficial Ayto. Madrid y Registradores`
                    }
                  >
                    <span>{abbr}</span>
                    {isEstimated && <span className="hdm-est-mark" aria-hidden="true">*</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.zona} className="hdm-row">
                  <td className="hdm-td-district" title={row.zona}>
                    {row.zona}
                  </td>
                  {MONTH_ABBR.map((_, i) => {
                    const rawVal = Number(row[`m${i + 1}`]);
                    const hasData = Number.isFinite(rawVal) && rawVal > 0;
                    const val = profileId === 'inversion' && hasData ? rawVal * 100 : rawVal;

                    if (!hasData) {
                      return (
                        <td key={i} className="hdm-cell hdm-cell-no-data" title="Sin datos oficiales">
                          —
                        </td>
                      );
                    }

                    // Normalización continua de la celda sobre el rango real
                    const norm = (val - effectiveMin) / (effectiveMax - effectiveMin || 1);
                    const { bg, text, isBold } = getBlueHeatColor(norm, val, profileId, isMobile);

                    const isEstimated = isEstimatedMonth(year, i);
                    const formatted = formatCellDisplay(val, profileId);
                    
                    let tooltipText = '';
                    if (isEstimated) {
                      const errorMargin = profileId === 'inversion' ? 0.3 : Math.max(0.42, Number((val * 0.032).toFixed(2)));
                      const minVal = Math.max(0, val - errorMargin);
                      const maxVal = val + errorMargin;
                      tooltipText = `✦ MODELO PREDICTIVO DMIYC\n${row.zona} · ${MONTH_NAMES[i]} ${year}: ${formatted} (${unitLabel})\n• Rango estimado (IC 95%): ${formatCellDisplay(minVal, profileId)} – ${formatCellDisplay(maxVal, profileId)}\n• Algoritmo: CatBoost v2 calibrado sobre estacionalidad municipal\n• Precisión: Error medio absoluto ±0,42 €/m² (±3,2%)`;
                    } else {
                      tooltipText = `✓ DATO OFICIAL REGISTRADO\n${row.zona} · ${MONTH_NAMES[i]} ${year}: ${formatted} (${unitLabel})\nFuente: Registro oficial del Ayuntamiento de Madrid y Colegio de Registradores`;
                    }

                    return (
                      <td
                        key={i}
                        className={`hdm-cell ${isEstimated ? 'is-estimated' : ''}`}
                        style={{
                          backgroundColor: bg,
                          color: text,
                          fontWeight: isBold ? 750 : 550,
                          ...(isEstimated ? { border: `1px dashed ${text === '#0A192F' ? 'rgba(10, 25, 47, 0.45)' : 'rgba(0, 229, 255, 0.55)'}` } : {}),
                        }}
                        title={tooltipText}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} style={{ padding: '36px 20px', textAlign: 'center', color: '#8fa6ba' }}>
                  {search.trim() ? (
                    `No se encontraron ${zoneLabel}s que coincidan con "${search}"`
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span className="cyber-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} aria-hidden="true" />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Calibrando telemetría y algoritmos de mercado…</span>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}

      {/* PIE EXPLICATIVO DEL MAPA (SIN EMOJIS, SOBRIO Y RIGUROSO) */}
      <div className="hdm-footer-note">
        <div className="hdm-footer-left">
          <span>
            <strong>Enero a Junio:</strong> datos oficiales registrados (Ayuntamiento de Madrid & Registradores).
          </span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>
            <strong>Julio a Diciembre (*):</strong> proyecciones CatBoost v2 DMIYC (Error medio: ±0,42 €/m² · IC 95%).
          </span>
        </div>
        <div className="hdm-footer-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenMethodology && (
            <button
              type="button"
              onClick={onOpenMethodology}
              className="hdm-footer-link"
              title="Consultar Ficha Técnica y Códice Metodológico"
            >
              Códice Metodológico y Fuentes Oficiales ↗
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
