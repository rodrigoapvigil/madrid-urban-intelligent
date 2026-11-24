'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import './HeatmapDistritosMeses.css';

interface HeatmapDistritosMesesProps {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  level?: string;
  year: string;
  min?: number;
  max?: number;
  selectedMonth?: string;
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
 * Escala de 5 bandas tonales de azul y cian:
 * 1. [0.00 - 0.20]: Azul noche profundo (precios/rentabilidad base)
 * 2. [0.20 - 0.45]: Azul cerúleo / cobalto
 * 3. [0.45 - 0.70]: Turquesa / cian oceánico
 * 4. [0.70 - 0.88]: Cian puro vibrante
 * 5. [0.88 - 1.00]: Cian diamante brillante resplandeciente (máximos)
 */
function getBlueHeatColor(norm: number): { bg: string; text: string; isBold: boolean } {
  const t = Math.max(0, Math.min(1, norm));

  if (t < 0.20) {
    const f = t / 0.20;
    const r = Math.round(4 + f * 4);
    const g = Math.round(28 + f * 24);
    const b = Math.round(56 + f * 42);
    return { bg: `rgb(${r}, ${g}, ${b})`, text: '#c2d8ed', isBold: false };
  } else if (t < 0.45) {
    const f = (t - 0.20) / 0.25;
    const r = Math.round(8 - f * 8);
    const g = Math.round(52 + f * 43);
    const b = Math.round(98 + f * 57);
    return { bg: `rgb(${r}, ${g}, ${b})`, text: '#ffffff', isBold: false };
  } else if (t < 0.70) {
    const f = (t - 0.45) / 0.25;
    const g = Math.round(95 + f * 65);
    const b = Math.round(155 + f * 50);
    return { bg: `rgb(0, ${g}, ${b})`, text: '#ffffff', isBold: true };
  } else if (t < 0.88) {
    const f = (t - 0.70) / 0.18;
    const g = Math.round(160 + f * 65);
    const b = Math.round(205 + f * 37);
    return { bg: `rgb(0, ${g}, ${b})`, text: '#01162d', isBold: true };
  } else {
    const f = (t - 0.88) / 0.12;
    const r = Math.round(f * 130);
    const g = Math.round(225 + f * 21);
    return { bg: `rgb(${r}, ${g}, 255)`, text: '#011024', isBold: true };
  }
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
}) => {
  const [search, setSearch] = useState('');

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
      {/* CABECERA SUPERIOR: TÍTULO Y LEYENDA MULTI-TONAL AZUL */}
      <div className="hdm-header">
        <div className="hdm-title-group">
          <h3 className="hdm-title">{titleLabel}</h3>
          <span className="hdm-subtitle">
            Seguimiento mensual por {zoneLabel} en {year} · Flujo continuo de mercado
          </span>
        </div>

        <div className="hdm-controls">
          <div className="hdm-scale-legend">
            <span>&lt; {effectiveMin.toLocaleString('es-ES', { maximumFractionDigits: 0 })} {unitLabel}</span>
            <div
              className="hdm-scale-bar"
              style={{
                background: 'linear-gradient(90deg, #041c38 0%, #083462 20%, #005f9b 45%, #00a0cd 70%, #00e1f2 88%, #82f6ff 100%)'
              }}
              aria-hidden="true"
            />
            <span>&gt; {effectiveMax.toLocaleString('es-ES', { maximumFractionDigits: 0 })} {unitLabel}</span>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE CALOR (+52PX ALTURA, BUSCADOR EN TH DISTRITO) */}
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
                const isEstimated = i >= 6; // Julio a Diciembre son estimaciones
                return (
                  <th
                    key={abbr}
                    className={`hdm-th hdm-th-month ${isSelected ? 'is-selected' : ''}`}
                    title={
                      isEstimated
                        ? `${MONTH_NAMES[i]}: Estimación predictiva DMIYC`
                        : `${MONTH_NAMES[i]}: Registro oficial Ayto. Madrid`
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
                    const { bg, text, isBold } = getBlueHeatColor(norm);

                    const isEstimated = i >= 6;
                    const formatted = formatCellDisplay(val, profileId);
                    const tooltipText = `${row.zona} · ${MONTH_NAMES[i]} ${year}: ${formatted} (${isEstimated ? 'Estimación predictiva DMIYC' : 'Registro oficial Ayto. Madrid'})`;

                    return (
                      <td
                        key={i}
                        className="hdm-cell"
                        style={{
                          backgroundColor: bg,
                          color: text,
                          fontWeight: isBold ? 750 : 550,
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
                <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#8fa6ba' }}>
                  No se encontraron {zoneLabel}s que coincidan con &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PIE EXPLICATIVO DEL MAPA (SIN EMOJIS, SOBRIO Y RIGUROSO) */}
      <div className="hdm-footer-note">
        <div className="hdm-footer-left">
          <span>
            <strong>Enero a Julio:</strong> datos oficiales registrados (Ayuntamiento de Madrid & Registradores).
          </span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>
            <strong>Agosto a Diciembre (*):</strong> proyecciones predictivas continuas DMIYC.
          </span>
        </div>
        <span className="hdm-footer-sub">
          Misma escala continua de precios · Pasa el ratón sobre cualquier celda para ver el detalle de trazabilidad.
        </span>
      </div>
    </div>
  );
};
