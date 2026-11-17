'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [viewYear, setViewYear] = useState(Number(year));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const minYear = Number(years[0] || 2023);
  const maxYear = Number(years[years.length - 1] || 2028);
  const monthIndex = Math.max(0, MONTHS.indexOf(month));
  const selectedIndex = (Number(year) - minYear) * 12 + monthIndex;
  const lastIndex = (maxYear - minYear + 1) * 12 - 1;
  const isLatest = year === latestReal.year && month === latestReal.month;

  const isRealMonth = (candidateYear: number, candidateMonth: string) => {
    if (candidateYear < Number(latestReal.year)) {
      const yearMonths = monthsByYear[String(candidateYear)];
      return yearMonths ? yearMonths.includes(candidateMonth) : true;
    }
    return candidateYear === Number(latestReal.year) && MONTHS.indexOf(candidateMonth) <= MONTHS.indexOf(latestReal.month);
  };

  const isReal = isRealMonth(Number(year), month);
  const dateLabel = `${month} ${year}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const setPeriod = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(lastIndex, index));
    const nextYear = String(minYear + Math.floor(boundedIndex / 12));
    const nextMonth = MONTHS[boundedIndex % 12];
    if (nextYear !== year) onYearChange(nextYear);
    onMonthChange(nextMonth);
  };

  const setViewedYear = (nextYear: number) => setViewYear(Math.max(minYear, Math.min(maxYear, nextYear)));
  const selectMonth = (selectedMonth: string) => {
    if (String(viewYear) !== year) onYearChange(String(viewYear));
    onMonthChange(selectedMonth);
    setOpen(false);
  };

  const moveByYear = (offset: number) => setPeriod(selectedIndex + offset * 12);
  const togglePopover = () => {
    if (!open) setViewYear(Number(year));
    setOpen(value => !value);
  };

  return <div ref={rootRef} className={`tool-period${compact ? ' is-compact' : ''}`}>
    <div className="tool-period-date-controls" onKeyDown={event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      if (event.shiftKey) moveByYear(direction);
      else setPeriod(selectedIndex + direction);
    }}>
      <button type="button" className="tool-period-arrow" aria-label="Mes anterior" disabled={selectedIndex <= 0} onClick={() => setPeriod(selectedIndex - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <button
        ref={triggerRef}
        type="button"
        className="tool-period-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${dateLabel}, ${isReal ? 'dato real' : 'estimación'}. Elegir periodo`}
        onClick={togglePopover}
      >
        <span className="tool-period-date">{dateLabel}</span>
        <span className={`tool-period-status ${isReal ? 'is-real' : 'is-estimate'}`}>{isReal ? 'Dato real' : 'Estimación'}</span>
        <ChevronDown className="tool-period-chevron" size={15} aria-hidden="true" />
      </button>
      <button type="button" className="tool-period-arrow" aria-label="Mes siguiente" disabled={selectedIndex >= lastIndex} onClick={() => setPeriod(selectedIndex + 1)}><ChevronRight size={18} aria-hidden="true" /></button>

      {open && <div className="tool-period-popover" role="dialog" aria-label="Elegir periodo">
        <div className="tool-period-year-picker">
          <button type="button" aria-label="Año anterior" disabled={viewYear <= minYear} onClick={() => setViewedYear(viewYear - 1)}><ChevronLeft size={17} aria-hidden="true" /></button>
          <strong>{viewYear}</strong>
          <button type="button" aria-label="Año siguiente" disabled={viewYear >= maxYear} onClick={() => setViewedYear(viewYear + 1)}><ChevronRight size={17} aria-hidden="true" /></button>
        </div>
        <div className="tool-period-month-grid" role="group" aria-label={`Meses de ${viewYear}`}>
          {MONTHS.map(candidate => {
            const candidateIsReal = isRealMonth(viewYear, candidate);
            const selected = viewYear === Number(year) && candidate === month;
            return <button
              type="button"
              key={candidate}
              className={`${selected ? 'is-active' : ''} ${candidateIsReal ? 'is-real' : 'is-estimate'}`}
              aria-pressed={selected}
              aria-label={`${candidate} ${viewYear} · ${candidateIsReal ? 'dato real' : 'estimación'}`}
              onClick={() => selectMonth(candidate)}
            >{SHORT_MONTHS[candidate]}</button>;
          })}
        </div>
        <div className="tool-period-shortcuts" aria-label="Accesos rápidos al periodo">
          <button type="button" className="tool-period-latest" disabled={isLatest} onClick={() => { onLatest(); setOpen(false); }}>Último dato real</button>
          <button type="button" disabled={selectedIndex < 12} onClick={() => { moveByYear(-1); setOpen(false); }}>Hace 1 año</button>
        </div>
      </div>}
    </div>
  </div>;
}
