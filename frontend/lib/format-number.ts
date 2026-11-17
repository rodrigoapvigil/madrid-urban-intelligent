const spanishNumber = (value: number, digits = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('es-ES', {
    useGrouping: Math.abs(numeric) >= 10_000,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric);
};

export const formatNumber = (value: number, digits = 0) => spanishNumber(value, digits);
export const formatPercent = (value: number, digits = 1, showPositiveSign = false) => {
  const numeric = Number(value);
  const formatted = spanishNumber(numeric, digits);
  return `${showPositiveSign && numeric > 0 ? '+' : ''}${formatted} %`;
};
export const formatEuroAmount = (value: number, digits = 0) => `${spanishNumber(value, digits)} €`;
