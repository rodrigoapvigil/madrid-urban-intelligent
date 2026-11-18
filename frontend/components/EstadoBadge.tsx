import React from 'react';

export type EstadoBadgeStatus = 'real' | 'estimate';

export default function EstadoBadge({ status, className = '' }: { status: EstadoBadgeStatus; className?: string }) {
  const label = status === 'real' ? 'Dato real' : 'Estimación';
  return <span className={`v2-estado-badge v2-estado-badge--${status} ${className}`.trim()}>{label}</span>;
}
