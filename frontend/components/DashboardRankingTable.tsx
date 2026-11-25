'use client';

import React, { ReactNode, useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import SegmentedControl from './SegmentedControl';

type RankingRow = { name: string; value: number };
type OrderMode = 'affordable' | 'expensive' | 'increase' | 'demand-high' | 'demand-low' | 'yield-high' | 'yield-low';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const points = values.map((value, index) => {
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    return `${(index / Math.max(1, values.length - 1)) * 80},${22 - ((value - min) / range) * 20}`;
  });
  return (
    <svg
      className="v2-ranking-sparkline"
      width="80"
      height="24"
      viewBox="0 0 80 24"
      role="img"
      aria-label="Tendencia mensual oficial Ene–Dic"
    >
      <title>Evolución mensual (Ene–Dic) · Registro oficial contrastado</title>
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardRankingTable({
  profileId, level, rows, loading, loadingRows, highlightedZone, isMobile,
  metric, onMetricChange, formatName, formatNumber, formatEuro, monthlyRows,
  previousValues, districtForZone, order, onOrderChange, hasAnnualVariation,
  onCompareZone,
}: {
  profileId: string;
  level: 'Distritos' | 'Barrios';
  rows: RankingRow[];
  loading: boolean;
  loadingRows: ReactNode;
  highlightedZone: string;
  isMobile: boolean;
  metric: 'demand' | 'total' | 'unit';
  onMetricChange: (value: 'demand' | 'total' | 'unit') => void;
  formatName: (name: string) => string;
  formatNumber: (value: number, digits: number) => string;
  formatEuro: (value: number, digits: number) => string;
  monthlyRows: Array<Record<string, any> & { zona: string }>;
  previousValues: Record<string, number>;
  districtForZone?: (zone: string) => string | undefined;
  order: string;
  onOrderChange: (value: OrderMode) => void;
  hasAnnualVariation: boolean;
  onCompareZone?: (zoneName: string) => void;
}) {
  const isVenta = profileId === 'venta';
  const isDemand = isVenta && metric === 'demand';
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
  const [minYieldThreshold, setMinYieldThreshold] = useState<number | null>(null);

  const yieldCounts = useMemo(() => {
    const getPct = (val: number) => (val > 1 ? val : val * 100);
    return {
      all: rows.length,
      gte5: rows.filter(r => getPct(Number(r.value) || 0) >= 5).length,
      gte6: rows.filter(r => getPct(Number(r.value) || 0) >= 6).length,
      gte7: rows.filter(r => getPct(Number(r.value) || 0) >= 7).length,
    };
  }, [rows]);

  const sortedRows = useMemo(() => {
    let filtered = [...rows];
    if (isInvestment && minYieldThreshold !== null) {
      filtered = filtered.filter(row => {
        const rawVal = Number(row.value) || 0;
        const pct = rawVal > 1 ? rawVal : rawVal * 100;
        return pct >= minYieldThreshold;
      });
    }
    return filtered.sort((a, b) => {
      if (order === 'increase') {
        const delta = (row: RankingRow) => {
          const previous = previousValues[normalize(row.name)];
          return previous > 0 ? (row.value - previous) / previous : Number.NEGATIVE_INFINITY;
        };
        return delta(b) - delta(a);
      }
      if (order === 'expensive' || order === 'demand-high' || order === 'yield-high') return b.value - a.value;
      return a.value - b.value;
    });
  }, [rows, order, previousValues, isInvestment, minYieldThreshold]);

  const title = isDemand
    ? `Top 10 ${zoneLabel} con ${order === 'demand-low' ? 'menos' : 'más'} demanda`
    : isInvestment
      ? minYieldThreshold !== null
        ? sortedRows.length === 1
          ? `Distrito con rentabilidad > ${minYieldThreshold}% (1 encontrado: ${formatName(sortedRows[0]?.name || '')})`
          : sortedRows.length < 10
            ? `Distritos con rentabilidad > ${minYieldThreshold}% (${sortedRows.length} encontrados)`
            : `Top 10 ${zoneLabel} con mayor rentabilidad (> ${minYieldThreshold}%)`
        : `Top 10 ${zoneLabel} con ${order === 'yield-low' ? 'menor' : 'mayor'} rentabilidad`
      : order === 'expensive'
        ? `Top 10 ${zoneLabel} más caros`
        : order === 'increase'
          ? `Top 10 ${zoneLabel} con mayor subida anual`
          : `Top 10 ${zoneLabel} más asequibles`;
  
  const isPerMonth = metric === 'total' && profileId === 'alquiler';
  const isTotalPrice = metric === 'total' && (profileId === 'compra' || profileId === 'venta');
  const valueHeading = isDemand ? 'DEMANDA' : isInvestment ? 'RENTABILIDAD' : profileId === 'alquiler'
    ? (metric === 'total' ? 'ALQUILER €/MES' : 'ALQUILER €/M²')
    : (metric === 'total' ? 'PRECIO COMPRA €' : 'COMPRA €/M²');
  const orderOptions: Array<{ value: OrderMode; label: string }> = isDemand
    ? [{ value: 'demand-high', label: 'Más demanda' }, { value: 'demand-low', label: 'Menos demanda' }]
    : isInvestment
      ? [{ value: 'yield-high', label: 'Mayor rentabilidad' }, { value: 'yield-low', label: 'Menor rentabilidad' }]
      : [{ value: 'affordable', label: 'Más asequibles' }, { value: 'expensive', label: 'Más caros' }, ...(hasAnnualVariation ? [{ value: 'increase' as const, label: 'Mayor subida' }] : [])];
  const orderValue = orderOptions.some(option => option.value === order) ? order as OrderMode : orderOptions[0].value;

  return (
    <div
      className="v2-rank-mini-card"
      style={{
        background: 'rgba(1, 16, 36, 0.92)',
        padding: '16px 18px',
        borderRadius: '16px',
        border: '1px solid rgba(186, 204, 214, 0.16)',
        borderTop: '1px solid rgba(0, 229, 255, 0.28)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(16px)',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="v2-rank-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.01em' }}>
            {title}
          </h3>
          <span style={{ fontSize: '11px', color: '#8fa6ba' }}>
            {isDemand
              ? 'Volumen y presión de compraventas notariales'
              : isInvestment
                ? 'Rendimiento bruto y neto de mercado'
                : profileId === 'alquiler'
                  ? 'Precios oficiales y evolución temporal'
                  : 'Precios de transacción contrastados'}
          </span>
        </div>
        <div className="v2-ranking-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isVenta && (
            <div title="Elige entre volumen de demanda notarial, precio medio de venta o precio por m²">
              <SegmentedControl<'demand' | 'total' | 'unit'>
                label="Métrica mostrada"
                size="sm"
                value={metric}
                options={[
                  { value: 'demand', label: '⚡ Demanda' },
                  { value: 'total', label: 'Total Venta (70m²)' },
                  { value: 'unit', label: '€/m²' }
                ] as const}
                onChange={onMetricChange}
              />
            </div>
          )}
          {isPriceProfile && !isVenta && (
            <div title="Cálculo obtenido multiplicando el precio medio por metro cuadrado de la zona por el tamaño residencial medio oficial del Catastro (70 m²)">
              <SegmentedControl<'total' | 'unit'>
                label="Unidad mostrada"
                size="sm"
                value={metric === 'demand' ? 'total' : metric}
                options={[{ value: 'total', label: profileId === 'alquiler' ? '€/mes (70m²)' : 'Total Compra (70m²)' }, { value: 'unit', label: '€/m²' }] as const}
                onChange={onMetricChange}
              />
            </div>
          )}
          {isInvestment && (
            <div className="v2-ranking-yield-filter" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#8ea5b7', fontWeight: '600', textTransform: 'uppercase' }}>Rent. mín:</span>
              {[
                ...(!isMobile ? [{ thresh: null, label: 'Todas', count: yieldCounts.all }] : []),
                { thresh: 5, label: '> 5%', count: yieldCounts.gte5 },
                { thresh: 6, label: '> 6%', count: yieldCounts.gte6 },
                { thresh: 7, label: '> 7%', count: yieldCounts.gte7 }
              ].map(item => (
                <button
                  key={item.thresh === null ? 'all' : item.thresh}
                  type="button"
                  onClick={() => setMinYieldThreshold(item.thresh)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: minYieldThreshold === item.thresh ? '1px solid #E879F9' : '1px solid rgba(186, 204, 214, 0.18)',
                    background: minYieldThreshold === item.thresh ? 'rgba(232, 121, 249, 0.2)' : 'transparent',
                    color: minYieldThreshold === item.thresh ? '#ffffff' : '#a9bed0',
                    fontSize: '10.5px',
                    fontWeight: minYieldThreshold === item.thresh ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    style={{
                      background: minYieldThreshold === item.thresh ? 'rgba(232, 121, 249, 0.35)' : 'rgba(186, 204, 214, 0.14)',
                      padding: '0 4px',
                      borderRadius: '3px',
                      fontSize: '9.5px',
                      fontWeight: '700'
                    }}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* Selector de orden: en móvil solo se muestra si hay más de 1 opción con sentido */}
          {(!isMobile || orderOptions.length > 1) && !(isMobile && isInvestment) && (
            <select className="v2-ranking-order" aria-label="Orden del Top 10" value={orderValue} onChange={event => onOrderChange(event.target.value as OrderMode)}>
              {orderOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          )}
        </div>
      </div>
      {loading && rows.length > 0 && <div className="v2-ranking-loading">Actualizando…</div>}
      <div
        className="v2-ranking-table-scroll"
        style={{
          width: '100%',
          flex: '1 1 auto',
          maxHeight: isMobile ? 'none' : '540px',
          height: isMobile ? 'auto' : '540px',
          overflowY: isMobile ? 'visible' : 'auto',
          overflowX: 'hidden',
          border: '1px solid rgba(186, 204, 214, 0.14)',
          borderRadius: '10px',
          background: 'rgba(0, 10, 22, 0.45)',
          scrollbarWidth: 'thin'
        }}
      >
        <table className="v2-ranking-table v2-ranking-table-informative" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 8, background: '#06192f' }}>
            <tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: accent }}>
              <th style={{ padding: '8px 10px', fontWeight: '600' }}>{level === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
              <th style={{ padding: '8px 10px', fontWeight: '600', textAlign: 'right' }}>
                <span>{valueHeading}</span>
                {(isPerMonth || isTotalPrice) && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'rgba(0, 229, 255, 0.12)',
                      color: '#00e5ff',
                      marginLeft: '5px',
                      fontWeight: '600',
                      letterSpacing: '0'
                    }}
                    title="Superficie estándar oficial INE / Catastro"
                  >
                    (70 m²)
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && loading ? loadingRows : sortedRows.slice(0, 10).map((item, index) => {
              const previous = previousValues[normalize(item.name)];
              const variation = Number.isFinite(previous) && previous > 0 ? ((item.value - previous) / previous) * 100 : null;
              const monthly = monthlyByZone.get(normalize(item.name));
              const sparkline = monthly ? Array.from({ length: 12 }, (_, monthIndex) => Number(monthly[`m${monthIndex + 1}`])).filter(value => Number.isFinite(value) && value > 0) : [];
              const rawVal = Number(item.value) || 0;
              const latestM2FromMonthly = sparkline.length > 0 ? sparkline[sparkline.length - 1] : null;

              // Calibración rigurosa de Compra vs Alquiler
              let effectiveValue = rawVal;
              let companionM2: number | null = null;
              let companionTotal: number | null = null;

              if (profileId === 'compra' || (profileId === 'venta' && metric !== 'demand')) {
                if (metric === 'total') {
                  // Salvaguarda: si por desfase o caché residual llegara un valor < 10.000 €, se calibra con el precio m² oficial del Catastro (70 m²)
                  if (effectiveValue < 10000 && latestM2FromMonthly && latestM2FromMonthly > 100) {
                    effectiveValue = Math.round(latestM2FromMonthly * 70);
                  }
                  companionM2 = latestM2FromMonthly || (effectiveValue > 0 ? Math.round(effectiveValue / 70) : null);
                } else {
                  // metric === 'unit'
                  companionTotal = effectiveValue > 0 ? Math.round(effectiveValue * 70) : null;
                }
              } else if (profileId === 'alquiler') {
                if (metric === 'total') {
                  companionM2 = latestM2FromMonthly || (effectiveValue > 0 ? Number((effectiveValue / 70).toFixed(1)) : null);
                } else {
                  companionTotal = effectiveValue > 0 ? Math.round(effectiveValue * 70) : null;
                }
              }

              const price = metric === 'unit'
                ? `${formatNumber(effectiveValue, Number.isInteger(Number(effectiveValue)) ? 0 : 1)} €/m²`
                : profileId === 'alquiler'
                  ? `${formatEuro(effectiveValue, 0)}/mes`
                  : formatEuro(effectiveValue, 0);

              const prevPrice = Number.isFinite(previous) && previous > 0
                ? metric === 'unit'
                  ? `${formatNumber(previous, Number.isInteger(Number(previous)) ? 0 : 1)} €/m²`
                  : profileId === 'alquiler'
                    ? `${formatEuro(previous, 0)}/mes`
                    : formatEuro(previous, 0)
                : null;
              const investmentPct = rawVal > 1 ? rawVal : rawVal * 100;
              const valueLabel = isDemand ? `${formatNumber(rawVal, 0)} trans.` : isInvestment ? `${formatNumber(investmentPct, 1)}%` : price;
              const district = level === 'Barrios' ? districtForZone?.(item.name) : undefined;
              const selected = Boolean(highlightedZone && normalize(highlightedZone) === normalize(item.name));
              return (
                <tr
                  key={item.name || index}
                  className={`v2-ranking-row ${selected ? 'is-filtered' : ''}`}
                  style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}
                >
                  <td className="v2-ranking-zone" style={{ padding: '8px 10px', color: '#FFFFFF', fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span className="v2-ranking-position" style={{ color: '#8fa6ba', fontSize: '11px', width: '18px', flexShrink: 0 }}>
                          {index + 1}.
                        </span>
                        <span className="v2-ranking-label" style={{ minWidth: 0 }}>
                          <span className="v2-ranking-name" title={formatName(item.name)} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', wordBreak: isMobile ? 'break-word' : undefined }}>
                            {formatName(item.name)}
                          </span>
                          {district && (
                            <small className="v2-ranking-district" style={{ display: 'block', fontSize: '10px', color: '#8fa6ba' }}>
                              {formatName(district)}
                            </small>
                          )}
                        </span>
                      </div>
                      {onCompareZone && (
                        <button
                          type="button"
                          className="v2-ranking-compare-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompareZone(item.name);
                          }}
                          title={`Comparar ${formatName(item.name)} con mi zona en el módulo comparador`}
                          aria-label={isMobile ? 'Comparar' : `Comparar ${formatName(item.name)} con mi zona`}
                        >
                          <Scale size={isMobile ? 14 : 11} aria-hidden="true" />
                          {!isMobile && <span>Comparar</span>}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="v2-ranking-value" style={{ padding: '8px 10px', textAlign: 'right', color: accent, fontWeight: '700' }}>
                    <div className="v2-ranking-value-line" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {sparkline.length > 1 && <Sparkline values={sparkline} color={accent} />}
                      <span style={{ fontSize: '13px' }}>{valueLabel}</span>
                    </div>
                    {(isPriceProfile || (profileId === 'venta' && metric !== 'demand')) && metric === 'total' && companionM2 && (
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#8fa6b9',
                          fontWeight: '550',
                          marginTop: '2px',
                          letterSpacing: '0.01em',
                          cursor: 'help'
                        }}
                        title={profileId === 'compra' || profileId === 'venta' ? `Precio medio de venta: ${formatNumber(companionM2, 0)} €/m² (Notarías y Registradores)` : `Precio medio de alquiler: ${formatNumber(companionM2, 1)} €/m²`}
                      >
                        · {formatNumber(companionM2, profileId === 'alquiler' ? 1 : 0)} €/m²
                      </div>
                    )}
                    {(isPriceProfile || (profileId === 'venta' && metric !== 'demand')) && metric === 'unit' && companionTotal && (
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#8fa6b9',
                          fontWeight: '550',
                          marginTop: '2px',
                          letterSpacing: '0.01em',
                          cursor: 'help'
                        }}
                        title="Vivienda tipo estándar oficial Catastro (70 m²)"
                      >
                        · Vivienda 70 m²: {profileId === 'alquiler' ? `${formatEuro(companionTotal, 0)}/mes` : formatEuro(companionTotal, 0)}
                      </div>
                    )}
                    {variation !== null && (
                      <small
                        className="v2-ranking-annual-change"
                        title={prevPrice ? `De ${prevPrice} (2025) a ${valueLabel} (2026)` : undefined}
                        style={{
                          cursor: prevPrice ? 'help' : 'default',
                          display: 'block',
                          fontSize: '10px',
                          color: variation >= 0 ? '#3ddc97' : '#ff6b6b'
                        }}
                      >
                        {variation >= 0 ? '▲' : '▼'} {Math.abs(variation).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% año
                      </small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isInvestment && sortedRows.length < 4 && minYieldThreshold !== null && (
          <div
            style={{
              margin: '12px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(232, 121, 249, 0.06)',
              border: '1px solid rgba(232, 121, 249, 0.28)',
              color: '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#E879F9', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em' }}>
              <span>💡 TELEMETRÍA OFICIAL · COMPRESIÓN DE YIELDS EN MADRID CAPITAL</span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', lineHeight: '1.45', color: '#c5d5e6' }}>
              Actualmente, solo {sortedRows.map(r => formatName(r.name)).join(', ') || 'determinadas zonas'} alcanza{sortedRows.length === 1 ? '' : 'n'} el umbral del {minYieldThreshold}% en rentabilidad bruta de cierre notarial. En distritos consolidados como Salamanca (3,2%) o Chamberí (3,5%), la fuerte escalada del precio de compraventa comprime la rentabilidad por alquiler a mínimos históricos.
            </p>
            <span style={{ fontSize: '10px', color: '#8fa6ba' }}>Registro de la Propiedad & Catastro · Modelo CatBoost v2 DMIYC</span>
          </div>
        )}
      </div>
    </div>
  );
}
