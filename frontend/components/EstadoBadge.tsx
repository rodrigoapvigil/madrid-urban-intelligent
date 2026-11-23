import React from 'react';

export type EstadoBadgeStatus = 'real' | 'estimate';

export default function EstadoBadge({ status, className = '' }: { status: EstadoBadgeStatus; className?: string }) {
  const isEstimate = status === 'estimate';
  const label = isEstimate ? 'Estimación' : 'Dato real';
  const tooltip = isEstimate
    ? 'Calculado con modelos predictivos sobre transacciones oficiales del Ayuntamiento de Madrid (Margen de confianza: ±5%)'
    : 'Dato observado en registros oficiales contrastados';

  return (
    <span
      className={`v2-estado-badge v2-estado-badge--${status} ${className}`.trim()}
      title={tooltip}
      style={{ cursor: 'help' }}
    >
      {label}
      {isEstimate && (
        <span
          style={{
            marginLeft: '4px',
            fontSize: '9px',
            opacity: 0.85,
            fontWeight: 800,
            display: 'inline-block',
          }}
          aria-hidden="true"
        >
          ⓘ
        </span>
      )}
    </span>
  );
}
