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
};

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-ES')
  .replace(/^\d+\.\s*/, '')
  .trim();

export default function ZoneSearch({ options, district, barrio, onSelect, formatName, compact = false }: ZoneSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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
  }, [options, query, formatName]);
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
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const choose = (option: ZoneSearchOption) => {
    if (option.kind === 'city') onSelect({ district: 'Todos', barrio: 'Todos' });
    else if (option.kind === 'district') onSelect({ district: option.name, barrio: 'Todos' });
    else onSelect({ district: option.district || 'Todos', barrio: option.name });
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
  };

  const breadcrumb = selection?.kind === 'barrio'
    ? `Madrid · ${formatName(selection.district || '')} · ${formatName(selection.name)}`
    : selection?.kind === 'district'
      ? `Madrid · ${formatName(selection.name)}`
      : 'Madrid';

  return (
    <div ref={rootRef} className={`v2-zone-search ${compact ? 'is-compact' : ''}`}>
      {!compact && <span className="v2-zone-filter-title">Zona</span>}
      <div className="v2-zone-search-control">
        <div className="v2-zone-search-field">
          <Search size={16} aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={query}
            placeholder="Busca un distrito o barrio"
            aria-label="Busca un distrito o barrio"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
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
        </div>

      {open && query && <div id={listId} className="v2-zone-search-results" role="listbox" aria-label="Resultados de zonas">
        {results.length ? <>
          {groupedResults.districts.length > 0 && <div role="group" aria-label="Distritos">
            <span className="v2-zone-search-group-label">Distritos</span>
            {groupedResults.districts.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
          </div>}
          {groupedResults.barrios.length > 0 && <div role="group" aria-label="Barrios">
            <span className="v2-zone-search-group-label">Barrios</span>
            {groupedResults.barrios.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
          </div>}
          {groupedResults.city.map(({ option, index }) => <ZoneResult key={option.id} option={option} index={index} listId={listId} formatName={formatName} active={index === activeIndex} onActivate={setActiveIndex} onChoose={choose} />)}
        </> : <p className="v2-zone-search-empty">Sin resultados</p>}
      </div>}
      </div>

      <div className="v2-zone-search-selection" aria-live="polite">
        <small>{breadcrumb}</small>
        {selection && <button type="button" className="v2-zone-search-reset" onClick={() => choose({ id: 'city-madrid', name: 'Madrid', kind: 'city' })}>Ver Madrid</button>}
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
    <small>{option.kind === 'district' ? 'Distrito' : option.kind === 'city' ? 'Ciudad' : `Barrio de ${formatName(option.district || '')}`}</small>
  </button>;
}
