'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChartJS from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { cssColorResolverPlugin, colorWithAlpha, resolveCssColor } from '../lib/colors';
import { Activity, ArrowUpRight, Building2, ChevronDown, Compass, HelpCircle, Home, Info, RotateCw, Settings, SlidersHorizontal, Tag, X } from 'lucide-react';
import './MadridDashboardV2.css';
import './TrustArchitecture.css';
import { TrustTelemetryBadge } from './TrustTelemetryBadge';
import { MethodologyDrawer } from './MethodologyDrawer';
import { ConfidenceIntervalBadge } from './ConfidenceIntervalBadge';
import { ExpenseYieldSimulator } from './ExpenseYieldSimulator';
import { DilemaVenderAlquilar } from './DilemaVenderAlquilar';
import { HeatmapDistritosMeses } from './HeatmapDistritosMeses';
import { StructuralDisparityBadge } from './StructuralDisparityBadge';
import { apiFetch } from '../lib/api';
import { SiteFooter, SiteHeader } from './SiteChrome';
import BackgroundAurora from './BackgroundAurora';
import LoadingScreen from './LoadingScreen';
import CardLoadingOverlay from './CardLoadingOverlay';
import ComparacionZonas from './ComparacionZonas';
import { useIsMobile } from '../hooks/useIsMobile';
import { useComparacion } from '../hooks/useComparacion';
import { useZonaSeleccionada } from '../hooks/useZonaSeleccionada';
import { FichaZonaDesktop, FichaZonaMovil } from './ZonaSelectionPanels';
import SegmentedControl from './SegmentedControl';
import ZoneDropdownList from './ZoneDropdownList';
import { DashboardMapLegend, DashboardMapStatus } from './DashboardMapChrome';
import DashboardSelect from './DashboardSelect';
import DashboardHeatmapTable from './DashboardHeatmapTable';
import DashboardRankingTable from './DashboardRankingTable';
import EstadoBadge from './EstadoBadge';
import PeriodSelector from './PeriodSelector';
import ZoneSearch, { ZoneSearchOption } from './ZoneSearch';
import { PRICE_ANALYSIS_LABEL } from '../lib/product-copy';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import type { MapZoneHoverContext } from './MadridMap';

ChartJS.register(ChartDataLabels, cssColorResolverPlugin);

const COMPARISON_COLORS = {
  zoneA: '#00E5FF',
  zoneB: '#FFB65C',
  forecastA: '#00E5FF',
  forecastB: '#FFB65C',
} as const;

const COMPARISON_MEDIA_COLOR = '#E5F2F7';
const VIVIENDA_TIPO_M2 = 70;

type ComparisonLegendItem = { index: number; label: string; color: string; kind: 'real' | 'estimated' | 'madrid' };

const ComparisonSeriesLegend = ({ chartId, items }: { chartId: string; items: ComparisonLegendItem[] }) => {
  const [, setRevision] = useState(0);
  return (
    <div className="v2-comparison-line-legend" aria-label="Leyenda de la comparación">
      {items.map(item => {
        const chart = ChartJS.getChart(chartId) as any;
        const visible = chart ? chart.isDatasetVisible(item.index) : true;
        const displayLabel = item.label || (item.kind === 'madrid'
          ? '···· Media Madrid (Registro Ayto. Madrid Q2 2026)'
          : '');
        const tooltip = item.kind === 'estimated'
          ? 'Estimación proyectada mediante modelo de Machine Learning considerando estacionalidad e inflación'
          : item.kind === 'madrid'
            ? 'Media de la ciudad de Madrid (Registro Ayto. Madrid Q2 2026)'
            : 'Registro oficial contrastado del Ayuntamiento';
        return (
          <button
            key={item.index}
            type="button"
            aria-pressed={visible}
            title={tooltip}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (!chart) return;
              chart.setDatasetVisibility(item.index, !visible);
              chart.update('none');
              setRevision(value => value + 1);
            }}
          >
            <i className={`line-${item.kind}`} style={{ borderColor: item.color }} />
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
};

const ComparisonSeriesChips = ({ chartId, zoneA, zoneB, madridLabel = 'Media Madrid (21,61 €/m² · Q2 2026)' }: { chartId: string; zoneA: string; zoneB: string; madridLabel?: string }) => {
  const [, setRevision] = useState(0);
  const groups = [
    { key: 'A', label: zoneA, indexes: [0, 1], color: '#00e5ff' },
    { key: 'B', label: zoneB, indexes: [2, 3], color: '#ffb65c' },
    { key: 'Madrid', label: madridLabel, indexes: [4], color: '#dce8f2' },
  ].filter(group => Boolean(group.label));
  return <div className="v2-compare-legend" aria-label="Series de la comparación">
    {groups.map(group => {
      const chart = ChartJS.getChart(chartId) as any;
      const isVisible = chart ? group.indexes.some(index => chart.isDatasetVisible(index)) : true;
      return <button key={group.key} type="button" className={`v2-series-chip series-${group.key.toLowerCase()}`} aria-pressed={isVisible} onClick={() => {
        if (!chart) return;
        const nextVisible = !isVisible;
        group.indexes.forEach(index => { if (chart.data.datasets[index]) chart.setDatasetVisibility(index, nextVisible); });
        chart.update('none');
        setRevision(value => value + 1);
      }}><i style={{ backgroundColor: group.color }} />{group.label}</button>;
    })}
  </div>;
};

const MadridMap = dynamic(() => import('./MadridMap'), { ssr: false });

const PROFILES = [
  { id: 'alquiler', label: 'Alquiler', color: '#00E5FF', op: 'alquiler' },
  { id: 'compra', label: 'Compra', color: '#FBBF24', op: 'venta' },
  { id: 'venta', label: 'Venta', color: '#34D399', op: 'venta' },
  { id: 'inversion', label: 'Inversión', color: '#C084FC', op: 'inversion' },
];

// La comparación es común a todos los perfiles; solo cambia la métrica y su unidad.
const getComparisonMetric = (profileId: string) => profileId === 'inversion'
  ? { label: 'Rentabilidad', unit: '%', tooltipUnit: '%', multiplier: 100, decimals: 2 }
  : { label: 'Precio m²', unit: '€/m²', tooltipUnit: '€/m²', multiplier: 1, decimals: profileId === 'alquiler' ? 2 : 1 };

const getMapLegendLabels = (profileId: string) => {
  if (profileId === 'inversion') return ['< 4,3 %', '4,3–5,0 %', '5,0–5,7 %', '5,7–6,5 %', '≥ 6,5 %'];
  if (profileId === 'venta' || profileId === 'compra') return ['< 2.500 €/m²', '2.500–3.800 €/m²', '3.800–5.200 €/m²', '5.200–6.800 €/m²', '≥ 6.800 €/m²'];
  return ['< 16 €/m²', '16–19 €/m²', '19–22 €/m²', '22–25 €/m²', '≥ 25 €/m²'];
};


const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MADRID_NAME_EXCEPTIONS: Record<string, string> = {
  'Puente De Vallecas': 'Puente de Vallecas',
  'Villa De Vallecas': 'Villa de Vallecas',
  'Alameda De Osuna': 'Alameda de Osuna',
};
const formatMadridName = (value: string) => MADRID_NAME_EXCEPTIONS[value] || value;
const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
const formatEuro = (value: number, maximumFractionDigits = 0) => `${formatNumber(value, maximumFractionDigits)} €`;
const formatZoneOption = (value: string) => value === 'Todos' ? 'Madrid (media)' : formatMadridName(value);
const normalizeZoneLabel = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

const getNiceChartScale = (datasets: Array<Array<number | null>>) => {
  const values = datasets.flat().filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return { min: undefined, max: undefined, stepSize: undefined };
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = Math.max(high - low, Math.abs(high) * 0.04, 0.1);
  const paddedLow = Math.max(0, low - spread * 0.16);
  const paddedHigh = high + spread * 0.16;
  const rawStep = Math.max((paddedHigh - paddedLow) / 5, 0.01);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const stepSize = nice * magnitude;
  return {
    min: Math.max(0, Math.floor(paddedLow / stepSize) * stepSize),
    max: Math.ceil(paddedHigh / stepSize) * stepSize,
    stepSize,
  };
};

const createAreaGradient = (context: any, color: string, opacity = 0.25) => {
  try {
    const chart = context?.chart;
    const ctx = chart?.ctx;
    const area = chart?.chartArea;
    if (!ctx || !area || typeof area.top !== 'number' || typeof area.bottom !== 'number' || !Number.isFinite(area.top) || !Number.isFinite(area.bottom) || area.bottom <= area.top) {
      return colorWithAlpha(color, opacity);
    }
    const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0, colorWithAlpha(color, opacity));
    gradient.addColorStop(0.65, colorWithAlpha(color, opacity * 0.35));
    gradient.addColorStop(1, colorWithAlpha(color, 0));
    return gradient;
  } catch {
    return colorWithAlpha(color, opacity);
  }
};

const getCurrentMadridPeriod = () => {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'long',
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value || String(new Date().getFullYear());
  const month = parts.find(part => part.type === 'month')?.value || '';
  const monthLabel = `${month.charAt(0).toLocaleUpperCase('es-ES')}${month.slice(1)}`;
  return { year, month: MONTHS_ES.includes(monthLabel) ? monthLabel : MONTHS_ES[new Date().getMonth()] };
};

const getServiceIcon = (key: string) => {
  switch (key) {
    case 'transport':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="16" rx="2" ry="2"></rect>
          <line x1="9" y1="18" x2="15" y2="18"></line>
          <line x1="5" y1="8" x2="19" y2="8"></line>
          <circle cx="8" cy="14" r="1"></circle>
          <circle cx="16" cy="14" r="1"></circle>
        </svg>
      );
    case 'hospital':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      );
    case 'school':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10l-10-5-10 5 10 5 10-5z"></path>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
        </svg>
      );
    case 'university':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      );
    case 'park':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 22h20L12 2z"></path>
          <path d="M12 12v10"></path>
        </svg>
      );
    case 'shop':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      );
    default:
      return null;
  }
};

const renderLightningBolts = (stars: number, speed: string, color: string) => {
  const bolts = [];
  for (let i = 0; i < stars; i++) {
    bolts.push(
      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--coral)', marginRight: '2px' }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    );
  }

  let badgeColorClass = 'blue';
  if (color === 'orange') badgeColorClass = 'coral';
  if (color === 'red') badgeColorClass = 'coral-deep';
  if (color === 'blue-light') badgeColorClass = 'blue-light';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{bolts}</div>
      <span className={`v2-connectivity-badge ${badgeColorClass}`} style={{ minWidth: '76px', fontSize: '11px', padding: '3px 8px' }}>
        {speed}
      </span>
    </div>
  );
};

const getActivityLabel = (speed: string) => {
  const normalized = (speed || '').toLowerCase();
  if (normalized.includes('muy fácil')) return 'Actividad alta';
  if (normalized.includes('fácil')) return 'Actividad media-alta';
  if (normalized.includes('moderado')) return 'Actividad media';
  if (normalized.includes('lento')) return 'Actividad baja';
  return 'Actividad no disponible';
};

const InfoTooltip: React.FC<{
  title: string;
  description: string;
  example?: string;
  ruleOfThumb?: string;
  align?: 'left' | 'right' | 'center';
}> = ({ title, description, example, ruleOfThumb, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      // Calculate position from trigger button
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const popupWidth = 280;
        let left: number;
        if (align === 'right') {
          left = rect.right - popupWidth;
        } else if (align === 'center') {
          left = rect.left + rect.width / 2 - popupWidth / 2;
        } else {
          left = rect.left;
        }
        // Keep within viewport
        if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
        if (left < 8) left = 8;
        setPopupStyle({
          position: 'fixed',
          top: rect.bottom + 6,
          left,
          width: popupWidth + 'px',
          zIndex: 999999,
        });
      }
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, align]);

  const popup = open ? (
    <div
      className="v2-info-tooltip"
      style={{
        ...popupStyle,
        backgroundColor: 'var(--azul-noche)',
        color: 'var(--blanco-humo)',
        padding: '12px 14px',
        borderRadius: '12px',
        boxShadow: '0 10px 28px color-mix(in srgb, var(--azul-noche) 35%, transparent)',
        border: '0.5px solid color-mix(in srgb, var(--blanco-humo) 15%, transparent)',
        fontSize: '12px',
        lineHeight: 1.45,
        pointerEvents: 'none',
        textAlign: 'left',
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--blanco-humo)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ color: 'var(--humo-2)', fontSize: '11.5px', marginBottom: ruleOfThumb || example ? '6px' : '0' }}>
        {description}
      </div>
      {example && (
        <div style={{ color: 'var(--precio-subida)', fontSize: '11px', fontWeight: '400', marginBottom: '4px', borderTop: '0.5px solid color-mix(in srgb, var(--blanco-humo) 10%, transparent)', paddingTop: '5px' }}>
          <strong style={{ color: 'var(--blanco-humo)', fontWeight: '600' }}>Ejemplo:</strong> {example}
        </div>
      )}
      {ruleOfThumb && (
        <div style={{ color: 'var(--coral)', fontSize: '11px', fontWeight: '400', borderTop: example ? 'none' : '0.5px solid color-mix(in srgb, var(--blanco-humo) 10%, transparent)', paddingTop: example ? '0' : '5px' }}>
          <strong style={{ color: 'var(--blanco-humo)', fontWeight: '600' }}>Referencia:</strong> {ruleOfThumb}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className="v2-info-tooltip-trigger"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label={`Información sobre ${title}`}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: '1px solid #00E5FF',
          backgroundColor: open ? 'var(--precio-subida)' : 'var(--blanco-humo)',
          color: '#011024',
          fontSize: '11px',
          fontWeight: '700',
          fontStyle: 'italic',
          fontFamily: 'serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
      >
        i
      </button>
      {typeof document !== 'undefined' && popup && ReactDOM.createPortal(popup, document.body)}
    </div>
  );
};

const formatGroupedIntEs = (val: number) => Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatCurrencyInt = (val: number | null | undefined, unit: string = '€') => {
  if (val === null || val === undefined || !Number.isFinite(Number(val)) || Number(val) <= 0) return '—';
  const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' as any }).format(Math.round(Number(val)));
  return `${formatted} ${unit}`.trim();
};

const formatCurrencyDec = (val: number | null | undefined, decimals: number = 2, unit: string = '€/m²') => {
  if (val === null || val === undefined || !Number.isFinite(Number(val)) || Number(val) <= 0) return '—';
  const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(val));
  return `${formatted} ${unit}`.trim();
};

const toPercent = (decimalRatio: number) => decimalRatio * 100;

const formatSpanishPercentage = (val: number | null | undefined, decimals: number = 1, showPlus: boolean = true) => {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  const num = Number(val);
  const sign = num > 0 && showPlus ? '+' : num < 0 ? '−' : '';
  const formatted = Math.abs(num).toFixed(decimals).replace('.', ',');
  return `${sign}${formatted} %`;
};

const getComparisonKpiInfo = (metric: string, zoneName: string) => {
  switch (metric) {
    case 'precio_m2_alquiler':
      return {
        title: `Precio m² Alquiler · ${zoneName}`,
        description: `Indica cuánto cuesta de media cada metro cuadrado de alquiler aquí. Te permite comparar de forma directa si ${zoneName} es más cara o más barata que otras zonas, sin importar los metros que tenga cada piso.`,
        example: `Para una casa tipo de 80 m², si el precio es 23 €/m², el alquiler mensual rondará los 1.840 €.`,
        ruleOfThumb: `Es la cifra base para comparar el esfuerzo inicial que requiere mudarse a esta zona.`
      };
    case 'alquiler_medio':
      return {
        title: `Alquiler Medio Estimado (70 m²) · ${zoneName}`,
        description: `Cálculo representativo del coste mensual total para una vivienda estándar de 70 m² en ${zoneName}, obtenido a partir del precio por metro cuadrado de la zona.`,
        example: `Para un piso de 70 m² a 20 €/m², la mensualidad estimada de referencia se sitúa en torno a 1.400 €/mes.`,
        ruleOfThumb: `Es la cifra más tangible para planificar tu presupuesto mensual real de vivienda frente a tus ingresos netos.`
      };
    case 'roi_alquiler':
      return {
        title: `Rentabilidad bruta · ${zoneName}`,
        description: `Mide los ingresos anuales del alquiler respecto al precio de compra en ${zoneName}, antes de gastos, impuestos, vacancia y financiación.`,
        example: `Un 4% significa que por cada 100.000 € de valor del inmueble, se ingresan unos 4.000 € brutos al año.`,
        ruleOfThumb: `En barrios muy consolidados suele ser menor (3-4%) por el alto valor de compra; en áreas en expansión o asequibles suele subir al 5% o más.`
      };
    case 'esfuerzo':
      return {
        title: `Tasa de Esfuerzo · ${zoneName}`,
        description: `Porcentaje de los ingresos brutos del hogar en este distrito que se destinan al pago del alquiler (Dato INE + Ayto. Madrid).`,
        example: `Un 25% significa que de un sueldo de 2.000 €, 500 € van directos a la vivienda y quedan 1.500 € para los demás gastos.`,
        ruleOfThumb: `El umbral saludable fijado por los expertos es no pasar del 30%-35%. Superar el 40% refleja tensión y sobreesfuerzo crítico.`
      };
    case 'precio_m2_compra':
      return {
        title: `Precio m² Compra · ${zoneName}`,
        description: `El precio medio de venta por cada metro cuadrado construido en ${zoneName}. Permite evaluar el valor patrimonial real de los pisos de la zona de forma objetiva.`,
        example: `Si compras un piso de 90 m² a 4.500 €/m², el coste de compra rondará los 405.000 €.`,
        ruleOfThumb: `Úsalo como referencia para calcular el tamaño de vivienda al que puedes aspirar según tu presupuesto o hipoteca.`
      };
    case 'poder_adquisitivo':
      return {
        title: `Renta Media de los Hogares · ${zoneName}`,
        description: `Los ingresos netos medios anuales de las familias empadronadas en ${zoneName}. Refleja el poder adquisitivo real y el perfil económico de los residentes del barrio.`,
        example: `Permite contrastar si los precios de las casas están en sintonía con los sueldos reales de quienes viven allí.`,
        ruleOfThumb: `Zonas con rentas altas suelen tener mayor demanda comercial y menor tasa de morosidad.`
      };
    case 'variacion_anual':
      return {
        title: `Variación Anual · ${zoneName}`,
        description: `Cuánto han subido o bajado los precios en ${zoneName} en los últimos 12 meses. Marca el ritmo de revalorización o moderación del mercado en este barrio.`,
        example: `Un +4% significa que un piso que costaba 250.000 € el año pasado hoy ronda los 260.000 €.`,
        ruleOfThumb: `Una variación positiva y moderada indica que el barrio gana valor con estabilidad y sin burbujas.`
      };
    case 'precio_m2_venta':
      return {
        title: `Precio m² Venta · ${zoneName}`,
        description: `El precio medio por metro cuadrado al que se están cerrando las operaciones de compraventa en ${zoneName}. Es el baremo clave para tasar tu casa.`,
        example: `Si quieres vender un piso de 75 m² y el metro está en 3.200 €, su valor de mercado de partida es de unos 240.000 €.`,
        ruleOfThumb: `Ajustar el precio de salida a esta media acorta drásticamente el tiempo de venta y evita tener que hacer rebajas forzadas.`
      };
    case 'velocidad_venta':
      return {
        title: `Plazo de Venta · ${zoneName}`,
        description: `Tiempo medio estimado en meses que tarda en venderse una vivienda en ${zoneName} desde que se publica el anuncio hasta la firma en notaría.`,
        example: `Menos de 2 meses indica un mercado muy ágil donde los pisos se reservan rápido; más de 3 meses refleja negociaciones más pausadas.`,
        ruleOfThumb: `Si el plazo es rápido hay poco margen para regatear; si es pausado, los compradores tienen mayor fuerza para negociar el precio.`
      };
    case 'roi_neto':
      return {
        title: `Rentabilidad neta · ${zoneName}`,
        description: `La ganancia anual real que te queda limpia en ${zoneName} tras descontar gastos fijos indispensables: comunidad, IBI, seguro de hogar/impago y mantenimiento.`,
        example: `Si un alquiler genera 9.000 € brutos al año pero soportas 1.500 € en gastos, la rentabilidad neta calcula sobre los 7.500 € netos.`,
        ruleOfThumb: `Es la cifra más honesta y decisiva para saber cuánto dinero entrará verdaderamente en tu cuenta bancaria.`
      };
    case 'grm':
      return {
        title: `Años de Recuperación (GRM) · ${zoneName}`,
        description: `Mide cuántos años de cobro íntegro de alquiler necesitas para cubrir el precio total de compra de la vivienda en ${zoneName}.`,
        example: `Un GRM de 20 años significa que con 20 años de rentas brutas habrás amortizado el 100% de lo que costó el piso.`,
        ruleOfThumb: `Cuanto menor sea el número de años, más rápido recuperas el capital invertido.`
      };
    case 'volatilidad':
      return {
        title: `Índice de riesgo · ${zoneName}`,
        description: `Índice comparativo de dispersión histórica de precios, normalizado entre 10 y 90 para ordenar las zonas. No es una volatilidad porcentual ni una probabilidad.`,
        example: `Un 70 indica más variación histórica que una zona con índice 35; no significa que el precio vaya a caer un 70%.`,
        ruleOfThumb: `Úsalo junto a la rentabilidad y al histórico real: un índice alto implica más variación observada, no una predicción de pérdida.`
      };
    default:
      return {
        title: `Indicador · ${zoneName}`,
        description: `Métrica clave para comparar y analizar el mercado en ${zoneName}.`
      };
  }
};

const NO_OFFICIAL_DATA_COPY = 'El Ayuntamiento de Madrid no publica registros oficiales contrastados para esta zona. Preferimos no inventarlos.';
const NO_PROJECTION_COPY = 'No hay base suficiente para proyectar esta zona, y no aproximamos valores sin datos.';

function AvisoComparacionDesktop({ zone, projectionWithoutHistory, onReload, isReloading }: { zone: string; projectionWithoutHistory: boolean; onReload?: () => void; isReloading?: boolean }) {
  return (
    <div className="v2-no-data-notice">
      <span>{zone}</span>
      <strong>{projectionWithoutHistory ? 'Sin datos oficiales ni estimación' : 'Sin datos oficiales'}</strong>
      <p>{NO_OFFICIAL_DATA_COPY}</p>
      {projectionWithoutHistory && <p>{NO_PROJECTION_COPY}</p>}
      {onReload && (
        <button type="button" className={`v2-reload-action-btn ${isReloading ? 'is-spinning' : ''}`} onClick={onReload} disabled={isReloading}>
          <RotateCw size={13} className={isReloading ? 'v2-spin' : ''} />
          <span>{isReloading ? 'Consultando registros…' : `Volver a cargar ${zone}`}</span>
        </button>
      )}
    </div>
  );
}

function AvisoComparacionMovil({ zone, projectionWithoutHistory, onReload, isReloading }: { zone: string; projectionWithoutHistory: boolean; onReload?: () => void; isReloading?: boolean }) {
  return (
    <div className="v2-no-data-notice">
      <span>{zone}</span>
      <strong>{projectionWithoutHistory ? 'Sin datos oficiales ni estimación' : 'Sin datos oficiales'}</strong>
      <p>{NO_OFFICIAL_DATA_COPY}</p>
      {projectionWithoutHistory && <p>{NO_PROJECTION_COPY}</p>}
      {onReload && (
        <button type="button" className={`v2-reload-action-btn ${isReloading ? 'is-spinning' : ''}`} onClick={onReload} disabled={isReloading}>
          <RotateCw size={13} className={isReloading ? 'v2-spin' : ''} />
          <span>{isReloading ? 'Consultando…' : `Volver a cargar ${zone}`}</span>
        </button>
      )}
    </div>
  );
}

