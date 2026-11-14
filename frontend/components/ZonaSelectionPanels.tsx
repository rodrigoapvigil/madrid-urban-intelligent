import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type DesktopCardPosition = {
  point: { x: number; y: number };
  bounds: { left: number; top: number; right: number; bottom: number };
};

type DesktopZonaPanelProps = ZonaPanelProps & {
  zoneType: 'DISTRITO' | 'BARRIO';
  position: DesktopCardPosition | null;
  pinned?: boolean;
  style?: React.CSSProperties;
};

export function FichaZonaDesktop({ zone, rank, primaryLabel, primaryValue, secondaryLabel, secondaryValue, delta, onClose, zoneType, position, pinned, style }: DesktopZonaPanelProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !position) return;
    const panelRect = panel.getBoundingClientRect();
    const { point, bounds } = position;
    const minX = bounds.left + 8;
    const minY = bounds.top + 8;
    let x = point.x + 14;
    let y = point.y + 14;
    if (x + panelRect.width > bounds.right - 8) x = point.x - panelRect.width - 14;
    if (y + panelRect.height > bounds.bottom - 8) y = point.y - panelRect.height - 14;
    x = Math.max(minX, Math.min(x, bounds.right - panelRect.width - 8));
    y = Math.max(minY, Math.min(y, bounds.bottom - panelRect.height - 8));
    panel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    panel.style.visibility = 'visible';
  }, [position, zone, rank, primaryValue, secondaryValue, delta]);

  if (!mounted || typeof document === 'undefined' || !position) return null;
  return createPortal(<aside ref={panelRef} className="zona-panel zona-panel-desktop" style={style} role="status" aria-live="polite">
    <div className="zona-panel-top"><div className="zona-panel-heading"><span className="zona-panel-kind">{zoneType}</span><strong>{zone}</strong>{rank && <span>{rank}</span>}</div>{pinned && <button type="button" className="zona-panel-close" aria-label="Quitar zona seleccionada" onClick={onClose}>×</button>}</div>
    <dl>
      <div><dt>{primaryLabel}</dt><dd>{primaryValue}</dd></div>
      <div><dt>{secondaryLabel}</dt><dd>{secondaryValue}</dd></div>
    </dl>
    {delta && <p>{delta}</p>}
  </aside>, document.body);
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
