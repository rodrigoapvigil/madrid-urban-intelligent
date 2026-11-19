'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export type ZoneSearchOption = {
  id: string;
  name: string;
  kind: 'district' | 'barrio' | 'city';
  district?: string;
  aliases?: string[];
};

type ZoneSearchProps = {
  options: ZoneSearchOption[];
  district: string;
  barrio: string;
  onSelect: (selection: { district: string; barrio: string }) => void;
  formatName: (name: string) => string;
  compact?: boolean;
  title?: string;
  showReset?: boolean;
  picker?: {
    selected: ZoneSearchOption;
    excludedId?: string;
    accent: 'a' | 'b';
    onSelect: (option: ZoneSearchOption) => void;
    onOpenChange?: (open: boolean) => void;
  };
};

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-ES')
  .replace(/^\d+\.\s*/, '')
  .trim();

export default function ZoneSearch({ options, district, barrio, onSelect, formatName, compact = false, title = 'Zona', picker }: ZoneSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listId = useId();

  const selection = useMemo(() => {
    if (barrio !== 'Todos') return options.find(option => option.kind === 'barrio' && option.name === barrio && option.district === district);
    if (district !== 'Todos') return options.find(option => option.kind === 'district' && option.name === district);
    return undefined;
  }, [options, district, barrio]);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    const matches = options
      .filter(option => {
        if (picker && (option.id === picker.excludedId || option.kind === 'city')) return false;
        const searchable = [option.name, formatName(option.name), ...(option.aliases || [])].map(normalize);
        return searchable.some(value => value.includes(needle));
      })
      .sort((a, b) => {
        const aStarts = normalize(formatName(a.name)).startsWith(needle) ? 0 : 1;
        const bStarts = normalize(formatName(b.name)).startsWith(needle) ? 0 : 1;
        const aKind = a.kind === 'district' ? 0 : a.kind === 'barrio' ? 1 : 2;
        const bKind = b.kind === 'district' ? 0 : b.kind === 'barrio' ? 1 : 2;
        return aStarts - bStarts || aKind - bKind || formatName(a.name).localeCompare(formatName(b.name), 'es');
      });
    return [
      ...matches.filter(option => option.kind === 'district'),
      ...matches.filter(option => option.kind === 'barrio'),
      ...matches.filter(option => option.kind === 'city'),
    ];
  }, [options, query, formatName, picker]);
  const groupedResults = useMemo(() => {
    let index = 0;
    const groups = { districts: [] as Array<{ option: ZoneSearchOption; index: number }>, barrios: [] as Array<{ option: ZoneSearchOption; index: number }>, city: [] as Array<{ option: ZoneSearchOption; index: number }> };
    results.forEach(option => {
      const entry = { option, index: index++ };
      if (option.kind === 'district') groups.districts.push(entry);
      else if (option.kind === 'barrio') groups.barrios.push(entry);
      else groups.city.push(entry);
    });
    return groups;
  }, [results]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
        setEditing(false);
        picker?.onOpenChange?.(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [picker]);

  const choose = (option: ZoneSearchOption) => {
    if (picker) {
      picker.onSelect(option);
      setQuery('');
      setOpen(false);
      setEditing(false);
      picker.onOpenChange?.(false);
      setActiveIndex(0);
      return;
    }
    if (option.kind === 'city') onSelect({ district: 'Todos', barrio: 'Todos' });
    else if (option.kind === 'district') onSelect({ district: option.name, barrio: 'Todos' });
    else onSelect({ district: option.district || 'Todos', barrio: option.name });
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
  };

  return (
    <div ref={rootRef} className={`v2-zone-search ${compact ? 'is-compact' : ''} ${picker ? `is-comparison-picker zone-${picker.accent}` : ''}`}>
      {!compact && <span className="v2-zone-filter-title">{title}</span>}
      <div className="v2-zone-search-control">
        <div className="v2-zone-search-field">
          {picker && !editing ? (
            <button type="button" className="v2-zone-search-picked" aria-label={`Cambiar ${picker.accent === 'a' ? 'zona A' : 'zona B'}, actualmente ${formatName(picker.selected.name)} ${picker.selected.kind === 'district' ? 'Distrito' : 'Barrio'}`} onClick={() => { setEditing(true); setOpen(true); picker.onOpenChange?.(true); }}>
              <span className="v2-zone-search-picked-copy"><strong>{formatName(picker.selected.name)}</strong><small>{picker.selected.kind === 'district' ? 'Distrito' : 'Barrio'}</small></span>
              <Search size={17} aria-hidden="true" />
            </button>
          ) : picker ? <>
            <Search size={16} aria-hidden="true" />
            <input
              id={inputId}
              type="search"
              value={query}
              placeholder="Busca un distrito o barrio"
              aria-label={`Buscar zona ${picker.accent.toUpperCase()}`}
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && Boolean(query)}
              aria-controls={open && Boolean(query) && results.length ? listId : undefined}
              aria-activedescendant={open && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              autoFocus
              onFocus={() => setOpen(true)}
              onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
              onKeyDown={event => {
                if (event.key === 'Escape') { setOpen(false); setQuery(''); setEditing(false); picker.onOpenChange?.(false); }
                else if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setOpen(true); setActiveIndex(index => (index + 1) % results.length); }
                else if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActiveIndex(index => (index - 1 + results.length) % results.length); }
                else if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
              }}
            />
            {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(''); setActiveIndex(0); }}><X size={16} /></button>}
          </> : selection ? (
            <div className="v2-zone-search-selected-chip" aria-live="polite">
              <span>{formatName(selection.name)}</span>
              <button type="button" aria-label={`${formatName(selection.name)} seleccionada. Volver a Madrid`} onClick={() => choose({ id: 'city-madrid', name: 'Madrid', kind: 'city' })}><X size={16} aria-hidden="true" /></button>
            </div>
          ) : <>
            <Search size={16} aria-hidden="true" />
            <input
              id={inputId}
              type="search"
              value={query}
              placeholder="Busca un distrito o barrio"
              aria-label={`${title}: busca un distrito o barrio`}
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && Boolean(query)}
              aria-controls={open && Boolean(query) && results.length ? listId : undefined}
              aria-activedescendant={open && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              onFocus={() => setOpen(true)}
              onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
              onKeyDown={event => {
                if (event.key === 'Escape') { setOpen(false); setQuery(''); }
                else if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setOpen(true); setActiveIndex(index => (index + 1) % results.length); }
                else if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setActiveIndex(index => (index - 1 + results.length) % results.length); }
                else if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
              }}
            />
            {query && <button type="button" aria-label="Limpiar búsqueda y volver a Madrid" onClick={() => choose({ id: 'city-madrid', name: 'Madrid', kind: 'city' })}><X size={16} /></button>}
          </>}
        </div>

      {open && query && <>
        <div className={`v2-zone-search-announcement ${results.length ? 'is-count' : 'is-empty'}`} role="status" aria-live="polite">
          {results.length ? `${results.length} ${results.length === 1 ? 'zona encontrada' : 'zonas encontradas'}` : picker ? 'Sin resultados' : 'No encontramos esa zona. Prueba otro nombre.'}
        </div>
        {results.length > 0 && <div id={listId} className="v2-zone-search-results" role="listbox" aria-label="Resultados de zonas">
          {groupedResults.districts.length > 0 && <div role="group" aria-label="Distritos">
            <span className="v2-zone-search-group-label">Distritos</span>
            {groupedResults.districts.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
          </div>}
          {groupedResults.barrios.length > 0 && <div role="group" aria-label="Barrios">
            <span className="v2-zone-search-group-label">Barrios</span>
            {groupedResults.barrios.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
          </div>}
          {groupedResults.city.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
        </div>}
      </>}
      </div>

    </div>
  );
}

function ZoneResult({ option, index, listId, formatName, active, onActivate, onChoose }: {
  option: ZoneSearchOption;
  index: number;
  listId: string;
  formatName: (name: string) => string;
  active: boolean;
  onActivate: (index: number) => void;
  onChoose: (option: ZoneSearchOption) => void;
}) {
  return <button
    type="button"
    id={`${listId}-${index}`}
    role="option"
    aria-selected={active}
    key={option.id}
    className="v2-zone-search-result"
    onMouseEnter={() => onActivate(index)}
    onClick={() => onChoose(option)}
  >
    <span>{formatName(option.name)}</span>
    <small>{option.kind === 'district' ? 'Distrito' : option.kind === 'city' ? 'Ciudad' : 'Barrio'}</small>
  </button>;
}
