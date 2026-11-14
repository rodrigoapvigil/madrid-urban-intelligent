import React from 'react';
import './ZonaSelectionPanels.css';

type ZonaPanelProps = {
  zone: string;
  rank?: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  delta?: string | null;
  onClose?: () => void;
  children?: React.ReactNode;
};

export function FichaZonaDesktop({ zone, rank, primaryLabel, primaryValue, secondaryLabel, secondaryValue, delta, onClose }: ZonaPanelProps) {
  return <aside className="zona-panel zona-panel-desktop" role="status" aria-live="polite">
    <div className="zona-panel-top"><div className="zona-panel-heading"><strong>{zone}</strong>{rank && <span>{rank}</span>}</div>{zone !== 'Madrid · Media general' && <button type="button" className="zona-panel-close" aria-label="Quitar zona seleccionada" onClick={onClose}>×</button>}</div>
    <dl>
      <div><dt>{primaryLabel}</dt><dd>{primaryValue}</dd></div>
      <div><dt>{secondaryLabel}</dt><dd>{secondaryValue}</dd></div>
    </dl>
    {delta && <p>{delta}</p>}
  </aside>;
}

export function FichaZonaMovil({ zone, rank, primaryLabel, primaryValue, secondaryLabel, secondaryValue, delta, onClose, children }: ZonaPanelProps) {
  return <aside className="zona-panel zona-panel-movil" role="status" aria-live="polite">
    <button type="button" className="zona-panel-close" aria-label="Cerrar ficha de zona" onClick={onClose}>×</button>
    <div className="zona-panel-heading"><strong>{zone}</strong>{rank && <span>{rank}</span>}</div>
    <dl>
      <div><dt>{primaryLabel}</dt><dd>{primaryValue}</dd></div>
      <div><dt>{secondaryLabel}</dt><dd>{secondaryValue}</dd></div>
    </dl>
    {delta && <p>{delta}</p>}
    {children}
  </aside>;
}
