'use client';

import React from 'react';
import { colorWithAlpha } from '../lib/colors';
import DashboardResourceState, { DashboardResourceStatus } from './DashboardResourceState';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DashboardHeatmapTable({
  rows,
  profileId,
  level,
  year,
  min,
  max,
  visibleCount,
  onShowMore,
  formatValue,
  status,
  onRetry,
}: {
  rows: Array<Record<string, any> & { zona: string }>;
  profileId: string;
  level: string;
  year: string;
  min: number;
  max: number;
  visibleCount: number;
  onShowMore: () => void;
  formatValue: (value: number) => string;
  status: DashboardResourceStatus;
  onRetry: () => void;
}) {
  const cellColor = profileId === 'venta' || profileId === 'compra' ? '#FF8B6A' : '#00DDF0';
  return (
    <div className="v2-heatmap-scroll" data-resource-state={status}>
      <table className="v2-heatmap-table">
        <thead><tr><th>{level === 'Distritos' ? 'Distrito' : 'Barrio'}</th>{MONTHS.map(month => <th key={month}>{month.slice(0, 3)}</th>)}</tr></thead>
        <tbody>
          {(status === 'ready' || (status === 'loading' && rows.length > 0)) ? rows.map((row, idx) => (
            <tr key={idx} className={idx >= visibleCount ? 'v2-heatmap-extra-row' : undefined}>
              <td className="zona-name">{row.zona}</td>
              {MONTHS.map((_, monthIndex) => {
                const value = Number(row[`m${monthIndex + 1}`]);
                const opacity = value > 0 ? 0.22 + ((value - min) / (max - min || 1)) * 0.78 : 0;
                return <td key={monthIndex} className={value > 0 ? undefined : 'v2-heatmap-no-data'} title={value > 0 ? undefined : 'Sin datos oficiales del Ayuntamiento'} style={{ backgroundColor: value > 0 ? colorWithAlpha(cellColor, opacity) : 'transparent', color: opacity > 0.65 ? 'var(--blanco-humo)' : 'var(--azul-noche)' }}>{value > 0 ? formatValue(value) : 'n/d'}</td>;
              })}
            </tr>
          )) : <tr><td colSpan={13}><DashboardResourceState status={status} retry={onRetry} emptyText={`No hay datos disponibles para el año ${year}.`} /></td></tr>}
        </tbody>
      </table>
      {status === 'loading' && rows.length > 0 && <div className="v2-heatmap-loading-overlay"><DashboardResourceState status="loading" /></div>}
      {rows.length > visibleCount && <button className="v2-heatmap-more" type="button" onClick={onShowMore}>Mostrar 15 más</button>}
    </div>
  );
}
