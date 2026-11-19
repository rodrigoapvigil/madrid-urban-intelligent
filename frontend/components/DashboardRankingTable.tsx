'use client';

import React, { ReactNode, useMemo } from 'react';
import SegmentedControl from './SegmentedControl';

type RankingRow = { name: string; value: number };
type OrderMode = 'affordable' | 'expensive' | 'increase' | 'demand-high' | 'demand-low' | 'yield-high' | 'yield-low';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const points = values.map((value, index) => {
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    return `${(index / Math.max(1, values.length - 1)) * 80},${22 - ((value - min) / range) * 20}`;
  });
  return <svg className="v2-ranking-sparkline" width="80" height="24" viewBox="0 0 80 24" role="img" aria-label="Tendencia de los últimos 12 meses">
    <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export default function DashboardRankingTable({
  profileId, level, rows, loading, loadingRows, highlightedZone, isMobile,
  metric, onMetricChange, formatName, formatNumber, formatEuro, monthlyRows,
  previousValues, districtForZone, order, onOrderChange, hasAnnualVariation,
}: {
  profileId: string;
  level: 'Distritos' | 'Barrios';
  rows: RankingRow[];
  loading: boolean;
  loadingRows: ReactNode;
  highlightedZone: string;
  isMobile: boolean;
  metric: 'total' | 'unit';
  onMetricChange: (value: 'total' | 'unit') => void;
  formatName: (name: string) => string;
  formatNumber: (value: number, digits: number) => string;
  formatEuro: (value: number, digits: number) => string;
  monthlyRows: Array<Record<string, any> & { zona: string }>;
  previousValues: Record<string, number>;
  districtForZone?: (zone: string) => string | undefined;
  order: string;
  onOrderChange: (value: OrderMode) => void;
  hasAnnualVariation: boolean;
}) {
  const isDemand = profileId === 'venta';
  const isInvestment = profileId === 'inversion';
  const isPriceProfile = !isDemand && !isInvestment;
  const accent =
    profileId === 'compra' ? '#FFC247' :
    profileId === 'venta' ? '#3DDC97' :
    profileId === 'inversion' ? '#E879F9' :
    '#00E5FF';
  const zoneLabel = level === 'Distritos' ? 'distritos' : 'barrios';
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const monthlyByZone = useMemo(() => new Map(monthlyRows.map(row => [normalize(String(row.zona || '')), row])), [monthlyRows]);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    if (order === 'increase') {
      const delta = (row: RankingRow) => {
        const previous = previousValues[normalize(row.name)];
        return previous > 0 ? (row.value - previous) / previous : Number.NEGATIVE_INFINITY;
      };
      return delta(b) - delta(a);
    }
    if (order === 'expensive' || order === 'demand-high' || order === 'yield-high') return b.value - a.value;
    return a.value - b.value;
  }), [rows, order, previousValues]);

  const title = isDemand
    ? `Top 10 ${zoneLabel} con ${order === 'demand-low' ? 'menos' : 'más'} demanda`
    : isInvestment
      ? `Top 10 ${zoneLabel} con ${order === 'yield-low' ? 'menor' : 'mayor'} rentabilidad`
      : order === 'expensive' ? `Top 10 ${zoneLabel} más caros` : order === 'increase' ? `Top 10 ${zoneLabel} con mayor subida anual` : `Top 10 ${zoneLabel} más asequibles`;
  const valueHeading = isDemand ? 'DEMANDA' : isInvestment ? 'RENTABILIDAD' : profileId === 'alquiler'
    ? (metric === 'total' ? 'ALQUILER €/MES' : 'ALQUILER €/M²')
    : (metric === 'total' ? 'PRECIO €' : 'PRECIO €/M²');
  const orderOptions: Array<{ value: OrderMode; label: string }> = isDemand
    ? [{ value: 'demand-high', label: 'Más demanda' }, { value: 'demand-low', label: 'Menos demanda' }]
    : isInvestment
      ? [{ value: 'yield-high', label: 'Mayor rentabilidad' }, { value: 'yield-low', label: 'Menor rentabilidad' }]
      : [{ value: 'affordable', label: 'Más asequibles' }, { value: 'expensive', label: 'Más caros' }, ...(hasAnnualVariation ? [{ value: 'increase' as const, label: 'Mayor subida' }] : [])];
  const orderValue = orderOptions.some(option => option.value === order) ? order as OrderMode : orderOptions[0].value;

  return (
    <div className="v2-rank-mini-card" style={{ background: '#011024', padding: '16px', borderRadius: '16px', border: '1px solid rgba(186, 204, 214, 0.16)', width: '100%' }}>
      <div className="v2-rank-head">
        <span>{title}</span>
      </div>
      <div className="v2-ranking-controls">
        {isPriceProfile && <SegmentedControl<'total' | 'unit'> label="Unidad mostrada" size="sm" value={metric} options={[{ value: 'total', label: profileId === 'alquiler' ? '€/mes' : '€' }, { value: 'unit', label: '€/m²' }] as const} onChange={onMetricChange} />}
        <select className="v2-ranking-order" aria-label="Orden del Top 10" value={orderValue} onChange={event => onOrderChange(event.target.value as OrderMode)}>
          {orderOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {loading && rows.length > 0 && <div className="v2-ranking-loading">Actualizando…</div>}
      <table className="v2-ranking-table v2-ranking-table-informative" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: accent }}><th style={{ paddingBottom: '8px', fontWeight: '600' }}>{level === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th><th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>{valueHeading}</th></tr></thead>
        <tbody>
          {sortedRows.length === 0 && loading ? loadingRows : sortedRows.slice(0, 10).map((item, index) => {
            const previous = previousValues[normalize(item.name)];
            const variation = Number.isFinite(previous) && previous > 0 ? ((item.value - previous) / previous) * 100 : null;
            const price = metric === 'unit' ? `${formatNumber(item.value, Number.isInteger(Number(item.value)) ? 0 : 1)} €/m²` : profileId === 'alquiler' ? `${formatEuro(item.value, 0)}/mes` : formatEuro(item.value, 0);
            const valueLabel = isDemand ? `${formatNumber(item.value, 0)} trans.` : isInvestment ? `${formatNumber(item.value * 100, 2)}%` : price;
            const monthly = monthlyByZone.get(normalize(item.name));
            const sparkline = monthly ? Array.from({ length: 12 }, (_, monthIndex) => Number(monthly[`m${monthIndex + 1}`])).filter(value => Number.isFinite(value) && value > 0) : [];
            const district = level === 'Barrios' ? districtForZone?.(item.name) : undefined;
            const selected = Boolean(highlightedZone && normalize(highlightedZone) === normalize(item.name));
            return <tr key={item.name || index} className={selected ? 'is-filtered' : undefined} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
              <td className="v2-ranking-zone" style={{ padding: '8px 0', color: '#FFFFFF', fontWeight: '600' }}>
                <span className="v2-ranking-position">{index + 1}.</span>
                <span className="v2-ranking-label"><span className="v2-ranking-name" title={formatName(item.name)}>{formatName(item.name)}</span>{district && <small className="v2-ranking-district">{formatName(district)}</small>}</span>
              </td>
              <td className="v2-ranking-value" style={{ padding: '8px 0', textAlign: 'right', color: accent, fontWeight: '700' }}>
                <div className="v2-ranking-value-line">{sparkline.length > 1 && <Sparkline values={sparkline} color={accent} />}<span>{valueLabel}</span></div>
                {variation !== null && <small className="v2-ranking-annual-change">{variation >= 0 ? '▲' : '▼'} {Math.abs(variation).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% año</small>}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
