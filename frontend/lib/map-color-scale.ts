export type MarketProfileId = 'alquiler' | 'compra' | 'venta' | 'inversion';

const MARKET_PROFILES: MarketProfileId[] = ['alquiler', 'compra', 'venta', 'inversion'];

export const PROFILE_ACCENTS: Record<MarketProfileId, string> = {
  alquiler: '#38C8D7',
  compra: '#E6B653',
  venta: '#63C79C',
  inversion: '#C58BDD',
};

const PROFILE_MAP_RAMPS: Record<MarketProfileId, string[]> = {
  alquiler: ['#124766', '#0D6784', '#0C8BA6', '#18B2C9', '#5AD6E5'],
  compra: ['#49361F', '#6D4E22', '#916626', '#B27D2C', '#D29A3C'],
  venta: ['#17483A', '#21654A', '#2F845B', '#43A76F', '#65C58C'],
  inversion: ['#452C58', '#603973', '#7B478D', '#9A5BAC', '#B978C9'],
};

export function marketProfileId(profile: string): MarketProfileId {
  const normalized = profile.toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MARKET_PROFILES.find(id => normalized.includes(id)) || 'alquiler';
}

export function profileAccentColor(profile: string): string {
  return PROFILE_ACCENTS[marketProfileId(profile)];
}

export function profileMapTierColors(profile: string): string[] {
  return PROFILE_MAP_RAMPS[marketProfileId(profile)];
}

export function comparisonZoneColors(profile: string): { zoneA: string; zoneB: string } {
  const id = marketProfileId(profile);
  const zoneA = '#35C8D7';
  const zoneB = '#FFB65C';
  // Keep A/B identity clear while avoiding a collision with the active profile accent.
  if (id === 'alquiler') return { zoneA: '#B59AE8', zoneB };
  if (id === 'compra') return { zoneA, zoneB: '#B59AE8' };
  return { zoneA, zoneB };
}

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

export const MAP_TIER_COLORS = PROFILE_MAP_RAMPS.alquiler;
