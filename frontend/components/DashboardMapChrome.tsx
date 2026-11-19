'use client';

import React, { ReactNode } from 'react';
import { Info } from 'lucide-react';

export function DashboardMapStatus({
  isMobile,
  isProjection,
  mobileStatus,
  observedMonth,
  observedYear,
  latestRealMonth,
  latestRealYear,
  firstProjectionMonth,
  onHelp,
  children,
}: {
  isMobile: boolean;
  isProjection: boolean;
  mobileStatus: string;
  observedMonth: string;
  observedYear: string;
  latestRealMonth: string;
  latestRealYear: string | number;
  firstProjectionMonth: string;
  onHelp: () => void;
  children: ReactNode;
}) {
  return (
    <div className="v2-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
      {isMobile ? <>
        <div className={`v2-data-status ${isProjection ? 'is-projection' : 'is-real'}`} role="status" aria-live="polite">
          <span className="v2-data-status-dot" aria-hidden="true" />
          <span><strong>{mobileStatus}</strong> · Último dato observado: {observedMonth} de {observedYear} · estimaciones desde {firstProjectionMonth}. Estimación estadística basada en datos oficiales hasta {observedMonth}; no es una tasación ni una garantía de precios futuros.</span>
        </div>
        <button
        className="v2-map-help-button"
        onClick={onHelp}
        style={{ background: 'rgba(1, 16, 36, 0.92)', border: '1.5px solid #00F0FF', borderRadius: '16px', padding: '5px 14px', fontSize: '11px', fontWeight: '600', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)' }}
        onMouseEnter={event => { event.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.16)'; event.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.35)'; }}
        onMouseLeave={event => { event.currentTarget.style.backgroundColor = 'rgba(1, 16, 36, 0.92)'; event.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)'; }}
      >
        <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#FFFFFF', color: '#011024', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>i</span>
        <span>¿Cómo usar el mapa?</span>
      </button>
        {children}
      </> : <>
        <div className="v2-map-period-slot">{children}</div>
        <button
          type="button"
          className="v2-map-help-icon"
          aria-label="Cómo leer el mapa"
          title="Cómo leer el mapa"
          onClick={onHelp}
        >
          ?
        </button>
      </>}
    </div>
  );
}

export function DashboardMapLegend({
  title,
  labels,
  dataCount,
  totalCount,
  observedThrough,
  estimatesFrom,
  profileId = 'alquiler',
}: {
  title: string;
  labels: string[];
  dataCount: number;
  totalCount: number;
  observedThrough: string;
  estimatesFrom?: string;
  profileId?: string;
}) {
  const countNote = `${dataCount} de ${totalCount} barrios tienen datos disponibles.`;
  const periodNote = `Datos observados hasta ${observedThrough.toLocaleLowerCase('es')}${estimatesFrom ? ` · Estimaciones desde ${estimatesFrom.toLocaleLowerCase('es')}` : ''}`;
  const noDataNote = 'Rayado: la fuente oficial no publica datos para este periodo; no se estiman.';
  return (
    <div className="v2-map-legend" data-profile={profileId} role="group" aria-label="Estado de datos y leyenda del mapa">
      <div className="v2-map-legend-desktop">
        <div className="v2-map-legend-status">
          <strong>{countNote}</strong>
          <small>{periodNote}</small>
        </div>
        <div className="v2-map-legend-visual">
          <div className="v2-map-legend-title">{title}</div>
          <div className="v2-map-legend-scale" aria-label={`Escala de menor a mayor valor · ${title}`}><span>Más bajo</span><div className="v2-map-legend-swatches" aria-hidden="true"><i className="tier-1" /><i className="tier-2" /><i className="tier-3" /><i className="tier-4" /><i className="tier-5" /></div><span>Más alto</span></div>
          <div className="v2-map-legend-labels">{labels.map(label => <span key={label}>{label}</span>)}<span className="no-data-label"><i aria-hidden="true" /> <span>Sin datos</span><details className="v2-map-legend-help"><summary aria-label="Qué significa el rayado" title="Qué significa el rayado"><Info size={14} aria-hidden="true" /></summary><span className="v2-map-legend-help-copy">{noDataNote}</span></details></span></div>
        </div>
      </div>
    </div>
  );
}
