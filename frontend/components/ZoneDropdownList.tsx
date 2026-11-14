'use client';

import React, { useMemo, useState } from 'react';

type ZoneDropdownListProps = {
  id: string;
  label: string;
  zones: string[];
  selectedZone: string;
  formatZone?: (zone: string) => string;
  onSelect: (zone: string) => void;
};

/** Desktop zone list using the same search and option styles as dashboard filters. */
export default function ZoneDropdownList({ id, label, zones, selectedZone, formatZone = zone => zone, onSelect }: ZoneDropdownListProps) {
  const [query, setQuery] = useState('');
  const filteredZones = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
    return zones.filter(zone => zone !== 'Todos' && zone.toLocaleLowerCase('es-ES').includes(normalizedQuery));
  }, [query, zones]);

  return (
    <div className="v2-dropdown-menu v2-zone-dropdown-list" id={`${id}-menu`}>
      <input
        className="v2-dropdown-search"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Buscar zona…"
        aria-label={`Buscar ${label.toLocaleLowerCase('es-ES')}`}
        aria-controls={`${id}-options`}
      />
      <div id={`${id}-options`} role="listbox" aria-label={label}>
        {filteredZones.map(zone => (
          <button
            type="button"
            key={zone}
            id={`${id}-option-${encodeURIComponent(zone)}`}
            className="v2-dropdown-item"
            role="option"
            aria-selected={selectedZone === zone}
            onClick={() => onSelect(zone)}
          >
            {formatZone(zone)}
          </button>
        ))}
        {filteredZones.length === 0 && <p className="v2-zone-dropdown-empty">No hay zonas que coincidan.</p>}
      </div>
    </div>
  );
}
