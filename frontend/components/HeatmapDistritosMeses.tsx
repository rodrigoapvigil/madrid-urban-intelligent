'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { colorWithAlpha } from '../lib/colors';
import './HeatmapDistritosMeses.css';

interface HeatmapDistritosMesesProps {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  year: string;
  min: number;
  max: number;
  selectedMonth?: string;
  formatValue?: (value: number) => string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_ABBR = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const HeatmapDistritosMeses: React.FC<HeatmapDistritosMesesProps> = ({
  rows,
  profileId,
  year,
  min,
  max,
  selectedMonth,
  formatValue = (v: number) => v.toFixed(1),
}) => {
  const [search, setSearch] = useState('');

  const isSaleOrPurchase = profileId === 'venta' || profileId === 'compra';
  const baseColor = isSaleOrPurchase ? '#FF8B6A' : '#00DDF0';

  // Filtrado de distritos en tiempo real
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => String(r.zona || '').toLowerCase().includes(q));
  }, [rows, search]);

  // Unidad según perfil
  const unitLabel = profileId === 'inversion' ? '%' : '€/m²';
  const titleLabel = profileId === 'inversion'
    ? 'Evolución de Rentabilidad'
    : profileId === 'alquiler'
      ? 'Evolución del Alquiler (€/m²)'
      : profileId === 'compra'
        ? 'Evolución de Precio de Compra (€/m²)'
        : 'Evolución de Precio de Venta (€/m²)';

  const selectedMonthIdx = selectedMonth
    ? MONTH_NAMES.findIndex(m => m.toLowerCase() === selectedMonth.toLowerCase())
    : -1;

  return (
    <div className="hdm-card" data-dashboard-section="heatmap">
      {/* CABECERA DEL MAPA DE CALOR */}
      <div className="hdm-header">
        <div className="hdm-title-group">
          <h3 className="hdm-title">{titleLabel}</h3>
          <span className="hdm-subtitle">
            Seguimiento mensual por distrito en {year} · Flujo continuo de mercado
          </span>
        </div>

        <div className="hdm-controls">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="search"
              className="hdm-search-input"
              placeholder="Buscar distrito..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar distrito en el mapa de calor"
            />
          </div>

          <div className="hdm-scale-legend">
            <span>&lt; {min > 0 ? min.toFixed(0) : '15'} {unitLabel}</span>
            <div
              className="hdm-scale-bar"
              style={{
                background: `linear-gradient(90deg, ${colorWithAlpha(baseColor, 0.2)} 0%, ${baseColor} 100%)`
              }}
              aria-hidden="true"
            />
            <span>&gt; {max > 0 ? max.toFixed(0) : '28'} {unitLabel}</span>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE CALOR (TABLE LAYOUT FIXED) */}
      <div className="hdm-table-scroll">
        <table className="hdm-table">
          <thead>
            <tr>
              <th className="hdm-th hdm-th-district">Distrito</th>
              {MONTH_ABBR.map((abbr, i) => {
                const isSelected = selectedMonthIdx === i;
                const isEstimated = i >= 6; // Julio a Diciembre son estimaciones
                return (
                  <th
                    key={abbr}
                    className={`hdm-th hdm-th-month ${isSelected ? 'is-selected' : ''}`}
                    title={isEstimated ? `${MONTH_NAMES[i]}: Estimación predictiva DMIYC` : `${MONTH_NAMES[i]}: Registro oficial Ayto. Madrid`}
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

                    // Opacidad proporcional continua
                    const norm = (val - min) / (max - min || 1);
                    const opacity = Math.max(0.18, Math.min(1, 0.18 + norm * 0.82));
                    const bgColor = colorWithAlpha(baseColor, opacity);
                    const textColor = opacity > 0.65 ? '#011428' : '#ffffff';

                    const isEstimated = i >= 6;
                    const tooltipText = `${row.zona} · ${MONTH_NAMES[i]} ${year}: ${formatValue(val)} ${unitLabel} (${isEstimated ? 'Estimación predictiva DMIYC' : 'Registro oficial Ayto. Madrid'})`;

                    return (
                      <td
                        key={i}
                        className="hdm-cell"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                          fontWeight: opacity > 0.65 ? 750 : 500,
                        }}
                        title={tooltipText}
                      >
                        {formatValue(val)}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#8fa6ba' }}>
                  No se encontraron distritos que coincidan con &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PIE EXPLICATIVO DEL MAPA (OPCIÓN 1: SUTIL, FLUIDO, SIN LÍNEAS BRUSCAS) */}
      <div className="hdm-footer-note">
        <div className="hdm-footer-left">
          <span>ℹ️</span>
          <span>
            <strong>Enero a Junio:</strong> datos oficiales registrados (Ayto. Madrid & Registradores).
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>
            <strong>Julio a Diciembre (*):</strong> proyecciones predictivas continuas DMIYC.
          </span>
        </div>
        <span style={{ fontSize: '10.5px', color: '#688299' }}>
          Misma escala continua de precios · Pasa el ratón sobre cualquier celda para ver el detalle de trazabilidad.
        </span>
      </div>
    </div>
  );
};