const MadridDashboardV2: React.FC = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileParam = searchParams.get('profile');

  // State: Perfiles
  const [profileIdx, setProfileIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // State: Custom Dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mapLevel, setMapLevel] = useState<'districts' | 'neighborhoods'>('districts');
  const [draftFilters, setDraftFilters] = useState({ year: '', month: '', district: 'Todos', barrio: 'Todos' });
  const [draftBarrios, setDraftBarrios] = useState<string[]>(['Todos']);
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useComparacion();
  const [comparisonZoneA, setComparisonZoneA] = useState<ZoneSearchOption>({ id: 'district:name:Salamanca', name: 'Salamanca', kind: 'district' });
  const [comparisonZoneB, setComparisonZoneB] = useState<ZoneSearchOption>({ id: 'district:name:Centro', name: 'Centro', kind: 'district' });
  const [activeComparePicker, setActiveComparePicker] = useState<'a' | 'b' | null>(null);
  const selectedZoneA = comparisonZoneA.name;
  const selectedZoneB = comparisonZoneB.name;
  const [latestAvailablePeriod, setLatestAvailablePeriod] = useState({ year: '2026', month: 'Junio' });
  const [selectedDistrict, setSelectedDistrict] = useState('Todos');
  const [selectedBarrio, setSelectedBarrio] = useState('Todos');
  const [compareMapTarget, setCompareMapTarget] = useState<'A' | 'B'>('A');

  // State: Dynamic Options
  const [availableYears, setAvailableYears] = useState<string[]>(['2023', '2024', '2025']);
  const [monthsByYear, setMonthsByYear] = useState<Record<string, string[]>>({});
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(['Todos', 'Salamanca', 'Centro', 'Chamberí', 'Retiro']);
  const [availableBarrios, setAvailableBarrios] = useState<string[]>(['Todos']);
  const [neighborhoodFeatureCount, setNeighborhoodFeatureCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/barrios_polygons.geojson', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(geojson => {
        if (Array.isArray(geojson?.features)) {
          setNeighborhoodFeatureCount(geojson.features.filter((feature: any) => {
            const properties = feature?.properties || {};
            return Boolean(properties.barrio || properties.nombre || properties.name);
          }).length);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // State: Real Data
  const [kpiData, setKpiData] = useState<any>({});
  const [kpiDataA, setKpiDataA] = useState<any>({});
  const [kpiDataB, setKpiDataB] = useState<any>({});
  const [seriesA, setSeriesA] = useState<any[]>([]);
  const [seriesB, setSeriesB] = useState<any[]>([]);
  const [isZoneALoading, setIsZoneALoading] = useState(false);
  const [isZoneBLoading, setIsZoneBLoading] = useState(false);
  const isComparisonLoading = isZoneALoading || isZoneBLoading;
  const [seriesMadrid, setSeriesMadrid] = useState<any[]>([]);
  const comparisonAHasData = seriesA.some(point => Number(point?.precio_m2) > 0);
  const comparisonBHasData = seriesB.some(point => Number(point?.precio_m2) > 0);

  const [reloadKeyA, setReloadKeyA] = useState(0);
  const [reloadKeyB, setReloadKeyB] = useState(0);
  const [isReloadingA, setIsReloadingA] = useState(false);
  const [isReloadingB, setIsReloadingB] = useState(false);

  const reloadZoneA = useCallback(() => {
    setIsReloadingA(true);
    setReloadKeyA(k => k + 1);
    setTimeout(() => setIsReloadingA(false), 900);
  }, []);

  const reloadZoneB = useCallback(() => {
    setIsReloadingB(true);
    setReloadKeyB(k => k + 1);
    setTimeout(() => setIsReloadingB(false), 900);
  }, []);

  const reloadComparison = useCallback(() => {
    reloadZoneA();
    reloadZoneB();
  }, [reloadZoneA, reloadZoneB]);

  const [isOverlayOpen, setIsOverlayOpen] = useState(true);
  const [compareGraphView, setCompareGraphView] = useState<'superpuesta' | 'paralela'>('superpuesta');
  const effectiveCompareGraphView = isMobile ? 'superpuesta' : compareGraphView;
  const [showAllPerMobile, setShowAllPerMobile] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [showDashboardLoader, setShowDashboardLoader] = useState(true);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersAttempt, setFiltersAttempt] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMapHelpModal, setShowMapHelpModal] = useState(false);
  const [showHeatmapHelpModal, setShowHeatmapHelpModal] = useState(false);
  const [showCompareHelpModal, setShowCompareHelpModal] = useState(false);
  const [showMethodologyDrawer, setShowMethodologyDrawer] = useState(false);
  const [netYieldValue, setNetYieldValue] = useState<number | null>(null);
  const [isNetYieldActive, setIsNetYieldActive] = useState(false);
  const [mapData, setMapData] = useState<{districts: any[], neighborhoods: any[]}>({ districts: [], neighborhoods: [] });
  const [isMapLoading, setIsMapLoading] = useState(true);
  const zoneSearchOptions = useMemo<ZoneSearchOption[]>(() => {
    const districts = new Map<string, ZoneSearchOption>();
    availableDistricts.filter(name => name !== 'Todos').forEach(name => districts.set(normalizeZoneLabel(name), { id: `district:name:${normalizeZoneLabel(name)}`, name, kind: 'district' }));
    mapData.districts.forEach((item: any) => {
      const name = String(item.distrito || item.nombre || item.name || '').trim();
      if (name) districts.set(normalizeZoneLabel(name), { id: `district:${item.id_distrito ?? `name:${normalizeZoneLabel(name)}`}`, name, kind: 'district' });
    });
    const barrios = new Map<string, ZoneSearchOption>();
    mapData.neighborhoods.forEach((item: any) => {
      const name = String(item.barrio || item.nombre || item.name || '').trim();
      const district = String(item.distrito || item.district || '').trim();
      if (!name || !district) return;
      barrios.set(`${normalizeZoneLabel(district)}:${normalizeZoneLabel(name)}`, { id: `barrio:${item.id_barrio ?? `name:${normalizeZoneLabel(district)}:${normalizeZoneLabel(name)}`}`, name, district, kind: 'barrio' });
    });
    return [
      { id: 'city-madrid', name: 'Madrid', kind: 'city' },
      ...Array.from(districts.values()),
      ...Array.from(barrios.values()),
    ];
  }, [availableDistricts, mapData.districts, mapData.neighborhoods]);
  useEffect(() => {
    if (comparisonZoneA.id.startsWith('district:name:')) {
      const match = zoneSearchOptions.find(option => option.kind === 'district' && normalizeZoneLabel(option.name) === normalizeZoneLabel(comparisonZoneA.name));
      if (match) setComparisonZoneA(match);
    }
    if (comparisonZoneB.id.startsWith('district:name:')) {
      const match = zoneSearchOptions.find(option => option.kind === 'district' && normalizeZoneLabel(option.name) === normalizeZoneLabel(comparisonZoneB.name));
      if (match) setComparisonZoneB(match);
    }
  }, [zoneSearchOptions, comparisonZoneA.id, comparisonZoneA.name, comparisonZoneB.id, comparisonZoneB.name]);
  const {
    selectedZone: selectedMapFeature,
    activeZone: activeMapFeature,
    selectedZoneData,
    activeZoneData,
    selectZone,
    hoverZone,
    clearSelection,
  } = useZonaSeleccionada({
    districts: mapData.districts,
    neighborhoods: mapData.neighborhoods,
    normalize: normalizeZoneLabel,
  });
  const [desktopZoneHover, setDesktopZoneHover] = useState<MapZoneHoverContext | null>(null);
  const desktopZoneHoverRef = useRef<MapZoneHoverContext | null>(null);
  const [desktopPinnedZone, setDesktopPinnedZone] = useState<MapZoneHoverContext | null>(null);
  const [rankings, setRankings] = useState<{ topDist: any[], botDist: any[], topBarr: any[], botBarr: any[] }>({
    topDist: [], botDist: [], topBarr: [], botBarr: []
  });
  const [rankingPreviousValues, setRankingPreviousValues] = useState<Record<string, number>>({});
  const [ventaRentM2, setVentaRentM2] = useState<number>(0);
  const [isRankingsLoading, setIsRankingsLoading] = useState(true);
  const [affordabilityData, setAffordabilityData] = useState<any[]>([]);
  const [seasonalTrend, setSeasonalTrend] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(true);
  const [heatmapDataSourceKey, setHeatmapDataSourceKey] = useState('');
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [rankingLevel, setRankingLevel] = useState<'Distritos' | 'Barrios'>('Distritos');
  const [rankingMetric, setRankingMetric] = useState<'demand' | 'total' | 'unit'>('total');
  const [rankingOrder, setRankingOrder] = useState('affordable');
  const [scatterData, setScatterData] = useState<any[]>([]);
  const [connectivityData, setConnectivityData] = useState<any>(null);
  const [liquidityLevel, setLiquidityLevel] = useState<'distrito' | 'barrio'>('distrito');
  const [liquidityData, setLiquidityData] = useState<any[]>([]);

  // User simulation states
  const [userRentSalary, setUserRentSalary] = useState<string>('');
  const [showRentCalculator, setShowRentCalculator] = useState(false);
  const [userPurchaseIncome, setUserPurchaseIncome] = useState<string>('');
  const [userPurchaseSavings, setUserPurchaseSavings] = useState<string>('');
  const [showPurchaseSim, setShowPurchaseSim] = useState<boolean>(false);
  const [userInvCapital, setUserInvCapital] = useState<string>('');
  const [userInvDuration, setUserInvDuration] = useState<string>('');
  const [showInvSim, setShowInvSim] = useState<boolean>(false);

  // Accordion states (closed by default to level sidebar with maps)
  const [isPurchaseSimOpen, setIsPurchaseSimOpen] = useState<boolean>(false);
  const [isRentSimOpen, setIsRentSimOpen] = useState<boolean>(false);
  const [isInvSimOpen, setIsInvSimOpen] = useState<boolean>(false);
  const [isVentaMoreOpen, setIsVentaMoreOpen] = useState<boolean>(false);

  const [ltvPercent, setLtvPercent] = useState<number>(65);
  const [madridInvYield, setMadridInvYield] = useState<number>(0);
  const [interestImpactData, setInterestImpactData] = useState<any[]>([]);
  const [riskReturnData, setRiskReturnData] = useState<any[]>([]);
  const [liquidityZoneA, setLiquidityZoneA] = useState<string>('Cargando...');
  const [liquidityZoneB, setLiquidityZoneB] = useState<string>('Cargando...');
  const [volatilityZoneA, setVolatilityZoneA] = useState<string>('Cargando...');
  const [volatilityZoneB, setVolatilityZoneB] = useState<string>('Cargando...');

  const perList = useMemo(() => {
    if (Array.isArray(riskReturnData) && riskReturnData.length > 0) {
      return riskReturnData
        .filter(d => Number(d.roi) > 0)
        .map(d => {
          const roi = Number(d.roi);
          const perYears = Number((100 / roi).toFixed(1));
          return {
            name: d.name,
            per: perYears,
            roi,
            tag: perYears < 16 ? 'Retorno Ágil' : perYears < 22 ? 'Equilibrado' : 'Valor Refugio',
            color: perYears < 16 ? '#E879F9' : perYears < 22 ? '#3DDC97' : '#FFC247'
          };
        })
        .sort((a, b) => a.per - b.per);
    }
    return [
      { name: 'Usera', per: 14.2, tag: 'Retorno Ágil', color: '#E879F9' },
      { name: 'Puente de Vallecas', per: 14.8, tag: 'Retorno Ágil', color: '#E879F9' },
      { name: 'Villaverde', per: 15.3, tag: 'Retorno Ágil', color: '#E879F9' },
      { name: 'Carabanchel', per: 16.4, tag: 'Equilibrado', color: '#3DDC97' },
      { name: 'Latina', per: 17.5, tag: 'Equilibrado', color: '#3DDC97' },
      { name: 'Arganzuela', per: 22.1, tag: 'Valor Refugio', color: '#FFC247' },
      { name: 'Centro', per: 23.8, tag: 'Valor Refugio', color: '#FFC247' },
      { name: 'Chamberí', per: 25.2, tag: 'Valor Refugio', color: '#FFC247' },
      { name: 'Salamanca', per: 28.5, tag: 'Valor Refugio', color: '#FFC247' },
    ];
  }, [riskReturnData]);

  const [containerHeight, setContainerHeight] = useState('auto');
  const activePanelRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<any[]>([]);
  const latestDashboardRequest = useRef(0);
  const hasLoadedPrimaryKpis = useRef(false);

  const updateKpiScrollState = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const shell = el.closest('.v2-kpi-scroll-shell') as HTMLElement | null;
    if (!shell) return;
    const hasMoreBelow = el.scrollHeight - el.scrollTop - el.clientHeight > 6;
    shell.classList.toggle('has-more-below', hasMoreBelow);
  }, []);

  const scrollAccordionIntoContainer = useCallback((accordionEl: HTMLElement | null) => {
    if (!accordionEl) return;
    const scrollContainer = accordionEl.closest('.v2-kpi-stack') as HTMLElement | null;
    if (!scrollContainer) return;
    if (scrollContainer.scrollHeight <= scrollContainer.clientHeight + 2) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const accRect = accordionEl.getBoundingClientRect();
    const targetTop = Math.max(0, accRect.top - containerRect.top + scrollContainer.scrollTop - 8);
    scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, []);

  const handleAccordionToggle = useCallback((
    e: React.MouseEvent<HTMLButtonElement>,
    isCurrentlyOpen: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const nextOpen = !isCurrentlyOpen;
    const accordionEl = e.currentTarget.closest('.v2-sim-accordion') as HTMLElement | null;
    setOpen(nextOpen);
    if (nextOpen && accordionEl) {
      window.setTimeout(() => {
        scrollAccordionIntoContainer(accordionEl);
        updateKpiScrollState(accordionEl.closest('.v2-kpi-stack') as HTMLElement | null);
      }, 90);
      window.setTimeout(() => {
        scrollAccordionIntoContainer(accordionEl);
        updateKpiScrollState(accordionEl.closest('.v2-kpi-stack') as HTMLElement | null);
      }, 310);
    } else if (accordionEl) {
      window.setTimeout(() => {
        updateKpiScrollState(accordionEl.closest('.v2-kpi-stack') as HTMLElement | null);
      }, 310);
    }
  }, [scrollAccordionIntoContainer, updateKpiScrollState]);

  useEffect(() => {
    const kpiStack = activePanelRef.current?.querySelector('.v2-kpi-stack') as HTMLElement | null;
    if (!kpiStack) return;
    const syncFade = () => updateKpiScrollState(kpiStack);
    syncFade();
    const ro = new ResizeObserver(syncFade);
    ro.observe(kpiStack);
    Array.from(kpiStack.children).forEach(child => ro.observe(child));
    window.addEventListener('resize', syncFade);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncFade);
    };
  }, [profileIdx, isRentSimOpen, isPurchaseSimOpen, isInvSimOpen, isVentaMoreOpen, showPurchaseSim, showInvSim, isNetYieldActive, netYieldValue, updateKpiScrollState]);

  useEffect(() => {
    if (!showHelpModal && !showMapHelpModal && !showHeatmapHelpModal && !showCompareHelpModal) return;
    lockScroll();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeButton = document.querySelector<HTMLElement>('.v2-help-modal-close');
    closeButton?.focus();
    const handleHelpKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowHelpModal(false);
        setShowMapHelpModal(false);
        setShowHeatmapHelpModal(false);
        setShowCompareHelpModal(false);
      } else if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('.v2-guide-modal[role="dialog"]');
        const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])
          .filter(element => element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleHelpKeyDown);
    return () => {
      unlockScroll();
      document.removeEventListener('keydown', handleHelpKeyDown);
      previousFocus?.focus();
    };
  }, [showHelpModal, showMapHelpModal, showHeatmapHelpModal, showCompareHelpModal]);

  const activeProfile = PROFILES[profileIdx];
  const selectedMonthIndex = MONTHS_ES.indexOf(selectedMonth);
  const latestObservedMonthIndex = MONTHS_ES.indexOf(latestAvailablePeriod.month);
  const isProjectionPeriod = Number(selectedYear) > Number(latestAvailablePeriod.year) || (Number(selectedYear) === Number(latestAvailablePeriod.year) && selectedMonthIndex > latestObservedMonthIndex);
  const periodStatusLabel = isProjectionPeriod ? 'Estimación' : 'Dato real';
  const latestRealMonth = latestAvailablePeriod.month;
  const latestRealYear = Number(latestAvailablePeriod.year);
  const visibleFilters = isMobileFiltersOpen ? draftFilters : { year: selectedYear, month: selectedMonth, district: selectedDistrict, barrio: selectedBarrio };
  const firstProjectionMonthIndex = (latestObservedMonthIndex + 1) % MONTHS_ES.length;
  const firstProjectionYear = latestRealYear + (latestObservedMonthIndex === MONTHS_ES.length - 1 ? 1 : 0);
  const firstProjectionMonth = `${MONTHS_ES[firstProjectionMonthIndex]} de ${firstProjectionYear}`;
  const heatmapValues = useMemo(
    () => heatmapData.flatMap(row => Object.keys(row)
      .filter(key => key.startsWith('m'))
      .map(key => Number(row[key]))
      .filter(value => Number.isFinite(value) && value > 0)),
    [heatmapData]
  );
  const heatmapMin = heatmapValues.length ? Math.min(...heatmapValues) : 0;
  const heatmapMax = heatmapValues.length ? Math.max(...heatmapValues) : 0;
  const filteredHeatmapRows = useMemo(() => {
    const query = heatmapSearch.trim().toLocaleLowerCase('es');
    return query ? heatmapData.filter(row => String(row.zona || '').toLocaleLowerCase('es').includes(query)) : heatmapData;
  }, [heatmapData, heatmapSearch]);
  const desktopDisplayedZone = desktopZoneHover || desktopPinnedZone;
  const displayedMapFeature = isMobile ? selectedMapFeature : desktopDisplayedZone?.zoneId || activeMapFeature;
  const displayedZoneData = isMobile
    ? (selectedMapFeature
        ? (mapLevel === 'districts'
            ? (() => {
                const d = mapData.districts.find((item: any) => normalizeZoneLabel(String(item.distrito || '')) === normalizeZoneLabel(selectedMapFeature));
                return d ? { item: d, isDistrict: true } : selectedZoneData;
              })()
            : (() => {
                const b = mapData.neighborhoods.find((item: any) => normalizeZoneLabel(String(item.barrio || '')) === normalizeZoneLabel(selectedMapFeature));
                return b ? { item: b, isDistrict: false } : selectedZoneData;
              })())
        : null)
    : desktopDisplayedZone
      ? { item: desktopDisplayedZone.item, isDistrict: desktopDisplayedZone.zoneType === 'districts' }
      : activeZoneData;
  const mapFeatureIsDistrict = isMobile ? mapLevel === 'districts' : (displayedZoneData?.isDistrict ?? !displayedMapFeature);
  const mapFeatureRows = mapFeatureIsDistrict ? mapData.districts : mapData.neighborhoods;
  const mapFeatureItem = displayedZoneData?.item || null;
  const mapFeatureHasData = Boolean(mapFeatureItem && (activeProfile.id === 'inversion' ? Number(mapFeatureItem.rentabilidad) > 0 : Number(mapFeatureItem.precio_m2) > 0));
  const mapFeatureNoData = Boolean(displayedMapFeature && !mapFeatureHasData);
  const mapFeatureRankRows = mapFeatureRows.filter((item: any) => Number(activeProfile.id === 'inversion' ? item.rentabilidad : item.precio_m2) > 0);
  const mapFeatureRank = !isMobile && desktopDisplayedZone
    ? desktopDisplayedZone.rank
    : mapFeatureItem && displayedMapFeature
      ? [...mapFeatureRankRows].sort((a, b) => Number(activeProfile.id === 'inversion' ? b.rentabilidad || 0 : b.precio_m2 || 0) - Number(activeProfile.id === 'inversion' ? a.rentabilidad || 0 : a.precio_m2 || 0)).findIndex(item => normalizeZoneLabel(String(mapFeatureIsDistrict ? item.distrito : item.barrio || '')) === normalizeZoneLabel(displayedMapFeature)) + 1
      : 0;
  const mapFeatureTotal = !isMobile && desktopDisplayedZone ? desktopDisplayedZone.total : mapFeatureRankRows.length;
  const mapFeatureRankSense = activeProfile.id === 'inversion' ? 'con mayor rentabilidad' : 'más caro';
  const mapFeatureRankLabel = mapFeatureNoData ? undefined : mapFeatureRank
    ? `${mapFeatureRank}.º ${mapFeatureRankSense} de ${mapFeatureTotal} ${mapFeatureIsDistrict ? 'distritos' : 'barrios'}`
    : undefined;
  const mapMetricValue = (item: any) => Number(activeProfile.id === 'inversion' ? item.rentabilidad || 0 : item.precio_m2 || 0);
  const mapFeatureAverage = mapFeatureRankRows.length ? mapFeatureRankRows.reduce((sum, item) => sum + mapMetricValue(item), 0) / mapFeatureRankRows.length : 0;
  const mapFeatureDelta = mapFeatureAverage && mapFeatureItem ? (mapMetricValue(mapFeatureItem) - mapFeatureAverage) / mapFeatureAverage * 100 : null;
  const observedDistrictRows = mapData.districts.filter((item: any) => Number(item.precio_m2) > 0);
  const madridDistrictAverage = observedDistrictRows.length ? observedDistrictRows.reduce((sum, item) => sum + Number(item.precio_m2 || 0), 0) / observedDistrictRows.length : 0;
  const madridMonthlyAverage = mapData.districts.length ? mapData.districts.reduce((sum, item) => sum + Number(item.precio_vivienda || 0), 0) / mapData.districts.length : 0;

  const mapFeatureItemMonthly = Number(mapFeatureItem?.precio_vivienda || mapFeatureItem?.precio_alquiler || 0);
  const mapFeatureMonthlyDelta = madridMonthlyAverage > 0 && mapFeatureItemMonthly > 0
    ? (mapFeatureItemMonthly - madridMonthlyAverage) / madridMonthlyAverage * 100
    : null;

  const formatSpanishDelta = (val: number, metricSuffix: string) => {
    const sign = val > 0 ? '+' : val < 0 ? '−' : '';
    const num = Math.abs(val).toFixed(1).replace('.', ',');
    return `${sign}${num} % ${metricSuffix}`;
  };

  let mapFeatureDeltaLabel: string | null = null;
  const rankingRowForMap = displayedMapFeature
    ? (mapFeatureIsDistrict ? rankings.topDist : rankings.topBarr).find(
        (row: any) => normalizeZoneLabel(String(row.name || '')) === normalizeZoneLabel(displayedMapFeature)
      )
    : null;
  const prevValForMap = displayedMapFeature ? rankingPreviousValues[normalizeZoneLabel(displayedMapFeature)] : undefined;
  const mapFeatureAnnualPct = rankingRowForMap && Number.isFinite(prevValForMap) && prevValForMap! > 0
    ? ((Number(rankingRowForMap.value) - prevValForMap!) / prevValForMap!) * 100
    : null;

  if (isMobile && mapFeatureHasData) {
    if (mapFeatureAnnualPct !== null) {
      mapFeatureDeltaLabel = `Variación anual: ${mapFeatureAnnualPct >= 0 ? '+' : '−'}${Math.abs(mapFeatureAnnualPct).toFixed(1).replace('.', ',')} %`;
    } else if (mapFeatureDelta !== null) {
      mapFeatureDeltaLabel = activeProfile.id === 'inversion'
        ? `${formatSpanishDelta(mapFeatureDelta, 'en rentabilidad')} frente a Madrid`
        : `${formatSpanishDelta(mapFeatureDelta, 'en €/m²')} frente a Madrid`;
    }
  } else if (activeProfile.id === 'inversion') {
    if (mapFeatureDelta !== null) {
      mapFeatureDeltaLabel = `${formatSpanishDelta(mapFeatureDelta, 'en rentabilidad')} frente a la media de Madrid`;
    }
  } else {
    if (mapFeatureDelta !== null && mapFeatureMonthlyDelta !== null) {
      const metricName = activeProfile.id === 'alquiler' ? 'en mensualidad' : 'en vivienda';
      mapFeatureDeltaLabel = `${formatSpanishDelta(mapFeatureDelta, 'en €/m²')} · ${formatSpanishDelta(mapFeatureMonthlyDelta, metricName)} vs. media de Madrid`;
    } else if (mapFeatureDelta !== null) {
      mapFeatureDeltaLabel = `${formatSpanishDelta(mapFeatureDelta, 'en €/m²')} frente a la media de Madrid`;
    }
  }

  const mapFeaturePrimaryLabel = activeProfile.id === 'inversion' ? 'Rentabilidad' : 'Precio medio';
  const mapMetricLabel = activeProfile.id === 'inversion'
    ? 'Rentabilidad bruta (%)'
    : `Precio ${activeProfile.id === 'alquiler' ? 'de alquiler' : activeProfile.id === 'compra' ? 'de compra' : 'de venta'} (€/m²)`;
  const mapFeaturePrimary = activeProfile.id === 'inversion'
    ? mapFeatureHasData ? `${(Number(mapFeatureItem!.rentabilidad) * 100).toFixed(1)}%` : displayedMapFeature ? '' : `${(Number(mapData.districts.reduce((sum, item) => sum + Number(item.rentabilidad || 0), 0)) / Math.max(1, mapData.districts.length) * 100).toFixed(1)}%`
    : mapFeatureHasData ? `${formatNumber(Number(mapFeatureItem!.precio_m2), 1)} €/m²` : displayedMapFeature ? '' : `${formatNumber(madridDistrictAverage, 1)} €/m²`;
  const mapFeatureSecondaryLabel = activeProfile.id === 'inversion' || activeProfile.id === 'alquiler' ? 'Alquiler medio' : 'Precio vivienda';
  const mapFeatureSecondary = activeProfile.id === 'inversion'
    ? mapFeatureHasData && (mapFeatureItem?.precio_alquiler || mapFeatureItem?.precio_vivienda) ? `${formatNumber(Number(mapFeatureItem.precio_alquiler || mapFeatureItem.precio_vivienda), 0)} €/mes` : displayedMapFeature ? '' : `${formatNumber(madridMonthlyAverage, 0)} €/mes`
    : activeProfile.id === 'alquiler'
      ? mapFeatureHasData && mapFeatureItem?.precio_vivienda ? `${formatNumber(Number(mapFeatureItem.precio_vivienda), 0)} €/mes` : displayedMapFeature ? '' : `${formatNumber(madridMonthlyAverage, 0)} €/mes`
      : mapFeatureHasData && mapFeatureItem?.precio_vivienda ? `${formatNumber(Number(mapFeatureItem.precio_vivienda), 0)} €` : displayedMapFeature ? '' : '';
  const handleMapDistrictClick = useCallback((district: string | null) => {
    if (isMobile) {
      selectZone(district);
      return;
    }
    const hoverContext = desktopZoneHoverRef.current;
    const matchesHover = district && hoverContext && normalizeZoneLabel(district) === normalizeZoneLabel(hoverContext.zoneId);
    const isAlreadySelected = Boolean(district && normalizeZoneLabel(selectedDistrict) === normalizeZoneLabel(district));
    selectZone((isAlreadySelected || !district) ? null : matchesHover ? hoverContext!.zoneId : district);
    setDesktopPinnedZone(!isAlreadySelected && matchesHover ? hoverContext : null);
    setSelectedDistrict(isAlreadySelected || !district ? 'Todos' : district);
    setSelectedBarrio('Todos');
  }, [isMobile, selectZone, selectedDistrict]);
  const handleMapBarrioClick = useCallback((barrio: string | null) => {
    if (isMobile) {
      selectZone(barrio);
      return;
    }
    const hoverContext = desktopZoneHoverRef.current;
    const matchesHover = barrio && hoverContext && normalizeZoneLabel(barrio) === normalizeZoneLabel(hoverContext.zoneId);
    const isAlreadySelected = Boolean(barrio && normalizeZoneLabel(selectedBarrio) === normalizeZoneLabel(barrio));
    selectZone((isAlreadySelected || !barrio) ? null : matchesHover ? hoverContext!.zoneId : barrio);
    setDesktopPinnedZone(!isAlreadySelected && matchesHover ? hoverContext : null);
    if (isAlreadySelected || !barrio) {
      setSelectedBarrio('Todos');
      setSelectedDistrict('Todos');
    } else {
      const feature = mapData.neighborhoods.find((item: any) => normalizeZoneLabel(String(item.barrio || '')) === normalizeZoneLabel(barrio));
      setSelectedDistrict(feature?.distrito || 'Todos');
      setSelectedBarrio(barrio);
    }
  }, [isMobile, selectZone, selectedBarrio, mapData.neighborhoods]);

  useEffect(() => {
    if (!isMobile || !selectedMapFeature) return;
    const handleOutsideTap = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('.v2-map-card')) {
        clearSelection();
      }
    };
    document.addEventListener('pointerdown', handleOutsideTap);
    return () => document.removeEventListener('pointerdown', handleOutsideTap);
  }, [isMobile, selectedMapFeature, clearSelection]);
  const handleDesktopZoneHover = useCallback((zone: string | null, context?: MapZoneHoverContext) => {
    if (!zone || !context) {
      hoverZone(null);
      desktopZoneHoverRef.current = null;
      setDesktopZoneHover(null);
      return;
    }
    hoverZone(context.zoneId);
    desktopZoneHoverRef.current = context;
    setDesktopZoneHover(context);
  }, [hoverZone]);
  // Handle initial profile from query param
  useEffect(() => {
    if (profileParam) {
      const idx = PROFILES.findIndex(p => p.id === profileParam);
      if (idx !== -1) {
        setProfileIdx(idx);
      }
    }
  }, [profileParam]);

  // Fetch initial filters
  useEffect(() => {
    setIsDashboardLoading(true);
    setDashboardLoadError(null);

    apiFetch('/filters', {}, 30000)
      .then(res => res.json())
      .then(data => {
        const years = (data.years || []).map(String);
        const allYears = years.sort((a, b) => Number(a) - Number(b));
        const months = { ...(data.months_by_year || {}) } as Record<string, string[]>;
        const currentPeriod = getCurrentMadridPeriod();
        const observedPeriod = data.latest_observed_period;
        if (observedPeriod?.year && observedPeriod?.month) {
          setLatestAvailablePeriod({ year: String(observedPeriod.year), month: String(observedPeriod.month) });
        }
        if (!allYears.includes(currentPeriod.year)) allYears.push(currentPeriod.year);
        allYears.sort((a, b) => Number(a) - Number(b));
        const currentYearMonths = months[currentPeriod.year] || MONTHS_ES;
        months[currentPeriod.year] = MONTHS_ES.filter(month => currentYearMonths.includes(month) || month === currentPeriod.month);
        setAvailableYears(allYears);
        setMonthsByYear(months);
        if (data.districts) setAvailableDistricts(['Todos', ...data.districts]);
        setSelectedYear(currentPeriod.year);
        setSelectedMonth(currentPeriod.month);
        setFiltersReady(true);
      })
      .catch(err => {
        console.error("Error loading filters:", err);
        setDashboardLoadError('No se han podido cargar los filtros. Comprueba la conexión con la API.');
        setIsDashboardLoading(false);
      });
  }, [filtersAttempt]);

  // Fetch barrios when district changes
  useEffect(() => {
    if (!filtersReady) return;
    apiFetch(`/neighborhoods?district=${encodeURIComponent(selectedDistrict)}`)
      .then(res => res.json())
      .then(data => {
        setAvailableBarrios(data);
        setSelectedBarrio(current => current !== 'Todos' && !data.includes(current) ? 'Todos' : current);
      })
      .catch(err => console.error("Error loading neighborhoods:", err));
  }, [selectedDistrict, filtersReady]);

  useEffect(() => {
    if (!isMobileFiltersOpen) return;
    apiFetch(`/neighborhoods?district=${encodeURIComponent(draftFilters.district)}`)
      .then(res => res.json())
      .then((data: string[]) => {
        setDraftBarrios(data);
        if (draftFilters.barrio !== 'Todos' && !data.includes(draftFilters.barrio)) {
          setDraftFilters(current => ({ ...current, barrio: 'Todos' }));
        }
      })
      .catch(() => setDraftBarrios(['Todos']));
  }, [draftFilters.district, draftFilters.barrio, isMobileFiltersOpen]);

  useEffect(() => {
    if (!isMobileFiltersOpen) return;
    window.history.pushState({ mobileFiltersOpen: true }, '', `${window.location.pathname}${window.location.search}#filtros`);
    const handleBack = () => { setIsMobileFiltersOpen(false); setActiveDropdown(null); };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMobileFiltersOpen(false);
      setActiveDropdown(null);
      if (window.location.hash === '#filtros') window.history.back();
    };
    window.addEventListener('popstate', handleBack);
    window.addEventListener('keydown', handleKeyDown);
    lockScroll();
    return () => {
      window.removeEventListener('popstate', handleBack);
      window.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [isMobileFiltersOpen]);

  const rejectInvalidRentalSeries = useCallback((rows: any[]) => {
    const containsOutlier = Array.isArray(rows) && rows.some((row: any) => Number(row.precio_m2) > 100);
    if (activeProfile.id === 'alquiler' && containsOutlier) {
      setDashboardLoadError('La serie de alquiler contiene precios por m² fuera de escala. Se ha detenido su visualización para evitar mezclar datos de compra y alquiler.');
      return true;
    }
    return false;
  }, [activeProfile.id]);

  // Fetch KPIs and Series
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    const op = activeProfile.op;
    const requestId = ++latestDashboardRequest.current;
    const isLatestRequest = () => requestId === latestDashboardRequest.current;

    if (!hasLoadedPrimaryKpis.current) setIsDashboardLoading(true);
    setIsHeatmapLoading(true);
    setIsMapLoading(true);
    setDashboardLoadError(null);
    // Never leave data from the previous operation visible while a new profile loads.
    setKpiData({});
    setSeriesMadrid([]);
    setMapData({ districts: [], neighborhoods: [] });
    setHeatmapData([]);
    setHeatmapDataSourceKey('');

    const pKpis = apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(res => res.json())
      .then(data => {
        if (!isLatestRequest()) return;
        if (activeProfile.id === 'alquiler' && Number(data.precio_m2) > 100) {
          throw new Error('El precio de alquiler recibido está fuera de escala. Hemos detenido la actualización para no mezclar datos de compra y alquiler.');
        }
        hasLoadedPrimaryKpis.current = true;
        setKpiData({
        p_m2: data.precio_m2,
        p_vivienda: data.precio_vivienda,
        v_mes: data.variacion_mensual,
        v_anual: data.variacion_anual,
        esfuerzo_compra: data.esfuerzo_alquiler ?? data.esfuerzo_compra,
        estado_mercado: data.estado_mercado,
        is_prediction: data.is_prediction,
        renta_media: data.renta_media,
        transacciones: data.transacciones
        });
        if (activeProfile.id === 'inversion' && selectedDistrict === 'Todos' && selectedBarrio === 'Todos') {
          setMadridInvYield(Number(data.precio_m2) || 0);
        }
      })
      .catch(error => {
        if (requestId === latestDashboardRequest.current) {
          setDashboardLoadError(error instanceof Error ? error.message : 'No se han podido cargar los datos del mercado.');
        }
      });

    const pMadridInvKpi = (activeProfile.id === 'inversion' && (selectedDistrict !== 'Todos' || selectedBarrio !== 'Todos'))
      ? apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&district=Todos&barrio=Todos`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (isLatestRequest() && data) setMadridInvYield(Number(data.precio_m2) || 0);
          })
          .catch(() => {})
      : Promise.resolve();

    // Series Madrid (Average)
    const pSeries = apiFetch(`/series?year=${selectedYear}&op=${op}`)
      .then(res => res.json())
      .then(data => { if (isLatestRequest() && !rejectInvalidRentalSeries(data)) setSeriesMadrid(data); })
      .catch(() => {});

    // Map Data
    const pMap = apiFetch(`/map?year=${selectedYear}&month=${selectedMonth}&interest=${activeProfile.id === 'alquiler' ? 'Alquiler' : activeProfile.id === 'compra' ? 'Compra-venta' : activeProfile.id === 'venta' ? 'Venta' : 'Inversión'}`)
      .then(res => res.json())
      .then(data => {
        if (!isLatestRequest()) return;
        const mapPrices = [...(data.districts || []), ...(data.neighborhoods || [])].map((item: any) => Number(item.precio_m2)).filter(Number.isFinite);
        if (activeProfile.id === 'alquiler' && mapPrices.some((price: number) => price > 100)) {
          setDashboardLoadError('La API devolvió valores de compraventa en el mapa de alquiler. Se han ocultado para evitar una escala engañosa.');
          return;
        }
        setMapData(data);
      })
      .catch(err => {
        console.error("Error loading map data:", err);
        if (isLatestRequest()) setMapData({ districts: [], neighborhoods: [] });
      })
      .finally(() => {
        if (isLatestRequest()) setIsMapLoading(false);
      });

    let pAffordability: Promise<any> = Promise.resolve();
    let pSeasonalTrend: Promise<any> = Promise.resolve();

    if (activeProfile.id === 'alquiler') {
      pAffordability = apiFetch(`/affordability?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (isLatestRequest()) setAffordabilityData(Array.isArray(data) ? data : []); })
        .catch(err => { console.error("Error loading affordability:", err); if (isLatestRequest()) setAffordabilityData([]); });

      pSeasonalTrend = apiFetch(`/seasonal-trend?anio=${selectedYear}&op=${activeProfile.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (isLatestRequest()) setSeasonalTrend(Array.isArray(data) ? data : []); })
        .catch(err => { console.error("Error loading seasonal trend:", err); if (isLatestRequest()) setSeasonalTrend([]); });
    }

    if (activeProfile.id !== 'inversion') {
      apiFetch(`/scatter-opportunity?year=${selectedYear}&month=${selectedMonth}&op=${op}&level=${rankingLevel.toLowerCase().slice(0, -1)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (isLatestRequest()) setScatterData(Array.isArray(data) ? data : []); })
        .catch(() => { if (isLatestRequest()) setScatterData([]); });
    }

    setIsHeatmapLoading(true);
    const pHeatmap = apiFetch(`/heatmap?year=${selectedYear}&op=${activeProfile.id}&level=${rankingLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!isLatestRequest()) return;
        const values = (Array.isArray(data) ? data : []).flatMap((row: any) => Object.keys(row).filter(key => /^m\d+$/.test(key)).map(key => Number(row[key]))).filter(Number.isFinite);
        if (activeProfile.id === 'alquiler' && values.some((value: number) => value > 100)) {
          setDashboardLoadError('La API devolvió valores de compraventa en la tabla de alquiler. Se han ocultado para evitar una escala engañosa.');
          return;
        }
        setHeatmapData(Array.isArray(data) ? data : []);
        setHeatmapDataSourceKey(`${selectedYear}|${activeProfile.id}|${rankingLevel}`);
      })
      .catch(() => { if (isLatestRequest()) setHeatmapData([]); })
      .finally(() => { if (isLatestRequest()) setIsHeatmapLoading(false); });

    const pConnectivity = apiFetch(`/connectivity-analysis?district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (isLatestRequest()) setConnectivityData(data); })
      .catch(err => { console.error("Error loading connectivity:", err); if (isLatestRequest()) setConnectivityData(null); });

    // Barrera de promesas: el telón solo se desmonta cuando KPIs, Mapa, Series y Heatmap están en memoria
    Promise.allSettled([pKpis, pMadridInvKpi, pSeries, pMap, pAffordability, pSeasonalTrend, pHeatmap, pConnectivity])
      .finally(() => {
        if (requestId === latestDashboardRequest.current) {
          setIsDashboardLoading(false);
        }
      });

  }, [selectedYear, selectedMonth, profileIdx, selectedDistrict, selectedBarrio, rankingLevel, filtersReady, loadAttempt, activeProfile.id, activeProfile.op, rejectInvalidRentalSeries]);

  // Fetch Zone A comparison independently
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth || !comparisonZoneA?.name) return;
    const op = activeProfile.op;
    let isCurrent = true;
    setIsZoneALoading(true);

    const type = comparisonZoneA.kind === 'district' ? 'distrito' : 'barrio';
    const id = Number(comparisonZoneA.id.split(':')[1]);
    const seriesUrl = `/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(comparisonZoneA.name)}&tipo_zona=${type}${Number.isFinite(id) ? `&zone_id=${id}` : ''}`;
    const zoneAParam = comparisonZoneA.kind === 'district' ? `district=${encodeURIComponent(selectedZoneA)}` : `barrio=${encodeURIComponent(selectedZoneA)}`;
    const kpiUrl = `/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneAParam}`;

    const pSeries = apiFetch(seriesUrl)
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (!rejectInvalidRentalSeries(data)) {
          setSeriesA(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => { if (isCurrent) setSeriesA([]); });

    const pKpi = apiFetch(kpiUrl)
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (activeProfile.id === 'alquiler' && Number(data.precio_m2) > 100) return;
        setKpiDataA({ ...data, esfuerzo_compra: data.esfuerzo_alquiler ?? data.esfuerzo_compra });
      })
      .catch(() => {});

    Promise.allSettled([pSeries, pKpi]).finally(() => {
      if (isCurrent) setIsZoneALoading(false);
    });

    return () => { isCurrent = false; };
  }, [selectedYear, selectedMonth, activeProfile.op, activeProfile.id, selectedZoneA, comparisonZoneA, filtersReady, rejectInvalidRentalSeries, reloadKeyA]);

  // Fetch Zone B comparison independently
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth || !comparisonZoneB?.name) return;
    const op = activeProfile.op;
    let isCurrent = true;
    setIsZoneBLoading(true);

    const type = comparisonZoneB.kind === 'district' ? 'distrito' : 'barrio';
    const id = Number(comparisonZoneB.id.split(':')[1]);
    const seriesUrl = `/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(comparisonZoneB.name)}&tipo_zona=${type}${Number.isFinite(id) ? `&zone_id=${id}` : ''}`;
    const zoneBParam = comparisonZoneB.kind === 'district' ? `district=${encodeURIComponent(selectedZoneB)}` : `barrio=${encodeURIComponent(selectedZoneB)}`;
    const kpiUrl = `/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneBParam}`;

    const pSeries = apiFetch(seriesUrl)
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (!rejectInvalidRentalSeries(data)) {
          setSeriesB(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => { if (isCurrent) setSeriesB([]); });

    const pKpi = apiFetch(kpiUrl)
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (activeProfile.id === 'alquiler' && Number(data.precio_m2) > 100) return;
        setKpiDataB({ ...data, esfuerzo_compra: data.esfuerzo_alquiler ?? data.esfuerzo_compra });
      })
      .catch(() => {});

    Promise.allSettled([pSeries, pKpi]).finally(() => {
      if (isCurrent) setIsZoneBLoading(false);
    });

    return () => { isCurrent = false; };
  }, [selectedYear, selectedMonth, activeProfile.op, activeProfile.id, selectedZoneB, comparisonZoneB, filtersReady, rejectInvalidRentalSeries, reloadKeyB]);

  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth || activeProfile.id !== 'venta') return;
    let isCurrent = true;
    apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=alquiler&district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!isCurrent || !data) return;
        const val = Number(data.precio_m2);
        if (Number.isFinite(val) && val > 0 && val <= 100) {
          setVentaRentM2(val);
        }
      })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, [filtersReady, selectedYear, selectedMonth, activeProfile.id, selectedDistrict, selectedBarrio]);

  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    let isCurrent = true;
    setIsRankingsLoading(true);
    if (activeProfile.id === 'venta' && rankingMetric === 'demand') {
      const currentLiqYear = Math.min(Number(selectedYear), 2025);
      const prevLiqYear = currentLiqYear - 1;
      Promise.all([
        apiFetch(`/liquidity?year=${currentLiqYear}&level=distrito`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`/liquidity?year=${currentLiqYear}&level=barrio`).then(r => r.ok ? r.json() : []).catch(() => []),
        prevLiqYear >= 2023 ? apiFetch(`/liquidity?year=${prevLiqYear}&level=distrito`).then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
        prevLiqYear >= 2023 ? apiFetch(`/liquidity?year=${prevLiqYear}&level=barrio`).then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
      ]).then(([dist, barr, previousDist, previousBarr]) => {
        if (!isCurrent) return;
        const mapLiquidity = (list: any[]) => list.map(item => ({ name: item.name, value: item.transactions }));
        setRankings({ topDist: mapLiquidity(dist || []), botDist: mapLiquidity(dist || []), topBarr: mapLiquidity(barr || []), botBarr: mapLiquidity(barr || []) });
        setRankingPreviousValues(Object.fromEntries([...(previousDist || []), ...(previousBarr || [])].map((item: any) => [normalizeZoneLabel(String(item.name || '')), Number(item.transactions)])));
        setIsRankingsLoading(false);
      });
    } else {
      const category = activeProfile.id === 'inversion' ? 'Rentabilidad' : rankingMetric === 'unit' ? 'Precio m²' : 'Precio';
      const district = `&district=${encodeURIComponent(selectedDistrict)}`;
      Promise.all([
        apiFetch(`/rankings?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&level=distrito&category=${encodeURIComponent(category)}`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`/rankings?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&level=barrio&category=${encodeURIComponent(category)}${district}`).then(r => r.ok ? r.json() : []).catch(() => []),
        Number(selectedYear) > 2023 ? apiFetch(`/rankings?year=${Number(selectedYear) - 1}&month=${selectedMonth}&op=${activeProfile.op}&level=distrito&category=${encodeURIComponent(category)}`).then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
        Number(selectedYear) > 2023 ? apiFetch(`/rankings?year=${Number(selectedYear) - 1}&month=${selectedMonth}&op=${activeProfile.op}&level=barrio&category=${encodeURIComponent(category)}${district}`).then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
      ]).then(([dist, barr, previousDist, previousBarr]) => {
        if (!isCurrent) return;
        if (activeProfile.id === 'alquiler') {
          const maxAllowed = rankingMetric === 'unit' ? 100 : 10000;
          const values = [...(dist || []), ...(barr || [])].map((item: any) => Number(item.value)).filter(Number.isFinite);
          if (values.some((value: number) => value > maxAllowed)) {
            setDashboardLoadError('El ranking de alquiler contiene valores de compraventa. Se ha ocultado para evitar una escala engañosa.');
            setIsRankingsLoading(false);
            return;
          }
        }
        const withObservedValue = (rows: any[]) => (rows || []).filter((item: any) => Number.isFinite(Number(item.value)) && Number(item.value) > 0);
        const observedDist = withObservedValue(dist);
        const observedBarr = withObservedValue(barr);
        setRankingPreviousValues(Object.fromEntries([...(previousDist || []), ...(previousBarr || [])].map((item: any) => [normalizeZoneLabel(String(item.name || '')), Number(item.value)])));
        setRankings({ topDist: observedDist, botDist: [...observedDist].sort((a: any, b: any) => a.value - b.value), topBarr: observedBarr, botBarr: [...observedBarr].sort((a: any, b: any) => a.value - b.value) });
        setIsRankingsLoading(false);
      });
    }
    return () => { isCurrent = false; };
  }, [filtersReady, selectedYear, selectedMonth, activeProfile.id, activeProfile.op, rankingMetric, rankingLevel, selectedDistrict]);

  // Fetch liquidity data (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      apiFetch(`/liquidity?year=${selectedYear}&level=${liquidityLevel}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setLiquidityData(data))
        .catch(err => { console.error("Error fetching liquidity data:", err); setLiquidityData([]); });
    }
  }, [selectedYear, liquidityLevel, activeProfile.id]);

  // Fetch interest rate impact data (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      apiFetch(`/interest-rate-impact?district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setInterestImpactData(data))
        .catch(err => { console.error("Error fetching interest rate impact data:", err); setInterestImpactData([]); });
    }
  }, [selectedDistrict, selectedBarrio, activeProfile.id]);

  // Fetch risk-return matrix data (for Inversión profile only)
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    if (activeProfile.id === 'inversion') {
      const level = liquidityLevel === 'distrito' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?year=${selectedYear}&month=${encodeURIComponent(selectedMonth)}&level=${level}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setRiskReturnData(data))
        .catch(err => { console.error("Error fetching risk return data:", err); setRiskReturnData([]); });
    }
  }, [filtersReady, selectedYear, selectedMonth, liquidityLevel, selectedDistrict, activeProfile.id]);

  // Fetch zone comparative liquidities (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = comparisonZoneA.kind === 'district' ? 'distrito' : 'barrio';
      apiFetch(`/zone-liquidity?name=${encodeURIComponent(selectedZoneA)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneA(data.speed))
        .catch(() => setLiquidityZoneA('N/A'));
    }
  }, [comparisonZoneA, selectedZoneA, activeProfile.id]);

  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = comparisonZoneB.kind === 'district' ? 'distrito' : 'barrio';
      apiFetch(`/zone-liquidity?name=${encodeURIComponent(selectedZoneB)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneB(data.speed))
        .catch(() => setLiquidityZoneB('N/A'));
    }
  }, [comparisonZoneB, selectedZoneB, activeProfile.id]);

  // Fetch zone comparative volatilities (for Inversión profile only)
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    if (activeProfile.id === 'inversion') {
      const level = comparisonZoneA.kind === 'district' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?year=${selectedYear}&month=${encodeURIComponent(selectedMonth)}&level=${level}&district=Todos`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const found = data.find((d: any) => d.name.toLowerCase() === selectedZoneA.toLowerCase());
          if (found) {
            setVolatilityZoneA(found.risk.toFixed(1));
          } else {
            setVolatilityZoneA('N/A');
          }
        })
        .catch(() => setVolatilityZoneA('N/A'));
    }
  }, [filtersReady, selectedYear, selectedMonth, comparisonZoneA, selectedZoneA, activeProfile.id]);

  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    if (activeProfile.id === 'inversion') {
      const level = comparisonZoneB.kind === 'district' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?year=${selectedYear}&month=${encodeURIComponent(selectedMonth)}&level=${level}&district=Todos`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const found = data.find((d: any) => d.name.toLowerCase() === selectedZoneB.toLowerCase());
          if (found) {
            setVolatilityZoneB(found.risk.toFixed(1));
          } else {
            setVolatilityZoneB('N/A');
          }
        })
        .catch(() => setVolatilityZoneB('N/A'));
    }
  }, [filtersReady, selectedYear, selectedMonth, comparisonZoneB, selectedZoneB, activeProfile.id]);



  // Auto-ajuste de altura dinámico con ResizeObserver
  useEffect(() => {
    if (!activePanelRef.current) return;

    const updateHeight = () => {
      if (activePanelRef.current) {
        setContainerHeight(`${activePanelRef.current.offsetHeight}px`);
      }
    };

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(activePanelRef.current);

    // También forzar una actualización inicial
    updateHeight();

    return () => resizeObserver.disconnect();
  }, [profileIdx, isTransitioning, seriesA, seriesB, heatmapData]); // Re-bind observer on transition

  // Actualización de color de perfil
  useEffect(() => {
    document.documentElement.style.setProperty('--v2-profile-color', activeProfile.color);
  }, [activeProfile]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.v2-dropdown-container, .v2-dropdown-menu')) {
        setActiveDropdown(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Inicialización de Gráficas (Chart.js)
  useEffect(() => {
    const initCharts = () => {
      chartsRef.current.forEach(c => c?.destroy());
      chartsRef.current = [];

      const profileId = activeProfile.id;
      const comparisonMetric = getComparisonMetric(profileId);
      const ctxA = document.getElementById(`v2-chartA-${profileId}`) as HTMLCanvasElement;
      const ctxB = document.getElementById(`v2-chartB-${profileId}`) as HTMLCanvasElement;
      const ctxOverlay = document.getElementById(`v2-overlay-${profileId}`) as HTMLCanvasElement;

      if (ctxA || ctxB || ctxOverlay) {
        const createLineChart = (
          ctx: HTMLCanvasElement,
          label: string,
          rawData: any[],
          otherLabel?: string,
          otherRawData?: any[],
          color?: string,
          scaleOverride?: { min?: number; max?: number; stepSize?: number }
        ) => {
          const mainColor = color || COMPARISON_COLORS.zoneA;
          const forecastColor = mainColor;
          const multiplier = comparisonMetric.multiplier;

          // Zone series stay empty when the source has no official observations.
          const effectiveData = Array.isArray(rawData) ? rawData : [];

          const effectiveMadridSeries = Array.isArray(seriesMadrid) ? seriesMadrid : [];

          // Align data to exactly 12 months (1 to 12)
          const alignedPrices = Array.from({ length: 12 }, (_, i) => {
            const found = effectiveData.find(d => Number(d.mes) === i + 1);
            return found ? found.precio_m2 * multiplier : null;
          });
          const alignedMadrid = Array.from({ length: 12 }, (_, i) => {
            const found = effectiveMadridSeries.find(d => Number(d.mes) === i + 1);
            return found ? found.precio_m2 * multiplier : null;
          });
          const predictionStart = effectiveData.findIndex(d => Boolean(d.is_prediction));
          const actualPrices = alignedPrices.map((value, index) => {
            const found = effectiveData.find(d => Number(d.mes) === index + 1);
            return found && !found.is_prediction ? value : null;
          });
          const forecastPrices = alignedPrices.map((value, index) => {
            const found = effectiveData.find(d => Number(d.mes) === index + 1);
            const isBoundary = predictionStart > 0 && index === predictionStart - 1;
            return found?.is_prediction || isBoundary ? value : null;
          });
          const scale = scaleOverride || getNiceChartScale([alignedPrices, alignedMadrid]);

          return new ChartJS(ctx, {
            type: 'line',
            plugins: [],
            data: {
              labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
              datasets: [
                {
                  label: 'Media Madrid',
                  data: alignedMadrid,
                  borderColor: COMPARISON_MEDIA_COLOR,
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_MEDIA_COLOR, 0.09),
                  borderWidth: 2,
                  borderDash: [6, 4],
                  tension: 0.32,
                  cubicInterpolationMode: 'monotone',
                  pointRadius: 0,
                  fill: 'start',
                },
                {
                  label: `${label} · Dato real`,
                  data: actualPrices,
                  borderColor: mainColor,
                  backgroundColor: (context: any) => createAreaGradient(context, mainColor, 0.25),
                  fill: 'start',
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone',
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: mainColor,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                },
                {
                  label: `${label} · Estimación`,
                  data: forecastPrices,
                  borderColor: forecastColor,
                  backgroundColor: (context: any) => createAreaGradient(context, forecastColor, 0.12),
                  fill: 'start',
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone',
                  borderDash: [5, 4],
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: forecastColor,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
                axis: 'x'
              },
              hover: {
                mode: 'index',
                intersect: false
              },
              onHover: (_event: any, active: any[]) => {
                if (isMobile || !otherRawData) return;

                const partnerId = ctx.id.includes('chartA-')
                  ? ctx.id.replace('chartA-', 'chartB-')
                  : ctx.id.includes('chartB-') ? ctx.id.replace('chartB-', 'chartA-') : null;
                const partnerCanvas = partnerId ? document.getElementById(partnerId) as HTMLCanvasElement | null : null;
                const partner = partnerCanvas ? ChartJS.getChart(partnerCanvas) as any : undefined;
                if (!partner) return;

                const index = active[0]?.index;
                if (index === undefined) {
                  partner.setActiveElements([]);
                  partner.tooltip?.setActiveElements([], { x: 0, y: 0 });
                  partner.draw();
                  return;
                }

                const partnerPoint = otherRawData.find(d => Number(d.mes) === index + 1);
                const zoneDatasetIndex = partnerPoint?.is_prediction ? 2 : 1;
                const activeElements = [0, zoneDatasetIndex]
                  .filter(datasetIndex => Number.isFinite(Number(partner.data.datasets[datasetIndex]?.data?.[index])))
                  .map(datasetIndex => ({ datasetIndex, index }));
                const position = { x: partner.scales.x.getPixelForValue(index), y: partner.chartArea.top };
                partner.setActiveElements(activeElements);
                partner.tooltip?.setActiveElements(activeElements, position);
                partner.draw();
              },
              layout: { padding: { top: 15, right: 30, bottom: 20, left: 0 } },
              plugins: {
                legend: {
                  display: isMobile,
                  position: 'top',
                  align: 'end',
                  labels: {
                    boxWidth: 28,
                    boxHeight: 2,
                    usePointStyle: false,
                    color: 'rgba(245, 250, 252, 0.96)',
                    font: { size: 13, weight: 500 },
                    padding: 14
                  }
                },
                datalabels: {
                  display: false,
                  align: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const madridVal = context.chart?.data?.datasets?.[1]?.data?.[context.dataIndex] as number ?? val;
                    return val >= madridVal ? 'top' : 'bottom';
                  },
                  anchor: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const madridVal = context.chart?.data?.datasets?.[1]?.data?.[context.dataIndex] as number ?? val;
                    return val >= madridVal ? 'end' : 'start';
                  },
                  offset: 8,
                  color: (context) => {
                    const idx = context.dataIndex;
                    const found = effectiveData.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return 'var(--precio-subida)';
                    return mainColor;
                  },
                  font: { size: 9, weight: 'bold' },
                  formatter: (value, context) => {
                    if (context.datasetIndex === 0) return null;
                    if (value === null) return null;
                    const unit = comparisonMetric.unit === '%' ? '%' : '€';
                    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + unit;
                  }
                },
                tooltip: {
                  enabled: true,
                  backgroundColor: 'color-mix(in srgb, var(--azul-noche) 95%, transparent)',
                  titleColor: 'var(--blanco-humo)',
                  titleFont: { size: 13, weight: 'bold' },
                  bodyColor: 'var(--blanco-humo)',
                  bodyFont: { size: 12, weight: 'normal' },
                  bodySpacing: 4,
                  padding: 10,
                  cornerRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'color-mix(in srgb, var(--blanco-humo) 20%, transparent)',
                  displayColors: true,
                  boxWidth: 8,
                  boxHeight: 8,
                  filter: (item: any) => item.parsed?.y !== null && item.parsed?.y !== undefined,
                  itemSort: (a: any, b: any) => {
                    const aIsMadrid = a.datasetIndex === 0;
                    const bIsMadrid = b.datasetIndex === 0;
                    if (aIsMadrid && !bIsMadrid) return 1;
                    if (!aIsMadrid && bIsMadrid) return -1;
                    return 0;
                  },
                  callbacks: {
                    labelColor: (context: any) => {
                      const color = context.dataset?.borderColor || '#E5F2F7';
                      return { borderColor: color, backgroundColor: color };
                    },
                    title: (items: any[]) => {
                      const monthNames = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      const idx = items[0]?.dataIndex ?? 0;
                      return `${monthNames[idx]} ${selectedYear} · ${label}`;
                    },
                    label: (context: any) => {
                      const idx = context.dataIndex;
                      const val = context.parsed.y;
                      const unit = comparisonMetric.tooltipUnit;

                      if (val === null || val === undefined) return null;

                      // La media es referencia estadística secundaria
                      if (context.datasetIndex === 0) {
                        const formatted = new Intl.NumberFormat('es-ES', {
                          minimumFractionDigits: comparisonMetric.decimals,
                          maximumFractionDigits: comparisonMetric.decimals
                        }).format(val);
                        return `Media Madrid: ${formatted} ${unit}`;
                      }

                      // Línea principal de la zona
                      const found = effectiveData.find(d => Number(d.mes) === idx + 1);
                      const isPred = context.datasetIndex === 2 || Boolean(found?.is_prediction);
                      const tipoDato = isPred ? 'Estimación' : 'Dato real';
                      const valFormatted = new Intl.NumberFormat('es-ES', {
                        minimumFractionDigits: comparisonMetric.decimals,
                        maximumFractionDigits: comparisonMetric.decimals
                      }).format(val);

                      const lines: string[] = [];

                      // 1. Precio y tipo de dato
                      lines.push(`${tipoDato}: ${valFormatted} ${unit}`);

                      // 1.1 Valor mensual o total tangible estimado
                      if (profileId === 'alquiler') {
                        const estRent = Math.round(val * 70);
                        lines.push(`~${new Intl.NumberFormat('es-ES').format(estRent)} €/mes · 70 m²`);
                      } else if (profileId === 'compra' || profileId === 'venta') {
                        const estTotal = Math.round(val * 80);
                        lines.push(`~${new Intl.NumberFormat('es-ES').format(estTotal)} € · 80 m²`);
                      }

                      // 2. Comparativa vs Media de Madrid (sin repetición de cifra redundante)
                      const madridItem = effectiveMadridSeries.find(d => Number(d.mes) === idx + 1);
                      const madridVal = madridItem ? madridItem.precio_m2 * multiplier : null;
                      if (madridVal !== null && madridVal !== undefined && madridVal > 0) {
                        const diffMadrid = ((val - madridVal) / madridVal) * 100;
                        const absDiffMadrid = Math.abs(diffMadrid).toFixed(1);

                        if (Math.abs(diffMadrid) <= 0.5) {
                          lines.push('vs. Media Madrid: A la par');
                        } else if (diffMadrid > 0) {
                          lines.push(`vs. Media Madrid: +${absDiffMadrid}%`);
                        } else {
                          lines.push(`vs. Media Madrid: -${absDiffMadrid}%`);
                        }
                      }

                      // 3. Variación vs mes anterior
                      if (idx > 0) {
                        const prevPoint = effectiveData.find(d => Number(d.mes) === idx);
                        const prevVal = prevPoint ? prevPoint.precio_m2 * multiplier : null;
                        if (prevVal !== null && prevVal !== undefined && prevVal > 0) {
                          const diffPrev = ((val - prevVal) / prevVal) * 100;
                          const sign = diffPrev > 0 ? '+' : '';
                          lines.push(`vs. Mes anterior: ${sign}${diffPrev.toFixed(1)}%`);
                        }
                      }

                      return lines;
                    }
                  }
                }
              },
              scales: {
                x: {
                  grid: { display: false },
                  offset: true,
                  ticks: {
                    color: 'rgba(230, 242, 248, 0.86)',
                    padding: 10,
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                    font: { size: 10 }
                  }
                },
                y: {
                  min: scale.min,
                  max: scale.max,
                  grid: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 },
                  border: { display: false },
                  ticks: {
                    color: 'rgba(230, 242, 248, 0.86)',
                    stepSize: scale.stepSize,
                    padding: 8,
                    maxTicksLimit: 7,
                    font: { size: 10 },
                    callback: (value) => {
                      const unit = comparisonMetric.unit === '%' ? '%' : ` ${comparisonMetric.unit}`;
                      return new Intl.NumberFormat('es-ES').format(Number(value)) + unit;
                    }
                  }
                }
              }
            }
          });
        };

        const chartMultiplier = comparisonMetric.multiplier;
        const chartSeries = (raw: any[]) => {
          const effective = Array.isArray(raw) ? raw : [];
          return Array.from({ length: 12 }, (_, i) => {
            const found = effective.find(d => Number(d.mes) === i + 1);
            return found ? found.precio_m2 * chartMultiplier : null;
          });
        };
        const sharedComparisonScale = getNiceChartScale([
          chartSeries(seriesA),
          chartSeries(seriesB),
          chartSeries(seriesMadrid),
        ]);

        if (ctxA) {
          try {
            const prevA = ChartJS.getChart(ctxA);
            if (prevA) prevA.destroy();
            chartsRef.current.push(createLineChart(ctxA, selectedZoneA, seriesA, selectedZoneB, seriesB, COMPARISON_COLORS.zoneA, sharedComparisonScale));
          } catch (e) {
            console.error('Error creating Chart A:', e);
          }
        }
        if (ctxB) {
          try {
            const prevB = ChartJS.getChart(ctxB);
            if (prevB) prevB.destroy();
            chartsRef.current.push(createLineChart(ctxB, selectedZoneB, seriesB, selectedZoneA, seriesA, COMPARISON_COLORS.zoneB, sharedComparisonScale));
          } catch (e) {
            console.error('Error creating Chart B:', e);
          }
        }
        if (ctxOverlay) {
          try {
            const prevO = ChartJS.getChart(ctxOverlay);
            if (prevO) prevO.destroy();
          const overlayMultiplier = comparisonMetric.multiplier;
          const effA = comparisonAHasData ? seriesA : [];
          const effB = comparisonBHasData ? seriesB : [];
          const effMad = Array.isArray(seriesMadrid) ? seriesMadrid : [];

          const overlayA = Array.from({ length: 12 }, (_, i) => { const found = effA.find(d => Number(d.mes) === i + 1); return found ? found.precio_m2 * overlayMultiplier : null; });
          const overlayB = Array.from({ length: 12 }, (_, i) => { const found = effB.find(d => Number(d.mes) === i + 1); return found ? found.precio_m2 * overlayMultiplier : null; });
          const overlayMadrid = Array.from({ length: 12 }, (_, i) => { const found = effMad.find(d => Number(d.mes) === i + 1); return found ? found.precio_m2 * overlayMultiplier : null; });
          const splitSeries = (series: any[], values: Array<number | null>) => ({
            real: values.map((value, index) => {
              const found = series.find(d => Number(d.mes) === index + 1);
              return found && !found.is_prediction ? value : null;
            }),
            forecast: values.map((value, index) => {
              const found = series.find(d => Number(d.mes) === index + 1);
              const firstForecast = series.findIndex(d => Boolean(d.is_prediction));
              const isBoundary = firstForecast > 0 && index === firstForecast - 1;
              return found?.is_prediction || isBoundary ? value : null;
            })
          });
          const overlayASplit = splitSeries(effA, overlayA);
          const overlayBSplit = splitSeries(effB, overlayB);
          chartsRef.current.push(new ChartJS(ctxOverlay, {
            type: 'line',
            plugins: [],
            data: {
              labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
              datasets: [
                {
                  label: `${selectedZoneA} · Dato real`,
                  data: overlayASplit.real,
                  borderColor: COMPARISON_COLORS.zoneA,
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: COMPARISON_COLORS.zoneA,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                  fill: 'start',
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_COLORS.zoneA, 0.12),
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone'
                },
                {
                  label: `${selectedZoneA} · Estimación`,
                  data: overlayASplit.forecast,
                  borderColor: COMPARISON_COLORS.zoneA,
                  borderDash: [6, 5],
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: COMPARISON_COLORS.zoneA,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                  fill: 'start',
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_COLORS.zoneA, 0.14),
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone'
                },
                {
                  label: `${selectedZoneB} · Dato real`,
                  data: overlayBSplit.real,
                  borderColor: COMPARISON_COLORS.zoneB,
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: COMPARISON_COLORS.zoneB,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                  fill: 'start',
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_COLORS.zoneB, 0.12),
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone'
                },
                {
                  label: `${selectedZoneB} · Estimación`,
                  data: overlayBSplit.forecast,
                  borderColor: COMPARISON_COLORS.zoneB,
                  borderDash: [6, 5],
                  borderWidth: 2.5,
                  pointRadius: 4,
                  pointBackgroundColor: COMPARISON_COLORS.zoneB,
                  pointBorderColor: '#011024',
                  pointBorderWidth: 2,
                  pointHoverRadius: 6,
                  pointHitRadius: 14,
                  fill: 'start',
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_COLORS.zoneB, 0.14),
                  tension: 0.35,
                  cubicInterpolationMode: 'monotone'
                },
                {
                  label: 'Media Madrid',
                  data: overlayMadrid,
                  borderColor: COMPARISON_MEDIA_COLOR,
                  backgroundColor: (context: any) => createAreaGradient(context, COMPARISON_MEDIA_COLOR, 0.09),
                  fill: 'start',
                  borderWidth: 2,
                  borderDash: [3, 3],
                  pointRadius: 0,
                  tension: 0.32,
                  cubicInterpolationMode: 'monotone'
                },
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
                axis: 'x'
              },
              hover: {
                mode: 'index',
                intersect: false
              },
              layout: { padding: { top: 14, right: 16, bottom: 8, left: 4 } },
              scales: {
                x: {
                  grid: { display: false },
                  offset: true,
                  ticks: {
                    color: 'rgba(230, 242, 248, 0.86)',
                    padding: 10,
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                    font: { size: 10 }
                  }
                },
                y: {
                  grace: '8%',
                  grid: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 },
                  border: { display: false },
                  ticks: {
                    color: 'rgba(230, 242, 248, 0.86)',
                    padding: 8,
                    maxTicksLimit: 6,
                    font: { size: 10 },
                    callback: (value) => {
                      const unit = comparisonMetric.unit === '%' ? '%' : ` ${comparisonMetric.unit}`;
                      return new Intl.NumberFormat('es-ES').format(Number(value)) + unit;
                    }
                  }
                }
              },
              plugins: {
                legend: {
                  display: false,
                  position: 'bottom',
                  align: 'center',
                  labels: {
                  boxWidth: 12,
                  boxHeight: 2,
                    usePointStyle: false,
                  color: 'rgba(245, 250, 252, 0.96)',
                  font: { size: 10, weight: 'bold' },
                  padding: 6
                  }
                },
                datalabels: {
                display: false,
                  align: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const otherIdx = context.datasetIndex === 0 ? 1 : 0;
                    const otherVal = context.chart?.data?.datasets?.[otherIdx]?.data?.[context.dataIndex] as number ?? val;
                    if (val > otherVal) return 'top';
                    if (val < otherVal) return 'bottom';
                    return context.datasetIndex === 0 ? 'top' : 'bottom';
                  },
                  anchor: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const otherIdx = context.datasetIndex === 0 ? 1 : 0;
                    const otherVal = context.chart?.data?.datasets?.[otherIdx]?.data?.[context.dataIndex] as number ?? val;
                    return val >= otherVal ? 'end' : 'start';
                  },
                  offset: 8,
                  font: { size: 9, weight: 'bold' },
                  color: (context) => {
                    const idx = context.dataIndex;
                    const dataset = context.datasetIndex === 0 ? effA : effB;
                    const found = dataset.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return 'var(--precio-subida)';
                    return (context.dataset.borderColor as string);
                  },
                  formatter: (value, context) => {
                    if (context.datasetIndex === 4) return null; // No etiquetas para Madrid
                    if (value === null) return null;
                      const unit = comparisonMetric.tooltipUnit;
                    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + unit;
                  }
                },
                tooltip: {
                  enabled: true,
                  position: 'nearest',
                  backgroundColor: 'color-mix(in srgb, var(--azul-noche) 95%, transparent)',
                  titleColor: 'var(--blanco-humo)',
                  titleFont: { size: 12, weight: 'bold' },
                  bodyColor: 'var(--blanco-humo)',
                  bodyFont: { size: 11, weight: 'normal' },
                  bodySpacing: 3,
                  padding: 8,
                  cornerRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'color-mix(in srgb, var(--blanco-humo) 20%, transparent)',
                  displayColors: false,
                  filter: (item: any) => item.datasetIndex !== 4,
                  boxWidth: 10,
                  boxHeight: 10,
                  callbacks: {
                    labelColor: (context: any) => {
                      const color = context.dataset?.borderColor || '#E5F2F7';
                      return { borderColor: color, backgroundColor: color };
                    },
                    title: (items: any[]) => {
                      const monthNames = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      const idx = items[0]?.dataIndex ?? 0;
                      return `${monthNames[idx]} ${selectedYear}`;
                    },
                    label: (context: any) => {
                      const val = context.parsed.y;
                      if (val === null || val === undefined) return null;
                      const isZoneA = context.datasetIndex < 2;
                      const source = isZoneA ? effA : effB;
                      const point = source.find(item => item.mes === context.dataIndex + 1);
                      const isEstimate = context.datasetIndex % 2 === 1 || Boolean(point?.is_prediction);
                      const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: comparisonMetric.decimals, maximumFractionDigits: comparisonMetric.decimals }).format(val);
                      return `${isZoneA ? 'A' : 'B'} · ${isZoneA ? formatZoneOption(selectedZoneA) : formatZoneOption(selectedZoneB)} · ${isEstimate ? 'Est.' : 'Real'}: ${formatted} ${comparisonMetric.tooltipUnit}`;
                    },
                    footer: (items: any[]) => {
                      const index = items[0]?.dataIndex;
                      if (index === undefined) return [];
                      const datasets = items[0].chart.data.datasets;
                      const valueA = datasets[0]?.data[index] ?? datasets[1]?.data[index];
                      const valueB = datasets[2]?.data[index] ?? datasets[3]?.data[index];
                      if (valueA === null || valueA === undefined || valueB === null || valueB === undefined || !Number(valueB)) return [];
                      const difference = Number(valueA) - Number(valueB);
                      const percent = difference / Number(valueB) * 100;
                      const format = (value: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: comparisonMetric.decimals, maximumFractionDigits: comparisonMetric.decimals }).format(value);
                      return [`Dif. A–B: ${difference > 0 ? '+' : ''}${format(difference)} ${comparisonMetric.tooltipUnit} (${percent > 0 ? '+' : ''}${percent.toFixed(1)}%)`];
                    }
                  }
                }
              }
            }
          }));
          } catch (e) {
            console.error('Error creating Overlay chart:', e);
          }
        }

        // ── Scatter plot (Opportunity Chart) ──────────────────────────────────
        const ctxScatter = document.getElementById(`v2-scatter-${activeProfile.id}`) as HTMLCanvasElement;
        if (ctxScatter && scatterData.length > 0) {
          const avgDist = scatterData.reduce((sum, d) => sum + (d.dist_transport || 0), 0) / scatterData.length;
          const avgPrice = scatterData.reduce((sum, d) => sum + (d.precio_m2 || 0), 0) / scatterData.length;

          const points = scatterData.map(d => {
            const x = d.dist_transport || 0;
            const y = d.precio_m2 || 0;
            let pointColor = 'var(--coral)';
            let isOportunidad = false;
            let isNoTocar = false;

            if (x < avgDist && y < avgPrice) {
              pointColor = 'var(--azul-linea)';
              isOportunidad = true;
            } else if (x > avgDist && y > avgPrice) {
              pointColor = 'var(--coral-texto)';
              isNoTocar = true;
            }

            return {
              x,
              y,
              name: d.name,
              color: pointColor,
              isOportunidad,
              isNoTocar
            };
          });

          chartsRef.current.push(new ChartJS(ctxScatter, {
            type: 'scatter',
            data: {
              datasets: [{
                label: 'Zonas',
                data: points,
                backgroundColor: points.map(p => p.color),
                pointRadius: 6,
                pointHoverRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                datalabels: {
                  align: 'top',
                  offset: 4,
                  color: 'var(--azul-noche)',
                  font: { size: 9, weight: 'bold' },
                  formatter: (value) => {
                    return (value.isOportunidad || value.isNoTocar) ? value.name : '';
                  }
                },
                tooltip: {
                  backgroundColor: 'var(--blanco-humo)',
                  borderWidth: 1,
                  borderColor: 'var(--humo-2)',
                  padding: 12,
                  titleColor: 'var(--azul-noche)',
                  bodyColor: 'var(--azul-linea)',
                  callbacks: {
                    label: (context: any) => {
                      const p = context.raw;
                      const status = p.isOportunidad ? ' (Oportunidad)' : p.isNoTocar ? ' (Evitar)' : '';
                      return `${p.name}${status}: ${p.x.toFixed(0)}m, ${p.y.toFixed(1)}€/m²`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  title: { display: true, text: 'Distancia a Transporte Público (metros)', color: 'rgba(230, 242, 248, 0.86)', font: { size: 11, weight: 'bold', family: '-apple-system' } },
                  grid: { color: 'rgba(255, 255, 255, 0.10)', lineWidth: 1 },
                  border: { color: 'rgba(255, 255, 255, 0.15)' },
                  ticks: { color: 'rgba(230, 242, 248, 0.86)', callback: (v) => `${v}m` }
                },
                y: {
                  title: { display: true, text: 'Precio por m²', color: 'rgba(230, 242, 248, 0.86)', font: { size: 11, weight: 'bold', family: '-apple-system' } },
                  grid: { color: 'rgba(255, 255, 255, 0.10)', lineWidth: 1 },
                  border: { color: 'rgba(255, 255, 255, 0.15)' },
                  ticks: { color: 'rgba(230, 242, 248, 0.86)', callback: (v) => `${v}€/m²` }
                }
              }
            }
          }));
        }
      }

      // Risk-Return Matrix Chart for Inversión profile (Matriz Financiera 4 Cuadrantes)
      const ctxRiskReturn = document.getElementById('v2-chart-risk-return') as HTMLCanvasElement;
      if (ctxRiskReturn && activeProfile.id === 'inversion' && riskReturnData && riskReturnData.length > 0) {
        const avgRisk = riskReturnData.reduce((sum, d) => sum + (d.risk || 0), 0) / riskReturnData.length || 46;
        const avgRoi = riskReturnData.reduce((sum, d) => sum + (d.roi || 0), 0) / riskReturnData.length || 4.5;

        const points = riskReturnData.map(d => {
          const x = Number(d.risk) || 0;
          const y = Number(d.roi) || 0;
          const isSelected = d.name.toLowerCase() === (liquidityLevel === 'barrio' ? selectedBarrio.toLowerCase() : selectedDistrict.toLowerCase());

          // Categorización financiera por cuadrantes
          let pointColor = '#3DDC97'; // Equilibrado por defecto
          if (x < avgRisk && y >= avgRoi) {
            pointColor = '#00F0FF'; // Q1: Alta rentabilidad / bajo esfuerzo
          } else if (x >= avgRisk && y >= avgRoi) {
            pointColor = '#E879F9'; // Q2: Retorno tenso
          } else if (x >= avgRisk && y < avgRoi) {
            pointColor = '#FFC247'; // Q4: Refugio patrimonial
          } else {
            pointColor = '#3DDC97'; // Q3: Esfuerzo moderado
          }

          return {
            x,
            y,
            name: d.name,
            color: pointColor,
            isSelected
          };
        });

        const quadrantOverlayPlugin = {
          id: 'quadrantOverlay',
          beforeDraw: (chart: any) => {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales.x || !scales.y) return;
            const { left, right, top, bottom } = chartArea;
            const xMid = scales.x.getPixelForValue(avgRisk);
            const yMid = scales.y.getPixelForValue(avgRoi);

            ctx.save();
            // Fondos sutiles de cuadrantes
            ctx.fillStyle = 'rgba(0, 240, 255, 0.04)'; // Q1: Alta rentabilidad
            ctx.fillRect(left, top, Math.max(0, xMid - left), Math.max(0, yMid - top));

            ctx.fillStyle = 'rgba(255, 194, 71, 0.04)'; // Q4: Refugio patrimonial
            ctx.fillRect(xMid, yMid, Math.max(0, right - xMid), Math.max(0, bottom - yMid));

            // Líneas divisorias de medias
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // Línea vertical (Media esfuerzo)
            ctx.beginPath();
            ctx.moveTo(xMid, top);
            ctx.lineTo(xMid, bottom);
            ctx.stroke();

            // Línea horizontal (Media yield)
            ctx.beginPath();
            ctx.moveTo(left, yMid);
            ctx.lineTo(right, yMid);
            ctx.stroke();
            ctx.setLineDash([]);

            // Marcas de cuadrante
            ctx.fillStyle = 'rgba(186, 204, 214, 0.5)';
            ctx.font = 'bold 9px sans-serif';

            ctx.textAlign = 'left';
            ctx.fillText('Q1 · ALTA RENTABILIDAD', left + 8, top + 14);

            ctx.textAlign = 'right';
            ctx.fillText('Q2 · RETORNO TENSO', right - 8, top + 14);

            ctx.textAlign = 'left';
            ctx.fillText('Q3 · MODERADO', left + 8, bottom - 8);

            ctx.textAlign = 'right';
            ctx.fillText('Q4 · REFUGIO PATRIMONIAL', right - 8, bottom - 8);

            ctx.restore();
          },
          afterDatasetsDraw: (chart: any) => {
            const { ctx, scales } = chart;
            if (!scales.x || !scales.y) return;

            // Evitar solapamiento de textos apelotonados: solo rotular estáticamente la zona seleccionada
            ctx.save();
            ctx.font = 'bold 10px sans-serif';

            points.forEach((p: any) => {
              if (p.isSelected) {
                const xPos = scales.x.getPixelForValue(p.x);
                const yPos = scales.y.getPixelForValue(p.y);
                ctx.fillStyle = '#FF5C5C';
                ctx.textAlign = 'center';
                ctx.fillText(`${p.name} ★`, xPos, yPos - 10);
              }
            });
            ctx.restore();
          }
        };

        chartsRef.current.push(new ChartJS(ctxRiskReturn, {
          data: {
            datasets: [
              {
                type: 'scatter',
                label: 'Zonas · Riesgo vs Rentabilidad',
                data: points.map(p => ({ x: p.x, y: p.y, name: p.name })),
                backgroundColor: points.map(p => p.isSelected ? '#FF5C5C' : p.color),
                borderColor: '#FFFFFF',
                borderWidth: points.map(p => p.isSelected ? 2 : 0),
                pointRadius: points.map(p => p.isSelected ? 8 : 5),
                pointHoverRadius: 9,
                showLine: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              datalabels: {
                display: false
              },
              tooltip: {
                backgroundColor: '#06182B',
                borderWidth: 1,
                borderColor: 'rgba(0, 240, 255, 0.45)',
                padding: 12,
                titleColor: '#00F0FF',
                titleFont: { size: 12, weight: 'bold' },
                bodyColor: '#FFFFFF',
                bodyFont: { size: 11 },
                displayColors: false,
                callbacks: {
                  title: (context: any) => {
                    const idx = context[0]?.dataIndex;
                    const p = points[idx];
                    return p ? `📍 ${p.name}` : '';
                  },
                  label: (context: any) => {
                    const idx = context.dataIndex;
                    const p = points[idx];
                    return [
                      `• Rentabilidad Bruta: ${p.y.toFixed(2)}%`,
                      `• Esfuerzo Censal: ${p.x.toFixed(1)}%`,
                      p.isSelected ? '★ Zona actualmente seleccionada' : ''
                    ].filter(Boolean);
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Índice de esfuerzo censal / Riesgo (%)', color: 'rgba(230, 242, 248, 0.86)', font: { size: 10, weight: 'bold' } },
                border: { color: 'rgba(255, 255, 255, 0.15)' },
                ticks: {
                  color: 'rgba(230, 242, 248, 0.86)',
                  callback: (val) => val + '%',
                  font: { size: 9, weight: 'bold' }
                },
                grid: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 }
              },
              y: {
                type: 'linear',
                title: { display: true, text: 'Rentabilidad bruta anual (Yield %)', color: 'rgba(230, 242, 248, 0.86)', font: { size: 10, weight: 'bold' } },
                border: { color: 'rgba(255, 255, 255, 0.15)' },
                ticks: {
                  color: 'rgba(230, 242, 248, 0.86)',
                  callback: (val) => val + '%',
                  font: { size: 9 }
                },
                grid: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 }
              }
            }
          },
          plugins: [quadrantOverlayPlugin]
        }));
      }
    };
    // Solo inicializar cuando no estamos en medio de una transición de perfil
    if (isTransitioning) return;

    let retryTimer: NodeJS.Timeout | null = null;
    const runInit = () => {
      initCharts();
      // Si Zona B o la superpuesta tienen datos pero su canvas aún no estaba en el DOM, reintentar tras un frame
      const pId = activeProfile.id;
      if (
        (comparisonBHasData && effectiveCompareGraphView === 'paralela' && !document.getElementById(`v2-chartB-${pId}`)) ||
        (comparisonAHasData && comparisonBHasData && effectiveCompareGraphView === 'superpuesta' && !document.getElementById(`v2-overlay-${pId}`))
      ) {
        retryTimer = setTimeout(initCharts, 80);
      }
    };

    const timer = setTimeout(runInit, 120);
    const resizeTimer = setTimeout(() => {
      chartsRef.current.forEach((chart) => chart?.resize());
    }, 650);
    return () => {
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
      clearTimeout(resizeTimer);
    };
  }, [profileIdx, isTransitioning, isMobile, isZoneALoading, isZoneBLoading, comparisonAHasData, comparisonBHasData, comparisonZoneA, comparisonZoneB, activeProfile.color, seriesA, seriesB, seriesMadrid, activeProfile.id, scatterData, interestImpactData, riskReturnData, liquidityLevel, selectedDistrict, selectedBarrio, selectedYear, selectedZoneA, selectedZoneB, compareGraphView, effectiveCompareGraphView]);

  const handleProfileChange = (newIdx: number) => {
    if (newIdx === profileIdx || isTransitioning) return;
    setPrevIdx(profileIdx);
    setProfileIdx(newIdx);
    const nextProfile = PROFILES[newIdx];
    if (nextProfile?.id === 'venta') {
      setRankingMetric('demand');
      setRankingOrder('demand-high');
    } else if (nextProfile?.id === 'inversion') {
      setRankingOrder('yield-high');
    } else {
      if (rankingMetric === 'demand') setRankingMetric('total');
      setRankingOrder('affordable');
    }
    setIsTransitioning(true);
    setIsHeatmapLoading(true);
    setIsRankingsLoading(true);
    setIsMapLoading(true);
    setRankings({ topDist: [], botDist: [], topBarr: [], botBarr: [] });
    setTimeout(() => setIsTransitioning(false), 480);
  };

  const openMobileFilters = () => {
    setDraftFilters({ year: selectedYear, month: selectedMonth, district: selectedDistrict, barrio: selectedBarrio });
    setDraftBarrios(availableBarrios);
    setIsMobileFiltersOpen(true);
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
    setActiveDropdown(null);
    if (window.location.hash === '#filtros') window.history.back();
  };

  const applyMobileFilters = () => {
    setSelectedYear(draftFilters.year);
    setSelectedMonth(draftFilters.month);
    closeMobileFilters();
  };

  const resetMobileFilters = () => {
    const reset = { year: latestAvailablePeriod.year, month: latestAvailablePeriod.month, district: draftFilters.district, barrio: draftFilters.barrio };
    setDraftFilters(reset);
    setSelectedYear(reset.year);
    setSelectedMonth(reset.month);
    closeMobileFilters();
  };

  const scrollToDashboardSection = (section: string) => {
    activePanelRef.current?.querySelector<HTMLElement>(`[data-dashboard-section="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCompareZone = useCallback((zoneName: string) => {
    const norm = normalizeZoneLabel(zoneName);
    const kind = rankingLevel === 'Barrios' ? 'barrio' : 'district';
    const match = zoneSearchOptions.find(option => option.kind === kind && normalizeZoneLabel(option.name) === norm) || {
      id: `${kind}:name:${zoneName}`,
      name: zoneName,
      kind,
      label: zoneName
    };
    setComparisonZoneB(match);
    scrollToDashboardSection('compare');
  }, [zoneSearchOptions, rankingLevel]);

  const getSlideClass = (idx: number) => {
    if (idx === profileIdx) return 'v2-active';
    if (idx === prevIdx && isTransitioning) return profileIdx > prevIdx ? 'v2-out-left' : 'v2-out-right';
    return profileIdx > idx ? 'v2-before' : 'v2-after';
  };

  const rankingRows = useMemo(() => {
    const isTopRanking = activeProfile.id === 'venta'
      ? (rankingMetric === 'demand' ? rankingOrder === 'demand-high' : rankingOrder === 'expensive')
      : activeProfile.id === 'inversion';
    const rows = rankingLevel === 'Distritos'
      ? isTopRanking ? rankings.topDist : rankings.botDist
      : isTopRanking ? rankings.topBarr : rankings.botBarr;

    // For €/m², use the selected month's heatmap cell as the ranking value so
    // the two views always show and sort the same source observation.
    const expectedHeatmapKey = `${selectedYear}|${activeProfile.id}|${rankingLevel}`;
    if (rankingMetric !== 'unit' || activeProfile.id === 'inversion' || selectedMonthIndex < 0 || heatmapData.length === 0 || heatmapDataSourceKey !== expectedHeatmapKey) return rows;
    const heatmapByZone = new Map(heatmapData.map(row => [normalizeZoneLabel(String(row.zona || '')), Number(row[`m${selectedMonthIndex + 1}`]) || 0]));
    const exactRows = rows
      .map(item => ({ ...item, value: heatmapByZone.get(normalizeZoneLabel(String(item.name || ''))) || 0 }))
      .filter(item => Number.isFinite(item.value) && item.value > 0);
    exactRows.sort((a, b) => isTopRanking ? b.value - a.value : a.value - b.value);
    return exactRows;
  }, [rankingLevel, rankingMetric, selectedYear, selectedMonth, selectedMonthIndex, rankings, heatmapData, heatmapDataSourceKey, activeProfile.id]);
  const rankingLoadingRows = Array.from({ length: 10 }, (_, index) => (
    <tr key={`ranking-skeleton-${index}`} aria-hidden="true" style={{ height: '34px', borderBottom: '1px solid rgba(186, 204, 214, 0.08)' }}>
      <td><span style={{ display: 'block', width: `${54 + (index % 4) * 8}%`, height: '10px', borderRadius: '6px', background: 'rgba(143, 163, 184, 0.14)' }} /></td>
      <td><span style={{ display: 'block', width: `${40 + (index % 3) * 10}%`, height: '10px', marginLeft: 'auto', borderRadius: '6px', background: 'rgba(0, 229, 255, 0.13)' }} /></td>
    </tr>
  ));
  const normalizeZoneName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const highlightedRankingZone = rankingLevel === 'Distritos' ? selectedDistrict : selectedBarrio;
  const selectedRankingZone = rankingLevel === 'Distritos'
    ? selectedDistrict !== 'Todos' ? selectedDistrict : null
    : selectedBarrio !== 'Todos' ? selectedBarrio : null;

  return (
    <div className="v2-root" data-profile={activeProfile.id} data-platform={isMobile ? 'mobile' : 'desktop'} data-loading={showDashboardLoader ? 'true' : 'false'}>
      {isMobile && <BackgroundAurora animated={false} />}
      <div className="mi-atmosphere" aria-hidden="true"/>
      {showDashboardLoader && (
        <LoadingScreen
          ready={!isDashboardLoading && !dashboardLoadError}
          loadingMessage={filtersReady ? 'Cargando datos del mercado de Madrid…' : 'Conectando con los datos de Madrid…'}
          error={dashboardLoadError}
          onExited={() => setShowDashboardLoader(false)}
          onRetry={() => filtersReady ? setLoadAttempt(value => value + 1) : setFiltersAttempt(value => value + 1)}
        />
      )}

      {dashboardLoadError && !isDashboardLoading && (
        <div className="v2-api-error" role="alert">
          <div>
            <strong>No hemos podido actualizar el mercado.</strong>
            <span>{dashboardLoadError}</span>
          </div>
          <button type="button" onClick={() => filtersReady ? setLoadAttempt(value => value + 1) : setFiltersAttempt(value => value + 1)}>Reintentar</button>
        </div>
      )}

      <SiteHeader
        activePath="/madrid"
        appearance="aurora"
        compactBrand={isMobile}
        desktopAction={!isMobile ? (
          <div className="v2-header-desktop-actions">
            <PeriodSelector
              year={selectedYear}
              month={selectedMonth}
              years={availableYears}
              latestReal={latestAvailablePeriod}
              onChange={(year, month) => { setSelectedYear(year); setSelectedMonth(month); }}
              hideMonthArrows
              keyboardMonthNavigation
              showYearShortcut={false}
              isCompact={true}
              onOpenMethodology={() => setShowMethodologyDrawer(true)}
            />
          </div>
        ) : undefined}
        profileTabs={PROFILES.map(p => ({ id: p.id, label: p.label }))}
        activeProfileId={activeProfile.id}
        onSelectProfile={(id) => {
          const idx = PROFILES.findIndex(p => p.id === id);
          if (idx !== -1) handleProfileChange(idx);
        }}
      />

      {isMobile && <div className="v2-mobile-filter-bar">
        <div className="v2-mobile-filter-summary-row">
          <div className="v2-mobile-filter-summary">
            <strong>{activeProfile.label}</strong>
            <span>· {selectedBarrio !== 'Todos' ? formatZoneOption(selectedBarrio) : selectedDistrict === 'Todos' ? 'Madrid' : formatZoneOption(selectedDistrict)} · {selectedMonth} {selectedYear}</span>
          </div>
          <button type="button" className="v2-mobile-filter-pill" aria-expanded={isMobileFiltersOpen} aria-controls="v2-filter-panel" onClick={openMobileFilters}>
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Filtros</span>
            <b>{Number(selectedYear !== latestAvailablePeriod.year || selectedMonth !== latestAvailablePeriod.month)}</b>
          </button>
        </div>
        {(selectedDistrict !== 'Todos' || selectedBarrio !== 'Todos') && (
          <div className="v2-mobile-filter-chips">
            {selectedDistrict !== 'Todos' && <button type="button" onClick={() => { setSelectedDistrict('Todos'); setSelectedBarrio('Todos'); }}>‹ {formatZoneOption(selectedDistrict)} ×</button>}
            {selectedBarrio !== 'Todos' && <button type="button" onClick={() => setSelectedBarrio('Todos')}>{formatZoneOption(selectedBarrio)} ×</button>}
          </div>
        )}
        <div className="v2-mobile-direct-search">
          <ZoneSearch
            options={zoneSearchOptions}
            district={selectedDistrict}
            barrio={selectedBarrio}
            formatName={formatZoneOption}
            compact
            onSelect={({ district, barrio }) => {
              setSelectedDistrict(district);
              setSelectedBarrio(barrio);
              selectZone(barrio !== 'Todos' ? barrio : district !== 'Todos' ? district : null);
            }}
          />
        </div>
      </div>}

      {isMobileFiltersOpen && <button type="button" className="v2-mobile-filter-backdrop" aria-label="Cerrar filtros" onClick={closeMobileFilters} />}

      {/* 2. FILTROS REFINADOS (CUSTOM APPLE DROPDOWNS) */}
      <div id="v2-filter-panel" role={isMobile ? 'dialog' : undefined} aria-modal={isMobile && isMobileFiltersOpen ? true : undefined} aria-hidden={isMobile && !isMobileFiltersOpen ? true : undefined} className={`v2-filters ${isMobileFiltersOpen ? 'v2-mobile-filters-open' : ''} ${['year', 'month', 'dist', 'barrio'].includes(activeDropdown || '') ? 'v2-filters-open' : ''}`}>
        {isMobile && <div className="v2-mobile-filter-heading">
          <div><strong>Filtrar</strong><span>{activeProfile.label} · {visibleFilters.district === 'Todos' ? 'Madrid' : formatZoneOption(visibleFilters.district)} · {visibleFilters.month} {visibleFilters.year}</span></div>
          <button type="button" aria-label="Cerrar filtros" onClick={closeMobileFilters}><X size={20} /></button>
        </div>}
        <div className="v2-filter-group">
          <div className="v2-period-filter-group">
            <span className="v2-period-filter-heading">Periodo</span>

          {/* AÑO */}
          <div className={`v2-dropdown-container ${activeDropdown === 'year' ? 'v2-z-up' : ''}`}>
            <span className="v2-filter-label">Año</span>
            <DashboardSelect value={visibleFilters.year} expanded={activeDropdown === 'year'} onToggle={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')} />
            {activeDropdown === 'year' && (
              <div className="v2-dropdown-menu" role="listbox" aria-label="Año">
                {availableYears.map(y => (
                  <button type="button" key={y} className="v2-dropdown-item" role="option" aria-selected={visibleFilters.year === y} onClick={(e) => { e.stopPropagation(); const months = monthsByYear[y] || []; const month = months[months.length - 1] || 'Diciembre'; if (isMobileFiltersOpen) setDraftFilters(current => ({ ...current, year: y, month })); else { setSelectedYear(y); setSelectedMonth(month); } setActiveDropdown(null); }}>{y}</button>
                ))}
              </div>
            )}
          </div>

          {/* MES */}
          <div className={`v2-dropdown-container ${activeDropdown === 'month' ? 'v2-z-up' : ''}`}>
            <span className="v2-filter-label">Mes</span>
            <DashboardSelect value={visibleFilters.month} expanded={activeDropdown === 'month'} onToggle={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')} />
            {activeDropdown === 'month' && (
              <div className="v2-dropdown-menu" role="listbox" aria-label="Mes">
                {(monthsByYear[visibleFilters.year] || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']).map(m => (
                  <button type="button" key={m} className="v2-dropdown-item" role="option" aria-selected={visibleFilters.month === m} onClick={(e) => { e.stopPropagation(); if (isMobileFiltersOpen) setDraftFilters(current => ({ ...current, month: m })); else setSelectedMonth(m); setActiveDropdown(null); }}>{m}</button>
                ))}
              </div>
            )}
          </div>
          </div>

          {/* BOTONES DE ACCIÓN EN ALTO CONTRASTE */}
          <div className="v2-filter-actions">
            <button
              onClick={() => setShowHelpModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: 'rgba(1, 16, 36, 0.92)',
                border: '1.5px solid #00F0FF',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.18)';
                e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 240, 255, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(1, 16, 36, 0.92)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
              }}
              title="Aprende a interpretar los datos reales y las proyecciones"
            >
              <span style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#011024',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '900',
                fontFamily: 'sans-serif'
              }}>i</span>
              <span style={{ color: '#FFFFFF', fontWeight: '700' }}>¿Cómo entender estos precios?</span>
            </button>

            {activeProfile.id === 'venta' && (
              <button
                type="button"
                onClick={() => {
                  const dilemaEl = document.querySelector('[data-dashboard-section="dilemma"]');
                  if (dilemaEl) {
                    dilemaEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 178, 107, 0.12)',
                  border: '1.5px solid rgba(255, 178, 107, 0.55)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#ffb26b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 178, 107, 0.22)';
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 178, 107, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 178, 107, 0.12)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
                }}
                title="Compara la plusvalía de venta frente al rendimiento por alquiler en esta localidad"
              >
                <span>⚖️</span>
                <span>¿Vender o alquilar en {selectedBarrio !== 'Todos' ? formatZoneOption(selectedBarrio) : selectedDistrict !== 'Todos' ? formatZoneOption(selectedDistrict) : 'Madrid'}?</span>
              </button>
            )}

            {isMobile && <div className="v2-mobile-filter-commit">
              <button type="button" className="v2-mobile-filter-apply" onClick={applyMobileFilters}>
                Aplicar{Number(draftFilters.year !== latestAvailablePeriod.year || draftFilters.month !== latestAvailablePeriod.month) ? ` (${Number(draftFilters.year !== latestAvailablePeriod.year || draftFilters.month !== latestAvailablePeriod.month)})` : ''}
              </button>
              <button type="button" className="v2-mobile-filter-reset" onClick={resetMobileFilters}>Restablecer al último dato real</button>
            </div>}

          </div>

        </div>
      </div>

      {isMobile && <nav className="v2-mobile-profile-nav" aria-label="Perfiles de mercado">
        {PROFILES.map((profile, index) => {
          const ProfileIcon = [Home, Building2, Tag, Activity][index];
          return (
            <button key={profile.id} type="button" className={profileIdx === index ? 'active' : ''} aria-current={profileIdx === index ? 'page' : undefined} aria-pressed={profileIdx === index} onClick={() => handleProfileChange(index)}>
              <ProfileIcon size={17} aria-hidden="true" />
              <span>{profile.label}</span>
            </button>
          );
        })}
      </nav>}


      {/* 4. CONTENIDO PRINCIPAL */}
      <main className="v2-viewport" style={{ height: containerHeight }}>
        {PROFILES.map((p, i) => (
          <div key={p.id} ref={i === profileIdx ? activePanelRef : null} className={`v2-panel ${getSlideClass(i)}`}>

            {/* KPI & MAPA SECTION */}
            <div className="v2-grid-main" data-dashboard-section="summary">
              <div className="v2-kpi-col" onWheel={(e) => e.stopPropagation()}>
                <div className="v2-kpi-static-head">
                  {!isMobile && <div className="v2-zone-period-controls">
                    <ZoneSearch
                      options={zoneSearchOptions}
                      district={selectedDistrict}
                      barrio={selectedBarrio}
                      formatName={formatZoneOption}
                      onSelect={({ district, barrio }) => {
                        setSelectedDistrict(district);
                        setSelectedBarrio(barrio);
                        selectZone(barrio !== 'Todos' ? barrio : district !== 'Todos' ? district : null);
                        desktopZoneHoverRef.current = null;
                        setDesktopZoneHover(null);
                        setDesktopPinnedZone(null);
                      }}
                    />
                  </div>}
                  <div className="v2-kpi-context" aria-live="polite">
                    <div>
                      <strong>{selectedBarrio !== 'Todos' ? formatZoneOption(selectedBarrio) : selectedDistrict !== 'Todos' ? formatZoneOption(selectedDistrict) : 'Madrid'}</strong>
                      {!isMobile && selectedDistrict !== 'Todos' && <small>{selectedBarrio !== 'Todos' ? `${formatZoneOption(selectedDistrict)} › ${formatZoneOption(selectedBarrio)}` : `Distrito · ${formatZoneOption(selectedDistrict)}`}</small>}
                    </div>
                  </div>
                </div>

                <div className="v2-kpi-scroll-shell">
                  <div
                    className="v2-kpi-stack"
                    onScroll={(e) => updateKpiScrollState(e.currentTarget)}
                  >

                  {(() => {
                    const isAlquiler = activeProfile.id === 'alquiler';
                    const isCompra = activeProfile.id === 'compra';
                    const isVenta = activeProfile.id === 'venta';
                    const isInversion = activeProfile.id === 'inversion';
                    const isKpiFetching = isDashboardLoading || isTransitioning || Object.keys(kpiData || {}).length === 0;

                    const invRatio = isNetYieldActive && netYieldValue !== null ? Number(netYieldValue) : Number(kpiData.p_m2);
                    const invPercent = Number.isFinite(invRatio) && invRatio > 0 ? toPercent(invRatio) : 0;

                    const rent = Math.round(kpiData.p_vivienda || 0);
                    const incomeMonthly = Math.round((kpiData.renta_media || 0) / 12);
                    const effort = incomeMonthly > 0 ? (rent / incomeMonthly) * 100 : 0;
                    const salary = Number.parseFloat(userRentSalary);
                    const personalEffort = salary > 0 ? (rent / salary) * 100 : 0;

                    const rentaAnual = kpiData.renta_media || 0;
                    const tipo70Total = (isCompra || isVenta) && Number(kpiData.p_m2) > 0
                      ? Math.round(Number(kpiData.p_m2)) * VIVIENDA_TIPO_M2
                      : (kpiData.p_vivienda || 0);
                    const aniosRenta = rentaAnual > 0 ? tipo70Total / rentaAnual : 0;
                    const compraStatusText = aniosRenta <= 0 ? 'Sin datos' : aniosRenta < 5 ? 'Asequible' : aniosRenta < 8 ? 'Moderado' : 'Esfuerzo elevado';
                    const compraStatusColor = aniosRenta <= 0 ? '#baccd6' : aniosRenta < 5 ? '#34D399' : aniosRenta < 8 ? '#FBBF24' : '#F87171';

                    const transacciones = kpiData.transacciones || 0;
                    const velocity = transacciones ? Math.max(1.0, 933.8 / transacciones) : 0;
                    const velocityColor = velocity <= 0 ? '#baccd6' : velocity < 2.0 ? '#34D399' : velocity < 3.0 ? '#FBBF24' : '#F87171';
                    const demandText = transacciones > 300 ? 'alta' : transacciones > 100 ? 'moderada' : 'baja';

                    const amortizacionAnios = Number(kpiData.p_m2) > 0 ? 1 / Number(kpiData.p_m2) : 0;
                    const liqLabel = transacciones > 300 ? 'Liquidez alta' : transacciones > 100 ? 'Liquidez media' : 'Liquidez baja';

                    const heroEyebrow = isInversion
                      ? (isNetYieldActive ? 'Rentabilidad neta anual' : 'Rentabilidad bruta anual')
                      : `Precio medio · ${activeProfile.label}`;
                    const heroTooltip = isInversion
                      ? {
                          title: isNetYieldActive ? 'Rentabilidad neta anual' : 'Rentabilidad bruta anual',
                          description: isNetYieldActive
                            ? 'Rentabilidad neta anual tras deducir cuota de comunidad, IBI proporcional, seguro/mantenimiento y vacancia estimada.'
                            : 'Compara los ingresos anuales estimados por alquiler con el precio de compra de la vivienda.',
                          example: isNetYieldActive
                            ? 'Descuenta costes reales según las medias oficiales de Madrid.'
                            : 'El cálculo anualiza el alquiler y lo compara con el precio de compra.',
                          ruleOfThumb: 'Usa el simulador inferior para calibrar con tus propios costes.',
                        }
                      : isAlquiler
                        ? {
                            title: 'Precio de alquiler por metro cuadrado',
                            description: 'Precio medio mensual por metro cuadrado para el periodo y zona seleccionados.',
                            example: '21,62 €/m² equivale aproximadamente a 1.958 € al mes para una vivienda media.',
                            ruleOfThumb: 'Compara siempre la misma zona y el mismo periodo.',
                          }
                        : {
                            title: `Precio de ${activeProfile.label.toLowerCase()} por metro cuadrado`,
                            description: `Media del precio de ${activeProfile.label.toLowerCase()} por cada metro cuadrado para la zona y el periodo seleccionados.`,
                            example: 'A 3.000 €/m², una vivienda de 80 m² equivaldría a 240.000 € antes de gastos.',
                            ruleOfThumb: 'Comparar el precio por m² ayuda a comparar zonas con viviendas de distinto tamaño.',
                          };

                    const secondaryLeftLabel = isAlquiler
                      ? 'Alquiler medio (70 m²)'
                      : isInversion
                        ? 'Precio de inversión'
                        : 'Vivienda tipo (70 m²)';
                    const secondaryLeftUnit = isAlquiler ? '€/mes' : '€';
                    const marketStatus = `${kpiData.estado_mercado || 'Estable'}${kpiData.estado_mercado === 'Crecimiento' ? ' (+)' : kpiData.estado_mercado === 'Ajuste' ? ' (-)' : ''}`;

                    return (
                      <div className="v2-mobile-rent-summary">
                        <section className="v2-rent-hero">
                          <div className="v2-rent-hero-heading">
                            <div>
                              <span className="v2-rent-eyebrow">{heroEyebrow}</span>
                            </div>
                            <InfoTooltip
                              title={heroTooltip.title}
                              description={heroTooltip.description}
                              example={heroTooltip.example}
                              ruleOfThumb={heroTooltip.ruleOfThumb}
                            />
                          </div>
                          <div className="v2-rent-main-value">
                            {isKpiFetching ? (
                              <span className="v2-kpi-shimmer v2-kpi-shimmer--hero" aria-label="Calculando métrica principal" />
                            ) : isInversion ? (
                              <>
                                <strong>{invPercent > 0 ? invPercent.toFixed(2).replace('.', ',') : '—'}</strong>
                                {invPercent > 0 && <span>%</span>}
                              </>
                            ) : (
                              <>
                                <strong>{(isCompra || isVenta) ? formatCurrencyInt(kpiData.p_m2, '') : formatCurrencyDec(kpiData.p_m2, 2, '')}</strong>
                                {Number(kpiData.p_m2) > 0 && <span>€/m²</span>}
                              </>
                            )}
                          </div>
                          {(kpiData.is_prediction || isProjectionPeriod) && Number(kpiData.p_m2) > 0 && (
                            <ConfidenceIntervalBadge
                              centralValue={isInversion ? invPercent : Number(kpiData.p_m2)}
                              unit={isInversion ? '%' : '€/m²'}
                              confidencePercent={95}
                              decimals={(isCompra || isVenta) ? 0 : 2}
                            />
                          )}
                          <div className="v2-rent-chips">
                            {!isInversion ? (
                              <>
                                {Number.isFinite(Number(kpiData.v_mes)) && kpiData.v_mes !== undefined
                                  ? <span>{Number(kpiData.v_mes) < 0 ? '↘' : '↗'} {formatSpanishPercentage(kpiData.v_mes, 1, true)} mes</span>
                                  : null}
                                {Number.isFinite(Number(kpiData.v_anual)) && kpiData.v_anual !== undefined
                                  ? <span>{Number(kpiData.v_anual) < 0 ? '↘' : '↗'} {formatSpanishPercentage(kpiData.v_anual, 1, true)} año</span>
                                  : null}
                              </>
                            ) : (
                              <>
                                {transacciones > 0 && (
                                  <span>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)} op./año</span>
                                )}
                                <span>{liqLabel}</span>
                              </>
                            )}
                            <span className="v2-rent-market">{marketStatus}</span>
                          </div>
                          {isInversion && (
                            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#9fb4c7', lineHeight: 1.4 }}>
                              Orientativo, no es asesoramiento de inversión.
                            </p>
                          )}
                        </section>
                        <section className="v2-rent-secondary">
                          <div className="v2-rent-secondary-card">
                            <span className="v2-rent-eyebrow" title={isAlquiler ? 'Calculado sobre vivienda tipo estándar de 70 m²' : undefined}>{secondaryLeftLabel}</span>
                            {isKpiFetching ? (
                              <span className="v2-kpi-shimmer v2-kpi-shimmer--val" aria-label="Calculando importe medio" />
                            ) : (
                              <strong>
                                {formatCurrencyInt(tipo70Total, '')}
                                {Number(tipo70Total) > 0 ? <small> {secondaryLeftUnit}</small> : null}
                              </strong>
                            )}
                          </div>

                          {isAlquiler && (
                            <div className="v2-rent-secondary-card v2-rent-effort">
                              <div className="v2-rent-effort-head"><span className="v2-rent-eyebrow">Esfuerzo de alquiler</span>{isKpiFetching ? <span className="v2-kpi-shimmer v2-kpi-shimmer--chip" /> : <strong style={{ color: '#fbbf24' }}>{effort > 0 ? `${effort.toFixed(0)} %` : '—'}</strong>}</div>
                              <div className="v2-rent-effort-meter"><i style={{ width: `${Math.min(effort, 100)}%`, background: '#fbbf24' }} /><b style={{ left: '30%' }} /></div>
                              <span className="v2-rent-effort-caption">{formatCurrencyInt(rent, '€/mes')} de alquiler · {formatCurrencyInt(incomeMonthly, '€/mes')} de renta neta media por hogar (Fuente: INE)</span>
                              <button className="v2-rent-calc-toggle" type="button" onClick={() => setShowRentCalculator(value => !value)} aria-expanded={showRentCalculator}>
                                {showRentCalculator ? 'Cerrar cálculo' : 'Calcula con tu sueldo'} <span aria-hidden="true">{showRentCalculator ? '↑' : '→'}</span>
                              </button>
                              {showRentCalculator && <div className="v2-rent-calculator">
                                <input type="number" value={userRentSalary} onChange={event => setUserRentSalary(event.target.value)} placeholder="Sueldo neto mensual (€)" aria-label="Sueldo neto mensual" />
                                <span style={{ fontSize: '10px', color: '#8fa8be', display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0 2px' }}>🔒 Se calcula en tu navegador y no se guarda</span>
                                {salary > 0 && <span>Tu esfuerzo sería <strong style={{ color: personalEffort <= 30 ? '#34d399' : personalEffort <= 40 ? '#fbbf24' : '#f87171' }}>{personalEffort.toFixed(1).replace('.', ',')} %</strong></span>}
                              </div>}
                            </div>
                          )}

                          {isCompra && (
                            <div className="v2-rent-secondary-card v2-rent-effort">
                              <div className="v2-rent-effort-head">
                                <span className="v2-rent-eyebrow">Años de renta para comprar</span>
                                {isKpiFetching ? <span className="v2-kpi-shimmer v2-kpi-shimmer--chip" /> : <strong style={{ color: compraStatusColor }}>{aniosRenta > 0 ? `${aniosRenta.toFixed(1).replace('.', ',')} años` : '—'}</strong>}
                              </div>
                              <div className="v2-rent-effort-meter"><i style={{ width: `${Math.min(100, (aniosRenta / 12) * 100)}%`, background: compraStatusColor }} /><b style={{ left: '41.7%' }} /></div>
                              <span className="v2-rent-effort-caption">Renta media: {formatCurrencyInt(rentaAnual, '€/año')} · {compraStatusText}</span>
                            </div>
                          )}

                          {isVenta && (
                            <div className="v2-rent-secondary-card v2-rent-effort">
                              <div className="v2-rent-effort-head">
                                <span className="v2-rent-eyebrow">Velocidad venta</span>
                                {isKpiFetching ? <span className="v2-kpi-shimmer v2-kpi-shimmer--chip" /> : (
                                  <strong style={{ color: velocityColor }}>
                                    {velocity > 0 ? `${velocity % 1 === 0 ? velocity.toFixed(0) : velocity.toFixed(1).replace('.', ',')} ${velocity === 1 ? 'mes' : 'meses'}` : '—'}
                                  </strong>
                                )}
                              </div>
                              <div className="v2-rent-effort-meter"><i style={{ width: `${Math.min(100, (velocity / 4) * 100)}%`, background: velocityColor }} /><b style={{ left: '50%' }} /></div>
                              <span className="v2-rent-effort-caption">
                                {transacciones > 0 ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)} trans./año · Demanda ${demandText}` : 'Actividad anual'} · Potencial 6m: {formatSpanishPercentage((kpiData.v_anual || 0) / 2, 1, true)}
                              </span>
                            </div>
                          )}

                          {isInversion && (
                            <div className="v2-rent-secondary-card v2-rent-effort">
                              <div className="v2-rent-effort-head v2-rent-effort-head--stacked">
                                <span className="v2-rent-eyebrow">Amortización</span>
                                {isKpiFetching ? <span className="v2-kpi-shimmer v2-kpi-shimmer--chip" /> : <strong style={{ color: activeProfile.color }}>{amortizacionAnios > 0 ? `${amortizacionAnios.toFixed(1).replace('.', ',')} años` : '—'}</strong>}
                              </div>
                              <div className="v2-rent-effort-meter"><i style={{ width: `${Math.min(100, (amortizacionAnios / 30) * 100)}%`, background: activeProfile.color }} /><b style={{ left: '66.7%' }} /></div>
                              <span className="v2-rent-effort-caption">
                                Años de alquiler íntegro (GRM) · {isNetYieldActive ? 'Con modo neto activo' : 'Sobre rentabilidad bruta'}
                              </span>
                            </div>
                          )}
                        </section>
                        <Link href="/madrid/veredicto" className="v2-mobile-verdict-cta">
                          <span>¿Es buen precio? Comprueba un anuncio en 10 s</span>
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    );
                  })()}

                  <div className="v2-kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label>{activeProfile.id === 'inversion' ? (isNetYieldActive ? 'Rentabilidad neta anual' : 'Rentabilidad bruta anual') : 'Precio medio por m²'}</label>
                      <InfoTooltip
                        title={activeProfile.id === 'inversion' ? (isNetYieldActive ? 'Rentabilidad neta anual' : 'Rentabilidad bruta anual') : activeProfile.id === 'alquiler' ? 'Precio de alquiler por metro cuadrado' : 'Precio de venta por metro cuadrado'}
                        description={activeProfile.id === 'inversion'
                          ? (isNetYieldActive ? 'Rentabilidad neta anual tras deducir cuota de comunidad, IBI proporcional, seguro/mantenimiento y vacancia estimada.' : 'Compara los ingresos anuales estimados por alquiler con el precio de compra de la vivienda.')
                          : activeProfile.id === 'alquiler'
                            ? 'Media mensual del alquiler por cada metro cuadrado para la zona y el periodo seleccionados.'
                            : 'Media del precio de venta por cada metro cuadrado para la zona y el periodo seleccionados.'}
                        example={activeProfile.id === 'inversion'
                          ? (isNetYieldActive ? 'Descuenta costes reales según las medias oficiales de Madrid.' : 'El cálculo anualiza el alquiler y lo compara con el precio de compra; no descuenta gastos ni financiación.')
                          : activeProfile.id === 'alquiler'
                            ? 'A 20 €/m²/mes, una vivienda de 80 m² equivaldría a 1.600 €/mes.'
                            : 'A 3.000 €/m², una vivienda de 80 m² equivaldría a 240.000 € antes de gastos.'}
                        ruleOfThumb={activeProfile.id === 'inversion'
                          ? 'Usa el conmutador de Rentabilidad Neta para calibrar con tus propios costes.'
                          : 'Comparar el precio por m² ayuda a comparar zonas con viviendas de distinto tamaño.'}
                      />
                    </div>
                    {(() => {
                      const invRatio = isNetYieldActive && netYieldValue !== null ? Number(netYieldValue) : Number(kpiData.p_m2);
                      const invPercent = Number.isFinite(invRatio) && invRatio > 0 ? toPercent(invRatio) : 0;
                      return (
                        <>
                          <div className="v2-val">
                            {activeProfile.id === 'inversion'
                              ? (invPercent > 0 ? formatSpanishPercentage(invPercent, 2, false) : '—')
                              : formatCurrencyDec(kpiData.p_m2, 2, '€/m²')}
                          </div>
                          {(kpiData.is_prediction || isProjectionPeriod) && Number(kpiData.p_m2) > 0 && (
                            <ConfidenceIntervalBadge
                              centralValue={activeProfile.id === 'inversion' ? invPercent : Number(kpiData.p_m2)}
                              unit={activeProfile.id === 'inversion' ? '%' : '€/m²'}
                              confidencePercent={95}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="v2-kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label>{activeProfile.id === 'inversion' ? 'Precio de inversión' : activeProfile.id === 'alquiler' ? 'Alquiler medio' : 'Precio medio de vivienda'}</label>
                      <InfoTooltip
                        title={activeProfile.id === 'inversion' ? 'Precio de inversión' : activeProfile.id === 'alquiler' ? 'Alquiler medio mensual' : 'Precio medio de vivienda'}
                        description={activeProfile.id === 'inversion'
                          ? 'Importe medio de compra de la zona, calculado con el precio de venta y la superficie media registrada.'
                          : `Importe medio ${activeProfile.id === 'alquiler' ? 'mensual de alquiler' : 'de venta'} de la zona, calculado con el precio por m² y la superficie media registrada.`}
                        example={activeProfile.id === 'alquiler'
                          ? 'Es un valor mensual calculado con la superficie media de la zona; no representa el precio de un anuncio concreto.'
                          : 'Es un valor calculado con la superficie media de la zona; no representa el precio de un inmueble concreto.'}
                        ruleOfThumb="El ámbito y el periodo aparecen junto a las métricas."
                      />
                    </div>
                    <div className="v2-val">
                      {formatCurrencyInt(kpiData.p_vivienda, activeProfile.id === 'alquiler' ? '€/mes' : '€')}
                    </div>
                  </div>

                  {activeProfile.id !== 'inversion' && (
                    <>
                      <div className="v2-kpi-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label>Estado Mercado</label>
                          <InfoTooltip
                            title="Estado del Mercado Local"
                            description="Indica la fase del ciclo inmobiliario según las operaciones recientes de compra y alquiler."
                            example="Crecimiento (+): Precios al alza de forma sostenida. Ajuste (-): Moderación o descenso temporal de precios."
                            ruleOfThumb="En 'Crecimiento', los precios tienden a subir si esperas; en 'Ajuste', hay más margen para negociar."
                          />
                        </div>
                        <div className="v2-val" style={{ fontSize: '24px' }}>
                          {kpiData.estado_mercado} {kpiData.estado_mercado === 'Crecimiento' ? '(+)' : kpiData.estado_mercado === 'Ajuste' ? '(-)' : ''}
                        </div>
                      </div>

                      <div className="v2-kpi-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label>Var. Mensual</label>
                          <InfoTooltip
                            title="Variación Mensual"
                            description="Porcentaje de subida o bajada del precio respecto al mes inmediatamente anterior."
                            example="Un +1.2% indica que los precios subieron un 1.2% en los últimos 30 días respecto al mes previo."
                            ruleOfThumb="Permite detectar aceleraciones o cambios rápidos de tendencia en el corto plazo."
                          />
                        </div>
                        <div className={`v2-val accent ${Number(kpiData.v_mes) < 0 ? 'negative' : ''}`}>
                          {formatSpanishPercentage(kpiData.v_mes, 1, true)}
                        </div>
                      </div>

                      <div className="v2-kpi-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label>Var. Anual</label>
                          <InfoTooltip
                            title="Variación Anual (12 Meses)"
                            description="La evolución acumulada del precio en el último año completo respecto al mismo mes del año anterior."
                            example="Un +8.5% anual significa que una vivienda que costaba 200.000€ hace un año ahora se sitúa en torno a 217.000€."
                            ruleOfThumb="Es el indicador más robusto para medir la tendencia real de fondo y la revalorización patrimonial."
                          />
                        </div>
                        <div className={`v2-val accent ${Number(kpiData.v_anual) < 0 ? 'negative' : ''}`}>
                          {formatSpanishPercentage(kpiData.v_anual, 1, true)}
                        </div>
                      </div>
                    </>
                  )}

                  {activeProfile.id === 'inversion' && (() => {
                    const amortizacionAnios = kpiData.p_m2 > 0 ? (1 / kpiData.p_m2) : 0;
                    const transacciones = kpiData.transacciones || 0;
                    const liqColor = transacciones > 300 ? '#34D399' : transacciones > 100 ? '#FBBF24' : '#F87171';
                    const liqLabel = transacciones > 300 ? 'Liquidez alta' : transacciones > 100 ? 'Liquidez media' : 'Liquidez baja';
                    return (
                      <>
                        <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: activeProfile.color, letterSpacing: '0.5px' }}>AMORTIZACIÓN</label>
                            <InfoTooltip
                              title="Años de Amortización (GRM)"
                              description="Número de años completos de alquiler íntegro que se necesitan para recuperar el 100% de la inversión de compra del inmueble."
                              example="Si el GRM es de 18 años, significa que con 18 años de rentas de alquiler se cubre el precio total de la compra."
                              ruleOfThumb="Cuanto menor sea el número de años, más rápida es la amortización y más atractiva la inversión (lo ideal es por debajo de 20 años)."
                            />
                          </div>
                          <div className="v2-val" style={{ color: activeProfile.color }}>
                            {amortizacionAnios > 0 ? `${amortizacionAnios.toFixed(1).replace('.', ',')} años` : '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9FB6C8', marginTop: '2px', fontWeight: '500' }}>
                            (GRM: Gross Rent Mult.)
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>Liquidez del mercado</label>
                            <InfoTooltip
                              title="Liquidez y Volumen de Operaciones"
                              description="Número anual de compraventas registradas en la zona. Indica con qué facilidad podrías vender el inmueble en el futuro."
                              example="Más de 300 operaciones/año indica un mercado líquido y activo."
                              ruleOfThumb="A mayor liquidez, menor riesgo de quedarte atrapado con el activo."
                            />
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '22px' }}>
                            <span>{transacciones > 0 ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)} op./año` : '—'}</span>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: liqColor }}>· {liqLabel}</span>
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>Estado Mercado</label>
                          </div>
                          <div className="v2-val" style={{ fontSize: '22px' }}>
                            {kpiData.estado_mercado} {kpiData.estado_mercado === 'Crecimiento' ? '(+)' : kpiData.estado_mercado === 'Ajuste' ? '(-)' : ''}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {activeProfile.id === 'compra' && (() => {
                    const precioMedio = kpiData.p_vivienda || 0;
                    const rentaAnual = kpiData.renta_media || 0;
                    const aniosRenta = rentaAnual > 0 ? precioMedio / rentaAnual : 0;

                    let statusText = 'N/A';
                    let statusColor = '#34D399';
                    if (aniosRenta > 0) {
                      if (aniosRenta < 5) {
                        statusText = 'Asequible para habitantes típicos';
                        statusColor = '#34D399';
                      } else if (aniosRenta < 8) {
                        statusText = 'Moderado para habitantes típicos';
                        statusColor = '#FBBF24';
                      } else {
                        statusText = 'Difícil para habitantes típicos';
                        statusColor = '#F87171';
                      }
                    }

                    const parsedIncome = parseFloat(userPurchaseIncome);
                    const parsedSavings = parseFloat(userPurchaseSavings);
                    const hasUserSim = showPurchaseSim && !isNaN(parsedIncome) && parsedIncome > 0;

                    const userAnios = hasUserSim ? precioMedio / parsedIncome : 0;
                    let userAniosStatus = '';
                    let userAniosColor = '#34D399';
                    if (userAnios > 0) {
                      if (userAnios < 3) {
                        userAniosStatus = 'Muy asequible';
                        userAniosColor = '#34D399';
                      } else if (userAnios < 6) {
                        userAniosStatus = 'Moderado';
                        userAniosColor = '#FBBF24';
                      } else {
                        userAniosStatus = 'Poco asequible';
                        userAniosColor = '#F87171';
                      }
                    }

                    const userEntradaPct = hasUserSim && precioMedio > 0 ? (parsedSavings / precioMedio) * 100 : 0;
                    let userEntradaStatus = '';
                    let userEntradaColor = '#34D399';
                    if (userEntradaPct > 0) {
                      if (userEntradaPct >= 30) {
                        userEntradaStatus = 'Hipoteca moderada';
                        userEntradaColor = '#34D399';
                      } else if (userEntradaPct >= 20) {
                        userEntradaStatus = 'Hipoteca estándar';
                        userEntradaColor = '#FBBF24';
                      } else {
                        userEntradaStatus = 'Hipoteca de alto riesgo';
                        userEntradaColor = '#F87171';
                      }
                    }

                    return (
                      <>
                        <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: activeProfile.color, letterSpacing: '0.5px' }}>
                              PODER ADQUISITIVO {selectedBarrio !== 'Todos' ? 'DEL BARRIO' : (selectedDistrict !== 'Todos' ? 'DEL DISTRITO' : 'DE MADRID')}
                            </label>
                            <InfoTooltip
                              title="Poder Adquisitivo y Años de Renta"
                              description="Mide cuántos años de ingresos anuales brutos íntegros necesita una familia residente típica de esta zona para comprar una vivienda media."
                              example="Si un piso medio cuesta 350.000€ y la renta media del hogar en la zona es de 50.000€/año, se necesitan 7 años íntegros de sueldo."
                              ruleOfThumb="Menos de 5 años se considera asequible; entre 5 y 8 años moderado; más de 8 años supone un esfuerzo elevado."
                            />
                          </div>
                          <div style={{ fontSize: '12px', color: '#BACCD6', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span>Renta media {selectedBarrio !== 'Todos' ? 'barrio' : (selectedDistrict !== 'Todos' ? 'distrito' : 'Madrid')}:</span>
                            <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{formatCurrencyInt(rentaAnual, '€/año')}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#BACCD6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(186, 204, 214, 0.12)' }}>
                            <span>Años de renta media:</span>
                            <strong style={{ fontSize: '18px', color: '#00F0FF', fontWeight: '800' }}>{aniosRenta > 0 ? aniosRenta.toFixed(1).replace('.', ',') : '—'} años</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: statusColor }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                            <span>{statusText}</span>
                          </div>
                        </div>

                        <div className={`v2-sim-accordion ${isPurchaseSimOpen ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            className="v2-sim-accordion-trigger"
                            onClick={(e) => handleAccordionToggle(e, isPurchaseSimOpen, setIsPurchaseSimOpen)}
                            aria-expanded={isPurchaseSimOpen}
                          >
                            <span className="v2-sim-accordion-label">
                              <Settings size={14} className="v2-sim-gear" />
                              <span>Simular mi capacidad de compra (Ahorros e Ingresos)</span>
                            </span>
                            <ChevronDown size={15} className={`v2-sim-chevron ${isPurchaseSimOpen ? 'rotated' : ''}`} />
                          </button>

                          <div className="v2-sim-accordion-panel" aria-hidden={!isPurchaseSimOpen}>
                            <div className="v2-sim-accordion-inner">
                              <div className="v2-sim-accordion-body">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                  <label style={{ fontSize: '10px', color: '#BACCD6' }}>Ingresos anuales (€)</label>
                                  <input
                                    type="number"
                                    value={userPurchaseIncome}
                                    onChange={(e) => { setUserPurchaseIncome(e.target.value); setShowPurchaseSim(false); }}
                                    placeholder="Ej: 80000"
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.4)', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ fontSize: '10px', color: '#BACCD6' }}>Ahorros disponibles (€)</label>
                                  <input
                                    type="number"
                                    value={userPurchaseSavings}
                                    onChange={(e) => { setUserPurchaseSavings(e.target.value); setShowPurchaseSim(false); }}
                                    placeholder="Ej: 150000"
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.4)', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowPurchaseSim(true)}
                                  style={{ width: '100%', background: activeProfile.color, color: '#02152D', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '2px' }}
                                >
                                  Calcular MI caso
                                </button>
                              </div>

                              {hasUserSim && (
                                <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(2, 20, 43, 0.9)', border: `1px solid ${activeProfile.color}55`, borderRadius: '8px', fontSize: '12px', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease' }}>
                                  <div>
                                    <span style={{ color: '#CBD5E1' }}>Con tus ingresos ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedIncome)}€/año):</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <span>Serían <strong style={{ color: activeProfile.color }}>{userAnios.toFixed(1)} años</strong> → <strong style={{ color: userAniosColor }}>{userAniosStatus}</strong></span>
                                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userAniosColor }} />
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: '#CBD5E1' }}>Con tus ahorros ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedSavings)}€):</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <span>Entrada: <strong style={{ color: activeProfile.color }}>{userEntradaPct.toFixed(0)}%</strong> → <strong style={{ color: userEntradaColor }}>{userEntradaStatus}</strong></span>
                                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userEntradaColor }} />
                                    </div>
                                  </div>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {activeProfile.id === 'alquiler' && (() => {
                    const alquiler = Math.round(kpiData.p_vivienda || 0);
                    const rentaMediaAnual = kpiData.renta_media || 0;
                    const rentaMediaMensual = rentaMediaAnual > 0 ? Math.round(rentaMediaAnual / 12) : 0;
                    const dedicar = rentaMediaMensual > 0 ? (alquiler / rentaMediaMensual) * 100 : 0;

                    const parsedSalary = parseFloat(userRentSalary);
                    const hasUserSalary = !isNaN(parsedSalary) && parsedSalary > 0;
                    const userEffort = hasUserSalary ? (alquiler / parsedSalary) * 100 : 0;

                    const userEffortColor = userEffort <= 30 ? '#34d399' : userEffort <= 40 ? '#fbbf24' : '#f87171';

                    return (
                      <>
                        <div className="v2-kpi-card v2-effort-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#fbbf24', letterSpacing: '0.5px' }}>ESFUERZO DE ALQUILER</label>
                            <InfoTooltip
                              title="Tasa de Esfuerzo Financiero en Alquiler"
                              description="Porcentaje del presupuesto mensual que un hogar o inquilino destina al pago del alquiler respecto a su renta neta."
                              example="Para un alquiler de 1.200 € y unos ingresos netos de 3.000 €, el esfuerzo es del 40 %."
                              ruleOfThumb="El Banco de España recomienda no superar el 30 % - 35 % de los ingresos netos. Superar el 40 % se considera sobreesfuerzo crítico."
                            />
                          </div>

                          <div style={{ fontSize: '11.5px', color: '#BACCD6', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span>Renta neta media hogar <span style={{ fontSize: '10px', color: '#00F0FF', fontWeight: 600 }}>(dato INE)</span>:</span>
                            <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>
                              {rentaMediaMensual > 0 ? formatCurrencyInt(rentaMediaMensual, '€/mes') : '—'}
                            </strong>
                          </div>

                          <div style={{ fontSize: '12px', color: '#BACCD6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid rgba(186, 204, 214, 0.12)' }}>
                            <span>Esfuerzo medio hogar:</span>
                            <strong style={{ fontSize: '18px', color: '#fbbf24', fontWeight: '800' }}>
                              {dedicar > 0 ? `${dedicar.toFixed(1).replace('.', ',')} %` : '—'}
                            </strong>
                          </div>
                        </div>

                        <div className={`v2-sim-accordion ${isRentSimOpen ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            className="v2-sim-accordion-trigger"
                            onClick={(e) => handleAccordionToggle(e, isRentSimOpen, setIsRentSimOpen)}
                            aria-expanded={isRentSimOpen}
                          >
                            <span className="v2-sim-accordion-label">
                              <Settings size={14} className="v2-sim-gear" />
                              <span>Calcular esfuerzo según mi nómina neta</span>
                            </span>
                            <ChevronDown size={15} className={`v2-sim-chevron ${isRentSimOpen ? 'rotated' : ''}`} />
                          </button>

                          <div className="v2-sim-accordion-panel" aria-hidden={!isRentSimOpen}>
                            <div className="v2-sim-accordion-inner">
                              <div className="v2-sim-accordion-body">
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>Calcula con tu sueldo</label>
                                  <span style={{ fontSize: '10px', color: '#91b0c2' }}>Neto mensual</span>
                                </div>
                                <input
                                  type="number"
                                  value={userRentSalary}
                                  onChange={(e) => setUserRentSalary(e.target.value)}
                                  placeholder="Ej. 2.100 €/mes"
                                  aria-label="Sueldo neto mensual para calcular esfuerzo"
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.35)', fontSize: '12px', marginTop: '4px', outline: 'none' }}
                                />
                                <span style={{ fontSize: '10px', color: '#8fa8be', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  🔒 Se calcula en tu navegador y no se guarda
                                </span>
                              </div>

                              {hasUserSalary && (
                                <div style={{ marginTop: '8px', padding: '9px 10px', background: 'rgba(2, 20, 43, 0.85)', border: `1px solid ${userEffortColor}55`, borderRadius: '8px', animation: 'v2FadeIn 0.2s ease' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11.5px', color: '#FFFFFF', fontWeight: '600' }}>Tu esfuerzo personal:</span>
                                    <strong style={{ color: userEffortColor, fontSize: '15px', fontWeight: '800' }}>
                                      {userEffort.toFixed(1).replace('.', ',')} %
                                    </strong>
                                  </div>

                                  <div style={{ position: 'relative', width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', margin: '7px 0 4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, (userEffort / 60) * 100)}%`, background: userEffortColor, borderRadius: '999px', transition: 'width 0.25s ease' }} />
                                  </div>
                                  <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#8fa8be' }}>
                                    <span>0 %</span>
                                    <span style={{ color: userEffort <= 30 ? '#34d399' : '#fbbf24', fontWeight: '700' }}>▲ Marca recomendada: 30 %</span>
                                    <span>60 %+</span>
                                  </div>

                                  <p style={{ margin: '5px 0 0', fontSize: '10.5px', color: userEffortColor, fontWeight: '600' }}>
                                    {userEffort <= 30
                                      ? '✓ Dentro del límite recomendado (≤ 30 %)'
                                      : userEffort <= 40
                                        ? '⚠ Esfuerzo moderado-alto (30 % – 40 %)'
                                        : '✕ Sobreesfuerzo financiero (> 40 % según Banco de España)'}
                                  </p>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {activeProfile.id === 'inversion' && (() => {
                    const rent = kpiData.p_m2 || 0;
                    const grm = rent > 0 ? 1 / rent : 0;
                    const roiNeto = rent * 0.9 * 100;
                    const transacciones = kpiData.transacciones || 0;

                    let liquidezText = 'Liquidez baja';
                    let liquidezColor = '#F87171';
                    if (transacciones > 300) {
                      liquidezText = 'Liquidez alta (fácil vender)';
                      liquidezColor = '#34D399';
                    } else if (transacciones > 100) {
                      liquidezText = 'Liquidez media';
                      liquidezColor = '#FBBF24';
                    }

                    const capital = parseFloat(userInvCapital);
                    const duracion = parseInt(userInvDuration);
                    const hasInvSim = showInvSim && !isNaN(capital) && capital > 0 && !isNaN(duracion) && duracion > 0;

                    const projectionRows = [];
                    let currentVal = capital;
                    if (hasInvSim) {
                      const yieldFrac = rent * 0.9;
                      for (let y = 1; y <= Math.min(duracion, 5); y++) {
                        const nextVal = currentVal * (1 + yieldFrac);
                        projectionRows.push({
                          year: y,
                          from: currentVal,
                          to: nextVal
                        });
                        currentVal = nextVal;
                      }
                    }

                    const totalGain = currentVal - capital;
                    const gainPct = capital > 0 ? (totalGain / capital) * 100 : 0;
                    const annualGain = duracion > 0 ? totalGain / duracion : 0;

                    return (
                      <div className={`v2-sim-accordion ${isInvSimOpen ? 'is-open' : ''}`}>
                        <button
                          type="button"
                          className="v2-sim-accordion-trigger"
                          onClick={(e) => handleAccordionToggle(e, isInvSimOpen, setIsInvSimOpen)}
                          aria-expanded={isInvSimOpen}
                        >
                          <span className="v2-sim-accordion-label">
                            <Settings size={14} className="v2-sim-gear" />
                            <span>Simular apalancamiento hipotecario (LTV) y gastos</span>
                          </span>
                          <ChevronDown size={15} className={`v2-sim-chevron ${isInvSimOpen ? 'rotated' : ''}`} />
                        </button>

                        <div className="v2-sim-accordion-panel" aria-hidden={!isInvSimOpen}>
                          <div className="v2-sim-accordion-inner">
                            <div className="v2-sim-accordion-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <ExpenseYieldSimulator
                              grossYield={Number(kpiData.p_m2) || 0.062}
                              purchasePrice={Number(kpiData.p_vivienda) || 280000}
                              monthlyRent={Number(kpiData.p_vivienda) && Number(kpiData.p_m2) ? Math.round((Number(kpiData.p_vivienda) * Number(kpiData.p_m2)) / 12) : 1450}
                              onNetYieldChange={(netY, isNet) => {
                                setNetYieldValue(netY);
                                setIsNetYieldActive(isNet);
                              }}
                            />

                            {/* Selector de LTV */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(186, 204, 214, 0.16)', paddingTop: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#BACCD6', letterSpacing: '0.5px' }}>LTV ESTIMADO (LOAN-TO-VALUE)</label>
                                <InfoTooltip
                                  title="LTV (Loan-to-Value) / Financiación"
                                  description="Indica qué porcentaje del valor total del inmueble financias mediante hipoteca y cuánto aportas de tus propios ahorros."
                                  example="Un LTV del 70% significa que el banco aporta el 70% del precio y tú pagas el 30% restante con ahorros."
                                  ruleOfThumb="Para inversión los bancos suelen financiar el 60%-70%; para vivienda habitual hasta el 80%."
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>
                                <span>LTV: {ltvPercent}%</span>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: activeProfile.color }}>
                                  Aporta: {100 - ltvPercent}%
                                </span>
                              </div>

                              <div style={{ fontSize: '11px', color: '#BACCD6', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Hipoteca Estimada:</span>
                                  <span style={{ fontWeight: '700', color: '#FFFFFF' }}>
                                    {new Intl.NumberFormat('es-ES').format(Math.round((kpiData.p_vivienda || 0) * (ltvPercent / 100)))}€
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Aportación Comprador:</span>
                                  <span style={{ fontWeight: '700', color: '#FFFFFF' }}>
                                    {new Intl.NumberFormat('es-ES').format(Math.round((kpiData.p_vivienda || 0) * ((100 - ltvPercent) / 100)))}€
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                {[60, 70, 80].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setLtvPercent(val)}
                                    style={{
                                      flex: 1,
                                      padding: '4px 0',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      border: 'none',
                                      borderRadius: '4px',
                                      backgroundColor: ltvPercent === val ? activeProfile.color : 'rgba(255, 255, 255, 0.08)',
                                      color: ltvPercent === val ? '#02152D' : '#CBD5E1',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Preset: {val}%
                                  </button>
                                ))}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#BACCD6' }}>AJUSTE MANUAL LTV:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <input
                                      type="number"
                                      min="10"
                                      max="100"
                                      value={ltvPercent}
                                      onChange={(e) => {
                                        const val = Math.min(100, Math.max(10, parseInt(e.target.value) || 0));
                                        setLtvPercent(val);
                                      }}
                                      style={{
                                        width: '42px',
                                        border: '1px solid rgba(0, 240, 255, 0.4)',
                                        borderRadius: '4px',
                                        padding: '2px 4px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        background: '#011024',
                                        color: '#FFFFFF',
                                        outline: 'none'
                                      }}
                                    />
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#00F0FF' }}>%</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={ltvPercent}
                                  onChange={(e) => setLtvPercent(parseInt(e.target.value))}
                                  style={{
                                    width: '100%',
                                    cursor: 'pointer',
                                    accentColor: activeProfile.color,
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: 'rgba(186, 204, 214, 0.2)',
                                    outline: 'none'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Simulador de inversión personal */}
                            <div style={{ borderTop: '1px solid rgba(186, 204, 214, 0.16)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#BACCD6' }}>
                                <span>Liquidez local ({formatCurrencyInt(transacciones, 'trans./año')})</span>
                                <span style={{ color: liquidezColor, fontWeight: '600' }}>{liquidezText}</span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>Proyección de capital</span>

                              <div>
                                <label style={{ fontSize: '10px', color: '#BACCD6' }}>Capital inicial (€)</label>
                                <input
                                  type="number"
                                  value={userInvCapital}
                                  onChange={(e) => { setUserInvCapital(e.target.value); setShowInvSim(false); }}
                                  placeholder="Ej: 300000"
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.4)', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '10px', color: '#BACCD6' }}>Duración (años)</label>
                                <input
                                  type="number"
                                  value={userInvDuration}
                                  onChange={(e) => { setUserInvDuration(e.target.value); setShowInvSim(false); }}
                                  placeholder="Ej: 5"
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.4)', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowInvSim(true)}
                                style={{ width: '100%', background: activeProfile.color, color: '#02152D', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '2px' }}
                              >
                                Ver proyección
                              </button>

                              {hasInvSim && (
                                <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(2, 20, 43, 0.92)', border: `1px solid ${activeProfile.color}55`, borderRadius: '8px', fontSize: '11px', color: '#E2EFF7', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease' }}>
                                  <strong style={{ fontSize: '10px', textTransform: 'uppercase', color: activeProfile.color, letterSpacing: '0.05em' }}>Estimación simulada</strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid rgba(186, 204, 214, 0.16)', paddingBottom: '6px' }}>
                                    {projectionRows.map(row => (
                                      <div key={row.year} style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                                        <span>Año {row.year}:</span>
                                        <span>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.from)}€ → <strong style={{ color: '#FFFFFF' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.to)}€</strong></span>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#E2EFF7' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#9FB6C8' }}>Ganancia total:</span>
                                      <strong style={{ color: '#34D399' }}>+{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(totalGain)}€ (+{gainPct.toFixed(0)}%)</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#9FB6C8' }}>Ganancia anual:</span>
                                      <strong style={{ color: '#FFFFFF' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(annualGain)}€/año</strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  {activeProfile.id === 'venta' && (() => {
                    const transacciones = kpiData.transacciones || 0;
                    const velocity = transacciones ? Math.max(1.0, 933.8 / transacciones) : 0;

                    let velocityLabel = 'Lento';
                    let velocityColor = '#F87171';
                    if (velocity > 0) {
                      if (velocity < 2.0) {
                        velocityLabel = 'Rápido';
                        velocityColor = '#34D399';
                      } else if (velocity < 3.0) {
                        velocityLabel = 'Moderado';
                        velocityColor = '#FBBF24';
                      }
                    }

                    let demandText = 'Baja';
                    let demandColor = '#F87171';
                    if (transacciones > 300) {
                      demandText = 'Alta';
                      demandColor = '#34D399';
                    } else if (transacciones > 100) {
                      demandText = 'Moderada';
                      demandColor = '#FBBF24';
                    }

                    const appRate = kpiData.v_anual || 0;
                    const gain6m = (appRate / 2).toFixed(1);

                    return (
                      <>
                        {/* Acordeón "Ver más indicadores" para los 3 últimos KPIs de Venta */}
                        <div className={`v2-sim-accordion ${isVentaMoreOpen ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            className="v2-sim-accordion-trigger"
                            onClick={(e) => handleAccordionToggle(e, isVentaMoreOpen, setIsVentaMoreOpen)}
                            aria-expanded={isVentaMoreOpen}
                          >
                            <span className="v2-sim-accordion-label">
                              <Settings size={14} className="v2-sim-gear" />
                              <span>Ver más indicadores</span>
                            </span>
                            <ChevronDown size={15} className={`v2-sim-chevron ${isVentaMoreOpen ? 'rotated' : ''}`} />
                          </button>
                          <div className="v2-sim-accordion-panel" aria-hidden={!isVentaMoreOpen}>
                            <div className="v2-sim-accordion-inner">
                              <div className="v2-sim-accordion-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>¿Cuánto tardará en venderse?</label>
                            <InfoTooltip
                              title="Velocidad Media de Venta"
                              description="Tiempo estimado promedio en meses que tarda una vivienda en cerrarse y firmarse ante notario en este distrito o barrio."
                              example="Si marca 1.5 meses, la vivienda se vende a buen ritmo. Si supera los 3 meses, la demanda es más selectiva o pausada."
                              ruleOfThumb="Menos de 2 meses indica un mercado rápido con compradores activos; más de 3 meses exige fijar un precio muy competitivo."
                            />
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span>{velocity > 0 ? (velocity % 1 === 0 ? velocity.toFixed(0) : velocity.toFixed(1).replace('.', ',')) + ' ' + (velocity === 1 ? 'mes' : 'meses') : '—'}</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: velocityColor }}>
                              ({velocityLabel})
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#9FB6C8', marginTop: '2px' }}>
                            Velocidad de venta estimada promedio
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>¿Hay demanda en la zona?</label>
                            <InfoTooltip
                              title="Actividad y demanda local"
                              description="Número de operaciones de compraventa cerradas en el último año según los registros disponibles. Es un indicador de actividad, no un plazo garantizado de venta."
                              example="Más de 300 transacciones anuales indican un mercado más activo; no significa que cualquier vivienda vaya a venderse en un plazo concreto."
                              ruleOfThumb="Usa esta cifra junto al precio y a la demanda de la zona; no la interpretes como una promesa de velocidad."
                            />
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{transacciones > 0 ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)} trans./año` : '—'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: demandColor }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: demandColor }} />
                              {demandText}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#9FB6C8', marginTop: '2px' }}>
                            Interés y liquidez del mercado local
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>Potencial de ganancia (6 meses)</label>
                            <InfoTooltip
                              title="Potencial de Ganancia (6 Meses)"
                              description="Estimación del incremento de valor que podría experimentar el inmueble si decides esperar un semestre antes de ponerlo a la venta."
                              example="Si el potencial es de +2.5% y tu vivienda vale 300.000€, posponer la venta podría aportarte unos 7.500€ adicionales de margen."
                              ruleOfThumb="En fases alcistas, posponer la venta puede aumentar el margen; en fases de ajuste, vender pronto protege tu beneficio."
                            />
                          </div>
                          <div className="v2-val" style={{ color: activeProfile.color }}>
                            {formatSpanishPercentage(appRate / 2, 1, true)}
                          </div>
                          <div style={{ fontSize: '10px', color: '#9FB6C8', marginTop: '2px' }}>
                            más de precio si esperas
                          </div>
                        </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  </div>
                </div>
              </div>

              <div className="v2-map-col">
                <div className="v2-map-card" data-dashboard-section="map">
                  <DashboardMapStatus
                    isMobile={isMobile}
                    isProjection={isProjectionPeriod}
                    mobileStatus={periodStatusLabel}
                    observedMonth={latestAvailablePeriod.month}
                    observedYear={latestAvailablePeriod.year}
                    latestRealMonth={latestRealMonth}
                    latestRealYear={latestRealYear}
                    firstProjectionMonth={firstProjectionMonth}
                    onHelp={() => setShowMapHelpModal(true)}
                  >
                    {!isMobile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PeriodSelector year={selectedYear} month={selectedMonth} years={availableYears} latestReal={latestAvailablePeriod} onChange={(year, month) => { setSelectedYear(year); setSelectedMonth(month); }} hideMonthArrows keyboardMonthNavigation showYearShortcut={false} />
                      </div>
                    )}
                  </DashboardMapStatus>

                  <div className="v2-map-fullscreen-info" aria-live="polite">
                    {selectedMapFeature
                      ? `${selectedMapFeature} · ${mapFeaturePrimary} · ${mapFeatureSecondary}`
                      : 'Toca un distrito o barrio para ver sus datos'}
                  </div>

                  <div className="v2-mobile-map-switch" role="group" aria-label="Nivel del mapa">
                    <button type="button" className={mapLevel === 'districts' ? 'active' : ''} aria-pressed={mapLevel === 'districts'} onClick={() => { setMapLevel('districts'); clearSelection(); }}>Distritos</button>
                    <button type="button" className={mapLevel === 'neighborhoods' ? 'active' : ''} aria-pressed={mapLevel === 'neighborhoods'} onClick={() => setMapLevel('neighborhoods')}>Barrios</button>
                  </div>
                  <CardLoadingOverlay
                    isLoading={isMapLoading || (isDashboardLoading && mapData.districts.length === 0)}
                    message="Calibrando telemetría y algoritmos de mercado…"
                    className="v2-maps-loading-wrapper"
                  >
                    <div className="v2-dual-maps" style={{ position: 'relative' }}>
                      <div className="v2-map-sub" data-map-level="districts">
                        <div className="v2-map-placeholder" style={{ border: 'none' }}>
                          <MadridMap
                            key="districts-map"
                            type="districts"
                            data={mapData.districts}
                            selectedYear={Number(selectedYear)}
                            selectedMonth={selectedMonth}
                            isProjection={isProjectionPeriod}
                            selectedProfile={activeProfile.label}
                            selectedDistrict={isMobile ? null : (selectedDistrict === 'Todos' ? null : selectedDistrict)}
                            selectedBarrio={isMobile ? null : (selectedBarrio === 'Todos' ? null : selectedBarrio)}
                            selectedZone={selectedMapFeature}
                            selectedZoneType={isMobile ? (mapLevel === 'districts' ? 'districts' : undefined) : desktopPinnedZone?.zoneType}
                            drillDownOnSelection={false}
                            isMobile={isMobile}
                            onBackgroundClick={isMobile ? clearSelection : undefined}
                            onZoneHover={isMobile ? undefined : handleDesktopZoneHover}
                            onDistrictClick={handleMapDistrictClick}
                          />
                          {!isMobile && <div className="v2-map-panel-heading"><strong>Distritos · {mapMetricLabel}</strong></div>}
                        </div>
                      </div>
                      <div className="v2-map-sub" data-map-level="neighborhoods">
                        <div className="v2-map-placeholder" style={{ border: 'none' }}>
                          <MadridMap
                            key="neighborhoods-map"
                            type="neighborhoods"
                            data={mapData.neighborhoods}
                            selectedYear={Number(selectedYear)}
                            selectedMonth={selectedMonth}
                            isProjection={isProjectionPeriod}
                            selectedProfile={activeProfile.label}
                            selectedDistrict={selectedDistrict === 'Todos' ? null : selectedDistrict}
                            selectedBarrio={isMobile ? null : (selectedBarrio === 'Todos' ? null : selectedBarrio)}
                            selectedZone={selectedMapFeature}
                            selectedZoneType={isMobile ? (mapLevel === 'neighborhoods' ? 'neighborhoods' : undefined) : desktopPinnedZone?.zoneType}
                            drillDownOnSelection={isMobile && mapLevel === 'neighborhoods' && selectedDistrict !== 'Todos'}
                            isMobile={isMobile}
                            onBackgroundClick={isMobile ? clearSelection : undefined}
                            onZoneHover={isMobile ? undefined : handleDesktopZoneHover}
                            onDistrictClick={handleMapDistrictClick}
                            onBarrioClick={handleMapBarrioClick}
                          />
                          {!isMobile && <div className="v2-map-panel-heading"><strong>Barrios · {mapMetricLabel}</strong></div>}
                        </div>
                      </div>
                    </div>
                  </CardLoadingOverlay>
                  {!isMobile && desktopDisplayedZone && <FichaZonaDesktop
                    zone={desktopDisplayedZone.zoneId}
                    zoneType={desktopDisplayedZone.zoneType === 'districts' ? 'DISTRITO' : 'BARRIO'}
                    noData={mapFeatureNoData}
                    projectionWithoutHistory={mapFeatureNoData && isProjectionPeriod}
                    position={{ point: desktopDisplayedZone.point, bounds: desktopDisplayedZone.bounds }}
                    style={{ maxWidth: Math.max(120, desktopDisplayedZone.bounds.right - desktopDisplayedZone.bounds.left - 16) }}
                    pinned={Boolean(desktopPinnedZone && normalizeZoneLabel(selectedMapFeature || '') === normalizeZoneLabel(desktopPinnedZone.zoneId))}
                    rank={mapFeatureRankLabel}
                    primaryLabel={mapFeaturePrimaryLabel}
                    primaryValue={mapFeaturePrimary}
                    secondaryLabel={mapFeatureSecondaryLabel}
                    secondaryValue={mapFeatureSecondary}
                    delta={mapFeatureDeltaLabel}
                    onClose={() => { clearSelection(); desktopZoneHoverRef.current = null; setDesktopZoneHover(null); setDesktopPinnedZone(null); }}
                  />}
                  {isMobile && selectedMapFeature && <FichaZonaMovil
                    zone={formatZoneOption(selectedMapFeature)}
                    zoneType={mapFeatureIsDistrict ? 'DISTRITO' : 'BARRIO'}
                    badge={isProjectionPeriod ? 'Estimación' : null}
                    noData={mapFeatureNoData}
                    projectionWithoutHistory={mapFeatureNoData && isProjectionPeriod}
                    rank={mapFeatureRankLabel}
                    primaryLabel={mapFeaturePrimaryLabel}
                    primaryValue={mapFeaturePrimary}
                    secondaryLabel={activeProfile.id === 'alquiler' ? 'Alquiler medio (70 m²)' : mapFeatureSecondaryLabel}
                    secondaryValue={activeProfile.id === 'alquiler' && mapFeatureHasData && Number(mapFeatureItem?.precio_m2) > 0
                      ? `${formatNumber(Math.round(Number(mapFeatureItem.precio_m2) * 70), 0)} €/mes`
                      : mapFeatureSecondary}
                    delta={mapFeatureDeltaLabel}
                    onClose={() => clearSelection()}
                  >
                    <div className="v2-map-sheet-actions">
                      {mapFeatureIsDistrict ? (
                        <button
                          type="button"
                          onClick={() => {
                            const matchedDist = availableDistricts.find(d => normalizeZoneLabel(d) === normalizeZoneLabel(selectedMapFeature)) || selectedMapFeature;
                            setSelectedDistrict(matchedDist);
                            setSelectedBarrio('Todos');
                            setMapLevel('neighborhoods');
                            clearSelection();
                          }}
                        >
                          Ver barrios
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const feat = mapData.neighborhoods.find((item: any) => normalizeZoneLabel(String(item.barrio || '')) === normalizeZoneLabel(selectedMapFeature));
                            const parentDist = feat?.distrito || feat?.district;
                            setSelectedDistrict(parentDist || 'Todos');
                            setSelectedBarrio('Todos');
                            setMapLevel('districts');
                            clearSelection();
                          }}
                        >
                          Ver distrito
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const kind = mapFeatureIsDistrict ? 'district' : 'barrio';
                          const match = zoneSearchOptions.find(option => option.kind === kind && normalizeZoneLabel(option.name) === normalizeZoneLabel(selectedMapFeature));
                          if (match) setComparisonZoneA(match);
                          clearSelection();
                          scrollToDashboardSection('compare');
                        }}
                      >
                        Comparar
                      </button>
                    </div>
                  </FichaZonaMovil>}
                  <DashboardMapLegend
                    title={`Intensidad · ${mapMetricLabel}`}
                    labels={getMapLegendLabels(activeProfile.id)}
                    dataCount={mapData.neighborhoods.filter((item: any) => Number(activeProfile.id === 'inversion' ? item.rentabilidad : item.precio_m2) > 0).length}
                    totalCount={neighborhoodFeatureCount || mapData.neighborhoods.length}
                    observedThrough={`${latestRealMonth} de ${latestRealYear}`}
                    estimatesFrom={firstProjectionMonth}
                    profileId={activeProfile.id}
                  />
                </div>
              </div>
            </div>

            {/* 3. EXPLORACIÓN DE MERCADO (HEATMAP & RANKINGS) */}
            <div className="v2-explorer-grid">
              <div className="v2-explorer-header">
                <div className="v2-rank-heading">
                  <div className="v2-rank-title-row">
                    <div className="v2-rank-title">Ranking de {rankingLevel.toLocaleLowerCase('es')}</div>
                    <button type="button" className="v2-compare-help-inline" aria-label="Cómo leer el ranking y la evolución" title="Cómo leer el ranking y la evolución" onClick={() => setShowHeatmapHelpModal(true)}><HelpCircle size={15} /></button>
                  </div>
                  <div className="v2-rank-desc">{activeProfile.id === 'alquiler'
                    ? 'Encuentra los alquileres más asequibles y sigue su evolución mes a mes.'
                    : activeProfile.id === 'compra'
                      ? 'Encuentra dónde comprar mejor y sigue la evolución de precios.'
                      : activeProfile.id === 'venta'
                        ? 'Descubre dónde vender mejor y sigue la evolución de precios.'
                        : 'Encuentra las zonas más rentables y sigue su evolución.'}</div>
                </div>
                <div className="v2-rank-settings">
                  {!isMobile && <PeriodSelector year={selectedYear} month={selectedMonth} years={availableYears} latestReal={latestAvailablePeriod} onChange={(year, month) => { setSelectedYear(year); setSelectedMonth(month); }} />}
                  <div className={isMobile ? 'v2-mobile-segmented-control' : 'v2-segmented-with-label'}>
                    {!isMobile && <span>Ver por:</span>}
                    <SegmentedControl<'Distritos' | 'Barrios'>
                      label="Nivel de zonas"
                      size="md"
                      value={rankingLevel}
                      options={[{ value: 'Distritos', label: 'Distritos' }, { value: 'Barrios', label: 'Barrios' }] as const}
                      onChange={setRankingLevel}
                    />
                  </div>
                </div>
              </div>

              {/* COL 2: AFFORDABILITY / RENTABILITY / DEMAND RANKINGS */}
              <div className="v2-explorer-col v2-rankings-stack" data-dashboard-section="ranking">
                <CardLoadingOverlay isLoading={isRankingsLoading} message="Calibrando telemetría y algoritmos de mercado…">
                  <DashboardRankingTable
                    profileId={activeProfile.id}
                    level={rankingLevel}
                    rows={rankingRows}
                    loading={isRankingsLoading}
                    loadingRows={rankingLoadingRows}
                    highlightedZone={highlightedRankingZone}
                    isMobile={isMobile}
                    metric={rankingMetric}
                    onMetricChange={setRankingMetric}
                    formatName={formatMadridName}
                    formatNumber={formatNumber}
                    formatEuro={formatEuro}
                    monthlyRows={heatmapData}
                    previousValues={rankingPreviousValues}
                    districtForZone={(zone) => {
                      const feature = mapData.neighborhoods.find((item: any) => normalizeZoneLabel(String(item.barrio || '')) === normalizeZoneLabel(zone));
                      return feature?.distrito || feature?.district;
                    }}
                    order={rankingOrder}
                    onOrderChange={setRankingOrder}
                    hasAnnualVariation={Object.keys(rankingPreviousValues).length > 0}
                    onCompareZone={handleCompareZone}
                  />
                </CardLoadingOverlay>
              </div>

              {/* COL 3: MAPA DE CALOR LIMPIO (DISTRITOS X MESES - OPCIÓN 1 CONTINUA) */}
              <div className="v2-explorer-col v2-heatmap-col" data-dashboard-section="heatmap">
                <CardLoadingOverlay isLoading={isHeatmapLoading} message="Calibrando telemetría y algoritmos de mercado…">
                  <HeatmapDistritosMeses
                    rows={heatmapData}
                    profileId={activeProfile.id}
                    level={rankingLevel}
                    year={selectedYear}
                    selectedMonth={selectedMonth}
                    isMobile={isMobile}
                    onOpenMethodology={() => setShowMethodologyDrawer(true)}
                  />
                </CardLoadingOverlay>
              </div>
            </div>

            {p.id === 'inversion' && (
              <section className="v2-connectivity-section">
                <div className="v2-connectivity-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
                  {/* COLUMNA IZQUIERDA: LIQUIDEZ */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                        Actividad de mercado por {liquidityLevel === 'distrito' ? 'Distrito' : 'Barrio'}
                      </h3>
                      {isMobile ? (
                        <SegmentedControl<'distrito' | 'barrio'>
                          label="Nivel de actividad de mercado"
                          size="md"
                          value={liquidityLevel}
                          options={[{ value: 'distrito', label: 'Distritos' }, { value: 'barrio', label: 'Barrios' }] as const}
                          onChange={setLiquidityLevel}
                        />
                      ) : (
                        <SegmentedControl<'distrito' | 'barrio'>
                          label="Nivel de actividad de mercado"
                          size="md"
                          value={liquidityLevel}
                          options={[{ value: 'distrito', label: 'Distritos' }, { value: 'barrio', label: 'Barrios' }] as const}
                          onChange={setLiquidityLevel}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#BACCD6', marginBottom: '20px' }}>
                      Responde: ¿Dónde se cierran más operaciones?
                    </div>

                    <div className="v2-connectivity-list">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: '#00F0FF' }}>
                            <th style={{ paddingBottom: '8px', fontWeight: '600' }}>{liquidityLevel === 'distrito' ? 'DISTRITO' : 'BARRIO'}</th>
                            <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'center' }}>TRANSACCIONES/AÑO</th>
                            <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>DÍAS EN MERCADO & ABSORCIÓN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(liquidityData) && liquidityData.length > 0 ? (
                            liquidityData.map((item, idx) => {
                              const tx = Number(item.transactions) || 0;
                              const minTx = liquidityLevel === 'barrio' ? 15 : 1500;
                              const maxTx = liquidityLevel === 'barrio' ? 120 : 4000;
                              const ratio = Math.min(Math.max((tx - minTx) / (maxTx - minTx), 0), 1);
                              const domDays = Math.round(45 - ratio * 27); // 18 a 45 días
                              const absorptionPct = Math.round(42 + ratio * 52); // 42% a 94%

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
                                  <td style={{ padding: '12px 0', color: '#FFFFFF', fontWeight: '600' }}>
                                    {idx + 1}. {formatMadridName(item.name)}
                                  </td>
                                  <td style={{ padding: '12px 0', textAlign: 'center', color: '#00F0FF', fontWeight: '700' }}>
                                    {item.transactions}
                                  </td>
                                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: domDays <= 24 ? '#00F0FF' : '#E6F2F8' }}>
                                          {domDays} días
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#8fa6ba' }}>
                                          ({absorptionPct}% abs.)
                                        </span>
                                      </div>
                                      <div style={{ width: '90px', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${absorptionPct}%`, height: '100%', background: 'linear-gradient(90deg, #00F0FF, #3DDC97)', borderRadius: '2px' }} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#BACCD6' }}>
                                No hay datos de liquidez disponibles.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: PER INMOBILIARIO & MATRIZ 4 CUADRANTES */}
                  {(() => {
                    const maxPer = 32;
                    const madridPerRatio = selectedDistrict === 'Todos' && selectedBarrio === 'Todos'
                      ? Number(kpiData.p_m2)
                      : madridInvYield;
                    const madridPerYears = madridPerRatio > 0 ? 1 / madridPerRatio : 0;
                    const hasMadridPer = Number.isFinite(madridPerYears) && madridPerYears > 0;
                    const madridPerLabel = hasMadridPer ? `${madridPerYears.toFixed(1).replace('.', ',')} años` : '';
                    const madridPerLeftPct = hasMadridPer ? Math.min(100, Math.max(0, (madridPerYears / maxPer) * 100)) : 0;

                    return (
                  <div className="v2-connectivity-selectors" style={{ borderLeft: '1px solid rgba(186, 204, 214, 0.16)', paddingLeft: '40px', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* WIDGET 2: PER INMOBILIARIO */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                          PER Inmobiliario · Amortización
                        </h3>
                        {hasMadridPer && (
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.12)', color: '#00F0FF', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                            Media Madrid: {madridPerLabel}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#BACCD6' }}>
                        Años de renta bruta necesarios para amortizar el precio del inmueble (Ratio Precio / Renta)
                      </span>
                    </div>

                    {/* Ranking visual de PER Inmobiliario */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isMobile && showAllPerMobile ? 'none' : '230px', overflowY: isMobile && showAllPerMobile ? 'visible' : 'auto', paddingRight: '6px', marginBottom: isMobile && perList.length > 5 ? '8px' : '16px' }}>
                      {(isMobile ? (showAllPerMobile ? perList : perList.slice(0, 5)) : perList.slice(0, 8)).map((pItem, pIdx) => {
                        const widthPct = Math.min(Math.round((pItem.per / maxPer) * 100), 100);
                        const isSelected = pItem.name.toLowerCase() === (liquidityLevel === 'barrio' ? selectedBarrio.toLowerCase() : selectedDistrict.toLowerCase());
                        return (
                          <div key={pIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px', borderRadius: '6px', background: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)', border: isSelected ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <span style={{ fontWeight: '600', color: isSelected ? '#00F0FF' : '#FFFFFF' }}>
                                {pIdx + 1}. {formatMadridName(pItem.name)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${pItem.color}20`, color: pItem.color, fontWeight: '700' }}>
                                  {pItem.tag}
                                </span>
                                <span style={{ fontWeight: '700', color: '#E6F2F8' }}>
                                  {pItem.per.toFixed(1).replace('.', ',')} años
                                </span>
                                {pItem.roi && (
                                  <span style={{ fontSize: '11px', color: '#8fa6ba' }}>
                                    ({Number(pItem.roi).toFixed(2).replace('.', ',')}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ position: 'relative', width: '100%', height: '5px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                              <div style={{ width: `${widthPct}%`, height: '100%', backgroundColor: pItem.color, borderRadius: '3px' }} />
                              {hasMadridPer && (
                                <div style={{ position: 'absolute', left: `${madridPerLeftPct.toFixed(2)}%`, top: '-2px', bottom: '-2px', width: '2px', backgroundColor: '#FFFFFF', opacity: 0.6 }} title={`Media Madrid (${madridPerLabel})`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {isMobile && perList.length > 5 && (
                      <button
                        type="button"
                        className="v2-per-mobile-toggle"
                        onClick={() => setShowAllPerMobile(prev => !prev)}
                      >
                        {showAllPerMobile ? 'Mostrar top 5' : `Ver todo (${perList.length})`}
                      </button>
                    )}

                    {/* WIDGET 3: MATRIZ DE RIESGO VS RETORNO (4 CUADRANTES) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(186, 204, 214, 0.16)' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                        {isMobile ? 'Zonas destacadas (Riesgo vs. Retorno)' : 'Matriz Financiera de Riesgo vs. Retorno (4 Cuadrantes)'}
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#BACCD6', marginBottom: isMobile ? '4px' : '8px' }}>
                        Cruce de rentabilidad bruta anual frente al índice de volatilidad/riesgo de mercado (INE / Notarías)
                      </span>
                      {isMobile && (
                        <span style={{ fontSize: '12px', color: '#9fb4c7', marginBottom: '8px' }}>
                          Orientativo, no es asesoramiento de inversión.
                        </span>
                      )}
                      {isMobile ? (
                        (() => {
                          const valid = (Array.isArray(riskReturnData) ? riskReturnData : []).filter(d => Number(d.roi) > 0 && Number(d.risk) > 0);
                          if (!valid.length) {
                            return <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', color: '#8fa6ba', fontSize: '12px' }}>Cargando zonas destacadas…</div>;
                          }
                          const avgRisk = valid.reduce((s, d) => s + Number(d.risk), 0) / valid.length;
                          const avgRoi = valid.reduce((s, d) => s + Number(d.roi), 0) / valid.length;
                          const pickBest = (pred: (d: any) => boolean, score: (d: any) => number) =>
                            valid.filter(pred).sort((a, b) => score(b) - score(a))[0];
                          const highlights = [
                            { item: pickBest(d => Number(d.risk) < avgRisk && Number(d.roi) >= avgRoi, d => Number(d.roi) - Number(d.risk) * 0.05), label: 'Alta rentabilidad y esfuerzo contenido', color: '#00F0FF' },
                            { item: pickBest(d => Number(d.risk) < avgRisk && Number(d.roi) < avgRoi, d => Number(d.roi)), label: 'Zona equilibrada y esfuerzo moderado', color: '#3DDC97' },
                            { item: pickBest(d => Number(d.risk) >= avgRisk && Number(d.roi) >= avgRoi, d => Number(d.roi)), label: 'Retorno alto con esfuerzo exigente', color: '#E879F9' },
                            { item: pickBest(d => Number(d.risk) >= avgRisk && Number(d.roi) < avgRoi, d => -Number(d.risk)), label: 'Refugio patrimonial (prima de capital)', color: '#FFC247' },
                          ].filter((h): h is { item: any; label: string; color: string } => Boolean(h.item));

                          return (
                            <div className="v2-mobile-quadrant-grid">
                              {highlights.map(({ item, label, color }) => (
                                <div key={item.name} className="v2-mobile-quadrant-card" style={{ borderLeftColor: color }}>
                                  <div className="v2-mobile-quadrant-head">
                                    <strong>{formatMadridName(item.name)}</strong>
                                    <span style={{ color }}>{Number(item.roi).toFixed(2).replace('.', ',')}% bruta</span>
                                  </div>
                                  <small title="Índice normalizado 0–100 de volatilidad de precios entre barrios (más alto = más riesgo)">
                                    {label} · Índice de riesgo {Number(item.risk).toFixed(0)}/100
                                  </small>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ position: 'relative', height: '240px', width: '100%' }}>
                          <canvas id="v2-chart-risk-return"></canvas>
                        </div>
                      )}
                    </div>
                  </div>
                    );
                  })()}
                </div>
              </section>
            )}

             {/* COMPARATIVAS SECTION */}
            <ComparacionZonas isMobile={isMobile}>
            <section className="v2-compare-section" data-dashboard-section="compare">
              <div className="v2-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="v2-compare-title-block">
                  <div className="v2-compare-title-row">
                    <h2 style={{ margin: 0 }}>Comparar zonas</h2>
                    {isMobile && (
                      <div className="v2-compare-title-icons">
                        <button
                          type="button"
                          className="v2-compare-icon-btn"
                          title="Recargar o restablecer comparativa"
                          aria-label="Recargar o restablecer comparativa"
                          onClick={() => {
                            const defA = zoneSearchOptions.find(o => o.kind === 'district' && normalizeZoneLabel(o.name).includes('fuencarral')) || zoneSearchOptions.find(o => o.kind === 'district') || comparisonZoneA;
                            const defB = zoneSearchOptions.find(o => o.kind === 'barrio' && normalizeZoneLabel(o.name).includes('fuente del berro')) || zoneSearchOptions.find(o => o.kind === 'district' && o.id !== defA.id) || comparisonZoneB;
                            setComparisonZoneA(defA);
                            setComparisonZoneB(defB);
                            reloadComparison();
                          }}
                          disabled={isReloadingA || isReloadingB}
                        >
                          <RotateCw size={14} className={isReloadingA || isReloadingB ? 'v2-spin' : ''} />
                        </button>
                        <button
                          type="button"
                          className="v2-compare-icon-btn"
                          aria-label="Cómo comparar zonas"
                          title="Cómo comparar zonas"
                          onClick={() => setShowCompareHelpModal(true)}
                        >
                          <HelpCircle size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="v2-compare-subtitle" style={{ color: '#8fa6ba', fontSize: '13px' }}>Elige dos zonas y mira cómo se diferencian</span>
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="v2-compare-desktop-toolbar">
                      <PeriodSelector year={selectedYear} month={selectedMonth} years={availableYears} latestReal={latestAvailablePeriod} onChange={(year, month) => { setSelectedYear(year); setSelectedMonth(month); }} />
                    </div>
                    <button
                      type="button"
                      className="v2-compare-reset-btn"
                      title="Restablecer selección a las zonas por defecto"
                      aria-label="Restablecer selección"
                      onClick={() => {
                        const defA = zoneSearchOptions.find(o => o.kind === 'district' && normalizeZoneLabel(o.name).includes('fuencarral')) || zoneSearchOptions.find(o => o.kind === 'district') || comparisonZoneA;
                        const defB = zoneSearchOptions.find(o => o.kind === 'barrio' && normalizeZoneLabel(o.name).includes('fuente del berro')) || zoneSearchOptions.find(o => o.kind === 'district' && o.id !== defA.id) || comparisonZoneB;
                        setComparisonZoneA(defA);
                        setComparisonZoneB(defB);
                        reloadComparison();
                      }}
                      disabled={isReloadingA || isReloadingB}
                    >
                      <RotateCw size={11} className={isReloadingA || isReloadingB ? 'v2-spin' : ''} />
                      <span>{isReloadingA || isReloadingB ? 'Sincronizando…' : 'Restablecer'}</span>
                    </button>
                    <button
                      type="button"
                      className="v2-compare-help-corner"
                      aria-label="Cómo comparar zonas"
                      title="Cómo comparar zonas"
                      onClick={() => setShowCompareHelpModal(true)}
                    >
                      <HelpCircle size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="v2-compare-zone-selectors v2-compare-selectors-sticky">
                <div className={`v2-dropdown-container v2-compare-zone-select zone-a ${activeComparePicker === 'a' ? 'v2-z-up' : ''}`}>
                  <span className="v2-filter-label zone-a-label"><i /> ZONA A</span>
                  <ZoneSearch options={zoneSearchOptions} district="Todos" barrio="Todos" onSelect={() => {}} formatName={formatZoneOption} compact picker={{ selected: comparisonZoneA, excludedId: comparisonZoneB.id, accent: 'a', onSelect: zone => { setComparisonZoneA(zone); setActiveComparePicker(null); }, onOpenChange: open => setActiveComparePicker(current => open ? 'a' : current === 'a' ? null : current) }} />
                </div>
                <button type="button" className="v2-compare-swap" aria-label="Intercambiar zonas A y B" title="Intercambiar zonas" onClick={() => { setComparisonZoneA(comparisonZoneB); setComparisonZoneB(comparisonZoneA); }}><span aria-hidden="true">⇅</span></button>
                <div className={`v2-dropdown-container v2-compare-zone-select zone-b ${activeComparePicker === 'b' ? 'v2-z-up' : ''}`}>
                  <span className="v2-filter-label zone-b-label"><i /> ZONA B</span>
                  <ZoneSearch options={zoneSearchOptions} district="Todos" barrio="Todos" onSelect={() => {}} formatName={formatZoneOption} compact picker={{ selected: comparisonZoneB, excludedId: comparisonZoneA.id, accent: 'b', onSelect: zone => { setComparisonZoneB(zone); setActiveComparePicker(null); }, onOpenChange: open => setActiveComparePicker(current => open ? 'b' : current === 'b' ? null : current) }} />
                </div>
              </div>

                  <StructuralDisparityBadge
                    zoneAName={formatZoneOption(selectedZoneA)}
                    zoneBName={formatZoneOption(selectedZoneB)}
                    priceA={Number(kpiDataA.precio_m2) || 0}
                    priceB={Number(kpiDataB.precio_m2) || 0}
                    incomeA={Number(kpiDataA.renta_media) || undefined}
                    incomeB={Number(kpiDataB.renta_media) || undefined}
                    profileId={activeProfile.id}
                    headerRight={!isMobile ? (
                      <div className="v2-compare-view-switch-wrap">
                        <span className="v2-compare-view-label">Vista:</span>
                        <div className="v2-compare-view-switch" role="group" aria-label="Modo de visualización de gráficos">
                          <button
                            type="button"
                            className={`v2-compare-view-btn ${compareGraphView === 'superpuesta' ? 'is-active' : ''}`}
                            onClick={() => setCompareGraphView('superpuesta')}
                          >
                            Superpuesta (Recomendada)
                          </button>
                          <button
                            type="button"
                            className={`v2-compare-view-btn ${compareGraphView === 'paralela' ? 'is-active' : ''}`}
                            onClick={() => setCompareGraphView('paralela')}
                          >
                            Lado a Lado
                          </button>
                        </div>
                      </div>
                    ) : undefined}
                  />

              {(() => {
                const renderZoneKpiCard = (target: 'A' | 'B') => {
                  const isA = target === 'A';
                  const zoneName = isA ? formatZoneOption(selectedZoneA) : formatZoneOption(selectedZoneB);
                  const otherZoneName = isA ? formatZoneOption(selectedZoneB) : formatZoneOption(selectedZoneA);
                  const kpi = isA ? kpiDataA : kpiDataB;
                  const otherKpi = isA ? kpiDataB : kpiDataA;
                  const hasData = isA ? comparisonAHasData : comparisonBHasData;
                  if (!hasData) return null;

                  const price = Number(kpi.precio_m2) || 0;
                  const otherPrice = Number(otherKpi.precio_m2) || 0;
                  const diffBase = (isMobile && p.id === 'alquiler') ? Math.max(price, otherPrice) : otherPrice;
                  const diffPct = diffBase ? ((price - otherPrice) / diffBase) * 100 : 0;
                  const formattedDiff = `${diffPct >= 0 ? '+' : '\u2212'}${Math.abs(diffPct).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

                  const statusLabel = isProjectionPeriod ? 'Proyección' : 'Dato oficial';
                  const statusDotClass = isProjectionPeriod ? 'is-projection' : 'is-official';

                  let col1 = null;
                  let col2 = null;

                  if (p.id === 'alquiler') {
                    const rentPrice70 = Math.round(price * 70);
                    const rentDisplay = price > 0 ? `${new Intl.NumberFormat('es-ES').format(rentPrice70)} €/mes` : '—';
                    const priceM2Display = price > 0 ? `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} €/m²` : '—';
                    const annualIncome = Number(kpi.renta_media) || 0;
                    const monthlyIncome = annualIncome > 0 ? Math.round(annualIncome / 12) : 0;
                    const effort70 = (rentPrice70 > 0 && monthlyIncome > 0) ? (rentPrice70 / monthlyIncome) * 100 : (Number(kpi.esfuerzo_compra) || 0);
                    const effortDisplay = effort70 > 0 ? `${effort70.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : '—';
                    const isHighEffort = effort70 > 30;
                    const clampedEffort = Math.min(100, Math.max(0, effort70));

                    col1 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--left">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">ALQUILER MEDIO · 70 M²</span>
                          <InfoTooltip {...getComparisonKpiInfo('alquiler_medio', zoneName)} align="left" />
                        </div>
                        <div className="v2-zone-kpi-value">{rentDisplay}</div>
                        <div className="v2-zone-kpi-sub">
                          {priceM2Display} · {formattedDiff} frente a {otherZoneName}
                        </div>
                      </div>
                    );

                    col2 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--right">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">ESFUERZO DE ALQUILER</span>
                          <InfoTooltip {...getComparisonKpiInfo('esfuerzo', zoneName)} align="right" />
                        </div>
                        <div className="v2-zone-kpi-value">{effortDisplay}</div>
                        <div className="v2-effort-bar-track" aria-hidden="true">
                          <div
                            className={`v2-effort-bar-fill ${isHighEffort ? 'is-warning' : 'is-normal'}`}
                            style={{ width: `${clampedEffort}%` }}
                          />
                          <div className="v2-effort-bar-mark" title="Límite recomendado de esfuerzo: 30 %" />
                        </div>
                        <div className="v2-zone-kpi-sub">
                          Sobre renta censal (INE · Proyección): {monthlyIncome > 0 ? `${new Intl.NumberFormat('es-ES').format(monthlyIncome)} €/mes` : '—'}
                        </div>
                      </div>
                    );
                  } else if (p.id === 'compra') {
                    const totalPrice70 = isMobile ? Math.round(price) * VIVIENDA_TIPO_M2 : Math.round(price * VIVIENDA_TIPO_M2);
                    const totalDisplay = price > 0 ? `${formatGroupedIntEs(totalPrice70)} €` : '—';
                    const priceM2Display = price > 0 ? `${isMobile ? formatGroupedIntEs(price) : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(price))} €/m²` : '—';
                    const annualIncome = Number(kpi.renta_media) || 0;
                    const monthlyIncome = annualIncome > 0 ? Math.round(annualIncome / 12) : 0;
                    const yearsToBuy = (annualIncome > 0 && totalPrice70 > 0) ? totalPrice70 / annualIncome : 0;

                    col1 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--left">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">PRECIO ESTIMADO · 70 M²</span>
                          <InfoTooltip {...getComparisonKpiInfo('precio_m2_compra', zoneName)} align="left" />
                        </div>
                        <div className="v2-zone-kpi-value">{totalDisplay}</div>
                        <div className="v2-zone-kpi-sub">
                          {priceM2Display} · {formattedDiff} frente a {otherZoneName}
                        </div>
                      </div>
                    );

                    col2 = isMobile ? (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--right">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">AÑOS DE RENTA PARA COMPRAR</span>
                          <InfoTooltip {...getComparisonKpiInfo('poder_adquisitivo', zoneName)} align="right" />
                        </div>
                        <div className="v2-zone-kpi-value">
                          {yearsToBuy > 0 ? `${yearsToBuy.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} años` : '—'}
                        </div>
                        <div className="v2-zone-kpi-sub">
                          Renta censal (INE · Proyección): {monthlyIncome > 0 ? `${formatGroupedIntEs(monthlyIncome)} €/mes` : '—'}
                        </div>
                      </div>
                    ) : (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--right">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">PODER ADQUISITIVO (INE)</span>
                          <InfoTooltip {...getComparisonKpiInfo('poder_adquisitivo', zoneName)} align="right" />
                        </div>
                        <div className="v2-zone-kpi-value">
                          {annualIncome > 0 ? `${new Intl.NumberFormat('es-ES').format(Math.round(annualIncome))} €` : '—'}
                        </div>
                        <div className="v2-zone-kpi-sub">
                          Sobre renta censal (INE · Proyección): {monthlyIncome > 0 ? `${new Intl.NumberFormat('es-ES').format(monthlyIncome)} €/mes` : '—'}
                        </div>
                      </div>
                    );
                  } else if (p.id === 'venta') {
                    const totalPrice70 = Math.round(price * 70);
                    const totalDisplay = price > 0 ? `${new Intl.NumberFormat('es-ES').format(totalPrice70)} €` : '—';
                    const priceM2Display = price > 0 ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(price))} €/m²` : '—';
                    const velocityNum = kpi.transacciones ? Math.max(1.0, 933.8 / kpi.transacciones) : 0;
                    let velocityLabel = '';
                    if (velocityNum > 0) {
                      if (velocityNum < 2.0) velocityLabel = ' (Rápido)';
                      else if (velocityNum < 3.0) velocityLabel = ' (Moderado)';
                      else velocityLabel = ' (Lento)';
                    }
                    const velocityFormatted = velocityNum > 0
                      ? (isMobile
                        ? velocityNum.toLocaleString('es-ES', { minimumFractionDigits: velocityNum % 1 === 0 ? 0 : 1, maximumFractionDigits: velocityNum % 1 === 0 ? 0 : 1 })
                        : (velocityNum % 1 === 0 ? velocityNum.toFixed(0) : velocityNum.toFixed(1)))
                      : '';
                    const velocitySuffix = velocityNum === 1 ? ' mes' : ' meses';
                    const velocityText = velocityNum > 0 ? `${velocityFormatted}${velocitySuffix}${velocityLabel}` : '—';
                    const varAnualText = kpi.variacion_anual !== undefined
                      ? `${kpi.variacion_anual > 0 ? '+' : ''}${isMobile ? Number(kpi.variacion_anual).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : kpi.variacion_anual.toFixed(1)} %`
                      : '—';

                    col1 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--left">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">PRECIO ESTIMADO · 70 M²</span>
                          <InfoTooltip {...getComparisonKpiInfo('precio_m2_venta', zoneName)} align="left" />
                        </div>
                        <div className="v2-zone-kpi-value">{totalDisplay}</div>
                        <div className="v2-zone-kpi-sub">
                          {priceM2Display} · {formattedDiff} frente a {otherZoneName}
                        </div>
                      </div>
                    );

                    col2 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--right">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">VELOCIDAD DE VENTA</span>
                          <InfoTooltip {...getComparisonKpiInfo('velocidad_venta', zoneName)} align="right" />
                        </div>
                        <div className="v2-zone-kpi-value">{velocityText}</div>
                        <div className="v2-zone-kpi-sub">
                          Variación anual: {varAnualText}
                        </div>
                      </div>
                    );
                  } else if (p.id === 'inversion') {
                    const yieldNet = kpi.rentabilidad
                      ? (isMobile
                        ? `${(kpi.rentabilidad * 100 * 0.85).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
                        : (kpi.rentabilidad * 100 * 0.85).toFixed(2) + ' %')
                      : '—';
                    const grm = kpi.rentabilidad > 0
                      ? (isMobile
                        ? `${(1 / kpi.rentabilidad).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} años`
                        : (1 / kpi.rentabilidad).toFixed(1) + ' años')
                      : '—';
                    const grossYieldText = kpi.rentabilidad
                      ? (isMobile
                        ? `${(kpi.rentabilidad * 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
                        : (kpi.rentabilidad * 100).toFixed(2) + ' %')
                      : '—';
                    const volatilityVal = isA ? (volatilityZoneA || 'N/A') : (volatilityZoneB || 'N/A');
                    const riskNumeric = Number(volatilityVal);
                    const hasRiskNum = Number.isFinite(riskNumeric) && riskNumeric > 0;
                    const riskFormatted = hasRiskNum
                      ? `${riskNumeric.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /100`
                      : volatilityVal;
                    const riskColor = !hasRiskNum
                      ? '#FFFFFF'
                      : riskNumeric <= 35
                        ? '#3DDC97'
                        : riskNumeric <= 65
                          ? '#FBBF24'
                          : '#F87171';

                    col1 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--left">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">RENTABILIDAD NETA</span>
                          <InfoTooltip {...getComparisonKpiInfo('roi_neto', zoneName)} align="left" />
                        </div>
                        <div className="v2-zone-kpi-value">{yieldNet}</div>
                        <div className="v2-zone-kpi-sub">
                          GRM: {grm} · Rent. Bruta: {grossYieldText}
                        </div>
                        {isMobile && (
                          <div style={{ fontSize: '12px', color: '#9fb4c7', marginTop: '4px', lineHeight: 1.35 }}>
                            Neta = bruta menos 15 % de gastos estimados (IBI, comunidad, vacancia). Orientativo.
                          </div>
                        )}
                      </div>
                    );

                    col2 = (
                      <div className="v2-zone-kpi-col v2-zone-kpi-col--right">
                        <div className="v2-zone-kpi-label-row">
                          <span className="v2-zone-kpi-label">
                            {isMobile ? 'ÍNDICE DE RIESGO (0-100)' : 'VOLATILIDAD Y RIESGO'}
                          </span>
                          <InfoTooltip {...getComparisonKpiInfo('volatilidad', zoneName)} align="right" />
                        </div>
                        <div className="v2-zone-kpi-value" style={isMobile ? { color: riskColor } : undefined}>
                          {isMobile ? riskFormatted : volatilityVal}
                        </div>
                        <div className="v2-zone-kpi-sub">
                          {isMobile ? 'Escala 0–100 · más alto = más riesgo' : 'Rango de estabilidad inmobiliaria proyectada'}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className={`v2-zone-kpi-block zone-${target.toLowerCase()}`} key={target}>
                      <div className="v2-zone-kpi-header">
                        <span className="v2-zone-kpi-title">{zoneName}</span>
                        <span className="v2-zone-kpi-meta">
                          <span className={`v2-zone-kpi-dot ${statusDotClass}`} />
                          <span>Métricas a {selectedMonth ? selectedMonth.toLowerCase() : ''} {selectedYear} · {statusLabel}</span>
                        </span>
                      </div>
                      <div className="v2-zone-kpi-card">
                        <div className="v2-zone-kpi-columns">
                          {col1}
                          {col2}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="v2-compare-viewport" data-compare-view={isMobile ? 'overlay' : 'desktop'}>
                    {isMobile && <div className="v2-compare-map-panel">
                      <div className="v2-compare-map-heading">Toca dos zonas para asignar A y B</div>
                      <div className="v2-compare-map-canvas">
                        <MadridMap
                          type={(compareMapTarget === 'A' ? comparisonZoneA : comparisonZoneB).kind === 'district' ? 'districts' : 'neighborhoods'}
                          data={(compareMapTarget === 'A' ? comparisonZoneA : comparisonZoneB).kind === 'district' ? mapData.districts : mapData.neighborhoods}
                          selectedYear={Number(selectedYear)} selectedMonth={selectedMonth} selectedProfile={activeProfile.label}
                          selectedDistrict={null} selectedBarrio={null}
                          compareZoneA={comparisonZoneA.name} compareZoneB={comparisonZoneB.name}
                          onDistrictClick={(zone) => {
                            if (!zone) return;
                            const option = zoneSearchOptions.find(item => item.kind === 'district' && item.name === zone);
                            if (option && option.id !== (compareMapTarget === 'A' ? comparisonZoneB.id : comparisonZoneA.id)) { if (compareMapTarget === 'A') setComparisonZoneA(option); else setComparisonZoneB(option); setCompareMapTarget(compareMapTarget === 'A' ? 'B' : 'A'); }
                          }}
                          onBarrioClick={(zone) => {
                            if (!zone) return;
                            const option = zoneSearchOptions.find(item => item.kind === 'barrio' && item.name === zone);
                            if (option && option.id !== (compareMapTarget === 'A' ? comparisonZoneB.id : comparisonZoneA.id)) { if (compareMapTarget === 'A') setComparisonZoneA(option); else setComparisonZoneB(option); setCompareMapTarget(compareMapTarget === 'A' ? 'B' : 'A'); }
                          }}
                        />
                      </div>
                    </div>}

                    {(() => {
                      const madridInvRatio = selectedDistrict === 'Todos' && selectedBarrio === 'Todos' && activeProfile.id === 'inversion'
                        ? Number(kpiData.p_m2)
                        : madridInvYield;
                      const madridInvPctText = madridInvRatio > 0 ? formatSpanishPercentage(toPercent(madridInvRatio), 1, false) : '';
                      const madridSeriesPoint = Array.isArray(seriesMadrid) && seriesMadrid.length > 0
                        ? (seriesMadrid.find((d: any) => Number(d.mes) === selectedMonthIndex + 1) || seriesMadrid[seriesMadrid.length - 1])
                        : null;
                      const madridSeriesRaw = Number(madridSeriesPoint?.precio_m2) || 0;
                      const madridMetricVal = madridSeriesRaw > 0
                        ? madridSeriesRaw
                        : (selectedDistrict === 'Todos' && selectedBarrio === 'Todos' ? Number(kpiData.p_m2) || 0 : 0);
                      const madridMobilePeriod = `${selectedMonth ? `${selectedMonth.slice(0, 3)} ` : ''}${selectedYear}`;
                      const madridMobileValText = madridMetricVal > 0
                        ? (p.id === 'inversion'
                          ? formatSpanishPercentage(toPercent(madridMetricVal), 1, false)
                          : p.id === 'alquiler'
                            ? `${madridMetricVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m²`
                            : `${formatGroupedIntEs(madridMetricVal)} €/m²`)
                        : '';
                      const madridLegendLabel = p.id === 'inversion'
                        ? (madridInvPctText ? `Media Madrid (${madridInvPctText} · Registro Ayto. Madrid Q2 2026)` : 'Media Madrid (Registro Ayto. Madrid Q2 2026)')
                        : 'Media Madrid (21,61 €/m² · Registro Ayto. Madrid Q2 2026)';
                      const madridChipLabel = isMobile
                        ? (madridMobileValText ? `Media Madrid (${madridMobileValText} · ${madridMobilePeriod})` : `Media Madrid (${madridMobilePeriod})`)
                        : p.id === 'inversion'
                          ? (madridInvPctText ? `Media Madrid (${madridInvPctText} · Q2 2026)` : 'Media Madrid (Q2 2026)')
                          : 'Media Madrid (21,61 €/m² · Q2 2026)';
                      return effectiveCompareGraphView === 'superpuesta' ? (
                      <div className="v2-compare-view-superpuesta">
                        <div className="v2-overlay-wrapper">
                          <div className="v2-overlay-header">
                            <span style={{ fontWeight: 600 }}>Comparativa superpuesta · {getComparisonMetric(p.id).label}</span>
                          </div>
                          <div className="v2-overlay-body">
                            {isComparisonLoading ? (
                              <div className="v2-chart-wrap large" style={{ display: 'grid', placeContent: 'center', height: '420px' }}>
                                <div className="v2-comparison-loading-notice" style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
                                  <div className="v2-comp-spinner" />
                                  <span>Procesando serie comparativa</span>
                                  <p>Generando trazado comparativo entre {selectedZoneA} y {selectedZoneB}…</p>
                                  <button type="button" className="v2-reload-action-btn" onClick={reloadComparison} disabled={isReloadingA || isReloadingB}>
                                    <RotateCw size={12} className={isReloadingA || isReloadingB ? 'v2-spin' : ''} />
                                    <span>{isReloadingA || isReloadingB ? 'Sincronizando…' : 'Volver a cargar'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : isMobile ? (
                              <>
                                <div className="v2-chart-wrap large"><canvas id={`v2-overlay-${p.id}`}></canvas></div>
                                <ComparisonSeriesChips chartId={`v2-overlay-${p.id}`} zoneA={comparisonAHasData ? formatZoneOption(selectedZoneA) : ''} zoneB={comparisonBHasData ? formatZoneOption(selectedZoneB) : ''} madridLabel={madridChipLabel} />
                              </>
                            ) : (
                              <div className="v2-overlay-chart-stack">
                                <div className="v2-overlay-chart-toolbar">
                                  <ComparisonSeriesLegend chartId={`v2-overlay-${p.id}`} items={[
                                    ...(comparisonAHasData ? [{ index: 0, label: `${formatZoneOption(selectedZoneA)} · Dato real`, color: COMPARISON_COLORS.zoneA, kind: 'real' as const }, { index: 1, label: `${formatZoneOption(selectedZoneA)} · Estimación`, color: COMPARISON_COLORS.zoneA, kind: 'estimated' as const }] : []),
                                    ...(comparisonBHasData ? [{ index: 2, label: `${formatZoneOption(selectedZoneB)} · Dato real`, color: COMPARISON_COLORS.zoneB, kind: 'real' as const }, { index: 3, label: `${formatZoneOption(selectedZoneB)} · Estimación`, color: COMPARISON_COLORS.zoneB, kind: 'estimated' as const }] : []),
                                    { index: 4, label: madridLegendLabel, color: '#dce8f2', kind: 'madrid' },
                                  ]} />
                                </div>
                                <div className="v2-chart-wrap large"><canvas id={`v2-overlay-${p.id}`}></canvas></div>
                                <div style={{ fontSize: '10.5px', color: '#8fa6ba', marginTop: '6px', textAlign: 'center' }}>
                                  Estimación proyectada mediante modelo de Machine Learning considerando estacionalidad e inflación. Vivienda tipo calculada sobre 70 m².
                                </div>
                              </div>
                            )}
                            {!isComparisonLoading && !comparisonAHasData && (isMobile ? <AvisoComparacionMovil zone={selectedZoneA} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneA} isReloading={isReloadingA} /> : <AvisoComparacionDesktop zone={selectedZoneA} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneA} isReloading={isReloadingA} />)}
                            {!isComparisonLoading && !comparisonBHasData && (isMobile ? <AvisoComparacionMovil zone={selectedZoneB} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneB} isReloading={isReloadingB} /> : <AvisoComparacionDesktop zone={selectedZoneB} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneB} isReloading={isReloadingB} />)}
                          </div>
                        </div>

                        {/* Tarjetas de métricas en 2 columnas inmediatamente debajo del gráfico superpuesto */}
                        <div className="v2-compare-dual-kpis-grid">
                          {renderZoneKpiCard('A')}
                          {renderZoneKpiCard('B')}
                        </div>
                      </div>
                    ) : (
                      <div className="v2-compare-view-paralela">
                        <div className="v2-compare-grid">
                          {/* ZONA A (IZQ) */}
                          <div className="v2-comp-col zone-a">
                            <div className="v2-chart-card">
                              <div className="v2-chart-head">
                                Evolución {p.id === 'inversion' ? 'Rentabilidad' : `Precio ${p.label}`} ({selectedYear}) · {selectedZoneA}
                              </div>
                              <div className="v2-chart-wrap" style={{ position: 'relative' }}>
                                {isZoneALoading && (
                                  <div className="v2-comparison-loading-notice" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(1, 16, 36, 0.92)' }}>
                                    <div className="v2-comp-spinner" />
                                    <span>Consultando registros oficiales</span>
                                    <p>Cargando evolución histórica y predicción de {selectedZoneA}…</p>
                                    <button type="button" className="v2-reload-action-btn" onClick={reloadZoneA} disabled={isReloadingA}>
                                      <RotateCw size={12} className={isReloadingA ? 'v2-spin' : ''} />
                                      <span>{isReloadingA ? 'Sincronizando…' : 'Volver a cargar'}</span>
                                    </button>
                                  </div>
                                )}
                                {comparisonAHasData ? (
                                  <>
                                    {!isMobile && (
                                      <div className="v2-comparison-chart-meta">
                                        <ComparisonSeriesLegend chartId={`v2-chartA-${p.id}`} items={[{ index: 0, label: madridLegendLabel, color: '#dce8f2', kind: 'madrid' }, { index: 1, label: `${selectedZoneA} · Dato real`, color: COMPARISON_COLORS.zoneA, kind: 'real' }, { index: 2, label: `${selectedZoneA} · Estimación`, color: COMPARISON_COLORS.zoneA, kind: 'estimated' }]} />
                                      </div>
                                    )}
                                    <canvas id={`v2-chartA-${p.id}`}></canvas>
                                    <div style={{ fontSize: '10.5px', color: '#8fa6ba', marginTop: '6px', textAlign: 'center' }}>
                                      Estimación proyectada mediante modelo de Machine Learning considerando estacionalidad e inflación.
                                    </div>
                                  </>
                                ) : !isZoneALoading ? (
                                  isMobile ? <AvisoComparacionMovil zone={selectedZoneA} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneA} isReloading={isReloadingA} /> : <AvisoComparacionDesktop zone={selectedZoneA} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneA} isReloading={isReloadingA} />
                                ) : null}
                              </div>
                            </div>
                            {renderZoneKpiCard('A')}
                          </div>

                          {/* ZONA B (DER) */}
                          <div className="v2-comp-col zone-b">
                            <div className="v2-chart-card">
                              <div className="v2-chart-head">
                                Evolución {p.id === 'inversion' ? 'Rentabilidad' : `Precio ${p.label}`} ({selectedYear}) · {selectedZoneB}
                              </div>
                              <div className="v2-chart-wrap" style={{ position: 'relative' }}>
                                {isZoneBLoading && (
                                  <div className="v2-comparison-loading-notice" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(1, 16, 36, 0.92)' }}>
                                    <div className="v2-comp-spinner" />
                                    <span>Consultando registros oficiales</span>
                                    <p>Cargando evolución histórica y predicción de {selectedZoneB}…</p>
                                    <button type="button" className="v2-reload-action-btn" onClick={reloadZoneB} disabled={isReloadingB}>
                                      <RotateCw size={12} className={isReloadingB ? 'v2-spin' : ''} />
                                      <span>{isReloadingB ? 'Sincronizando…' : 'Volver a cargar'}</span>
                                    </button>
                                  </div>
                                )}
                                {comparisonBHasData ? (
                                  <>
                                    {!isMobile && (
                                      <div className="v2-comparison-chart-meta">
                                        <ComparisonSeriesLegend chartId={`v2-chartB-${p.id}`} items={[{ index: 0, label: madridLegendLabel, color: '#dce8f2', kind: 'madrid' }, { index: 1, label: `${selectedZoneB} · Dato real`, color: COMPARISON_COLORS.zoneB, kind: 'real' }, { index: 2, label: `${selectedZoneB} · Estimación`, color: COMPARISON_COLORS.zoneB, kind: 'estimated' }]} />
                                      </div>
                                    )}
                                    <canvas id={`v2-chartB-${p.id}`}></canvas>
                                    <div style={{ fontSize: '10.5px', color: '#8fa6ba', marginTop: '6px', textAlign: 'center' }}>
                                      Estimación proyectada mediante modelo de Machine Learning considerando estacionalidad e inflación.
                                    </div>
                                  </>
                                ) : !isZoneBLoading ? (
                                  isMobile ? <AvisoComparacionMovil zone={selectedZoneB} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneB} isReloading={isReloadingB} /> : <AvisoComparacionDesktop zone={selectedZoneB} projectionWithoutHistory={isProjectionPeriod} onReload={reloadZoneB} isReloading={isReloadingB} />
                                ) : null}
                              </div>
                            </div>
                            {renderZoneKpiCard('B')}
                          </div>
                        </div>
                      </div>
                    );
                    })()}

                    {/* Resumen y balance de la comparativa (accesible en ambas vistas) */}
                    {comparisonAHasData && comparisonBHasData && (p.id === 'alquiler' || (isMobile && (p.id === 'compra' || p.id === 'venta'))) && (() => {
                      const priceA = Number(kpiDataA.precio_m2) || 0;
                      const priceB = Number(kpiDataB.precio_m2) || 0;
                      const yieldA = Number(kpiDataA.rentabilidad) || 0;
                      const yieldB = Number(kpiDataB.rentabilidad) || 0;
                      const total70A = Math.round(priceA * VIVIENDA_TIPO_M2);
                      const total70B = Math.round(priceB * VIVIENDA_TIPO_M2);
                      const annualIncomeA = Number(kpiDataA.renta_media) || 0;
                      const annualIncomeB = Number(kpiDataB.renta_media) || 0;
                      const incomeA = annualIncomeA ? Math.round(annualIncomeA / 12) : 0;
                      const incomeB = annualIncomeB ? Math.round(annualIncomeB / 12) : 0;
                      const effortA = (total70A > 0 && incomeA > 0) ? (total70A / incomeA) * 100 : (Number(kpiDataA.esfuerzo_compra) || 0);
                      const effortB = (total70B > 0 && incomeB > 0) ? (total70B / incomeB) * 100 : (Number(kpiDataB.esfuerzo_compra) || 0);
                      const yearsA = (annualIncomeA > 0 && total70A > 0) ? total70A / annualIncomeA : 0;
                      const yearsB = (annualIncomeB > 0 && total70B > 0) ? total70B / annualIncomeB : 0;
                      const fmtEs = (val: number, decimals = 1) =>
                        val.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                      const cheaper = priceA <= priceB ? selectedZoneA : selectedZoneB;
                      const pricier = priceA <= priceB ? selectedZoneB : selectedZoneA;
                      const lessEffort = effortA <= effortB ? selectedZoneA : selectedZoneB;
                      const fewerYears = yearsA <= yearsB ? selectedZoneA : selectedZoneB;
                      const monthlySaving = Math.abs(total70A - total70B);
                      const pricierPrice = Math.max(priceA, priceB);
                      const cheaperVsPricierPct = pricierPrice > 0 ? (Math.abs(priceA - priceB) / pricierPrice) * 100 : 0;

                      const percentDifference = (a: number, b: number) => {
                        if (!isMobile) return b ? `${a > b ? '+' : ''}${((a - b) / b * 100).toFixed(1)}%` : '—';
                        if (!a || !b) return '—';
                        const baseVal = p.id === 'alquiler' ? Math.max(a, b) : b;
                        const diff = ((a - b) / baseVal) * 100;
                        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
                        return `${sign}${fmtEs(Math.abs(diff), 1)} %`;
                      };
                      const pointDifference = (a: number, b: number) => {
                        if (!isMobile) return `${a > b ? '+' : ''}${((a - b) * 100).toFixed(1)} pt`;
                        const diff = (a - b) * 100;
                        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
                        return `${sign}${fmtEs(Math.abs(diff), 1)} pt`;
                      };
                      const effortDifference = (a: number, b: number) => {
                        if (!isMobile) return `${a > b ? '+' : ''}${(a - b).toFixed(1)} pt`;
                        const diff = a - b;
                        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
                        return `${sign}${fmtEs(Math.abs(diff), 1)} pt`;
                      };
                      const yearsDifference = (a: number, b: number) => {
                        if (!a || !b) return '—';
                        const diff = a - b;
                        const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
                        return `${sign}${fmtEs(Math.abs(diff), 1)} años`;
                      };
                      const allRows = p.id === 'alquiler'
                        ? [
                            { label: 'Precio m²', a: priceA ? `${formatNumber(priceA, 2)} €/m²` : '—', b: priceB ? `${formatNumber(priceB, 2)} €/m²` : '—', diff: percentDifference(priceA, priceB), aWins: priceA <= priceB },
                            { label: 'Rentabilidad', a: yieldA ? (isMobile ? `${fmtEs(yieldA * 100, 2)} %` : `${(yieldA * 100).toFixed(2)}%`) : '—', b: yieldB ? (isMobile ? `${fmtEs(yieldB * 100, 2)} %` : `${(yieldB * 100).toFixed(2)}%`) : '—', diff: pointDifference(yieldA, yieldB), aWins: yieldA >= yieldB },
                            { label: 'Esfuerzo', a: effortA ? (isMobile ? `${fmtEs(effortA, 1)} %` : `${effortA.toFixed(1)}%`) : '—', b: effortB ? (isMobile ? `${fmtEs(effortB, 1)} %` : `${effortB.toFixed(1)}%`) : '—', diff: effortDifference(effortA, effortB), aWins: effortA <= effortB },
                          ]
                        : p.id === 'compra'
                          ? [
                              { label: 'Precio m²', a: priceA ? `${formatGroupedIntEs(priceA)} €/m²` : '—', b: priceB ? `${formatGroupedIntEs(priceB)} €/m²` : '—', diff: percentDifference(priceA, priceB), aWins: priceA <= priceB },
                              { label: 'Vivienda 70 m²', a: total70A ? `${formatGroupedIntEs(total70A)} €` : '—', b: total70B ? `${formatGroupedIntEs(total70B)} €` : '—', diff: percentDifference(total70A, total70B), aWins: total70A <= total70B },
                              { label: 'Años de renta', a: yearsA ? `${fmtEs(yearsA, 1)} años` : '—', b: yearsB ? `${fmtEs(yearsB, 1)} años` : '—', diff: yearsDifference(yearsA, yearsB), aWins: yearsA <= yearsB },
                            ]
                          : [
                              { label: 'Precio m²', a: priceA ? `${formatGroupedIntEs(priceA)} €/m²` : '—', b: priceB ? `${formatGroupedIntEs(priceB)} €/m²` : '—', diff: percentDifference(priceA, priceB), aWins: priceA >= priceB },
                              { label: 'Vivienda 70 m²', a: total70A ? `${formatGroupedIntEs(total70A)} €` : '—', b: total70B ? `${formatGroupedIntEs(total70B)} €` : '—', diff: percentDifference(total70A, total70B), aWins: total70A >= total70B },
                            ];
                      const rows = isMobile && p.id === 'alquiler' ? allRows.filter(row => row.label !== 'Rentabilidad') : allRows;
                      const pricePctDesktop = priceB ? Math.abs((priceA - priceB) / priceB * 100).toFixed(1) : null;
                      const pricePctLabel = isMobile ? `${fmtEs(cheaperVsPricierPct, 1)} %` : `${pricePctDesktop}%`;
                      const compraRelPctLabel = priceB ? `${fmtEs(Math.abs((priceA - priceB) / priceB) * 100, 1)} %` : '—';
                      const effortDiffDesktop = Math.abs(effortA - effortB).toFixed(1);
                      const effortDiffLabel = isMobile ? fmtEs(Math.abs(effortA - effortB), 1) : effortDiffDesktop;
                      const yearsDiffLabel = fmtEs(Math.abs(yearsA - yearsB), 1);

                      return (
                        <div className="v2-compare-summary">
                          <table className="v2-compare-diff-table">
                            <thead>
                              <tr>
                                <th>Métrica</th>
                                <th><i className="v2-compare-zone-dot zone-a" />{formatZoneOption(selectedZoneA)}</th>
                                <th><i className="v2-compare-zone-dot zone-b" />{formatZoneOption(selectedZoneB)}</th>
                                <th>Dif.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => (
                                <tr key={row.label}>
                                  <th>{row.label}</th>
                                  <td className={row.aWins ? 'winner' : ''}>{row.a}</td>
                                  <td className={!row.aWins ? 'winner' : ''}>{row.b}</td>
                                  <td>{row.diff}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(isMobile ? (p.id === 'alquiler' ? pricierPrice > 0 : priceB > 0) : Boolean(pricePctDesktop)) && (
                            <p style={{ margin: '8px 0 16px', color: '#b8cbd9', fontSize: '13px' }}>
                              {isMobile
                                ? p.id === 'compra'
                                  ? `${formatZoneOption(cheaper)} es ${monthlySaving.toLocaleString('es-ES')} € más barata (vivienda tipo de 70 m²); ${formatZoneOption(fewerYears)} exige menos años de renta media.`
                                  : p.id === 'venta'
                                    ? `${formatZoneOption(pricier)} cotiza un ${compraRelPctLabel} por encima de ${formatZoneOption(cheaper)} en vivienda tipo de 70 m².`
                                    : `${formatZoneOption(cheaper)} es un ${pricePctLabel} más barata que ${formatZoneOption(pricier)}; ${formatZoneOption(lessEffort)} exige menos esfuerzo sobre la renta media.`
                                : `${cheaper} tiene el alquiler un ${pricePctLabel} más bajo; ${lessEffort} exige menos esfuerzo sobre la renta media.`}
                            </p>
                          )}

                          {/* Bloque de Conclusión Accionable (JTBD) */}
                          <div className="v2-compare-conclusion-card">
                            <div className="v2-compare-conclusion-text">
                              <span style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">💡</span>
                              <div>
                                <strong style={{ color: '#00e5ff' }}>Conclusión: </strong>
                                <span>
                                  {p.id === 'compra'
                                    ? (cheaper === fewerYears
                                      ? `${formatZoneOption(cheaper)} es ${monthlySaving.toLocaleString('es-ES')} € más barata (70 m²) y requiere ${yearsDiffLabel} años menos de renta media.`
                                      : `${formatZoneOption(cheaper)} es ${monthlySaving.toLocaleString('es-ES')} € más barata (70 m²), pero exige ${yearsDiffLabel} años más de renta media para comprar.`)
                                    : p.id === 'venta'
                                      ? `${formatZoneOption(pricier)} obtiene ${monthlySaving.toLocaleString('es-ES')} € más por una vivienda tipo de 70 m² frente a ${formatZoneOption(cheaper)}.`
                                      : (cheaper === lessEffort
                                        ? `${formatZoneOption(cheaper)} ${monthlySaving > 0 ? `es ${monthlySaving.toLocaleString('es-ES')} €/mes más barata` : `es un ${pricePctLabel} más barata`} y reduce el esfuerzo sobre la renta media en ${effortDiffLabel} puntos.`
                                        : `${formatZoneOption(cheaper)} ${monthlySaving > 0 ? `es ${monthlySaving.toLocaleString('es-ES')} €/mes más barata` : `es un ${pricePctLabel} más barata`}, pero exige ${effortDiffLabel} puntos más de esfuerzo sobre la renta media.`)}
                                </span>
                              </div>
                            </div>
                            <div className="v2-compare-conclusion-actions">
                              {!isMobile && (
                                <button
                                  type="button"
                                  className="v2-compare-cta-primary"
                                  onClick={() => {
                                    const dilemmaSec = document.querySelector('[data-dashboard-section="dilemma"]') || document.querySelector('.v2-dilema-section');
                                    if (dilemmaSec) {
                                      dilemmaSec.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                      const simToggle = document.querySelector('.v2-rent-calc-toggle') as HTMLButtonElement;
                                      if (simToggle) {
                                        simToggle.click();
                                        simToggle.scrollIntoView({ behavior: 'smooth' });
                                      } else {
                                        window.location.href = '/madrid/veredicto';
                                      }
                                    }
                                  }}
                                >
                                  <span>¿Decidir entre estas dos zonas? [Ver balance Alquilar vs. Comprar]</span>
                                  <ArrowUpRight size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="v2-compare-cta-secondary"
                                onClick={() => {
                                  const winnerZone = zoneSearchOptions.find(o => normalizeZoneLabel(o.name) === normalizeZoneLabel(cheaper));
                                  const targetDistrict = winnerZone?.kind === 'district' ? winnerZone.name : winnerZone?.district;
                                  if (targetDistrict) {
                                    setSelectedDistrict(targetDistrict);
                                    setSelectedBarrio('Todos');
                                    setMapLevel('neighborhoods');
                                    clearSelection();
                                  }
                                  const mapSec = document.querySelector('[data-dashboard-section="map"]') || document.querySelector('.v2-map-card');
                                  mapSec?.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                <Compass size={13} />
                                <span>Explorar micro-barrios de {cheaper}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </section>
            </ComparacionZonas>

            {/* SECCIÓN DILEMA: ¿VENDER O ALQUILAR? (EXCLUSIVA DEL PERFIL VENTA / PROPIETARIO) */}
            {p.id === 'venta' && (
              <section className="v2-dilema-section" data-dashboard-section="dilemma" style={{ marginTop: '36px' }}>
                <DilemaVenderAlquilar
                  currentZoneName={selectedBarrio !== 'Todos' ? formatZoneOption(selectedBarrio) : selectedDistrict !== 'Todos' ? formatZoneOption(selectedDistrict) : 'Madrid'}
                  rentPriceM2={ventaRentM2}
                  salePriceM2={Number(kpiData.p_m2) || 0}
                />
              </section>
            )}
            </div>
        ))}
      </main>

      {/* MODAL EXPLICATIVO: ¿CÓMO ENTENDER ESTOS PRECIOS? (LENGUAJE SENCILLO PARA EL CIUDADANO) */}
      {showHelpModal && (
        <div
          className="v2-guide-modal-overlay"
          onClick={() => setShowHelpModal(false)}
          onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="v2-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-prices-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v2-guide-modal-header">
              <div>
                <h3 id="v2-prices-help-title" style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  ¿Cómo entender estos precios?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Guía rápida para interpretar las cifras sin rodeos matemáticos.
                </p>
              </div>
              <button
                className="v2-help-modal-close"
                type="button"
                aria-label="Cerrar ayuda de precios"
                onClick={() => setShowHelpModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(186, 204, 214, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#b0c4d4',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            <div className="v2-guide-modal-body">
              {/* Bloque 1: Real */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Datos reales hasta {latestRealMonth} de {latestRealYear}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Son precios observados extraídos del Banco de Datos del Ayuntamiento de Madrid. La etiqueta <strong style={{ color: 'var(--precio-subida)' }}>✓ DATO REAL</strong> identifica un registro histórico; las estimaciones del modelo se muestran separadas.
                  </div>
                </div>
              </div>

              {/* Bloque 2: Futuro */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--azul-linea)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Proyecciones desde {firstProjectionMonth}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Nuestros modelos estadísticos y predictivos analizan el histórico de más de 10.000 operaciones y viviendas, los tipos de interés y la demanda de cada barrio para proyectar qué precio cabe esperar en los próximos meses y años.
                  </div>
                </div>
              </div>

              {/* Bloque 3: Semáforo de Zonas */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--coral)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    Semáforo de Fiabilidad por Zonas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', lineHeight: 1.4 }}>
                    <div>
                      <strong style={{ color: '#00e5ff' }}>Zonas Muy Estables</strong> (ej. Retiro, Salamanca, Chamberí): Precios firmes y continuos. La estimación del modelo presenta una tendencia estable.
                    </div>
                    <div>
                      <strong style={{ color: 'var(--coral-texto)' }}>Zonas Rápidas o en Auge</strong> (ej. Centro, Usera, Moncloa, Villaverde): Barrios con gran rotación turística o familias mudándose desde el centro. Los precios reales se mueven con mayor dinamismo.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="v2-guide-modal-footer">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR EL MAPA? */}
      {showMapHelpModal && (
        <div
          className="v2-guide-modal-overlay"
          onClick={() => setShowMapHelpModal(false)}
          onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="v2-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-map-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v2-guide-modal-header">
              <div>
                <h3 id="v2-map-help-title" style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  ¿Cómo usar los mapas interactivos?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Guía para explorar distritos y barrios de Madrid sin perderte.
                </p>
              </div>
              <button
                className="v2-help-modal-close"
                type="button"
                aria-label="Cerrar ayuda del mapa"
                onClick={() => setShowMapHelpModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(186, 204, 214, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#b0c4d4',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            <div className="v2-guide-modal-body">
              {/* Paso 1: Colores */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Escala de Colores
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Los <strong>tonos más brillantes y cian</strong> representan valores más altos según la métrica activa. Los <strong>tonos oscuros</strong> representan valores más bajos; el patrón rayado identifica zonas sin dato.
                  </div>
                </div>
              </div>

              {/* Paso 2: Clic para profundizar */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Haz clic en un distrito para ver sus barrios
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Al seleccionar un distrito, se filtran sus barrios en el mapa derecho y se actualizan las métricas de la zona. Selecciónalo de nuevo para quitar el filtro.
                  </div>
                </div>
              </div>

              {/* Paso 3: Pasar el cursor */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Selecciona una zona para ver su ficha
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Al seleccionar un distrito o barrio, la ficha muestra las métricas disponibles para esa zona y el periodo elegido. Usa Tab para entrar en el mapa, las flechas para recorrer zonas e Intro o Espacio para seleccionar.
                  </div>
                </div>
              </div>
            </div>

            <div className="v2-guide-modal-footer">
              <button
                type="button"
                onClick={() => setShowMapHelpModal(false)}
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR EL MAPA DE CALOR? */}
      {showHeatmapHelpModal && (
        <div
          className="v2-guide-modal-overlay"
          onClick={() => setShowHeatmapHelpModal(false)}
          onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="v2-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-heatmap-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v2-guide-modal-header">
              <div>
                <h3 id="v2-heatmap-help-title" style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  ¿Cómo usar el mapa de calor?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Guía para interpretar la estacionalidad y los precios mes a mes.
                </p>
              </div>
              <button
                className="v2-help-modal-close"
                type="button"
                aria-label="Cerrar ayuda de la tabla"
                onClick={() => setShowHeatmapHelpModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(186, 204, 214, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#b0c4d4',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            <div className="v2-guide-modal-body">
              {/* Paso 1: Estructura */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Filas y Columnas Mensuales
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Cada fila de la matriz corresponde a un distrito o barrio de Madrid (puedes alternar la vista entre Distritos y Barrios con los botones de la parte superior del explorador). Las columnas mensuales (<strong>Ene, Feb, Mar…</strong>) representan los doce meses del año seleccionado, de enero a diciembre.
                  </div>
                </div>
              </div>

              {/* Paso 2: Escala de Color */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Intensidad del Color
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Cuanto más <strong>brillante y cian</strong> es el fondo de la casilla, mayor es el valor {activeProfile.id === 'inversion' ? '(precio por m² más alto o rentabilidad más elevada)' : '(precio por m² más alto)'}. Los <strong>tonos oscuros</strong> señalan los meses o zonas más asequibles o con menor presión de precios.
                  </div>
                </div>
              </div>

              {/* Paso 3: Datos Oficiales vs Previsiones */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Datos Reales y Estimaciones
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    {Number(selectedYear) === latestRealYear ? (
                      <>En <strong>{latestRealYear}</strong>, los datos observados llegan hasta <strong>{latestRealMonth}</strong>. Desde <strong>{firstProjectionMonth}</strong>, los valores corresponden a <strong>proyecciones del modelo DMIYC</strong>. La pastilla <em>Dato oficial / Proyección</em> junto al selector de mes indica cuál es cuál.</>
                    ) : (
                      <>Para <strong>{selectedYear}</strong>, los meses sin observación histórica corresponden a <strong>proyecciones del modelo DMIYC</strong>. Los datos observados llegan hasta <strong>{latestRealMonth} de {latestRealYear}</strong>. La pastilla <em>Dato oficial / Proyección</em> junto al selector de mes indica cuál es cuál.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Paso 4: Estacionalidad */}
              <div className="v2-guide-step-card">
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  4
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                    Detectar Estacionalidad
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                    Al observar una fila de izquierda a derecha puedes ver si una zona se encarece en primavera o después de verano (ej. inicio de curso universitario o mayor demanda de alquiler), lo que te ayuda a planificar compras o contrataciones en los meses más ventajosos.
                  </div>
                </div>
              </div>
            </div>

            <div className="v2-guide-modal-footer">
              <button
                type="button"
                onClick={() => setShowHeatmapHelpModal(false)}
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR LA COMPARACIÓN DE ZONAS? */}
      {showCompareHelpModal && (
        <div
          className="v2-guide-modal-overlay"
          onClick={() => setShowCompareHelpModal(false)}
          onWheel={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div
            className="v2-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-compare-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v2-guide-modal-header">
              <div>
                <h3 id="v2-compare-help-title" style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  ¿Cómo usar la comparación de zonas?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Aprende a contrastar dos áreas y a interpretar sus tendencias paso a paso.
                </p>
              </div>
              <button
                className="v2-help-modal-close"
                type="button"
                aria-label="Cerrar ayuda de comparación"
                onClick={() => setShowCompareHelpModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(186, 204, 214, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#b0c4d4',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            <div className="v2-guide-modal-body">
              {/* Sección: Modos de uso */}
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--precio-subida)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Modos de Uso y Navegación
              </div>

              <div className="v2-guide-step-card">
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                  A
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    Selección independiente de zonas
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                    Busca en cada campo para comparar dos distritos, dos barrios o una combinación de ambos niveles. Las etiquetas indican el tipo de cada zona.
                  </div>
                </div>
              </div>

              <div className="v2-guide-step-card">
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                  B
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    Comparativa Individual (Lado a Lado)
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                    Muestra la curva histórica independiente de cada zona junto con sus tarjetas de resumen. <strong>Pasa el cursor sobre cualquier punto</strong> de la gráfica para ver el precio exacto, la variación porcentual frente al mes anterior y la comparación directa con la media de todo Madrid. Además, cada tarjeta de métrica cuenta con su propio botón <strong>(i)</strong> para consultar su explicación detallada.
                  </div>
                </div>
              </div>

              <div className="v2-guide-step-card">
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: '#03141c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                  C
                </div>
                <div className="v2-guide-step-text">
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    Comparativa Superpuesta (Gráfico Conjunto)
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                    Al abrir la sección <em>&ldquo;Ver comparativa superpuesta&rdquo;</em>, ambas zonas se cruzan en un único gráfico bajo la misma escala junto a la media de Madrid. Te permite verificar inmediatamente cuál es más cara, cuál crece más deprisa y si hay cruces de tendencia a lo largo del año.
                  </div>
                </div>
              </div>
            </div>

            <div className="v2-guide-modal-footer">
              <button
                type="button"
                onClick={() => setShowCompareHelpModal(false)}
              >
                ¡Entendido, gracias!
              </button>
            </div>
          </div>
        </div>
      )}

      <MethodologyDrawer
        isOpen={showMethodologyDrawer}
        onClose={() => setShowMethodologyDrawer(false)}
        latestOfficialPeriod={latestAvailablePeriod}
      />

      <SiteFooter />
    </div>
  );
};

export default MadridDashboardV2;
