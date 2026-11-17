'use client';

import React, { ReactNode } from 'react';
import SegmentedControl from './SegmentedControl';
import DashboardResourceState, { DashboardResourceStatus } from './DashboardResourceState';
import { profileAccentColor } from '../lib/map-color-scale';

type RankingRow = { name: string; value: number };

export default function DashboardRankingTable({
  profileId, level, rows, loading, loadingRows, valueMax, isMobile,
  metric, onMetricChange, formatName, formatNumber, formatEuro, status, onRetry,
}: {
  profileId: string;
  level: 'Distritos' | 'Barrios';
  rows: RankingRow[];
  loading: boolean;
  loadingRows: ReactNode;
  valueMax: number;
  isMobile: boolean;
  metric: 'total' | 'unit';
  onMetricChange: (value: 'total' | 'unit') => void;
  formatName: (name: string) => string;
  formatNumber: (value: number, digits: number) => string;
  formatEuro: (value: number, digits: number) => string;
  status: DashboardResourceStatus;
  onRetry: () => void;
}) {
  const zoneType = level === 'Distritos' ? 'distrito' : 'barrio';
  const title = profileId === 'venta'
    ? `Top 10 · ${level.toLocaleLowerCase('es-ES')} con más demanda`
    : profileId === 'inversion'
      ? `Top 10 · amortización por ${zoneType}`
      : `Top 10 · ${level.toLocaleLowerCase('es-ES')} ${profileId === 'compra' ? 'con menor precio' : 'más asequibles'}`;
  const isDemand = profileId === 'venta';
  const isInvestment = profileId === 'inversion';
  const profileAccent = profileAccentColor(profileId);
  const valueHeading = isDemand ? 'DEMANDA' : isInvestment ? 'AÑOS' : profileId === 'alquiler'
    ? (metric === 'total' ? 'ALQUILER €/MES' : 'ALQUILER €/M²')
    : (metric === 'total' ? 'PRECIO €' : 'PRECIO €/M²');

  return (
    <div className="v2-rank-mini-card" data-resource-state={status} style={{ background: '#011024', padding: '16px', borderRadius: '16px', border: '1px solid rgba(186, 204, 214, 0.16)', width: '100%' }}>
      <div className="v2-rank-head">
        <span>{title}</span>
        {!isDemand && !isInvestment && <div className="v2-ranking-head-actions"><SegmentedControl<'total' | 'unit'> label="Unidad mostrada" size="sm" value={metric} options={[{ value: 'total', label: profileId === 'alquiler' ? '€/mes' : '€' }, { value: 'unit', label: '€/m²' }] as const} onChange={onMetricChange} /></div>}
      </div>
      {status === 'loading' && rows.length > 0 && <DashboardResourceState status="loading" />}
      <table className={`v2-ranking-table${!isDemand && !isInvestment ? ' v2-affordability-ranking-table' : ''}`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: profileAccent }}><th style={{ paddingBottom: '8px', fontWeight: '600' }}>{level === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th><th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>{valueHeading}</th></tr></thead>
        <tbody>
          {status === 'loading' && rows.length === 0 ? loadingRows : status === 'error' || status === 'empty' ? <tr><td colSpan={2}><DashboardResourceState status={status} retry={onRetry} emptyText="No hay datos disponibles para esta selección." /></td></tr> : rows.map((item, index) => {
            const demand = isDemand;
            const years = item.value > 0 ? `${(1 / item.value).toFixed(1)} años` : '-';
            const price = metric === 'unit' ? `${formatNumber(item.value, 1)} €/m²` : profileId === 'alquiler' ? `${formatEuro(item.value, 2)}/mes` : formatEuro(item.value, 2);
            return <tr key={index} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
              <td className="v2-ranking-zone" style={{ padding: '8px 0', color: '#FFFFFF', fontWeight: '600' }}><span className="v2-ranking-position">{index + 1}.</span><span className="v2-ranking-name">{formatName(item.name)}</span></td>
              <td className="v2-ranking-value" style={{ padding: '8px 0', textAlign: 'right', color: profileAccent, fontWeight: '700' }}>
                {(demand || isInvestment) && <i style={{ width: `${Math.max(0, Math.min(100, (Number(item.value) || 0) / valueMax * 100))}%`, background: `${profileAccent}38` }} />}
                <span>{demand ? `${formatNumber(item.value, 0)} trans.` : isInvestment ? years : price}</span>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
