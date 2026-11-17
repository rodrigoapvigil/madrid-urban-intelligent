'use client';

import React, { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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
  const draggingRef = useRef(false);
  const currentMonthIndex = Math.max(0, MONTHS.indexOf(month));
  const firstYear = Number(years[0] || 2023);
  const lastYear = Number(years[years.length - 1] || 2028);
  const totalMonths = (lastYear - firstYear + 1) * 12;
  const selectedIndex = (Number(year) - firstYear) * 12 + currentMonthIndex;
  const latestIndex = (Number(latestReal.year) - firstYear) * 12 + Math.max(0, MONTHS.indexOf(latestReal.month));
  const isLatest = year === latestReal.year && month === latestReal.month;
  const isReal = Number(year) < Number(latestReal.year)
    ? (monthsByYear[year] ? monthsByYear[year].includes(month) : true)
    : Number(year) === Number(latestReal.year) && currentMonthIndex <= MONTHS.indexOf(latestReal.month);
  const dateLabel = `${month} ${year}`;
  const yearTicks = useMemo(() => years.map(value => ({ year: value, position: totalMonths <= 1 ? 0 : (Number(value) - firstYear) * 12 / (totalMonths - 1) * 100 })), [years, firstYear, totalMonths]);
  const boundedSelectedIndex = Math.max(0, Math.min(totalMonths - 1, selectedIndex));
  const selectedPosition = totalMonths <= 1 ? 0 : boundedSelectedIndex / (totalMonths - 1) * 100;
  const latestPosition = totalMonths <= 1 ? 0 : Math.max(0, Math.min(totalMonths - 1, latestIndex)) / (totalMonths - 1) * 100;
  const projectionStartIndex = Math.min(totalMonths - 1, Math.max(0, latestIndex + 1));
  const projectionStart = `${SHORT_MONTHS[MONTHS[projectionStartIndex % 12]]} ${firstYear + Math.floor(projectionStartIndex / 12)}`;
  const estimateNote = <small className="tool-period-estimate-note">Estimación estadística, no es una tasación ni una garantía de precios futuros.</small>;
  const shortcutDecemberAvailable = years.includes('2026');

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

  const moveMonths = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(totalMonths - 1, boundedSelectedIndex + offset));
    const nextYear = String(firstYear + Math.floor(nextIndex / 12));
    const nextMonth = MONTHS[nextIndex % 12];
    if (nextYear !== year) onYearChange(nextYear);
    onMonthChange(nextMonth);
  };

  const selectAtPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const index = Math.round(ratio * (totalMonths - 1));
    const nextYear = String(firstYear + Math.floor(index / 12));
    const nextMonth = MONTHS[index % 12];
    if (nextYear !== year) onYearChange(nextYear);
    onMonthChange(nextMonth);
  };

  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      moveMonths(direction * (event.shiftKey ? 12 : 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onYearChange(years[0]);
      onMonthChange(MONTHS[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      onYearChange(years[years.length - 1]);
      onMonthChange(MONTHS[11]);
    }
  };

  const handleDateKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    moveMonths(direction * (event.shiftKey ? 12 : 1));
  };

  const selectYear = (selectedYear: string) => {
    const validMonths = monthsByYear[selectedYear]?.length ? monthsByYear[selectedYear] : MONTHS;
    const previousIndex = MONTHS.indexOf(month);
    const nextMonth = validMonths.includes(month)
      ? month
      : [...validMonths].sort((a, b) => Math.abs(MONTHS.indexOf(a) - previousIndex) - Math.abs(MONTHS.indexOf(b) - previousIndex))[0] || month;
    onYearChange(selectedYear);
    onMonthChange(nextMonth);
  };

  const quickActions = <div className="tool-period-shortcuts" aria-label="Accesos rápidos al periodo">
    <button type="button" className="tool-period-latest" disabled={isLatest} onClick={onLatest}><RotateCcw size={14} aria-hidden="true" />Último dato real</button>
    <button type="button" onClick={() => moveMonths(-12)}>Hace 1 año</button>
    {shortcutDecemberAvailable && <button type="button" onClick={() => { selectYear('2026'); onMonthChange('Diciembre'); }}>Dic 2026</button>}
  </div>;

  const monthGrid = <div className="tool-period-month-grid" role="group" aria-label={`Meses de ${year}`}>
    {MONTHS.map(candidate => {
      const candidateIsReal = Number(year) < Number(latestReal.year)
        ? (monthsByYear[year] ? monthsByYear[year].includes(candidate) : true)
        : Number(year) === Number(latestReal.year) && MONTHS.indexOf(candidate) <= MONTHS.indexOf(latestReal.month);
      return <button
        type="button"
        key={candidate}
        className={`${candidate === month ? 'is-active' : ''} ${candidateIsReal ? 'is-real' : 'is-estimate'}`}
        aria-pressed={candidate === month}
        aria-label={`${candidate} ${year} · ${candidateIsReal ? 'dato real' : 'estimación'}`}
        onClick={() => { onMonthChange(candidate); setOpen(false); }}
      >{SHORT_MONTHS[candidate]}</button>;
    })}
  </div>;

  const timeline = <div className="tool-period-timeline-wrap">
    <div className="tool-period-year-marks" aria-label="Años">
      {yearTicks.map(({ year: tickYear, position }) => <button
        type="button"
        key={tickYear}
        className={tickYear === year ? 'is-active' : ''}
        style={{ left: `${position}%` }}
        aria-pressed={tickYear === year}
        onClick={() => selectYear(tickYear)}
      >{tickYear}</button>)}
    </div>
    <div
      className="tool-period-timeline"
      role="slider"
      tabIndex={0}
      aria-label="Periodo mensual, de 2023 a 2028"
      aria-valuemin={0}
      aria-valuemax={totalMonths - 1}
      aria-valuenow={boundedSelectedIndex}
      aria-valuetext={`${dateLabel}, ${isReal ? 'dato real' : 'estimación'}`}
      onKeyDown={handleTimelineKeyDown}
      onPointerDown={event => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        selectAtPointer(event);
      }}
      onPointerMove={event => { if (draggingRef.current) selectAtPointer(event); }}
      onPointerUp={event => { draggingRef.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { draggingRef.current = false; }}
    >
      <span className="tool-period-track-real" style={{ width: `${latestPosition}%` }} />
      <span className="tool-period-track-estimate" style={{ left: `${latestPosition}%`, width: `${100 - latestPosition}%` }} />
      <span className="tool-period-cutoff" style={{ left: `${latestPosition}%` }} aria-hidden="true" />
      <span className={`tool-period-thumb ${isReal ? 'is-real' : 'is-estimate'}`} style={{ left: `${selectedPosition}%` }} aria-hidden="true" />
    </div>
    <div className="tool-period-track-labels"><span>Dato real · hasta {latestReal.month} {latestReal.year}</span><span>Estimación · desde {projectionStart}</span></div>
  </div>;

  const fullSelector = <div className={`tool-period-selector${compact ? ' is-popover' : ''}`}>
      <div className="tool-period-current">
      <div className="tool-period-date-controls" onKeyDown={handleDateKeyDown}>
        <button type="button" className="tool-period-arrow" aria-label="Mes anterior" disabled={boundedSelectedIndex <= 0} onClick={() => moveMonths(-1)}><ChevronLeft size={19} /></button>
        {compact ? <button type="button" className="tool-period-date-open" aria-expanded={open} onClick={() => setOpen(value => !value)}>{dateLabel}<ChevronDown size={16} aria-hidden="true" /></button> : <strong className="tool-period-date">{dateLabel}</strong>}
        <button type="button" className="tool-period-arrow" aria-label="Mes siguiente" disabled={boundedSelectedIndex >= totalMonths - 1} onClick={() => moveMonths(1)}><ChevronRight size={19} /></button>
        <span className={`tool-period-status ${isReal ? 'is-real' : 'is-estimate'}`}>{isReal ? 'DATO REAL' : 'ESTIMACIÓN'}</span>
      </div>
      {!compact && quickActions}
    </div>
    {!isReal && estimateNote}
    {compact ? <>
      {open && <div className="tool-period-popover">
        <div className="tool-period-popover-years" role="group" aria-label="Elegir año">{years.map(option => <button key={option} type="button" aria-pressed={option === year} className={option === year ? 'is-active' : ''} onClick={() => selectYear(option)}>{option}</button>)}</div>
        {monthGrid}
        {quickActions}
      </div>}
    </> : timeline}
  </div>;

  return <div ref={rootRef} className={`tool-period${compact ? ' is-compact' : ''}`}>
    {compact ? fullSelector : <>
      <div className="tool-period-current">
        <div className="tool-period-date-controls" onKeyDown={handleDateKeyDown}>
          <button type="button" className="tool-period-arrow" aria-label="Mes anterior" disabled={boundedSelectedIndex <= 0} onClick={() => moveMonths(-1)}><ChevronLeft size={19} /></button>
          <strong className="tool-period-date">{dateLabel}</strong>
          <button type="button" className="tool-period-arrow" aria-label="Mes siguiente" disabled={boundedSelectedIndex >= totalMonths - 1} onClick={() => moveMonths(1)}><ChevronRight size={19} /></button>
          <span className={`tool-period-status ${isReal ? 'is-real' : 'is-estimate'}`}>{isReal ? 'DATO REAL' : 'ESTIMACIÓN'}</span>
        </div>
        {quickActions}
      </div>
      {!isReal && estimateNote}
      {timeline}
    </>}
  </div>;
}
