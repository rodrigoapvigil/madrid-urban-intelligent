'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

type Point = { mes: number; precio_m2: number; is_prediction?: boolean };
type Filters = { latest_period?: { year: number; month: string } };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FULL_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function LandingTrend() {
  const [operation, setOperation] = useState<'alquiler' | 'venta'>('alquiler');
  const [series, setSeries] = useState<Point[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    (async () => {
      try {
        const filterResponse = await apiFetch('/filters');
        const filters = await filterResponse.json() as Filters;
        const currentYear = filters.latest_period?.year ?? new Date().getFullYear();
        const response = await apiFetch(`/series?year=${currentYear}&op=${operation}`);
        const data = await response.json() as Point[];
        if (!active) return;
        const valid = Array.isArray(data) ? data.filter((item) => Number.isFinite(item.mes) && Number.isFinite(item.precio_m2) && item.precio_m2 > 0) : [];
        setYear(currentYear);
        setSeries(valid);
        setStatus(valid.length ? 'ready' : 'empty');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [operation, retry]);

  const chart = useMemo(() => {
    if (!series.length) return null;
    const values = series.map((point) => point.precio_m2);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.abs(max) * 0.04, 1);
    const low = Math.max(0, min - range * 0.28);
    const high = max + range * 0.28;
    const coords = series.map((point) => ({
      ...point,
      x: 48 + ((point.mes - 1) / 11) * 548,
      y: 208 - ((point.precio_m2 - low) / (high - low)) * 160,
    }));
    const makePath = (prediction: boolean) => {
      const points = coords.filter((point) => Boolean(point.is_prediction) === prediction);
      return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    };
    return { coords, min: low, max: high, realPath: makePath(false), predictionPath: makePath(true) };
  }, [series]);

  const unit = operation === 'alquiler' ? '€/m²/mes' : '€/m²';
  const formatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  const latest = series.reduce<Point | null>((result, point) => !result || point.mes > result.mes ? point : result, null);
  const monthDescription = latest ? `${FULL_MONTHS[latest.mes - 1]} ${year}` : '';
  const retryLoad = useCallback(() => setRetry((value) => value + 1), []);

  return (
    <div className="mi-trend" aria-labelledby="mi-trend-title">
      <div className="mi-trend__heading">
        <div><p className="mi-kicker mi-kicker--muted">Evolución mensual · Media de Madrid</p><h3 id="mi-trend-title">Precios por operación</h3></div>
        <label className="mi-trend__select-label">Operación
          <select value={operation} onChange={(event) => setOperation(event.target.value as 'alquiler' | 'venta')}>
            <option value="alquiler">Alquiler</option><option value="venta">Venta</option>
          </select>
        </label>
      </div>

      {status === 'loading' && <div className="mi-trend__message" role="status">Cargando la serie mensual…</div>}
      {status === 'error' && <div className="mi-trend__message" role="alert">No se pudo cargar la serie oficial. <button type="button" onClick={retryLoad}>Reintentar</button></div>}
      {status === 'empty' && <div className="mi-trend__message" role="status">No hay datos disponibles para esta operación y periodo.</div>}
      {chart && <>
        <div className="mi-trend__legend" aria-hidden="true"><span><i className="mi-dot mi-dot--blue"/>Dato real</span><span><i className="mi-dot mi-dot--forecast"/>Proyección</span></div>
        <svg className="mi-trend__chart" viewBox="0 0 620 260" role="img" aria-label={`Evolución mensual del precio medio de ${operation} en Madrid durante ${year}, expresada en ${unit}. El último dato es ${formatter.format(latest!.precio_m2)} ${unit} en ${monthDescription}.`}>
          {[0, 1, 2, 3].map((index) => {
            const y = 48 + index * 53;
            const value = chart.max - ((chart.max - chart.min) * index / 3);
            return <g key={index}><line x1="48" x2="596" y1={y} y2={y} className="mi-trend__gridline"/><text x="42" y={y + 4} textAnchor="end" className="mi-trend__y-label">{formatter.format(value)}</text></g>;
          })}
          <path d={chart.realPath} className="mi-trend__real-line"/>
          <path d={chart.predictionPath} className="mi-trend__prediction-line"/>
          {chart.coords.map((point) => <circle key={point.mes} cx={point.x} cy={point.y} r="4" className={point.is_prediction ? 'mi-trend__forecast-point' : 'mi-trend__real-point'}><title>{`${FULL_MONTHS[point.mes - 1]} ${year}: ${formatter.format(point.precio_m2)} ${unit} · ${point.is_prediction ? 'Proyección' : 'Dato real'}`}</title></circle>)}
          {MONTHS.map((month, index) => <text key={month} x={48 + (index / 11) * 548} y="239" textAnchor="middle" className="mi-trend__x-label">{month}</text>)}
        </svg>
        <div className="mi-trend__caption"><span>{latest ? `Último dato: ${monthDescription}` : `Periodo: ${year}`}</span><span>Unidad: {unit}</span></div>
        <details className="mi-trend__table-details"><summary>Consultar datos mensuales en tabla</summary>
          <div className="mi-trend__table-wrap"><table><caption>Serie mensual de {operation} en Madrid para {year}, en {unit}</caption><thead><tr><th scope="col">Mes</th><th scope="col">Valor</th><th scope="col">Tipo de dato</th></tr></thead><tbody>{series.map((point) => <tr key={point.mes}><th scope="row">{FULL_MONTHS[point.mes - 1]}</th><td>{formatter.format(point.precio_m2)} {unit}</td><td>{point.is_prediction ? 'Proyección' : 'Dato real'}</td></tr>)}</tbody></table></div>
        </details>
      </>}
    </div>
  );
}
