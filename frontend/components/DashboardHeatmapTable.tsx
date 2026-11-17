'use client';

import React from 'react';
import { colorTier, profileMapTierColors } from '../lib/map-color-scale';
import DashboardResourceState, { DashboardResourceStatus } from './DashboardResourceState';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DashboardHeatmapTable({
  rows,
  profileId,
  level,
  year,
  selectedMonth,
  latestReal,
  colorThresholds,
  visibleCount,
  onShowMore,
  selectedZone,
  formatValue,
  status,
  onRetry,
}: {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  level: string;
  year: string;
  selectedMonth: string;
  latestReal: { year: string | number; month: string };
  colorThresholds: number[];
  visibleCount: number;
  onShowMore: () => void;
  selectedZone?: string | null;
  formatValue: (value: number) => string;
  status: DashboardResourceStatus;
  onRetry: () => void;
}) {
  const tierColors = profileMapTierColors(profileId);
  const selectedMonthIndex = MONTHS.indexOf(selectedMonth);
  const latestYear = Number(latestReal.year);
  const selectedYear = Number(year);
  const latestMonthIndex = MONTHS.findIndex(month => month.toLocaleLowerCase('es') === latestReal.month.toLocaleLowerCase('es'));
  const realMonthCount = selectedYear < latestYear ? 12 : selectedYear > latestYear ? 0 : Math.max(0, latestMonthIndex + 1);
  const estimateMonthCount = 12 - realMonthCount;
  const firstEstimatedMonth = realMonthCount;
  const normalizeZone = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const readableTextColor = (hex: string) => {
    const channels = hex.replace('#', '').match(/.{2}/g)?.map(channel => parseInt(channel, 16) / 255) || [0, 0, 0];
    const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    return luminance > 0.28 ? '#03141c' : '#f2f7fb';
  };
  return (
    <div className="v2-heatmap-scroll" data-resource-state={status}>
      <table className="v2-heatmap-table">
        <thead>
          <tr className="v2-heatmap-period-groups">
            <th rowSpan={2}>{level === 'Distritos' ? 'Distrito' : 'Barrio'}</th>
            {realMonthCount > 0 && <th className="v2-heatmap-real-group" colSpan={realMonthCount}>Dato real</th>}
            {estimateMonthCount > 0 && <th className="v2-heatmap-estimate-group" colSpan={estimateMonthCount}>Estimación</th>}
          </tr>
          <tr className="v2-heatmap-month-head">{MONTHS.map((month, monthIndex) => {
            const isEstimated = monthIndex >= realMonthCount;
            const classes = [monthIndex === selectedMonthIndex ? 'v2-heatmap-selected-month' : '', isEstimated && monthIndex === firstEstimatedMonth && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : ''].filter(Boolean).join(' ');
            return <th key={month} className={classes || undefined} aria-current={monthIndex === selectedMonthIndex ? 'date' : undefined}>{month.slice(0, 3)}</th>;
          })}</tr>
        </thead>
        <tbody>
          {(status === 'ready' || (status === 'loading' && rows.length > 0)) ? rows.map((row, idx) => (
            <tr key={idx} className={`${idx >= visibleCount ? 'v2-heatmap-extra-row ' : ''}${selectedZone && normalizeZone(row.zona) === normalizeZone(selectedZone) ? 'v2-heatmap-zone-selected' : ''}`} aria-current={selectedZone && normalizeZone(row.zona) === normalizeZone(selectedZone) ? 'true' : undefined}>
              <td className="zona-name">{row.zona}</td>
              {MONTHS.map((_, monthIndex) => {
                const value = Number(row[`m${monthIndex + 1}`]);
                const tier = value > 0 ? colorTier(value, colorThresholds) : -1;
                const cellColor = value > 0 ? tierColors[tier] : 'transparent';
                const textColor = value > 0 ? readableTextColor(cellColor) : '#f2f7fb';
                const isEstimated = monthIndex >= realMonthCount;
                const classes = [value > 0 ? '' : 'v2-heatmap-no-data', isEstimated ? 'v2-heatmap-estimated-cell' : '', isEstimated && monthIndex === firstEstimatedMonth && realMonthCount > 0 ? 'v2-heatmap-estimated-start' : ''].filter(Boolean).join(' ');
                return <td key={monthIndex} className={classes || undefined} title={value > 0 ? monthIndex >= realMonthCount ? 'Estimación' : undefined : 'Sin datos oficiales del Ayuntamiento'} style={{ backgroundColor: cellColor, color: value > 0 ? textColor : '#f2f7fb' }}>{value > 0 ? formatValue(value) : 'n/d'}</td>;
              })}
            </tr>
          )) : <tr><td colSpan={13}><DashboardResourceState status={status} retry={onRetry} emptyText={`No hay datos disponibles para el año ${year}.`} /></td></tr>}
        </tbody>
      </table>
      {status === 'loading' && rows.length > 0 && <div className="v2-heatmap-loading-overlay"><DashboardResourceState status="loading" /></div>}
      {rows.length > visibleCount && <button className="v2-heatmap-more" type="button" onClick={onShowMore}>Ver todos ({rows.length})</button>}
    </div>
  );
}
