'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import EstadoBadge from './EstadoBadge';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function PeriodSelector({
  year,
  month,
  years,
  latestReal,
  onChange,
  hideMonthArrows = false,
  keyboardMonthNavigation = false,
  showYearShortcut = true,
  showStatusPill = false,
}: {
  year: string;
  month: string;
  years: string[];
  latestReal: { year: string; month: string };
  onChange: (year: string, month: string) => void;
  hideMonthArrows?: boolean;
  keyboardMonthNavigation?: boolean;
  showYearShortcut?: boolean;
  showStatusPill?: boolean;
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
  const pillLabel = estimated ? 'Proyección' : 'Dato oficial';

  const selectorNode = (
    <div className="v2-period-selector" data-period-selector>
      {!hideMonthArrows && <button type="button" className="v2-period-arrow" aria-label="Mes anterior" onClick={() => move(-1)}>‹</button>}
      <button
        type="button"
        className={`v2-period-trigger ${open ? 'is-open' : ''}`}
        aria-label={`${month} ${year}, ${estimated ? 'proyección' : 'dato oficial'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setCalendarYear(year); setOpen(value => !value); }}
        onKeyDown={event => {
          if (!keyboardMonthNavigation) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <strong>{month} {year}</strong>
        <ChevronDown className="v2-period-chevron" size={16} strokeWidth={2.25} aria-hidden="true" />
      </button>
      {!hideMonthArrows && <button type="button" className="v2-period-arrow" aria-label="Mes siguiente" onClick={() => move(1)}>›</button>}
      {open && <div className="v2-period-popover" role="dialog" aria-label="Elegir periodo">
        <div className="v2-period-year-row">
          <button type="button" aria-label="Año anterior" disabled={Number(calendarYear) <= Number(availableYears[0])} onClick={() => setCalendarYear(String(Number(calendarYear) - 1))}>‹</button>
          <strong>{calendarYear}</strong>
          <button type="button" aria-label="Año siguiente" disabled={Number(calendarYear) >= Number(availableYears[availableYears.length - 1])} onClick={() => setCalendarYear(String(Number(calendarYear) + 1))}>›</button>
        </div>
        <div className="v2-period-month-grid">{MONTHS.map((name, monthIndex) => {
          const isEstimate = Number(calendarYear) > Number(latestReal.year) || (calendarYear === latestReal.year && monthIndex > latestMonth);
          const selected = calendarYear === year && name === month;
          return (
            <button
              key={name}
              type="button"
              className={`${isEstimate ? 'is-estimate' : ''} ${selected ? 'is-selected' : ''}`}
              aria-label={`${name} ${calendarYear}${isEstimate ? ', proyección' : ', dato oficial'}`}
              aria-pressed={selected}
              onClick={() => { onChange(calendarYear, name); setOpen(false); }}
            >
              <span className="v2-period-month-name">{name.slice(0, 3)}</span>
              {isEstimate && <span className="v2-period-month-tag">proyección</span>}
            </button>
          );
        })}</div>
        <div className="v2-period-shortcuts">
          <div className="v2-period-shortcuts-actions">
            <button type="button" onClick={() => { onChange(latestReal.year, latestReal.month); setOpen(false); }}>Último dato real</button>
            {showYearShortcut && <button type="button" onClick={() => { const targetYear = String(Math.max(Number(availableYears[0]), Number(year) - 1)); onChange(targetYear, month); setOpen(false); }}>Hace 1 año</button>}
          </div>
          <span className={`v2-header-status-pill ${estimated ? 'is-projection' : 'is-official'}`}>
            <span className="v2-header-status-dot" aria-hidden="true" />
            <span>{pillLabel}</span>
          </span>
        </div>
      </div>}
    </div>
  );

  if (!showStatusPill) {
    return selectorNode;
  }

  return (
    <div className="v2-period-with-status">
      <span className={`v2-header-status-pill ${estimated ? 'is-projection' : 'is-official'}`}>
        <span className="v2-header-status-dot" aria-hidden="true" />
        <span>{pillLabel}</span>
      </span>
      {selectorNode}
    </div>
  );
}
