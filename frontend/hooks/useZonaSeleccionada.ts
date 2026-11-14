'use client';

import { useCallback, useMemo, useState } from 'react';

type Zona = { distrito?: string; barrio?: string; [key: string]: unknown };
type ZonaColecciones = {
  districts: Zona[];
  neighborhoods: Zona[];
  normalize: (value: string) => string;
};

export function useZonaSeleccionada({ districts, neighborhoods, normalize }: ZonaColecciones) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const selectZone = useCallback((zone: string | null) => setSelectedZone(zone), []);
  const hoverZone = useCallback((zone: string | null) => setHoveredZone(zone), []);
  const clearSelection = useCallback(() => setSelectedZone(null), []);
  const resolveZone = useCallback((zone: string | null) => {
    if (!zone) return null;
    const normalizedZone = normalize(zone);
    const district = districts.find(item => normalize(String(item.distrito || '')) === normalizedZone);
    if (district) return { item: district, isDistrict: true };
    const neighborhood = neighborhoods.find(item => normalize(String(item.barrio || '')) === normalizedZone);
    return neighborhood ? { item: neighborhood, isDistrict: false } : null;
  }, [districts, neighborhoods, normalize]);
  const selectedZoneData = useMemo(() => resolveZone(selectedZone), [resolveZone, selectedZone]);
  const activeZone = hoveredZone || selectedZone;
  const activeZoneData = useMemo(() => resolveZone(activeZone), [activeZone, resolveZone]);

  return {
    selectedZone,
    hoveredZone,
    activeZone,
    selectedZoneData,
    activeZoneData,
    selectZone,
    hoverZone,
    clearSelection,
  };
}
