'use client';

import React, { useState } from 'react';
import { colorWithAlpha } from '../lib/colors';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DashboardHeatmapTable({
  rows, profileId, level, year, min, max, latestReal, selectedMonth, formatValue,
}: {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  level: string;
  year: string;
  min: number;
  max: number;
  latestReal: { year: string; month: string };
  selectedMonth: string;
  formatValue: (value: number) => string;
}) {
  const cellColor = profileId === 'venta' || profileId === 'compra' ? '#FF8B6A' : '#00DDF0';
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const selectedYear = Number(year);
  const latestYear = Number(latestReal.year);
  const latestMonthIndex = MONTHS.findIndex(month => month.toLocaleLowerCase('es') === latestReal.month.toLocaleLowerCase('es'));
  const realMonthCount = selectedYear < latestYear ? 12 : selectedYear > latestYear ? 0 : latestMonthIndex + 1;
  const estimateMonthCount = 12 - realMonthCount;
  const selectedMonthIndex = MONTHS.findIndex(month => month.toLocaleLowerCase('es') === selectedMonth.toLocaleLowerCase('es'));
  const textColorFor = (opacity: number) => {
    const base = [1 / 255, 16 / 255, 36 / 255];
    const channels = cellColor.slice(1).match(/.{2}/g)?.map(channel => parseInt(channel, 16) / 255) || [0, 0, 0];
    const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const baseLinear = base.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = linear.reduce((sum, channel, index) => sum + (channel * opacity + baseLinear[index] * (1 - opacity)) * [0.2126, 0.7152, 0.0722][index], 0);
    const darkContrast = (luminance + 0.05) / 0.05;
    const lightContrast = 1.05 / (luminance + 0.05);
    return darkContrast >= lightContrast ? '#031528' : '#ffffff';
  };

  return (
    <div className="v2-heatmap-scroll" onMouseLeave={() => { setHoveredRow(null); setHoveredMonth(null); }}>
      <table className="v2-heatmap-table">
        <thead>
          <tr className="v2-heatmap-period-groups">
            <th className="v2-heatmap-th-zone" rowSpan={2}>{level === 'Distritos' ? 'Distrito' : 'Barrio'}</th>
            {realMonthCount > 0 && (
              <th className="v2-heatmap-real-group" colSpan={realMonthCount}>
                Datos Reales <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }} aria-hidden="true">✓</span>
              </th>
            )}
            {estimateMonthCount > 0 && (
              <th
                className="v2-heatmap-estimate-group"
                colSpan={estimateMonthCount}
                title="Proyección matemática mediante Machine Learning basada en el histórico de transacciones del Ayuntamiento de Madrid"
                style={{ cursor: 'help' }}
              >
                Estimación <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }} aria-hidden="true">ⓘ</span>
              </th>
            )}
          </tr>
          <tr className="v2-heatmap-month-head">
            {MONTHS.map((month, monthIndex) => (
              <th
                key={month}
                className={`v2-heatmap-th-month ${hoveredMonth === monthIndex ? 'is-hovered-column ' : ''}${selectedMonthIndex === monthIndex ? 'is-selected-month ' : ''}${monthIndex === realMonthCount && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : ''}`}
                onMouseEnter={() => setHoveredMonth(monthIndex)}
              >
                {month.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={hoveredRow === rowIndex ? 'is-hovered-row' : undefined} onMouseEnter={() => setHoveredRow(rowIndex)}>
              <td className="zona-name">{row.zona}</td>
              {MONTHS.map((_, monthIndex) => {
                const value = Number(row[`m${monthIndex + 1}`]);
                const opacity = value > 0 ? Math.max(.22, Math.min(1, .22 + ((value - min) / (max - min || 1)) * .78)) : 0;
                const classes = [
                  'v2-heatmap-td-val',
                  value > 0 ? '' : 'v2-heatmap-no-data',
                  monthIndex === realMonthCount && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : '',
                  selectedMonthIndex === monthIndex ? 'is-selected-month' : '',
                  hoveredMonth === monthIndex ? 'is-hovered-column' : '',
                ].filter(Boolean).join(' ');
                return (
                  <td
                    key={monthIndex}
                    className={classes || undefined}
                    onMouseEnter={() => setHoveredMonth(monthIndex)}
                    title={value > 0 ? monthIndex >= realMonthCount ? 'Estimación proyectada' : 'Dato oficial' : 'Sin datos oficiales del Ayuntamiento'}
                    style={{ backgroundColor: value > 0 ? colorWithAlpha(cellColor, opacity) : 'transparent', color: value > 0 ? textColorFor(opacity) : '#ffffff' }}
                  >
                    {value > 0 ? formatValue(value) : 'n/d'}
                  </td>
                );
              })}
            </tr>
          )) : <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-linea)' }}>No hay datos disponibles para el año {year}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
