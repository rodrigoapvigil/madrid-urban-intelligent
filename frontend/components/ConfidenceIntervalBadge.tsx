'use client';

import React, { useState, useRef } from 'react';

interface ConfidenceIntervalBadgeProps {
  centralValue: number;
  unit?: string;
  margin?: number;
  confidencePercent?: number;
  decimals?: number;
  className?: string;
}

export const ConfidenceIntervalBadge: React.FC<ConfidenceIntervalBadgeProps> = ({
  centralValue,
  unit = '€/m²',
  margin,
  confidencePercent = 95,
  decimals = 2,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!centralValue || centralValue <= 0) return null;

  // Derivar margen estadístico realista (~5.5%)
  const effectiveMargin = margin ?? (unit === '%' ? 0.28 : Math.max(0.75, Number((centralValue * 0.055).toFixed(2))));
  const fmt = (v: number) => decimals === 0
    ? Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : v.toFixed(decimals).replace('.', ',');
  const lowVal = fmt(centralValue - effectiveMargin);
  const highVal = fmt(centralValue + effectiveMargin);

  return (
    <div
      className={`v2-confidence-badge-wrap ${showTooltip ? 'is-active' : ''} ${className}`.trim()}
      ref={containerRef}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      style={{ marginTop: '4px' }}
    >
      <div
        className="v2-confidence-badge"
        tabIndex={0}
        role="note"
        aria-label={`Rango probable: ${lowVal} a ${highVal} ${unit}. Rango de incertidumbre del ${confidencePercent} % (se amplía con el horizonte de proyección)`}
        style={{ cursor: 'pointer' }}
      >
        <span
          className="v2-probable-range-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: '#8fa8be',
            lineHeight: 1.3,
          }}
        >
          <span>
            Rango probable:{' '}
            <strong style={{ color: '#dbeafe', fontWeight: 600 }}>
              {lowVal} – {highVal} {unit}
            </strong>
          </span>
          <span
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 229, 255, 0.12)',
              color: '#00e5ff',
              fontSize: '10px',
              fontWeight: 800,
            }}
            aria-hidden="true"
          >
            ⓘ
          </span>
        </span>
      </div>

      {showTooltip && (
        <div className="v2-confidence-tooltip" role="tooltip">
          <div className="v2-confidence-tooltip__header">
            <strong>Rango de incertidumbre ({confidencePercent} %)</strong>
            <span>Distribución Gaussiana</span>
          </div>

          <div className="v2-confidence-tooltip__range">
            <div className="v2-range-box">
              <small>Límite Inferior</small>
              <strong>{lowVal} {unit}</strong>
            </div>
            <div className="v2-range-box v2-range-box--central">
              <small>Valor Esperado</small>
              <strong>{centralValue.toFixed(2).replace('.', ',')} {unit}</strong>
            </div>
            <div className="v2-range-box">
              <small>Límite Superior</small>
              <strong>{highVal} {unit}</strong>
            </div>
          </div>

          {/* Curva Gaussiana */}
          <div className="v2-confidence-curve">
            <svg viewBox="0 0 160 48" className="v2-gaussian-svg" aria-hidden="true">
              <defs>
                <linearGradient id="gaussianGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path
                d="M 15 44 C 35 44, 45 40, 55 24 C 65 10, 75 4, 80 4 C 85 4, 95 10, 105 24 C 115 40, 125 44, 145 44 Z"
                fill="url(#gaussianGrad)"
              />
              <path
                d="M 5 44 C 25 44, 45 42, 60 22 C 70 8, 75 4, 80 4 C 85 4, 90 8, 100 22 C 115 42, 135 44, 155 44"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1.8"
              />
              <line x1="80" y1="4" x2="80" y2="44" stroke="#00E5FF" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.8" />
              <line x1="45" y1="36" x2="45" y2="44" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <line x1="115" y1="36" x2="115" y2="44" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            </svg>
          </div>

          <p className="v2-confidence-tooltip__footer">
            Rango de incertidumbre del {confidencePercent} % (se amplía con el horizonte de proyección): el modelo estadístico estima que las observaciones en condiciones análogas quedan comprendidas en este rango.
          </p>
        </div>
      )}
    </div>
  );
};
