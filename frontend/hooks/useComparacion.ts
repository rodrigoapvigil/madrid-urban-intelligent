import { useState } from 'react';

export type ComparisonZoneType = 'distrito' | 'barrio';

/** Comparison selections are shared across responsive view switches. */
export function useComparacion() {
  const [selectedZoneA, setSelectedZoneA] = useState('Salamanca');
  const [selectedZoneB, setSelectedZoneB] = useState('Centro');
  const [selectedZoneAType, setSelectedZoneAType] = useState<ComparisonZoneType>('distrito');
  const [selectedZoneBType, setSelectedZoneBType] = useState<ComparisonZoneType>('distrito');
  const [selectedZoneADistrict, setSelectedZoneADistrict] = useState('Salamanca');
  const [selectedZoneBDistrict, setSelectedZoneBDistrict] = useState('Centro');

  return {
    selectedZoneA, setSelectedZoneA, selectedZoneB, setSelectedZoneB,
    selectedZoneAType, setSelectedZoneAType, selectedZoneBType, setSelectedZoneBType,
    selectedZoneADistrict, setSelectedZoneADistrict, selectedZoneBDistrict, setSelectedZoneBDistrict,
  };
}
