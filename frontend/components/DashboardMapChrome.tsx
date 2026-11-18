'use client';

import React, { ReactNode } from 'react';

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
  isMobile,
  title,
  labels,
  dataCount,
  totalCount,
  dataSource,
  observedThrough,
  estimatesFrom,
}: {
  isMobile: boolean;
  title: string;
  labels: string[];
  dataCount: number;
  totalCount: number;
  dataSource: string;
  observedThrough: string;
  estimatesFrom: string;
}) {
  const note = `Rayado: sin datos publicados en la fuente oficial (${dataSource}). No los estimamos.`;
  const countNote = `${dataCount} de ${totalCount} barrios tienen dato en este periodo.`;
  const periodNote = `Corte general observado: ${observedThrough}. Las estimaciones comienzan en ${estimatesFrom}.`;
  return (
    <div className="v2-map-legend" aria-label="Leyenda del mapa">
      {isMobile ? (
        <>
          <div className="v2-map-legend-title">{title}</div>
          <div className="v2-map-legend-scale" aria-label="Tramos de la escala de color"><div className="v2-map-legend-swatches" aria-hidden="true"><i className="tier-1" /><i className="tier-2" /><i className="tier-3" /><i className="tier-4" /><i className="tier-5" /></div></div>
          <div className="v2-map-legend-labels">{labels.map(label => <span key={label}>{label}</span>)}<span className="no-data-label"><i /> Sin datos</span></div>
          <small>Los tonos comparan las zonas del periodo seleccionado. {note}</small>
          <small>{countNote}</small>
          <small>{periodNote}</small>
        </>
      ) : (
        <div className="v2-map-legend-desktop">
          <div className="v2-map-legend-notes"><small>{note}</small><small>{countNote}</small><small>{periodNote}</small></div>
          <div className="v2-map-legend-visual">
            <div className="v2-map-legend-title">{title}</div>
            <div className="v2-map-legend-scale" aria-label="Escala de menor a mayor valor"><span>Más bajo</span><div className="v2-map-legend-swatches" aria-hidden="true"><i className="tier-1" /><i className="tier-2" /><i className="tier-3" /><i className="tier-4" /><i className="tier-5" /></div><span>Más alto</span></div>
            <div className="v2-map-legend-labels">{labels.map(label => <span key={label}>{label}</span>)}<span className="no-data-label"><i /> Sin datos</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
