'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './ToolControls.css';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTHS: Record<string, string> = { Enero: 'Ene', Febrero: 'Feb', Marzo: 'Mar', Abril: 'Abr', Mayo: 'May', Junio: 'Jun', Julio: 'Jul', Agosto: 'Ago', Septiembre: 'Sep', Octubre: 'Oct', Noviembre: 'Nov', Diciembre: 'Dic' };

export type PeriodSelectorProps = {
  years: string[];
  year: string;
  month: string;
  latestReal: { year: string; month: string };
  monthsByYear?: Record<string, string[]>;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  onLatest: () => void;
  compact?: boolean;
};

export default function PeriodSelector({ years, year, month, latestReal, monthsByYear = {}, onYearChange, onMonthChange, onLatest, compact = false }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const latestMonthIndex = MONTHS.indexOf(latestReal.month);
  const isReal = (candidate: string) => {
    if (Number(year) < Number(latestReal.year)) return monthsByYear[year] ? monthsByYear[year].includes(candidate) : true;
    return Number(year) === Number(latestReal.year) && MONTHS.indexOf(candidate) <= latestMonthIndex;
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selector = <div className="tool-period-selector" role="group" aria-label="Seleccionar periodo">
    <div className="tool-period-row">
      <span className="tool-period-label">Año</span>
      <div className="tool-period-years" role="group" aria-label="Año">
        {years.map(option => <button type="button" key={option} className={option === year ? 'is-active' : ''} aria-pressed={option === year} onClick={() => onYearChange(option)}>{option}</button>)}
      </div>
      <button type="button" className="tool-period-latest" onClick={onLatest}>Último dato real</button>
      <span className="tool-period-key"><i className="is-real" />Dato real <i className="is-estimate" />Estimación</span>
    </div>
    <div className="tool-period-row tool-period-month-row">
      <span className="tool-period-label">Mes</span>
      <div className="tool-period-months" role="group" aria-label="Mes">
        {MONTHS.map(candidate => <button
          type="button"
          key={candidate}
          className={`${candidate === month ? 'is-active' : ''} ${isReal(candidate) ? 'is-real' : 'is-estimate'}`}
          aria-pressed={candidate === month}
          aria-label={`${candidate} ${year} · ${isReal(candidate) ? 'dato real' : 'estimación'}`}
          onClick={() => onMonthChange(candidate)}
        >{SHORT_MONTHS[candidate]}</button>)}
      </div>
    </div>
  </div>;

  return <div ref={rootRef} className={`tool-period ${compact ? 'is-compact' : ''}`}>
    {compact ? <>
      <button type="button" className="tool-period-chip" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {SHORT_MONTHS[month] || month.slice(0, 3)} {year}<ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && <div className="tool-period-popover">{selector}</div>}
    </> : selector}
  </div>;
}
