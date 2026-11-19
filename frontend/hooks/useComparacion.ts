import { useState } from 'react';

/** Comparison selections are shared across responsive view switches. */
export function useComparacion() {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  return {
    selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
  };
}
