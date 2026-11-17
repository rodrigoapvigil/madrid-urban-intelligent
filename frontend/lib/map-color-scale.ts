export type MarketProfileId = 'alquiler' | 'compra' | 'venta' | 'inversion';

const FALLBACK_CUTS: Record<MarketProfileId, number[]> = {
  alquiler: [16, 19, 22, 25],
  compra: [2100, 3100, 4200, 5400],
  venta: [2100, 3100, 4200, 5400],
  inversion: [.043, .05, .057, .065],
};

export function profileColorCuts(profile: MarketProfileId, rows: Array<Record<string, unknown>>, lastRealMonth: number): number[] {
  const values = rows.flatMap(row => Array.from({ length: Math.max(0, Math.min(12, lastRealMonth)) }, (_, index) => Number(row[`m${index + 1}`])))
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  if (values.length < 5) return FALLBACK_CUTS[profile];
  const unit = profile === 'alquiler' ? 1 : profile === 'inversion' ? .005 : 100;
  const cuts = [20, 40, 60, 80].map(percentile => {
    const value = values[Math.min(values.length - 1, Math.ceil(values.length * percentile / 100) - 1)];
    return Math.round(value / unit) * unit;
  });
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index] <= cuts[index - 1]) cuts[index] = cuts[index - 1] + unit;
  }
  return cuts;
}

export function colorTier(value: number, cuts: number[]) {
  return cuts.reduce((tier, cut) => tier + Number(value >= cut), 0);
}

export const MAP_TIER_COLORS = ['#08254a', '#0a3b68', '#075d86', '#058caf', '#00bcd4'];
