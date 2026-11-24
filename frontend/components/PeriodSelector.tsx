'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { METHODOLOGY_SOURCES } from './MethodologyDrawer';

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
  isCompact,
  onOpenMethodology,
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
  isCompact?: boolean;
  onOpenMethodology?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMethodologyPopover, setShowMethodologyPopover] = useState(false);
  const [calendarYear, setCalendarYear] = useState(year);
  const [internalScrolled, setInternalScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scroll detection for compact mode if isCompact is not explicitly passed
  useEffect(() => {
    const handleScroll = () => {
      setInternalScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown or popover on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowMethodologyPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowMethodologyPopover(false);
      }
    };
    if (open || showMethodologyPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, showMethodologyPopover]);

  const index = MONTHS.indexOf(month);
  const latestMonth = MONTHS.indexOf(latestReal.month);
  const estimated = Number(year) > Number(latestReal.year) || (year === latestReal.year && index > latestMonth);
  const compactMode = isCompact !== undefined ? isCompact : internalScrolled;

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
    <div className={`v2-period-selector ${compactMode ? 'is-compact' : ''}`} data-period-selector ref={containerRef}>
      {!hideMonthArrows && <button type="button" className="v2-period-arrow" aria-label="Mes anterior" onClick={() => move(-1)}>‹</button>}
      <button
        type="button"
        className={`v2-period-trigger ${open ? 'is-open' : ''} ${compactMode ? 'is-compact' : ''}`}
        aria-label={`${month} ${year}, ${estimated ? 'proyección' : 'dato oficial'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setCalendarYear(year);
          setOpen(value => !value);
          setShowMethodologyPopover(false);
        }}
        onKeyDown={event => {
          if (!keyboardMonthNavigation) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        {compactMode ? (
          <span className="v2-period-trigger-compact-row">
            <span
              className={`v2-period-dot ${estimated ? 'is-projection' : 'is-official'}`}
              aria-hidden="true"
            />
            <span className="v2-period-trigger-month">{month} {year}</span>
            <ChevronDown className="v2-period-chevron" size={14} strokeWidth={2.2} aria-hidden="true" />
          </span>
        ) : (
          <span className="v2-period-trigger-col">
            <span className="v2-period-trigger-row-top">
              <span className="v2-period-trigger-month">{month} {year}</span>
              <ChevronDown className="v2-period-chevron" size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="v2-period-trigger-row-bottom">
              <span
                className={`v2-period-dot ${estimated ? 'is-projection' : 'is-official'}`}
                aria-hidden="true"
              />
              <span className={`v2-period-status-text ${estimated ? 'is-projection' : 'is-official'}`}>
                {pillLabel}
              </span>
            </span>
          </span>
        )}
      </button>
      {!hideMonthArrows && <button type="button" className="v2-period-arrow" aria-label="Mes siguiente" onClick={() => move(1)}>›</button>}
      
      {open && (
        <div className="v2-period-popover" role="dialog" aria-label="Elegir periodo">
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
            {onOpenMethodology && (
              <button
                type="button"
                className="v2-period-methodology-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMethodologyPopover(true);
                }}
              >
                Fuentes y metodología ›
              </button>
            )}
          </div>
        </div>
      )}

      {showMethodologyPopover && (
        <div
          className="v2-methodology-popover v2-period-methodology-popover"
          role="dialog"
          aria-label="Fuentes y metodología"
        >
          <div className="v2-methodology-popover-header">
            <div className="v2-methodology-popover-title">
              <strong>Fuentes y metodología</strong>
            </div>
            <button
              type="button"
              className="v2-methodology-popover-close"
              onClick={() => setShowMethodologyPopover(false)}
              aria-label="Cerrar aviso"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="v2-methodology-popover-body">
            <div className="v2-methodology-point">
              <span className="v2-methodology-bullet" aria-hidden="true">●</span>
              <div>
                <strong className="v2-methodology-term">Fuentes:</strong>{' '}
                <span className="v2-methodology-desc">{METHODOLOGY_SOURCES.map((s) => s.title).join(', ')}.</span>
              </div>
            </div>

            <div className="v2-methodology-point">
              <span className="v2-methodology-bullet" aria-hidden="true">●</span>
              <div>
                <strong className="v2-methodology-term">Dato oficial:</strong>{' '}
                <span className="v2-methodology-desc">publicado por la fuente.</span>{' '}
                <strong className="v2-methodology-term">Proyección:</strong>{' '}
                <span className="v2-methodology-desc">estimación del modelo DMIYC para meses aún no publicados.</span>
              </div>
            </div>

            <div className="v2-methodology-point">
              <span className="v2-methodology-bullet" aria-hidden="true">●</span>
              <div>
                <strong className="v2-methodology-term">Sin datos oficiales (tramado):</strong>{' '}
                <span className="v2-methodology-desc">no se estiman.</span>
              </div>
            </div>
          </div>

          {onOpenMethodology && (
            <div className="v2-methodology-popover-footer">
              <button
                type="button"
                className="v2-methodology-full-btn"
                onClick={() => {
                  setShowMethodologyPopover(false);
                  setOpen(false);
                  onOpenMethodology();
                }}
              >
                <span>Abrir ficha técnica detallada</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return selectorNode;
}
