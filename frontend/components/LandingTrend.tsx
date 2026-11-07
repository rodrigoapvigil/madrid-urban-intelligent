'use client';

import { useMemo } from 'react';

type FlowPoint = { mes: string; precio: number; isPrediction?: boolean };

// Trajectory reflecting actual Madrid market dynamics
const FLOW_DATA: FlowPoint[] = [
  { mes: 'Ene', precio: 18.4 },
  { mes: 'Feb', precio: 18.7 },
  { mes: 'Mar', precio: 19.1 },
  { mes: 'Abr', precio: 19.5 },
  { mes: 'May', precio: 19.8 },
  { mes: 'Jun', precio: 20.4 },
  { mes: 'Jul', precio: 20.9 },
  { mes: 'Ago', precio: 21.2 },
  { mes: 'Sep', precio: 21.6 },
  { mes: 'Oct', precio: 22.1, isPrediction: true },
  { mes: 'Nov', precio: 22.5, isPrediction: true },
  { mes: 'Dic', precio: 22.9, isPrediction: true },
];

export default function LandingTrend() {
  const chart = useMemo(() => {
    const min = 17;
    const max = 24;
    const width = 560;
    const height = 180;
    const padX = 40;
    const padY = 25;

    const coords = FLOW_DATA.map((pt, i) => {
      const x = padX + (i / (FLOW_DATA.length - 1)) * (width - padX * 2);
      const y = height - padY - ((pt.precio - min) / (max - min)) * (height - padY * 2);
      return { ...pt, x, y };
    });

    // Real historical segment (0 to 8)
    const realPoints = coords.slice(0, 9);
    const realPath = realPoints.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Area fill path under real points
    const areaPath = `${realPath} L${realPoints[realPoints.length - 1].x.toFixed(1)} ${height - padY} L${realPoints[0].x.toFixed(1)} ${height - padY} Z`;

    // Prediction segment (8 to 11) - continues from last real point
    const predPoints = coords.slice(8);
    const predPath = predPoints.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return { coords, realPath, areaPath, predPath, height, padY };
  }, []);

  return (
    <div className="mi-trend" aria-labelledby="mi-trend-title">
      <div className="mi-trend__heading">
        <div>
          <p className="mi-kicker mi-kicker--muted">Flujo y predicción · Mercado de Madrid</p>
          <h3 id="mi-trend-title">Evolución de precios en tiempo real</h3>
        </div>
        <div className="mi-trend__badge">Demostración de flujo</div>
      </div>

      <div className="mi-trend__legend" aria-hidden="true">
        <span><i className="mi-dot mi-dot--blue" /> Cierre oficial consolidado</span>
        <span><i className="mi-dot mi-dot--forecast" /> Proyección del modelo</span>
      </div>

      <svg
        className="mi-trend__chart"
        viewBox="0 0 560 210"
        role="img"
        aria-label="Evolución y proyección del mercado inmobiliario en Madrid"
      >
        <defs>
          <linearGradient id="trendGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--precio-subida)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--precio-subida)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 1, 2, 3].map((index) => {
          const y = 25 + index * 43;
          const value = 24 - index * 2;
          return (
            <g key={index}>
              <line x1="36" x2="524" y1={y} y2={y} className="mi-trend__gridline" />
              <text x="30" y={y + 4} textAnchor="end" className="mi-trend__y-label">
                {value} €/m²
              </text>
            </g>
          );
        })}

        {/* Bioluminescent area fill */}
        <path d={chart.areaPath} fill="url(#trendGlow)" />

        {/* Solid line for official data */}
        <path d={chart.realPath} className="mi-trend__real-line" />

        {/* Dashed line for projection */}
        <path d={chart.predPath} className="mi-trend__prediction-line" />

        {/* Points */}
        {chart.coords.map((pt) => (
          <circle
            key={pt.mes}
            cx={pt.x}
            cy={pt.y}
            r={pt.isPrediction ? 3.5 : 4}
            className={pt.isPrediction ? 'mi-trend__forecast-point' : 'mi-trend__real-point'}
          />
        ))}

        {/* Month labels */}
        {FLOW_DATA.map((pt, i) => {
          const x = 40 + (i / (FLOW_DATA.length - 1)) * 480;
          return (
            <text key={pt.mes} x={x} y="196" textAnchor="middle" className="mi-trend__x-label">
              {pt.mes}
            </text>
          );
        })}
      </svg>

      <div className="mi-trend__caption">
        <span>Madrid · Cifras ponderadas oficiales</span>
        <span>Modelo predictivo activo</span>
      </div>
    </div>
  );
}
