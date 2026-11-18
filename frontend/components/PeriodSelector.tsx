'use client';

import React, { useState } from 'react';
import EstadoBadge from './EstadoBadge';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function PeriodSelector({ year, month, years, latestReal, onChange }: {
  year: string;
  month: string;
  years: string[];
  latestReal: { year: string; month: string };
  onChange: (year: string, month: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(year);
  const index = MONTHS.indexOf(month);
  const latestMonth = MONTHS.indexOf(latestReal.month);
  const estimated = Number(year) > Number(latestReal.year) || (year === latestReal.year && index > latestMonth);
  const move = (delta: number) => {
    let y = Number(year);
    let m = index + delta;
    if (m < 0) { y -= 1; m = 11; }
    if (m > 11) { y += 1; m = 0; }
    if (y < Number(years[0]) || y > Number(years[years.length - 1])) return;
    onChange(String(y), MONTHS[m]);
  };
  const availableYears = years.length ? years : ['2023', '2024', '2025', '2026', '2027', '2028'];

  return <div className="v2-period-selector" data-period-selector>
    <button type="button" className="v2-period-arrow" aria-label="Periodo anterior" onClick={() => move(-1)}>‹</button>
    <button type="button" className={`v2-period-trigger ${open ? 'is-open' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setCalendarYear(year); setOpen(value => !value); }}>
      <strong>{month} {year}</strong><EstadoBadge status={estimated ? 'estimate' : 'real'} /><span className="v2-period-chevron" aria-hidden="true">⌄</span>
    </button>
    <button type="button" className="v2-period-arrow" aria-label="Periodo siguiente" onClick={() => move(1)}>›</button>
    {open && <div className="v2-period-popover" role="dialog" aria-label="Elegir periodo">
      <div className="v2-period-year-row">
        <button type="button" aria-label="Año anterior" disabled={Number(calendarYear) <= Number(availableYears[0])} onClick={() => setCalendarYear(String(Number(calendarYear) - 1))}>‹</button>
        <strong>{calendarYear}</strong>
        <button type="button" aria-label="Año siguiente" disabled={Number(calendarYear) >= Number(availableYears[availableYears.length - 1])} onClick={() => setCalendarYear(String(Number(calendarYear) + 1))}>›</button>
      </div>
      <div className="v2-period-month-grid">{MONTHS.map((name, monthIndex) => {
        const isEstimate = Number(calendarYear) > Number(latestReal.year) || (calendarYear === latestReal.year && monthIndex > latestMonth);
        const selected = calendarYear === year && name === month;
        return <button key={name} type="button" className={`${isEstimate ? 'is-estimate' : ''} ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => { onChange(calendarYear, name); setOpen(false); }}>{name.slice(0, 3)}</button>;
      })}</div>
      <div className="v2-period-shortcuts">
        <button type="button" onClick={() => { onChange(latestReal.year, latestReal.month); setOpen(false); }}>Último dato real</button>
        <button type="button" onClick={() => { const targetYear = String(Math.max(Number(availableYears[0]), Number(year) - 1)); onChange(targetYear, month); setOpen(false); }}>Hace 1 año</button>
      </div>
    </div>}
  </div>;
}
