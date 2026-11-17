'use client';

import React, { ReactNode } from 'react';
import DashboardHelpButton from './DashboardHelpButton';

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
      <div className={`v2-data-status ${isProjection ? 'is-projection' : 'is-real'}`} role="status" aria-live="polite">
        {isMobile ? (
          <span><strong>{mobileStatus}</strong> · Último dato observado: {observedMonth} de {observedYear} · estimaciones desde {firstProjectionMonth}. Estimación estadística basada en datos oficiales hasta {observedMonth}; no es una tasación ni una garantía de precios futuros.</span>
        ) : (
          <strong className="v2-map-data-chip">Dato real · hasta {latestRealMonth} de {latestRealYear}</strong>
        )}
      </div>
      {!isMobile && <span className="v2-map-data-note">Desde {firstProjectionMonth}: estimación estadística basada en datos oficiales. No es una tasación ni una garantía de precios futuros.</span>}
      <DashboardHelpButton className="v2-map-help-button" onClick={onHelp} label="¿Cómo usar el mapa?" />
      {children}
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
}: {
  isMobile: boolean;
  title: string;
  labels: string[];
  dataCount: number;
  totalCount: number;
  dataSource: string;
}) {
  const note = `Rayado: sin datos publicados en la fuente oficial (${dataSource}). No los estimamos.`;
  const countNote = `${dataCount} de ${totalCount} barrios tienen dato en este periodo.`;
  return (
    <div className="v2-map-legend" aria-label="Leyenda del mapa">
      {isMobile ? (
        <>
          <div className="v2-map-legend-title">{title}</div>
          <div className="v2-map-legend-scale" aria-label="Tramos de la escala de color"><div className="v2-map-legend-swatches" aria-hidden="true"><i className="tier-1" /><i className="tier-2" /><i className="tier-3" /><i className="tier-4" /><i className="tier-5" /></div></div>
          <div className="v2-map-legend-labels">{labels.map(label => <span key={label}>{label}</span>)}<span className="no-data-label"><i /> Sin datos</span></div>
          <small>Los tonos comparan las zonas del periodo seleccionado. {note}</small>
          <small>{countNote}</small>
        </>
      ) : (
        <div className="v2-map-legend-desktop">
          <div className="v2-map-legend-notes"><small>{note}</small><small>{countNote}</small></div>
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
