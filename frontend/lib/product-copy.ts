import { formatNumber } from './format-number';

export const PRICE_ANALYSIS_LABEL = '¿Es buen precio?';

export const DASHBOARD_COPY = {
  sale: {
    velocityTitle: 'Tiempo medio de venta',
    velocityNote: 'Promedio histórico de la zona',
    gainTitle: 'Variación estimada a 6 meses',
    estimateNote: 'Estimación estadística, no una garantía.',
  },
  investment: {
    title: 'Indicadores de inversión',
    netYield: 'Rentabilidad neta estimada',
  },
  purchase: {
    affordability: (years: number) => `Equivale a ${formatNumber(years, 1)} años de renta media`,
  },
} as const;
