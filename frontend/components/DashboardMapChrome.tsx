'use client';

import React, { ReactNode } from 'react';
import DashboardHelpButton from './DashboardHelpButton';

export function DashboardMapStatus({
  isMobile,
  isProjection,
  mobileStatus,
  observedMonth,
  observedYear,
  firstProjectionMonth,
  zoneControls,
  onHelp,
  children,
}: {
  isMobile: boolean;
  isProjection: boolean;
  mobileStatus: string;
  observedMonth: string;
  observedYear: string;
  firstProjectionMonth: string;
  zoneControls?: ReactNode;
  onHelp: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`v2-map-header${isMobile ? ' is-mobile' : ' is-desktop'}`}>
      {isMobile ? <>
        <div className="v2-map-heading-row"><h2>Precios por zona</h2><DashboardHelpButton className="v2-map-help-button" onClick={onHelp} label="Cómo leer el mapa" /></div>
        {zoneControls}
        <div className={`v2-data-status ${isProjection ? 'is-projection' : 'is-real'}`} role="status" aria-live="polite">
          <span><strong>{mobileStatus}</strong> · Último dato observado: {observedMonth} de {observedYear} · estimaciones desde {firstProjectionMonth}. Estimación estadística basada en datos oficiales hasta {observedMonth}; no es una tasación ni una garantía de precios futuros.</span>
        </div>
        {children}
      </> : <>
        <div className="v2-map-header-zone"><div className="v2-map-heading-row"><h2>Precios por zona</h2><DashboardHelpButton className="v2-map-help-button" onClick={onHelp} label="Cómo leer el mapa" /></div>{zoneControls}</div>
        <div className="v2-map-header-actions">
          {children}
        </div>
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
  projectionNote,
}: {
  isMobile: boolean;
  title: string;
  labels: string[];
  dataCount: number;
  totalCount: number;
  dataSource: string;
  projectionNote?: string;
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
          <div className="v2-map-legend-notes"><small>{note}</small><small>{countNote}</small>{projectionNote && <small>{projectionNote}</small>}</div>
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
