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
  const cellColor =
    profileId === 'compra' ? '#FFC247' :
    profileId === 'venta' ? '#3DDC97' :
    profileId === 'inversion' ? '#E879F9' :
    '#00E5FF';
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

  const unit = profileId === 'inversion' ? '%' : '€/m²';

  return (
    <div
      className="v2-heatmap-scroll"
      role="region"
      aria-label={`Tabla mensual de ${level.toLocaleLowerCase('es')} por mes`}
      tabIndex={0}
      onMouseLeave={() => { setHoveredRow(null); setHoveredMonth(null); }}
    >
      <table className="v2-heatmap-table">
        <caption className="v2-heatmap-sr-only">
          {profileId === 'inversion' ? 'Rentabilidad bruta' : profileId === 'alquiler' ? 'Precio medio de alquiler' : profileId === 'compra' ? 'Precio medio de compra' : 'Precio medio de venta'} por {level.toLocaleLowerCase('es')} de enero a diciembre de {year}, en {unit}.
        </caption>
        <thead>
          <tr className="v2-heatmap-period-groups">
            <th scope="col" rowSpan={2} className="v2-heatmap-zone-head">{level === 'Distritos' ? 'Distrito' : 'Barrio'}</th>
            {realMonthCount > 0 && <th scope="colgroup" className="v2-heatmap-real-group" colSpan={realMonthCount}>Dato real</th>}
            {estimateMonthCount > 0 && <th scope="colgroup" className="v2-heatmap-estimate-group" colSpan={estimateMonthCount}>Estimación</th>}
          </tr>
          <tr className="v2-heatmap-month-head">{MONTHS.map((month, monthIndex) => {
            const monthStatus = monthIndex < realMonthCount ? 'dato real' : 'estimación';
            return <th key={month} scope="col" aria-label={`${month} ${year}, ${monthStatus}`} title={`${month} ${year} · ${monthStatus}`} className={`${hoveredMonth === monthIndex ? 'is-hovered-column ' : ''}${selectedMonthIndex === monthIndex ? 'is-selected-month ' : ''}${monthIndex === realMonthCount && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : ''}`} onMouseEnter={() => setHoveredMonth(monthIndex)}>{month.slice(0, 3)}</th>;
          })}</tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={hoveredRow === rowIndex ? 'is-hovered-row' : undefined} onMouseEnter={() => setHoveredRow(rowIndex)}>
              <th scope="row" className="zona-name" title={row.zona}>{row.zona}</th>
              {MONTHS.map((_, monthIndex) => {
                const value = Number(row[`m${monthIndex + 1}`]);
                const opacity = value > 0 ? Math.max(.22, Math.min(1, .22 + ((value - min) / (max - min || 1)) * .78)) : 0;
                const monthStatus = monthIndex < realMonthCount ? 'dato real' : 'estimación';
                const cellText = value > 0 ? `${formatValue(value)} ${unit}; ${monthStatus}` : `sin valor disponible; ${monthStatus}`;
                const classes = [value > 0 ? '' : 'v2-heatmap-no-data', monthIndex === realMonthCount && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : '', selectedMonthIndex === monthIndex ? 'is-selected-month' : '', hoveredMonth === monthIndex ? 'is-hovered-column' : ''].filter(Boolean).join(' ');
                return <td key={monthIndex} className={classes || undefined} onMouseEnter={() => setHoveredMonth(monthIndex)} aria-label={`${row.zona}, ${MONTHS[monthIndex]} ${year}: ${cellText}`} title={value > 0 ? `${MONTHS[monthIndex]} ${year} · ${monthStatus}` : 'Sin valor disponible para este mes'} style={{ backgroundColor: value > 0 ? colorWithAlpha(cellColor, opacity) : 'transparent', color: value > 0 ? textColorFor(opacity) : '#ffffff' }}>{value > 0 ? formatValue(value) : 'n/d'}</td>;
              })}
            </tr>
          )) : <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-linea)' }}>No hay datos disponibles para el año {year}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
