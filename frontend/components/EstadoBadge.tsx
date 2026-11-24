import React from 'react';

export type EstadoBadgeStatus = 'real' | 'estimate';

export default function EstadoBadge({ status, className = '' }: { status: EstadoBadgeStatus; className?: string }) {
  const isEstimate = status === 'estimate';
  const label = isEstimate ? 'Proyección' : 'Dato oficial';
  const tooltip = isEstimate
    ? 'Proyección estimada del modelo DMIYC para meses aún no publicados oficialmente'
    : 'Dato oficial contrastado publicado por el Ayuntamiento de Madrid y Colegio de Registradores';

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
