import { useState } from 'react';

export type ComparisonLevel = 'Distritos' | 'Barrios';

/** Comparison selections are shared across responsive view switches. */
export function useComparacion() {
  const [selectedZoneA, setSelectedZoneA] = useState('Salamanca');
  const [selectedZoneB, setSelectedZoneB] = useState('Centro');
  const [compareLevel, setCompareLevel] = useState<ComparisonLevel>('Distritos');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  return {
    selectedZoneA, setSelectedZoneA, selectedZoneB, setSelectedZoneB,
    compareLevel, setCompareLevel, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
  };
}
