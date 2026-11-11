'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChartJS from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { cssColorResolverPlugin, colorWithAlpha, resolveCssColor } from '../lib/colors';
import { Activity, Building2, ChevronDown, Database, Home, MapPinned, Maximize2, RotateCcw, RotateCw, SlidersHorizontal, Tag, X, ZoomIn, ZoomOut } from 'lucide-react';
import './MadridDashboardV2.css';
import { apiFetch } from '../lib/api';
import { SiteFooter, SiteHeader } from './SiteChrome';
import LoadingScreen from './LoadingScreen';

ChartJS.register(ChartDataLabels, cssColorResolverPlugin);

const COMPARISON_COLORS = {
  zoneA: '#00E5FF',
  zoneB: '#FFB86B',
  forecastA: '#A78BFA',
  forecastB: '#FF7AA8',
} as const;

const COMPARISON_MEDIA_COLOR = '#E5F2F7';

const updateChartZoom = (canvasId: string, action: 'in' | 'out' | 'reset') => {
  const chart = ChartJS.getChart(canvasId) as any;
  if (!chart) return;

  if (!chart._initialView) {
    chart._initialView = {
      x: { min: chart.scales.x.min, max: chart.scales.x.max },
      y: { min: chart.scales.y.min, max: chart.scales.y.max },
    };
  }

  if (action === 'reset') {
    chart.options.scales.x.min = chart._initialView.x.min;
    chart.options.scales.x.max = chart._initialView.x.max;
    chart.options.scales.y.min = chart._initialView.y.min;
    chart.options.scales.y.max = chart._initialView.y.max;
    chart.update('none');
    return;
  }

  const factor = action === 'in' ? 0.72 : 1 / 0.72;
  (['x', 'y'] as const).forEach(axis => {
    const scale = chart.scales[axis];
    const initial = chart._initialView[axis];
    const currentMin = scale.min;
    const currentMax = scale.max;
    const center = (currentMin + currentMax) / 2;
    const range = (currentMax - currentMin) * factor;
    const nextMin = center - range / 2;
    const nextMax = center + range / 2;
    if (action === 'out' && (nextMin < initial.min || nextMax > initial.max)) {
      chart.options.scales[axis].min = initial.min;
      chart.options.scales[axis].max = initial.max;
    } else {
      chart.options.scales[axis].min = nextMin;
      chart.options.scales[axis].max = nextMax;
    }
  });
  chart.update('none');
};

const FullscreenToggle = ({ targetSelector, chartId, label }: { targetSelector?: string; chartId?: string; label?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [toolbarRevision, setToolbarRevision] = useState(0);
  const targetRef = useRef<HTMLElement | null>(null);
  const nativeFullscreenRef = useRef(false);

  useEffect(() => {
    if (!expanded || !targetRef.current) return;
    const target = targetRef.current;
    const oldOverflow = document.body.style.overflow;
    target.classList.add('v2-is-fullscreen');
    document.body.classList.add('v2-fullscreen-open');
    document.body.style.overflow = 'hidden';
    window.history.pushState({ v2Fullscreen: true }, '', `${window.location.pathname}${window.location.search}#pantalla-completa`);
    const chart = chartId ? ChartJS.getChart(chartId) as any : null;
    if (chart && !chart.$v2FullscreenOriginal) {
      chart.$v2FullscreenOriginal = {
        labels: [...(chart.data.labels || [])],
        datasets: chart.data.datasets.map((dataset: any) => ({ ...dataset, data: [...(dataset.data || [])] })),
      };
    }
    const chartContainer = target.querySelector('.v2-chart-wrap');
    const chartResizeObserver = chartContainer && chart ? new ResizeObserver(() => chart.resize()) : null;
    if (chartContainer) chartResizeObserver?.observe(chartContainer);
    const resizeChart = () => window.setTimeout(() => chart?.resize(), 180);
    window.setTimeout(() => chart?.resize(), 120);
    window.addEventListener('orientationchange', resizeChart);
    const onBack = () => setExpanded(false);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') window.history.back(); };
    const onResize = () => chart?.resize();
    const onFullscreenChange = () => {
      if (nativeFullscreenRef.current && !document.fullscreenElement) {
        nativeFullscreenRef.current = false;
        window.history.back();
      }
    };
    window.addEventListener('popstate', onBack);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      target.classList.remove('v2-is-fullscreen');
      document.body.classList.remove('v2-fullscreen-open');
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('popstate', onBack);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', resizeChart);
      chartResizeObserver?.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      screen.orientation?.unlock?.();
      if (nativeFullscreenRef.current && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
        nativeFullscreenRef.current = false;
      }
      window.setTimeout(() => chart?.resize(), 80);
    };
  }, [expanded, chartId]);

  const close = () => window.history.back();
  const exportCsv = () => {
    const chart = chartId ? ChartJS.getChart(chartId) as any : null;
    let rows: string[][] = [];
    if (chart) {
      rows = [['Periodo', ...chart.data.datasets.map((dataset: any) => dataset.label || 'Serie')], ...(chart.data.labels || []).map((label: any, index: number) => [String(label), ...chart.data.datasets.map((dataset: any) => String(dataset.data?.[index] ?? ''))])];
    } else {
      const table = targetRef.current?.querySelector('table');
      rows = table ? Array.from(table.rows).map(row => Array.from(row.cells).map(cell => cell.innerText.trim())) : [];
    }
    if (!rows.length) return;
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${chartId || 'datos-dashboard'}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const exportPng = () => {
    const chart = chartId ? ChartJS.getChart(chartId) as any : null;
    if (chart) {
      const link = document.createElement('a'); link.href = chart.toBase64Image('image/png', 1); link.download = `${chartId}.png`; link.click(); return;
    }
    const table = targetRef.current?.querySelector('table');
    if (!table) return;
    const rows = Array.from(table.rows).map(row => Array.from(row.cells).map(cell => cell.innerText.trim()));
    const widths = Math.max(...rows.map(row => row.length), 1);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(720, widths * 120); canvas.height = Math.max(180, rows.length * 34 + 32);
    const context = canvas.getContext('2d'); if (!context) return;
    context.fillStyle = '#06162d'; context.fillRect(0, 0, canvas.width, canvas.height); context.font = '14px sans-serif';
    rows.forEach((row, rowIndex) => row.forEach((value, colIndex) => { context.fillStyle = rowIndex === 0 ? '#00e5ee' : '#eaf5ff'; context.fillText(value.slice(0, 32), 14 + colIndex * 120, 26 + rowIndex * 34); }));
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'tabla-dashboard.png'; link.click();
  };
  const setRange = (range: '6M' | '12M' | 'Todo') => {
    const chart = chartId ? ChartJS.getChart(chartId) as any : null;
    if (!chart?.$v2FullscreenOriginal) return;
    const original = chart.$v2FullscreenOriginal;
    const count = range === '6M' ? 6 : range === '12M' ? 12 : original.labels.length;
    chart.data.labels = original.labels.slice(-count);
    chart.data.datasets = original.datasets.map((dataset: any) => ({ ...dataset, data: dataset.data.slice(-count) }));
    chart.update('none'); setToolbarRevision(value => value + 1);
  };
  const chart = chartId ? ChartJS.getChart(chartId) as any : null;
  const open = (event: React.MouseEvent<HTMLButtonElement>) => {
    const scope = event.currentTarget.closest('.v2-panel') || document;
    targetRef.current = (targetSelector ? scope.querySelector(targetSelector) : event.currentTarget.closest('.v2-chart-card, .v2-overlay-wrapper')) as HTMLElement | null;
    if (!targetRef.current) return;
    if (window.matchMedia('(max-width: 768px), (orientation: landscape) and (max-height: 600px)').matches) {
      const fullscreenRequest = document.documentElement.requestFullscreen?.();
      fullscreenRequest?.then(async () => {
        nativeFullscreenRef.current = true;
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> };
        try { await orientation?.lock?.('landscape'); } catch { /* Keep the CSS fullscreen view usable when locking is unsupported. */ }
      }).catch(() => {});
    }
    setExpanded(true);
  };

  return <div className="v2-fullscreen-control">
    <button type="button" className={`v2-expand-button${label ? ' has-label' : ''}`} aria-label={expanded ? 'Cerrar pantalla completa' : label || 'Ampliar a pantalla completa'} title={expanded ? 'Cerrar' : label || 'Pantalla completa'} onClick={expanded ? close : open}>{expanded ? <X size={17} /> : <Maximize2 size={17} />}{!expanded && label && <span>{label}</span>}</button>
    {expanded && (chartId || targetRef.current?.querySelector('table')) && <div className="v2-fullscreen-toolbar" role="toolbar" aria-label="Herramientas de pantalla completa">
      {chartId && <div className="v2-fullscreen-zoom" role="group" aria-label="Zoom del gráfico"><button type="button" title="Acercar" aria-label="Acercar gráfica" onClick={() => updateChartZoom(chartId, 'in')}><ZoomIn size={16} /></button><button type="button" title="Alejar" aria-label="Alejar gráfica" onClick={() => updateChartZoom(chartId, 'out')}><ZoomOut size={16} /></button><button type="button" title="Restablecer vista" aria-label="Restablecer zoom de la gráfica" onClick={() => updateChartZoom(chartId, 'reset')}><RotateCcw size={15} /></button></div>}
      {chartId && <div className="v2-fullscreen-ranges">{(['6M', '12M', 'Todo'] as const).map(range => <button key={range} type="button" onClick={() => setRange(range)}>{range}</button>)}</div>}
      {chart?.data.datasets.map((dataset: any, index: number) => {
        const compactLabel = chart.data.datasets.length === 5 && index < 4 ? `${index < 2 ? 'A' : 'B'} ${index % 2 === 0 ? 'real' : 'est.'}` : dataset.label;
        return <button key={`${dataset.label}-${index}`} type="button" className="v2-fullscreen-series" title={dataset.label} aria-label={`${chart.isDatasetVisible(index) ? 'Ocultar' : 'Mostrar'} ${dataset.label}`} aria-pressed={chart.isDatasetVisible(index)} onClick={() => { chart.setDatasetVisibility(index, !chart.isDatasetVisible(index)); chart.update('none'); setToolbarRevision(value => value + 1); }}><i style={{ background: dataset.borderColor || dataset.backgroundColor }} />{compactLabel}</button>;
      })}
      <button type="button" onClick={exportPng}>PNG</button><button type="button" onClick={exportCsv}>CSV</button>
      <span hidden>{toolbarRevision}</span>
    </div>}
    {expanded && <div className="v2-fullscreen-rotate-hint" role="status"><RotateCw size={16} /><span>Gira el móvil para verlo mejor</span></div>}
  </div>;
};

const ChartZoomControls = ({ chartId }: { chartId: string }) => (
  <div className="v2-chart-controls" role="group" aria-label="Controles de zoom de la gráfica">
    <FullscreenToggle chartId={chartId} />
  </div>
);

const MadridMap = dynamic(() => import('./MadridMap'), { ssr: false });

const DEFAULT_BASELINE_SERIES: Record<string, Record<string, Array<{ mes: number; precio_m2: number; is_prediction: boolean; mes_nombre: string }>>> = {
  alquiler: {
    madrid: [
      { mes: 1, precio_m2: 20.2, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 20.5, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 20.8, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 21.0, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 21.2, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 21.4, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 21.3, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 21.1, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 21.4, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 21.6, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 21.3, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 21.5, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    salamanca: [
      { mes: 1, precio_m2: 27.56, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 27.94, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 27.59, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 27.65, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 27.92, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 28.10, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 28.35, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 28.48, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 28.72, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 28.90, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 28.66, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 29.15, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    centro: [
      { mes: 1, precio_m2: 26.10, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 26.35, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 26.50, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 26.80, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 27.05, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 27.20, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 27.42, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 27.30, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 27.55, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 27.75, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 27.25, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 27.90, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
  },
  compra: {
    madrid: [
      { mes: 1, precio_m2: 4250, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 4280, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 4310, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 4340, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 4380, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 4410, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 4440, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 4460, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 4500, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 4540, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 4580, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 4620, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    salamanca: [
      { mes: 1, precio_m2: 7200, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 7260, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 7310, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 7360, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 7420, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 7480, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 7530, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 7580, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 7640, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 7700, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 7750, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 7820, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    centro: [
      { mes: 1, precio_m2: 6050, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 6100, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 6150, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 6200, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 6250, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 6300, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 6350, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 6390, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 6440, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 6490, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 6540, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 6600, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
  },
  inversion: {
    madrid: [
      { mes: 1, precio_m2: 4.15, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 4.18, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 4.22, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 4.25, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 4.29, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 4.32, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 4.35, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 4.37, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 4.41, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 4.44, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 4.48, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 4.52, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    salamanca: [
      { mes: 1, precio_m2: 3.45, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 3.48, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 3.52, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 3.55, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 3.58, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 3.61, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 3.63, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 3.65, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 3.67, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 3.69, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 3.66, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 3.72, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
    centro: [
      { mes: 1, precio_m2: 4.05, is_prediction: false, mes_nombre: 'Enero' },
      { mes: 2, precio_m2: 4.10, is_prediction: false, mes_nombre: 'Febrero' },
      { mes: 3, precio_m2: 4.14, is_prediction: false, mes_nombre: 'Marzo' },
      { mes: 4, precio_m2: 4.18, is_prediction: false, mes_nombre: 'Abril' },
      { mes: 5, precio_m2: 4.22, is_prediction: false, mes_nombre: 'Mayo' },
      { mes: 6, precio_m2: 4.26, is_prediction: false, mes_nombre: 'Junio' },
      { mes: 7, precio_m2: 4.30, is_prediction: true, mes_nombre: 'Julio' },
      { mes: 8, precio_m2: 4.33, is_prediction: true, mes_nombre: 'Agosto' },
      { mes: 9, precio_m2: 4.36, is_prediction: true, mes_nombre: 'Septiembre' },
      { mes: 10, precio_m2: 4.39, is_prediction: true, mes_nombre: 'Octubre' },
      { mes: 11, precio_m2: 4.37, is_prediction: true, mes_nombre: 'Noviembre' },
      { mes: 12, precio_m2: 4.42, is_prediction: true, mes_nombre: 'Diciembre' },
    ],
  },
};
DEFAULT_BASELINE_SERIES.venta = DEFAULT_BASELINE_SERIES.compra;

const resolveFallbackSeries = (profileId: string, zoneName: string) => {
  const profileKey = (profileId && profileId in DEFAULT_BASELINE_SERIES) ? profileId : 'alquiler';
  const profileMap = DEFAULT_BASELINE_SERIES[profileKey];
  const zKey = (zoneName || '').toLowerCase().trim();
  const matched = Object.keys(profileMap).find(k => k === zKey || zKey.includes(k) || k.includes(zKey));
  return matched ? profileMap[matched] : profileMap.madrid;
};

const PROFILES = [
  { id: 'alquiler', label: 'Alquiler', color: 'var(--azul-linea)', op: 'alquiler' },
  { id: 'compra', label: 'Compra', color: 'var(--azul-linea)', op: 'venta' },
  { id: 'venta', label: 'Venta', color: 'var(--coral)', op: 'venta' },
  { id: 'inversion', label: 'Inversión', color: 'var(--texto-secundario-azul)', op: 'inversion' },
];

// La comparación es común a todos los perfiles; solo cambia la métrica y su unidad.
const getComparisonMetric = (profileId: string) => profileId === 'inversion'
  ? { label: 'Rentabilidad', unit: '%', tooltipUnit: '%', multiplier: 100, decimals: 2 }
  : { label: 'Precio m²', unit: '€/m²', tooltipUnit: '€/m²', multiplier: 1, decimals: profileId === 'alquiler' ? 2 : 1 };

const getMapLegendLabels = (profileId: string) => {
  if (profileId === 'inversion') return ['< 4,3 %', '4,3–5,0 %', '5,0–5,7 %', '5,7–6,5 %', '≥ 7,4 %'];
  if (profileId === 'venta' || profileId === 'compra') return ['< 2.100 €', '2.100–3.100 €', '3.100–4.200 €', '4.200–5.400 €', '≥ 6.800 €'];
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

const getZoneReliability = (district: string, isPrediction: boolean) => {
  if (!isPrediction) {
    return {
      type: 'real',
      tag: 'DATO REAL',
      title: 'Dato real registrado',
      titleColor: 'var(--precio-subida)',
      borderColor: 'color-mix(in srgb, var(--precio-subida) 25%, transparent)',
      bg: 'color-mix(in srgb, var(--precio-subida) 6%, transparent)',
      icon: '',
      description: 'Precio observado en la serie histórica del Banco de Datos del Ayuntamiento de Madrid.'
    };
  }

  const d = (district || '').toLowerCase();
  if (d.includes('centro') || d.includes('moncloa')) {
    return {
      type: 'hot',
      tag: 'PRECIOS RÁPIDOS',
      title: 'Zona de Alta Demanda (Precios Rápidos)',
      titleColor: 'var(--coral-texto)',
      borderColor: 'color-mix(in srgb, var(--coral) 35%, transparent)',
      bg: 'color-mix(in srgb, var(--coral) 8%, transparent)',
      icon: '',
      description: 'Mucha rotación y estudiantes. Los precios se mueven rápido y pueden fluctuar más de lo habitual.'
    };
  }
  if (d.includes('usera') || d.includes('villaverde') || d.includes('carabanchel')) {
    return {
      type: 'growth',
      tag: 'EN AUGE',
      title: 'Zona en Auge (Fuerte Demanda)',
      titleColor: 'var(--coral-texto)',
      borderColor: 'color-mix(in srgb, var(--coral) 35%, transparent)',
      bg: 'color-mix(in srgb, var(--coral) 8%, transparent)',
      icon: '',
      description: 'Desplazamiento de demanda hacia zonas con precios más accesibles, empujando la tendencia al alza.'
    };
  }
  if (d.includes('salamanca') || d.includes('retiro') || d.includes('chamberí') || d.includes('chamartín') || d.includes('arganzuela')) {
    return {
      type: 'stable',
      tag: 'ALTA FIABILIDAD',
      title: 'Zona estable (dato real)',
      titleColor: 'var(--azul-linea)',
      borderColor: 'color-mix(in srgb, var(--azul-linea) 35%, transparent)',
      bg: 'color-mix(in srgb, var(--azul-linea) 8%, transparent)',
      icon: '',
      description: 'Barrio consolidado con precios firmes. La estimación del modelo presenta una tendencia estable.'
    };
  }
  return {
    type: 'ai',
    tag: 'PROYECCIÓN',
    title: 'Estimación del modelo',
    titleColor: 'var(--azul-linea)',
    borderColor: 'color-mix(in srgb, var(--precio-subida) 25%, transparent)',
    bg: 'color-mix(in srgb, var(--precio-subida) 7%, transparent)',
    icon: '',
    description: 'Estimación calculada a partir de históricos y tendencias del mercado.'
  };
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

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

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

      {open && (
        <div
          className="v2-info-tooltip"
          style={{
            position: 'absolute',
            top: '24px',
            left: align === 'left' ? 0 : align === 'center' ? '50%' : 'auto',
            right: align === 'right' ? 0 : 'auto',
            transform: align === 'center' ? 'translateX(-50%)' : 'none',
            width: '280px',
            backgroundColor: 'var(--azul-noche)',
            color: 'var(--blanco-humo)',
            padding: '12px 14px',
            borderRadius: '12px',
            boxShadow: '0 10px 28px color-mix(in srgb, var(--azul-noche) 35%, transparent)',
            border: '0.5px solid color-mix(in srgb, var(--blanco-humo) 15%, transparent)',
            zIndex: 99999,
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
      )}
    </div>
  );
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
        description: `Indica qué porcentaje del sueldo neto de las familias de ${zoneName} se va exclusivamente en pagar el alquiler o la hipoteca. Es el termómetro de si los vecinos viven con desahogo o con el agua al cuello.`,
        example: `Un 25% significa que de un sueldo de 2.000 €, 500 € van directos a la vivienda y quedan 1.500 € para los demás gastos.`,
        ruleOfThumb: `El umbral saludable fijado por los expertos es no pasar del 30%-35%. Superar el 40% refleja tensión económica en la zona.`
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

const MadridDashboardV2: React.FC = () => {
  const predBadgeStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: '700',
    color: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.16)',
    border: '1px solid rgba(0, 240, 255, 0.45)',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-block'
  };
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
  const [selectedMapFeature, setSelectedMapFeature] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState({ year: '', month: '', district: 'Todos', barrio: 'Todos' });
  const [draftBarrios, setDraftBarrios] = useState<string[]>(['Todos']);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [latestAvailablePeriod, setLatestAvailablePeriod] = useState({ year: '2026', month: 'Junio' });
  const [selectedDistrict, setSelectedDistrict] = useState('Todos');
  const [selectedBarrio, setSelectedBarrio] = useState('Todos');
  const [selectedZoneA, setSelectedZoneA] = useState('Salamanca');
  const [selectedZoneB, setSelectedZoneB] = useState('Centro');
  const [compareMapTarget, setCompareMapTarget] = useState<'A' | 'B'>('A');
  const [compareDisplay, setCompareDisplay] = useState<'overlay' | 'A' | 'B'>('overlay');
  const [compareZoneSheet, setCompareZoneSheet] = useState<'A' | 'B' | null>(null);
  const [compareZoneSearch, setCompareZoneSearch] = useState('');

  // State: Dynamic Options
  const [availableYears, setAvailableYears] = useState<string[]>(['2023', '2024', '2025']);
  const [monthsByYear, setMonthsByYear] = useState<Record<string, string[]>>({});
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(['Todos', 'Salamanca', 'Centro', 'Chamberí', 'Retiro']);
  const [availableBarrios, setAvailableBarrios] = useState<string[]>(['Todos']);

  // State: Real Data
  const [kpiData, setKpiData] = useState<any>({});
  const [kpiDataA, setKpiDataA] = useState<any>({});
  const [kpiDataB, setKpiDataB] = useState<any>({});
  const [seriesA, setSeriesA] = useState<any[]>(() => DEFAULT_BASELINE_SERIES.alquiler.salamanca);
  const [seriesB, setSeriesB] = useState<any[]>(() => DEFAULT_BASELINE_SERIES.alquiler.centro);
  const [seriesMadrid, setSeriesMadrid] = useState<any[]>(() => DEFAULT_BASELINE_SERIES.alquiler.madrid);

  // State: Niveles Comparativa
  const [compareLevel, setCompareLevel] = useState<'Distritos' | 'Barrios'>('Distritos');

  const [isOverlayOpen, setIsOverlayOpen] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [showDashboardLoader, setShowDashboardLoader] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersAttempt, setFiltersAttempt] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMapHelpModal, setShowMapHelpModal] = useState(false);
  const [showHeatmapHelpModal, setShowHeatmapHelpModal] = useState(false);
  const [showCompareHelpModal, setShowCompareHelpModal] = useState(false);
  const [mapData, setMapData] = useState<{districts: any[], neighborhoods: any[]}>({ districts: [], neighborhoods: [] });
  const [rankings, setRankings] = useState<{ topDist: any[], botDist: any[], topBarr: any[], botBarr: any[] }>({
    topDist: [], botDist: [], topBarr: [], botBarr: []
  });
  const [affordabilityData, setAffordabilityData] = useState<any[]>([]);
  const [seasonalTrend, setSeasonalTrend] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [heatmapVisibleCount, setHeatmapVisibleCount] = useState(15);
  const [rankingLevel, setRankingLevel] = useState<'Distritos' | 'Barrios'>('Distritos');
  const [rankingMetric, setRankingMetric] = useState<'total' | 'unit'>('total');
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

  const [ltvPercent, setLtvPercent] = useState<number>(65);
  const [interestImpactData, setInterestImpactData] = useState<any[]>([]);
  const [riskReturnData, setRiskReturnData] = useState<any[]>([]);
  const [liquidityZoneA, setLiquidityZoneA] = useState<string>('Cargando...');
  const [liquidityZoneB, setLiquidityZoneB] = useState<string>('Cargando...');
  const [volatilityZoneA, setVolatilityZoneA] = useState<string>('Cargando...');
  const [volatilityZoneB, setVolatilityZoneB] = useState<string>('Cargando...');

  const [containerHeight, setContainerHeight] = useState('auto');
  const activePanelRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<any[]>([]);
  const latestDashboardRequest = useRef(0);
  const hasLoadedPrimaryKpis = useRef(false);

  const activeProfile = PROFILES[profileIdx];
  const selectedMonthIndex = MONTHS_ES.indexOf(selectedMonth);
  const latestObservedMonthIndex = MONTHS_ES.indexOf(latestAvailablePeriod.month);
  const isProjectionPeriod = Number(selectedYear) > Number(latestAvailablePeriod.year) || (Number(selectedYear) === Number(latestAvailablePeriod.year) && selectedMonthIndex > latestObservedMonthIndex);
  const periodStatusLabel = isProjectionPeriod ? 'Estimación' : 'Dato real';
  const realSeriesPoints = seriesMadrid.filter(point => point && !point.is_prediction);
  const latestRealPoint = realSeriesPoints[realSeriesPoints.length - 1];
  const latestRealMonth = latestRealPoint?.mes_nombre || latestAvailablePeriod.month;
  const latestRealYear = Number(latestRealPoint?.anio || latestAvailablePeriod.year);
  const visibleFilters = isMobileFiltersOpen ? draftFilters : { year: selectedYear, month: selectedMonth, district: selectedDistrict, barrio: selectedBarrio };
  const firstProjectionMonth = latestRealPoint
    ? MONTHS_ES[Number(latestRealPoint.mes)] || 'Enero'
    : MONTHS_ES[latestObservedMonthIndex + 1] || 'Enero';
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
  const mapFeatureItem = selectedMapFeature
    ? [...mapData.districts, ...mapData.neighborhoods].find(item => [item.distrito, item.barrio].filter(Boolean).some(name => normalizeZoneLabel(String(name)) === normalizeZoneLabel(selectedMapFeature)))
    : null;
  const mapFeatureIsDistrict = Boolean(selectedMapFeature && mapData.districts.some(item => normalizeZoneLabel(String(item.distrito || '')) === normalizeZoneLabel(selectedMapFeature)));
  const mapFeatureRows = mapFeatureIsDistrict ? mapData.districts : mapData.neighborhoods;
  const mapFeatureRank = mapFeatureItem ? [...mapFeatureRows].sort((a, b) => Number(b.precio_m2 || 0) - Number(a.precio_m2 || 0)).findIndex(item => normalizeZoneLabel(String(mapFeatureIsDistrict ? item.distrito : item.barrio || '')) === normalizeZoneLabel(selectedMapFeature)) + 1 : 0;
  const mapFeatureAverage = mapFeatureRows.length ? mapFeatureRows.reduce((sum, item) => sum + Number(item.precio_m2 || 0), 0) / mapFeatureRows.length : 0;
  const mapFeatureDelta = mapFeatureAverage && mapFeatureItem ? (Number(mapFeatureItem.precio_m2 || 0) - mapFeatureAverage) / mapFeatureAverage * 100 : null;
  const loadingStages = [
    { label: 'Conectando con la API', icon: Activity },
    { label: 'Procesando datos del mercado', icon: Database },
    { label: 'Preparando mapas y gráficas', icon: MapPinned },
  ];

  useEffect(() => {
    if (!isDashboardLoading) return;
    setLoadingStage(0);
    const timer = window.setInterval(() => {
      setLoadingStage((stage) => (stage + 1) % loadingStages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isDashboardLoading, loadingStages.length]);

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
        const observedPeriod = data.latest_observed_period;
        if (observedPeriod?.year && observedPeriod?.month) {
          setLatestAvailablePeriod({ year: String(observedPeriod.year), month: String(observedPeriod.month) });
        }
        if (allYears.length) setAvailableYears(allYears);
        setMonthsByYear(months);
        if (data.districts) setAvailableDistricts(['Todos', ...data.districts]);
        const preferredYear = String(observedPeriod?.year || (allYears.includes('2026') ? '2026' : allYears[allYears.length - 1] || '2026'));
        const preferredMonths = months[preferredYear] || MONTHS_ES;
        // En 2026 el último corte observado publicado es junio; abrir ahí evita
        // presentar una estimación como si fuera el dato actual por defecto.
        const preferredMonth = observedPeriod?.month || (preferredYear === '2026' && preferredMonths.includes('Junio')
          ? 'Junio'
          : preferredMonths[preferredMonths.length - 1] || 'Diciembre');
        setSelectedYear(preferredYear);
        setSelectedMonth(preferredMonth);
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
    window.addEventListener('popstate', handleBack);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', handleBack);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileFiltersOpen]);

  useEffect(() => {
    if (!compareZoneSheet) return;
    window.history.pushState({ compareZoneSheet: true }, '', `${window.location.pathname}${window.location.search}#zona-${compareZoneSheet.toLowerCase()}`);
    const onBack = () => setCompareZoneSheet(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') window.history.back(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onBack);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', onBack);
      window.removeEventListener('keydown', onKey);
    };
  }, [compareZoneSheet]);

  // Fetch KPIs and Series
  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    const op = activeProfile.op;
    const requestId = ++latestDashboardRequest.current;
    const isLatestRequest = () => requestId === latestDashboardRequest.current;
    const rejectInvalidRentalSeries = (rows: any[]) => {
      const containsOutlier = Array.isArray(rows) && rows.some((row: any) => Number(row.precio_m2) > 100);
      if (activeProfile.id === 'alquiler' && containsOutlier) {
        setDashboardLoadError('La serie de alquiler contiene precios por m² fuera de escala. Se ha detenido su visualización para evitar mezclar datos de compra y alquiler.');
        return true;
      }
      return false;
    };
    if (!hasLoadedPrimaryKpis.current) setIsDashboardLoading(true);
    setDashboardLoadError(null);
    // Never leave data from the previous operation visible while a new profile loads.
    setKpiData({});
    setKpiDataA({});
    setKpiDataB({});
    setSeriesMadrid([]);
    setSeriesA([]);
    setSeriesB([]);
    setMapData({ districts: [], neighborhoods: [] });
    setRankings({ topDist: [], botDist: [], topBarr: [], botBarr: [] });
    setHeatmapData([]);

    apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
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
      })
      .catch(error => {
        if (requestId === latestDashboardRequest.current) {
          setDashboardLoadError(error instanceof Error ? error.message : 'No se han podido cargar los datos del mercado.');
        }
      })
      .finally(() => {
        if (requestId === latestDashboardRequest.current) setIsDashboardLoading(false);
      });

    // Series Madrid (Average)
    apiFetch(`/series?year=${selectedYear}&op=${op}`)
      .then(res => res.json())
      .then(data => { if (isLatestRequest() && !rejectInvalidRentalSeries(data)) setSeriesMadrid(data); });

    // Series Zone A
    apiFetch(`/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(selectedZoneA)}&tipo_zona=${compareLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.json())
      .then(data => { if (isLatestRequest() && !rejectInvalidRentalSeries(data)) setSeriesA(data); });

    // Series Zone B
    apiFetch(`/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(selectedZoneB)}&tipo_zona=${compareLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.json())
      .then(data => { if (isLatestRequest() && !rejectInvalidRentalSeries(data)) setSeriesB(data); });

    // KPIs Zone A
    const zoneAParam = compareLevel === 'Distritos' ? `district=${encodeURIComponent(selectedZoneA)}` : `barrio=${encodeURIComponent(selectedZoneA)}`;
    apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneAParam}`)
      .then(res => res.json())
      .then(data => {
        if (!isLatestRequest()) return;
        if (activeProfile.id === 'alquiler' && Number(data.precio_m2) > 100) return;
        setKpiDataA({ ...data, esfuerzo_compra: data.esfuerzo_alquiler ?? data.esfuerzo_compra });
      });

    // KPIs Zone B
    const zoneBParam = compareLevel === 'Distritos' ? `district=${encodeURIComponent(selectedZoneB)}` : `barrio=${encodeURIComponent(selectedZoneB)}`;
    apiFetch(`/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneBParam}`)
      .then(res => res.json())
      .then(data => {
        if (!isLatestRequest()) return;
        if (activeProfile.id === 'alquiler' && Number(data.precio_m2) > 100) return;
        setKpiDataB({ ...data, esfuerzo_compra: data.esfuerzo_alquiler ?? data.esfuerzo_compra });
      });

    // Map Data
    apiFetch(`/map?year=${selectedYear}&month=${selectedMonth}&interest=${activeProfile.id === 'alquiler' ? 'Alquiler' : activeProfile.id === 'compra' ? 'Compra-venta' : activeProfile.id === 'venta' ? 'Venta' : 'Inversión'}`)
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
      .catch(err => console.error("Error loading map data:", err));

    if (activeProfile.id === 'alquiler') {
      apiFetch(`/affordability?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (isLatestRequest()) setAffordabilityData(Array.isArray(data) ? data : []); })
        .catch(err => { console.error("Error loading affordability:", err); if (isLatestRequest()) setAffordabilityData([]); });

      apiFetch(`/seasonal-trend?anio=${selectedYear}&op=${activeProfile.id}`)
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

    apiFetch(`/heatmap?year=${selectedYear}&op=${activeProfile.id}&level=${rankingLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!isLatestRequest()) return;
        const values = (Array.isArray(data) ? data : []).flatMap((row: any) => Object.keys(row).filter(key => /^m\d+$/.test(key)).map(key => Number(row[key]))).filter(Number.isFinite);
        if (activeProfile.id === 'alquiler' && values.some((value: number) => value > 100)) {
          setDashboardLoadError('La API devolvió valores de compraventa en la tabla de alquiler. Se han ocultado para evitar una escala engañosa.');
          return;
        }
        setHeatmapData(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (isLatestRequest()) setHeatmapData([]); });

    apiFetch(`/connectivity-analysis?district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (isLatestRequest()) setConnectivityData(data); })
      .catch(err => { console.error("Error loading connectivity:", err); if (isLatestRequest()) setConnectivityData(null); });

  }, [selectedYear, selectedMonth, profileIdx, selectedDistrict, selectedBarrio, selectedZoneA, selectedZoneB, compareLevel, rankingLevel, filtersReady, loadAttempt, activeProfile.id, activeProfile.op]);

  useEffect(() => {
    if (!filtersReady || !selectedYear || !selectedMonth) return;
    let isCurrent = true;
    setRankings({ topDist: [], botDist: [], topBarr: [], botBarr: [] });
    if (activeProfile.id === 'venta') {
      Promise.all([
        apiFetch(`/liquidity?year=${selectedYear}&level=distrito`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`/liquidity?year=${selectedYear}&level=barrio`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]).then(([dist, barr]) => {
        if (!isCurrent) return;
        const mapLiquidity = (list: any[]) => list.map(item => ({ name: item.name, value: item.transactions }));
        setRankings({ topDist: mapLiquidity(dist || []), botDist: mapLiquidity(dist || []), topBarr: mapLiquidity(barr || []), botBarr: mapLiquidity(barr || []) });
      });
    } else {
      const category = activeProfile.id === 'inversion' ? 'Rentabilidad' : rankingMetric === 'unit' ? 'Precio m²' : 'Precio';
      const district = `&district=${encodeURIComponent(selectedDistrict)}`;
      Promise.all([
        apiFetch(`/rankings?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&level=distrito&category=${encodeURIComponent(category)}`).then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch(`/rankings?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&level=barrio&category=${encodeURIComponent(category)}${district}`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]).then(([dist, barr]) => {
        if (!isCurrent) return;
        if (activeProfile.id === 'alquiler') {
          const maxAllowed = rankingMetric === 'unit' ? 100 : 10000;
          const values = [...(dist || []), ...(barr || [])].map((item: any) => Number(item.value)).filter(Number.isFinite);
          if (values.some((value: number) => value > maxAllowed)) {
            setDashboardLoadError('El ranking de alquiler contiene valores de compraventa. Se ha ocultado para evitar una escala engañosa.');
            return;
          }
        }
        setRankings({ topDist: dist || [], botDist: [...(dist || [])].sort((a: any, b: any) => a.value - b.value), topBarr: barr || [], botBarr: [...(barr || [])].sort((a: any, b: any) => a.value - b.value) });
      });
    }
    return () => { isCurrent = false; };
  }, [filtersReady, selectedYear, selectedMonth, activeProfile.id, activeProfile.op, rankingMetric, selectedDistrict]);

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
    if (activeProfile.id === 'inversion') {
      const level = liquidityLevel === 'distrito' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?level=${level}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setRiskReturnData(data))
        .catch(err => { console.error("Error fetching risk return data:", err); setRiskReturnData([]); });
    }
  }, [liquidityLevel, selectedDistrict, activeProfile.id]);

  // Fetch zone comparative liquidities (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      apiFetch(`/zone-liquidity?name=${encodeURIComponent(selectedZoneA)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneA(data.speed))
        .catch(() => setLiquidityZoneA('N/A'));
    }
  }, [selectedZoneA, compareLevel, activeProfile.id]);

  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      apiFetch(`/zone-liquidity?name=${encodeURIComponent(selectedZoneB)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneB(data.speed))
        .catch(() => setLiquidityZoneB('N/A'));
    }
  }, [selectedZoneB, compareLevel, activeProfile.id]);

  // Fetch zone comparative volatilities (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?level=${level}&district=Todos`)
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
  }, [selectedZoneA, compareLevel, activeProfile.id]);

  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      apiFetch(`/risk-return-matrix?level=${level}&district=Todos`)
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
  }, [selectedZoneB, compareLevel, activeProfile.id]);



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

          // Use effective data or robust baseline so chart is NEVER empty
          const effectiveData = (rawData && rawData.length > 0 && rawData.some(d => d && d.precio_m2 != null))
            ? rawData
            : resolveFallbackSeries(activeProfile.id, label);

          const effectiveMadridSeries = (seriesMadrid && seriesMadrid.length > 0 && seriesMadrid.some(d => d && d.precio_m2 != null))
            ? seriesMadrid
            : resolveFallbackSeries(activeProfile.id, 'madrid');

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
              layout: { padding: { top: 15, right: 30, bottom: 20, left: 0 } },
              plugins: {
                legend: {
                  display: true,
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
                  titleFont: { size: 14, weight: 'bold' },
                  bodyColor: 'var(--blanco-humo)',
                  bodyFont: { size: 13, weight: 'normal' },
                  bodySpacing: 4,
                  padding: 10,
                  cornerRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'color-mix(in srgb, var(--blanco-humo) 20%, transparent)',
                  displayColors: true,
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
                      return `${monthNames[idx]} ${selectedYear} · ${label}`;
                    },
                    label: (context: any) => {
                      const idx = context.dataIndex;
                      const val = context.parsed.y;
                      const unit = comparisonMetric.tooltipUnit;

                      if (val === null || val === undefined) {
                        return 'Sin datos registrados por el Ayuntamiento de Madrid para este periodo';
                      }

                      // La media es referencia estadística, no una cifra oficial proyectada.
                      if (context.datasetIndex === 0) {
                        const formatted = new Intl.NumberFormat('es-ES', {
                          minimumFractionDigits: comparisonMetric.decimals,
                          maximumFractionDigits: 2
                        }).format(val);
                        return `Media Madrid: ${formatted} ${unit}`;
                      }

                      // Línea principal de la zona
                      const found = effectiveData.find(d => d.mes === idx + 1);
                      const isPred = found ? Boolean(found.is_prediction) : false;
                      const tipoDato = isPred ? 'Estimación' : 'Dato real';
                      const valFormatted = new Intl.NumberFormat('es-ES', {
                        minimumFractionDigits: comparisonMetric.decimals,
                        maximumFractionDigits: 2
                      }).format(val);

                      const lines: string[] = [];

                      // 1. Precio actual y tipo de dato
                      lines.push(`Precio actual: ${valFormatted} ${unit} (${tipoDato})`);

                      // 2. Variación vs mes anterior
                      if (idx > 0) {
                        const prevVal = context.dataset.data[idx - 1];
                        if (prevVal !== null && prevVal !== undefined && prevVal > 0) {
                          const diffPrev = ((val - prevVal) / prevVal) * 100;
                          const absDiff = Math.abs(diffPrev).toFixed(1);
                          if (diffPrev > 0.08) {
                            lines.push(`Variación mes anterior: Subida del ${absDiff}%`);
                          } else if (diffPrev < -0.08) {
                            lines.push(`Variación mes anterior: Bajada del ${absDiff}%`);
                          } else {
                            lines.push(`Variación mes anterior: Sin variación (0.0%)`);
                          }
                        }
                      } else {
                        lines.push(`Inicio del ejercicio ${selectedYear}`);
                      }

                      // 3. Comparativa vs Media de Madrid
                      const madridItem = effectiveMadridSeries.find(d => d.mes === idx + 1);
                      const madridVal = madridItem ? madridItem.precio_m2 * multiplier : null;
                      if (madridVal !== null && madridVal !== undefined && madridVal > 0) {
                        const diffMadrid = ((val - madridVal) / madridVal) * 100;
                        const absDiffMadrid = Math.abs(diffMadrid).toFixed(1);
                        const madridFmt = new Intl.NumberFormat('es-ES', {
                          minimumFractionDigits: comparisonMetric.decimals,
                          maximumFractionDigits: 1
                        }).format(madridVal);

                        if (Math.abs(diffMadrid) <= 2) {
                          lines.push(`Comparativa Madrid: En la media de Madrid (${madridFmt} ${unit})`);
                        } else if (diffMadrid > 0) {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% más caro que la media (${madridFmt} ${unit})`);
                        } else {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% más barato que la media (${madridFmt} ${unit})`);
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
        const chartSeries = (raw: any[], zone: string) => {
          const effective = (raw && raw.length > 0 && raw.some(d => d && d.precio_m2 != null))
            ? raw
            : resolveFallbackSeries(activeProfile.id, zone);
          return Array.from({ length: 12 }, (_, i) => {
            const found = effective.find(d => Number(d.mes) === i + 1);
            return found ? found.precio_m2 * chartMultiplier : null;
          });
        };
        const sharedComparisonScale = getNiceChartScale([
          chartSeries(seriesA, selectedZoneA),
          chartSeries(seriesB, selectedZoneB),
          chartSeries(seriesMadrid, 'madrid'),
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
          const effA = (seriesA && seriesA.length > 0 && seriesA.some(d => d && d.precio_m2 != null))
            ? seriesA
            : resolveFallbackSeries(activeProfile.id, selectedZoneA);
          const effB = (seriesB && seriesB.length > 0 && seriesB.some(d => d && d.precio_m2 != null))
            ? seriesB
            : resolveFallbackSeries(activeProfile.id, selectedZoneB);
          const effMad = (seriesMadrid && seriesMadrid.length > 0 && seriesMadrid.some(d => d && d.precio_m2 != null))
            ? seriesMadrid
            : resolveFallbackSeries(activeProfile.id, 'madrid');

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
                  title: { display: true, text: 'Distancia a Transporte Público (metros)', font: { size: 11, weight: 'bold', family: '-apple-system' } },
                  grid: { color: 'var(--blanco-humo)' },
                  ticks: { callback: (v) => `${v}m` }
                },
                y: {
                  title: { display: true, text: 'Precio por m²', font: { size: 11, weight: 'bold', family: '-apple-system' } },
                  grid: { color: 'var(--blanco-humo)' },
                  ticks: { callback: (v) => `${v}€/m²` }
                }
              }
            }
          }));
        }
      }

      const ctxEuribor = document.getElementById('v2-chart-euribor') as HTMLCanvasElement;
      if (ctxEuribor && activeProfile.id === 'inversion' && interestImpactData && interestImpactData.length > 0) {
        chartsRef.current.push(new ChartJS(ctxEuribor, {
          type: 'bar',
          data: {
            labels: interestImpactData.map(d => d.year.toString()),
            datasets: [
              {
                type: 'line',
                label: 'Tipo Interés Medio (%)',
                data: interestImpactData.map(d => d.interest_rate),
                borderColor: 'var(--precio-subida)',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'yInteres',
                pointRadius: 4,
                pointBackgroundColor: 'var(--precio-subida)',
                fill: false
              },
              {
                type: 'bar',
                label: 'Precio m²',
                data: interestImpactData.map(d => d.price_m2),
                backgroundColor: 'color-mix(in srgb, var(--azul-linea) 20%, transparent)',
                borderColor: 'var(--azul-linea)',
                borderWidth: 1.5,
                borderRadius: 8,
                barThickness: 32,
                yAxisID: 'yPrecio'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  font: { size: 10, weight: 'bold' },
                  boxWidth: 8,
                  padding: 8
                }
              },
              tooltip: {
                backgroundColor: 'color-mix(in srgb, var(--blanco-humo) 95%, transparent)',
                titleColor: 'var(--azul-noche)',
                bodyColor: 'var(--azul-noche)',
                borderColor: 'color-mix(in srgb, var(--azul-noche) 10%, transparent)',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: (context) => {
                    if (context.dataset.yAxisID === 'yInteres') {
                      return `Interés: ${context.parsed.y}%`;
                    } else {
                      return `Precio: ${new Intl.NumberFormat('es-ES').format(context.parsed.y)}€/m²`;
                    }
                  }
                }
              },
              datalabels: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: 'var(--azul-linea)', font: { size: 10, weight: 'bold' } }
              },
              yInteres: {
                type: 'linear',
                position: 'left',
                ticks: {
                  color: 'var(--azul-linea)',
                  callback: (val) => val + '%',
                  font: { size: 9 }
                },
                grid: { color: 'color-mix(in srgb, var(--azul-noche) 5%, transparent)' }
              },
              yPrecio: {
                type: 'linear',
                position: 'right',
                ticks: {
                  color: 'var(--azul-linea)',
                  callback: (val) => val + '€',
                  font: { size: 9 }
                },
                grid: { drawOnChartArea: false }
              }
            }
          }
        }));
      }

      // Risk-Return Matrix Chart for Inversión profile
      const ctxRiskReturn = document.getElementById('v2-chart-risk-return') as HTMLCanvasElement;
      if (ctxRiskReturn && activeProfile.id === 'inversion' && riskReturnData && riskReturnData.length > 0) {
        const avgRisk = riskReturnData.reduce((sum, d) => sum + (d.risk || 0), 0) / riskReturnData.length;
        const avgRoi = riskReturnData.reduce((sum, d) => sum + (d.roi || 0), 0) / riskReturnData.length;

        const points = riskReturnData.map(d => {
          const x = d.risk || 0;
          const y = d.roi || 0;
          const isSelected = d.name.toLowerCase() === (liquidityLevel === 'barrio' ? selectedBarrio.toLowerCase() : selectedDistrict.toLowerCase());

          let pointColor = 'var(--precio-subida)'; // Blue default
          let isIdeal = false;
          let isAvoid = false;

          if (x < avgRisk && y > avgRoi) {
            pointColor = 'var(--azul-linea)'; // Blue (ideal: low risk, high return)
            isIdeal = true;
          } else if (x > avgRisk && y < avgRoi) {
            pointColor = 'var(--coral-texto)'; // Coral (avoid: high risk, low return)
            isAvoid = true;
          }

          return {
            x,
            y,
            name: d.name,
            color: pointColor,
            isSelected,
            isIdeal,
            isAvoid
          };
        });

        chartsRef.current.push(new ChartJS(ctxRiskReturn, {
          data: {
            datasets: [
              {
                type: 'scatter',
                label: 'Zonas · índice de riesgo vs rentabilidad',
                data: points.map(p => ({ x: p.x, y: p.y, name: p.name })),
                backgroundColor: points.map(p => p.isSelected ? 'var(--coral)' : p.color),
                borderColor: 'var(--blanco-humo)',
                borderWidth: points.map(p => p.isSelected ? 2 : 0),
                pointRadius: points.map(p => p.isSelected ? 7 : 5),
                pointHoverRadius: 8,
                showLine: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: { size: 9, weight: 'bold' },
                  boxWidth: 8,
                  padding: 8
                }
              },
              datalabels: {
                display: false // Avoid cluttering the bar chart since tooltips will show exact values
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
                    const idx = context.dataIndex;
                    const p = points[idx];
                    return `${p.name}: riesgo ${p.x.toFixed(1)} · rentabilidad ${p.y.toFixed(2)}%${p.isSelected ? ' ★ (Seleccionado)' : ''}`;
                  }
                }
              }
            },
            scales: {
              x: {
                title: { display: true, text: 'Índice de riesgo histórico (10–90)', font: { size: 10, weight: 'bold' } },
                min: 0,
                max: 100,
                ticks: {
                  color: 'var(--azul-linea)',
                  font: { size: 9, weight: 'bold' }
                }
              },
              y: {
                type: 'linear',
                title: { display: true, text: 'Rentabilidad bruta observada (%)', font: { size: 10, weight: 'bold' } },
                ticks: {
                  callback: (val) => val + '%',
                  font: { size: 9 }
                },
                grid: { color: 'color-mix(in srgb, var(--azul-noche) 5%, transparent)' }
              }
            }
          }
        }));
      }
    };
    // Solo inicializar cuando no estamos en medio de una transición de perfil
    if (isTransitioning) return;

    const timer = setTimeout(initCharts, 150);
    const resizeTimer = setTimeout(() => {
      chartsRef.current.forEach((chart) => chart?.resize());
    }, 650);
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
    };
  }, [profileIdx, isTransitioning, compareLevel, activeProfile.color, seriesA, seriesB, seriesMadrid, activeProfile.id, scatterData, interestImpactData, riskReturnData, liquidityLevel, selectedDistrict, selectedBarrio, selectedYear, selectedZoneA, selectedZoneB]);

  const handleProfileChange = (newIdx: number) => {
    if (newIdx === profileIdx || isTransitioning) return;
    setPrevIdx(profileIdx);
    setProfileIdx(newIdx);
    setIsTransitioning(true);
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
    setSelectedDistrict(draftFilters.district);
    setSelectedBarrio(draftFilters.barrio);
    closeMobileFilters();
  };

  const resetMobileFilters = () => {
    const reset = { year: latestAvailablePeriod.year, month: latestAvailablePeriod.month, district: 'Todos', barrio: 'Todos' };
    setDraftFilters(reset);
    setSelectedYear(reset.year);
    setSelectedMonth(reset.month);
    setSelectedDistrict(reset.district);
    setSelectedBarrio(reset.barrio);
    closeMobileFilters();
  };

  const scrollToDashboardSection = (section: string) => {
    activePanelRef.current?.querySelector<HTMLElement>(`[data-dashboard-section="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLevelToggle = (level: 'Distritos' | 'Barrios') => {
    if (level === compareLevel) return;
    const availableZones = (level === 'Distritos' ? availableDistricts : availableBarrios).filter(zone => zone !== 'Todos');
    if (!availableZones.includes(selectedZoneA)) setSelectedZoneA(availableZones[0] || 'Todos');
    if (!availableZones.includes(selectedZoneB)) setSelectedZoneB(availableZones[1] || availableZones[0] || 'Todos');
    setCompareLevel(level);
  };

  const getSlideClass = (idx: number) => {
    if (idx === profileIdx) return 'v2-active';
    if (idx === prevIdx && isTransitioning) return profileIdx > prevIdx ? 'v2-out-left' : 'v2-out-right';
    return profileIdx > idx ? 'v2-before' : 'v2-after';
  };

  const rankingRows = rankingLevel === 'Distritos'
    ? (activeProfile.id === 'venta' || activeProfile.id === 'inversion' ? rankings.topDist : rankings.botDist)
    : (activeProfile.id === 'venta' || activeProfile.id === 'inversion' ? rankings.topBarr : rankings.botBarr);
  const rankingValueMax = Math.max(1, ...rankingRows.map(item => Number(item.value) || 0));
  const normalizeZoneName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const highlightedRankingZone = rankingLevel === 'Distritos' ? selectedDistrict : selectedBarrio;
  const selectedRankingZone = rankingLevel === 'Distritos'
    ? selectedDistrict !== 'Todos' ? selectedDistrict : null
    : selectedBarrio !== 'Todos' ? selectedBarrio : null;

  return (
    <div className="v2-root" data-profile={activeProfile.id}>
      <div className="mi-atmosphere" aria-hidden="true"/>
      {showDashboardLoader && (
        <LoadingScreen
          ready={!isDashboardLoading}
          estimatedSeconds={25}
          onExited={() => setShowDashboardLoader(false)}
          onRetry={() => window.location.reload()}
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
        profileTabs={PROFILES.map(p => ({ id: p.id, label: p.label }))}
        activeProfileId={activeProfile.id}
        onSelectProfile={(id) => {
          const idx = PROFILES.findIndex(p => p.id === id);
          if (idx !== -1) handleProfileChange(idx);
        }}
        ctaText="El Veredicto"
        ctaHref="/madrid/veredicto"
      />

      <nav className="v2-mobile-section-nav is-visible" aria-label="Secciones del cuadro de mando">
        {[
          ['Resumen', 'summary'], ['Mapa', 'map'], ['Ranking', 'ranking'], ['Heatmap', 'heatmap'], ['Comparar', 'compare'],
        ].map(([label, section]) => <button key={section} type="button" onClick={() => scrollToDashboardSection(section)}>{label}</button>)}
      </nav>

      <div className="v2-mobile-filter-bar">
        <div className="v2-mobile-filter-summary">
          <strong>{activeProfile.label}</strong>
          <span>{selectedDistrict === 'Todos' ? 'Madrid' : formatZoneOption(selectedDistrict)} · {selectedMonth} {selectedYear}</span>
        </div>
        <div className="v2-mobile-filter-chips">
          {selectedDistrict !== 'Todos' && <button type="button" onClick={() => { setSelectedDistrict('Todos'); setSelectedBarrio('Todos'); }}>‹ {formatZoneOption(selectedDistrict)} ×</button>}
          {selectedBarrio !== 'Todos' && <button type="button" onClick={() => setSelectedBarrio('Todos')}>{formatZoneOption(selectedBarrio)} ×</button>}
          {(selectedYear !== latestAvailablePeriod.year || selectedMonth !== latestAvailablePeriod.month) && <button type="button" onClick={() => { setSelectedYear(latestAvailablePeriod.year); setSelectedMonth(latestAvailablePeriod.month); }}>{selectedMonth.slice(0, 3)} {selectedYear} ×</button>}
        </div>
        <button type="button" className="v2-mobile-filter-trigger" aria-expanded={isMobileFiltersOpen} aria-controls="v2-filter-panel" onClick={openMobileFilters}>
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>Filtros</span><b>{Number(selectedDistrict !== 'Todos') + Number(selectedBarrio !== 'Todos') + Number(selectedYear !== latestAvailablePeriod.year || selectedMonth !== latestAvailablePeriod.month)}</b>
        </button>
      </div>

      {isMobileFiltersOpen && <button type="button" className="v2-mobile-filter-backdrop" aria-label="Cerrar filtros" onClick={closeMobileFilters} />}

      {/* 2. FILTROS REFINADOS (CUSTOM APPLE DROPDOWNS) */}
      <div id="v2-filter-panel" className={`v2-filters ${isMobileFiltersOpen ? 'v2-mobile-filters-open' : ''} ${['year', 'month', 'dist', 'barrio'].includes(activeDropdown || '') ? 'v2-filters-open' : ''}`}>
        <div className="v2-mobile-filter-heading">
          <div><strong>Filtrar</strong><span>{activeProfile.label} · {visibleFilters.district === 'Todos' ? 'Madrid' : formatZoneOption(visibleFilters.district)} · {visibleFilters.month} {visibleFilters.year}</span></div>
          <button type="button" aria-label="Cerrar filtros" onClick={closeMobileFilters}><X size={20} /></button>
        </div>
        <div className="v2-filter-group">

          {/* AÑO */}
          <div className={`v2-dropdown-container ${activeDropdown === 'year' ? 'v2-z-up' : ''}`}>
            <span className="v2-filter-label">Año</span>
            <button type="button" className={`v2-custom-select ${activeDropdown === 'year' ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={activeDropdown === 'year'} onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}>
              <span>{visibleFilters.year}</span>
              <ChevronDown size={14} className="v2-select-chevron" />
            </button>
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
            <button type="button" className={`v2-custom-select ${activeDropdown === 'month' ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={activeDropdown === 'month'} onClick={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')}>
              <span>{visibleFilters.month}</span>
              <ChevronDown size={14} className="v2-select-chevron" />
            </button>
            {activeDropdown === 'month' && (
              <div className="v2-dropdown-menu" role="listbox" aria-label="Mes">
                {(monthsByYear[visibleFilters.year] || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']).map(m => (
                  <button type="button" key={m} className="v2-dropdown-item" role="option" aria-selected={visibleFilters.month === m} onClick={(e) => { e.stopPropagation(); if (isMobileFiltersOpen) setDraftFilters(current => ({ ...current, month: m })); else setSelectedMonth(m); setActiveDropdown(null); }}>{m}</button>
                ))}
              </div>
            )}
          </div>

          {/* DISTRITO */}
          <div className={`v2-dropdown-container ${activeDropdown === 'dist' ? 'v2-z-up' : ''}`}>
            <span className="v2-filter-label">Distrito</span>
            <button type="button" className={`v2-custom-select ${activeDropdown === 'dist' ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={activeDropdown === 'dist'} onClick={() => setActiveDropdown(activeDropdown === 'dist' ? null : 'dist')}>
              <span>{formatZoneOption(visibleFilters.district)}</span>
              <ChevronDown size={14} className="v2-select-chevron" />
            </button>
            {activeDropdown === 'dist' && (
              <div className="v2-dropdown-menu" role="listbox" aria-label="Distrito">
                {availableDistricts.map(d => (
                  <button type="button" key={d} className="v2-dropdown-item" role="option" aria-selected={visibleFilters.district === d} onClick={(e) => { e.stopPropagation(); if (isMobileFiltersOpen) setDraftFilters(current => ({ ...current, district: d, barrio: 'Todos' })); else setSelectedDistrict(d); setActiveDropdown(null); }}>{formatZoneOption(d)}</button>
                ))}
              </div>
            )}
          </div>

          {/* BARRIO */}
          <div className={`v2-dropdown-container ${activeDropdown === 'barrio' ? 'v2-z-up' : ''}`}>
            <span className="v2-filter-label">Barrio</span>
            <button type="button" disabled={visibleFilters.district === 'Todos'} className={`v2-custom-select ${activeDropdown === 'barrio' ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={activeDropdown === 'barrio'} onClick={() => setActiveDropdown(activeDropdown === 'barrio' ? null : 'barrio')}>
                    <span>{visibleFilters.district === 'Todos' ? 'Elige un distrito' : formatZoneOption(visibleFilters.barrio)}</span>
              <ChevronDown size={14} className="v2-select-chevron" />
            </button>
            {activeDropdown === 'barrio' && (
              <div className="v2-dropdown-menu" role="listbox" aria-label="Barrio">
                <input
                  className="v2-dropdown-search"
                  aria-label="Buscar barrio"
                  placeholder="Buscar barrio…"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const query = e.target.value.toLocaleLowerCase('es-ES');
                    const menu = e.currentTarget.parentElement;
                    menu?.querySelectorAll<HTMLButtonElement>('.v2-dropdown-item').forEach(item => {
                      item.hidden = query.length > 0 && !item.textContent?.toLocaleLowerCase('es-ES').includes(query);
                    });
                  }}
                />
                {(isMobileFiltersOpen ? draftBarrios : availableBarrios).map(b => (
                  <button type="button" key={b} className="v2-dropdown-item" role="option" aria-selected={visibleFilters.barrio === b} onClick={(e) => { e.stopPropagation(); if (isMobileFiltersOpen) setDraftFilters(current => ({ ...current, barrio: b })); else setSelectedBarrio(b); setActiveDropdown(null); }}>{formatZoneOption(b)}</button>
                ))}
              </div>
            )}
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

            <div className="v2-mobile-filter-commit">
              <button type="button" className="v2-mobile-filter-apply" onClick={applyMobileFilters}>Aplicar ({Number(draftFilters.district !== 'Todos') + Number(draftFilters.barrio !== 'Todos') + Number(draftFilters.year !== latestAvailablePeriod.year || draftFilters.month !== latestAvailablePeriod.month)})</button>
              <button type="button" className="v2-mobile-filter-reset" onClick={resetMobileFilters}>Restablecer al último dato real</button>
            </div>

          </div>

        </div>
      </div>

      <nav className="v2-mobile-profile-nav" aria-label="Perfiles de mercado">
        {PROFILES.map((profile, index) => {
          const ProfileIcon = [Home, Building2, Tag, Activity][index];
          return (
            <button key={profile.id} type="button" className={profileIdx === index ? 'active' : ''} aria-current={profileIdx === index ? 'page' : undefined} aria-pressed={profileIdx === index} onClick={() => handleProfileChange(index)}>
              <ProfileIcon size={17} aria-hidden="true" />
              <span>{profile.label}</span>
            </button>
          );
        })}
      </nav>


      {/* 4. CONTENIDO PRINCIPAL */}
      <main className="v2-viewport" style={{ height: containerHeight }}>
        {PROFILES.map((p, i) => (
          <div key={p.id} ref={i === profileIdx ? activePanelRef : null} className={`v2-panel ${getSlideClass(i)}`}>

            {/* KPI & MAPA SECTION */}
            <div className="v2-grid-main" data-dashboard-section="summary">
              <div className="v2-kpi-col">
                <div className="v2-kpi-stack">

                  {activeProfile.id === 'alquiler' && (() => {
                    const rent = kpiData.p_vivienda || 0;
                    const incomeMonthly = (kpiData.renta_media || 0) / 12;
                    const effort = incomeMonthly > 0 ? (rent / incomeMonthly) * 100 : 0;
                    const effortColor = effort <= 30 ? '#00E5EE' : effort <= 40 ? '#F4B860' : '#F08080';
                    const salary = Number.parseFloat(userRentSalary);
                    const personalEffort = salary > 0 ? (rent / salary) * 100 : 0;
                    const money = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);
                    return (
                      <div className="v2-mobile-rent-summary">
                        <section className="v2-rent-hero">
                          <div className="v2-rent-hero-heading">
                            <div>
                              <span className="v2-rent-eyebrow">Precio medio · alquiler</span>
                              <span className="v2-rent-real"><i />{periodStatusLabel} · {selectedMonth} {selectedYear}</span>
                            </div>
                            <InfoTooltip
                              title="Precio de alquiler por metro cuadrado"
                              description="Precio medio mensual por metro cuadrado para el periodo y zona seleccionados."
                              example="21,62 €/m² equivale aproximadamente a 1.958 € al mes para una vivienda media."
                              ruleOfThumb="Compara siempre la misma zona y el mismo periodo."
                            />
                          </div>
                          <div className="v2-rent-main-value">
                            <strong>{new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiData.p_m2 || 0)}</strong>
                            <span>€/m²</span>
                          </div>
                          <div className="v2-rent-chips">
                            <span>{Number(kpiData.v_mes || 0) < 0 ? '↘' : '↗'} {kpiData.v_mes > 0 ? '+' : ''}{Number(kpiData.v_mes || 0).toFixed(1)}% mes</span>
                            <span>{Number(kpiData.v_anual || 0) < 0 ? '↘' : '↗'} {kpiData.v_anual > 0 ? '+' : ''}{Number(kpiData.v_anual || 0).toFixed(1)}% año</span>
                            <span className="v2-rent-market">{kpiData.estado_mercado || 'Mercado estable'}</span>
                          </div>
                        </section>
                        <section className="v2-rent-secondary">
                          <div className="v2-rent-secondary-card">
                            <span className="v2-rent-eyebrow">Alquiler medio</span>
                            <strong>{money(rent)} <small>€/mes</small></strong>
                          </div>
                          <div className="v2-rent-secondary-card v2-rent-effort">
                            <div className="v2-rent-effort-head"><span className="v2-rent-eyebrow">Esfuerzo de alquiler</span><strong style={{ color: effortColor }}>{effort > 0 ? `${effort.toFixed(0)}%` : '—'}</strong></div>
                            <div className="v2-rent-effort-meter"><i style={{ width: `${Math.min(effort, 100)}%`, background: effortColor }} /><b style={{ left: '30%' }} /></div>
                            <span className="v2-rent-effort-caption">{money(rent)} € de alquiler · {money(incomeMonthly)} € de renta (INE)</span>
                            <span className="v2-rent-effort-note">30% recomendado</span>
                            <button className="v2-rent-calc-toggle" type="button" onClick={() => setShowRentCalculator(value => !value)} aria-expanded={showRentCalculator}>
                              {showRentCalculator ? 'Cerrar cálculo' : 'Calcula con tu sueldo'} <span aria-hidden="true">{showRentCalculator ? '↑' : '→'}</span>
                            </button>
                            {showRentCalculator && <div className="v2-rent-calculator">
                              <input type="number" value={userRentSalary} onChange={event => setUserRentSalary(event.target.value)} placeholder="Sueldo neto mensual (€)" aria-label="Sueldo neto mensual" />
                              {salary > 0 && <span>Tu esfuerzo sería <strong style={{ color: personalEffort <= 30 ? '#00E5EE' : personalEffort <= 40 ? '#F4B860' : '#F08080' }}>{personalEffort.toFixed(0)}%</strong></span>}
                            </div>}
                          </div>
                        </section>
                      </div>
                    );
                  })()}

                  <div className="v2-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label>{activeProfile.id === 'inversion' ? 'Rentabilidad' : 'Precio m²'}</label>
                        <InfoTooltip
                          title={activeProfile.id === 'inversion' ? 'Rentabilidad Bruta (Yield)' : 'Precio por Metro Cuadrado'}
                          description={activeProfile.id === 'inversion'
                            ? 'Porcentaje anual que rinde la vivienda a través del alquiler respecto al precio de compra.'
                            : 'El precio unitario promedio que cuesta cada metro cuadrado de vivienda en esta zona.'}
                          example={activeProfile.id === 'inversion'
                            ? 'Si compras por 200.000€ y alquilas por 800€/mes (9.600€/año), la rentabilidad bruta es del 4,8% anual.'
                            : 'Si un piso tiene 80 m² y el precio es 20 €/m², el alquiler rondará los 1.600 €/mes.'}
                          ruleOfThumb={activeProfile.id === 'inversion'
                            ? 'En Madrid, una rentabilidad bruta superior al 5% se considera muy atractiva.'
                            : 'Dato clave para comparar el valor real de distintas viviendas independientemente de su tamaño.'}
                        />
                      </div>
                      {kpiData.is_prediction ? (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            color: getZoneReliability(selectedDistrict, true).titleColor,
                            backgroundColor: getZoneReliability(selectedDistrict, true).bg,
                            border: `0.5px solid ${getZoneReliability(selectedDistrict, true).borderColor}`,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-block'
                          }}
                          title={getZoneReliability(selectedDistrict, true).description}
                        >
                          {getZoneReliability(selectedDistrict, true).tag}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            color: 'var(--precio-subida)',
                            backgroundColor: 'color-mix(in srgb, var(--precio-subida) 8%, transparent)',
                            border: '0.5px solid color-mix(in srgb, var(--precio-subida) 20%, transparent)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-block'
                          }}
                          title="Dato observado en la serie histórica del Ayuntamiento de Madrid"
                        >
                          ✓ DATO REAL
                        </span>
                      )}
                    </div>
                    <div className="v2-val">
                      {activeProfile.id === 'inversion'
                        ? (kpiData.p_m2 * 100).toFixed(2) + '%'
                        : new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiData.p_m2 || 0) + ' €/m²'}
                    </div>
                  </div>

                  <div className="v2-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label>{activeProfile.id === 'inversion' ? 'Precio de inversión' : activeProfile.id === 'alquiler' ? 'Alquiler medio' : 'Precio medio de vivienda'}</label>
                        <InfoTooltip
                          title={activeProfile.id === 'inversion' ? 'Precio de inversión' : activeProfile.id === 'alquiler' ? 'Alquiler medio mensual' : 'Precio medio de vivienda'}
                          description="Estimación del coste total mensual o de compra, según el perfil seleccionado, a partir del valor por metro cuadrado y la superficie media observada."
                          example="Sirve para interpretar el valor total de una vivienda tipo, además del precio unitario por m²."
                          ruleOfThumb="Comprueba siempre la superficie y el periodo antes de comparar dos zonas."
                        />
                      </div>
                      {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                    </div>
                    <div className="v2-val">
                      {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiData.p_vivienda || 0)} {activeProfile.id === 'alquiler' ? '€/mes' : '€'}
                    </div>
                  </div>

                  {activeProfile.id === 'inversion' ? (
                    <div className="v2-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label>LTV Estimado (Loan-to-Value)</label>
                          <InfoTooltip
                            title="LTV (Loan-to-Value) / Financiación"
                            description="Indica qué porcentaje del valor total del inmueble financias mediante hipoteca y cuánto aportas de tus propios ahorros."
                            example="Un LTV del 70% significa que el banco aporta el 70% del precio y tú pagas el 30% restante con ahorros."
                            ruleOfThumb="Para inversión los bancos suelen financiar el 60%-70%; para vivienda habitual hasta el 80%."
                          />
                        </div>
                        {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                      </div>

                      <div className="v2-val" style={{ fontSize: '24px', margin: '4px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span>LTV: {ltvPercent}%</span>
                        <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--azul-linea)' }}>
                          Aporta: {100 - ltvPercent}%
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#BACCD6', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(186, 204, 214, 0.16)', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#BACCD6' }}>Hipoteca Estimada:</span>
                          <span style={{ fontWeight: '700', color: '#FFFFFF' }}>
                            {new Intl.NumberFormat('es-ES').format(Math.round((kpiData.p_vivienda || 0) * (ltvPercent / 100)))}€
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#BACCD6' }}>Aportación Comprador:</span>
                          <span style={{ fontWeight: '700', color: '#FFFFFF' }}>
                            {new Intl.NumberFormat('es-ES').format(Math.round((kpiData.p_vivienda || 0) * ((100 - ltvPercent) / 100)))}€
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[60, 70, 80].map((val) => (
                            <button
                              key={val}
                              onClick={() => setLtvPercent(val)}
                              style={{
                                flex: 1,
                                padding: '4px 0',
                                fontSize: '10px',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: ltvPercent === val ? activeProfile.color : 'rgba(255, 255, 255, 0.08)',
                                color: ltvPercent === val ? '#FFFFFF' : '#BACCD6',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Preset: {val}%
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(186, 204, 214, 0.16)', paddingTop: '6px' }}>
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
                              outline: 'none',
                              margin: '2px 0'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: '#BACCD6', fontWeight: '500', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--coral)', flexShrink: 0 }}>
                          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7.5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                          <path d="M9 18h6" />
                          <path d="M10 22h4" />
                        </svg>
                        <span style={{ color: '#00F0FF', fontWeight: '600' }}>
                          {ltvPercent <= 65 ? 'Alto ahorro = Zona premium' : ltvPercent <= 75 ? 'Ahorro medio = Zona de estabilidad' : 'Financiación estándar'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="v2-kpi-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label>Estado Mercado</label>
                          <InfoTooltip
                            title="Estado del Mercado Local"
                            description="Indica la fase del ciclo inmobiliario según las operaciones recientes de compra y alquiler."
                            example="Crecimiento (+): Precios al alza de forma sostenida. Ajuste (-): Moderación o descenso temporal de precios."
                            ruleOfThumb="En 'Crecimiento', los precios tienden a subir si esperas; en 'Ajuste', hay más margen para negociar."
                          />
                        </div>
                        {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                      </div>
                      <div className="v2-val" style={{ fontSize: '24px' }}>
                        {kpiData.estado_mercado} {kpiData.estado_mercado === 'Crecimiento' ? '(+)' : kpiData.estado_mercado === 'Ajuste' ? '(-)' : ''}
                      </div>
                    </div>
                  )}

                  {activeProfile.id !== 'inversion' ? (
                    <>
                      <div className="v2-kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>Var. Mensual</label>
                            <InfoTooltip
                              title="Variación Mensual"
                              description="Porcentaje de subida o bajada del precio respecto al mes inmediatamente anterior."
                              example="Un +1.2% indica que los precios subieron un 1.2% en los últimos 30 días respecto al mes previo."
                              ruleOfThumb="Permite detectar aceleraciones o cambios rápidos de tendencia en el corto plazo."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div className={`v2-val accent ${kpiData.v_mes < 0 ? 'negative' : ''}`}>
                          {kpiData.v_mes > 0 ? '+' : ''}{kpiData.v_mes?.toFixed(1)}%
                        </div>
                      </div>

                      <div className="v2-kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label>Var. Anual</label>
                            <InfoTooltip
                              title="Variación Anual (12 Meses)"
                              description="La evolución acumulada del precio en el último año completo respecto al mismo mes del año anterior."
                              example="Un +8.5% anual significa que una vivienda que costaba 200.000€ hace un año ahora se sitúa en torno a 217.000€."
                              ruleOfThumb="Es el indicador más robusto para medir la tendencia real de fondo y la revalorización patrimonial."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div className={`v2-val accent ${kpiData.v_anual < 0 ? 'negative' : ''}`}>
                          {kpiData.v_anual > 0 ? '+' : ''}{kpiData.v_anual?.toFixed(1)}%
                        </div>
                      </div>
                    </>
                  ) : (() => {
                    const amortizacionAnios = kpiData.p_m2 > 0 ? (1 / kpiData.p_m2) : 0;
                    return (
                      <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: activeProfile.color, letterSpacing: '0.5px' }}>AMORTIZACIÓN</label>
                            <InfoTooltip
                              title="Años de Amortización (GRM)"
                              description="Número de años completos de alquiler íntegro que se necesitan para recuperar el 100% de la inversión de compra del inmueble."
                              example="Si el GRM es de 18 años, significa que con 18 años de rentas de alquiler se cubre el precio total de la compra."
                              ruleOfThumb="Cuanto menor sea el número de años, más rápida es la amortización y más atractiva la inversión (lo ideal es por debajo de 20 años)."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div className="v2-val" style={{ color: activeProfile.color }}>
                          {amortizacionAnios > 0 ? amortizacionAnios.toFixed(1) + ' años' : '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--azul-linea)', marginTop: '2px', fontWeight: '500' }}>
                          (GRM: Gross Rent Mult.)
                        </div>
                      </div>
                    );
                  })()}

                  {activeProfile.id === 'compra' && (() => {
                    const precioMedio = kpiData.p_vivienda || 0;
                    const rentaAnual = kpiData.renta_media || 0;
                    const aniosRenta = rentaAnual > 0 ? precioMedio / rentaAnual : 0;

                    let statusText = 'N/A';
                    let statusColor = 'var(--azul-linea)';
                    if (aniosRenta > 0) {
                      if (aniosRenta < 5) {
                        statusText = 'Asequible para habitantes típicos';
                        statusColor = 'var(--azul-linea)';
                      } else if (aniosRenta < 8) {
                        statusText = 'Moderado para habitantes típicos';
                        statusColor = 'var(--coral)';
                      } else {
                        statusText = 'Difícil para habitantes típicos';
                        statusColor = 'var(--coral-texto)';
                      }
                    }

                    const parsedIncome = parseFloat(userPurchaseIncome);
                    const parsedSavings = parseFloat(userPurchaseSavings);
                    const hasUserSim = showPurchaseSim && !isNaN(parsedIncome) && parsedIncome > 0;

                    const userAnios = hasUserSim ? precioMedio / parsedIncome : 0;
                    let userAniosStatus = '';
                    let userAniosColor = 'var(--azul-linea)';
                    if (userAnios > 0) {
                      if (userAnios < 3) {
                        userAniosStatus = 'Muy asequible';
                        userAniosColor = 'var(--azul-linea)';
                      } else if (userAnios < 6) {
                        userAniosStatus = 'Moderado';
                        userAniosColor = 'var(--coral)';
                      } else {
                        userAniosStatus = 'Poco asequible';
                        userAniosColor = 'var(--coral-texto)';
                      }
                    }

                    const userEntradaPct = hasUserSim && precioMedio > 0 ? (parsedSavings / precioMedio) * 100 : 0;
                    let userEntradaStatus = '';
                    let userEntradaColor = 'var(--azul-linea)';
                    if (userEntradaPct > 0) {
                      if (userEntradaPct >= 30) {
                        userEntradaStatus = 'Hipoteca moderada';
                        userEntradaColor = 'var(--azul-linea)';
                      } else if (userEntradaPct >= 20) {
                        userEntradaStatus = 'Hipoteca estándar';
                        userEntradaColor = 'var(--coral)';
                      } else {
                        userEntradaStatus = 'Hipoteca de alto riesgo';
                        userEntradaColor = 'var(--coral-texto)';
                      }
                    }

                    return (
                      <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--azul-linea)', letterSpacing: '0.5px' }}>
                              PODER ADQUISITIVO {selectedBarrio !== 'Todos' ? 'DEL BARRIO' : (selectedDistrict !== 'Todos' ? 'DEL DISTRITO' : 'DE MADRID')}
                            </label>
                            <InfoTooltip
                              title="Poder Adquisitivo y Años de Renta"
                              description="Mide cuántos años de ingresos anuales brutos íntegros necesita una familia residente típica de esta zona para comprar una vivienda media."
                              example="Si un piso medio cuesta 350.000€ y la renta media del hogar en la zona es de 50.000€/año, se necesitan 7 años íntegros de sueldo."
                              ruleOfThumb="Menos de 5 años se considera asequible; entre 5 y 8 años moderado; más de 8 años supone un esfuerzo elevado."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Precio medio vivienda: <strong style={{ display: 'block', fontSize: '15px', color: '#FFFFFF', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(precioMedio)}€</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Renta media {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ display: 'block', fontSize: '15px', color: '#FFFFFF', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(rentaAnual)}€/año</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Años de renta media:</span>
                          <strong style={{ fontSize: '18px', color: '#00F0FF', fontWeight: '800' }}>{aniosRenta > 0 ? aniosRenta.toFixed(1) : '-'} años</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: statusColor }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                          <span>{statusText}</span>
                        </div>

                        <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid rgba(186, 204, 214, 0.16)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>¿Tu situación es diferente?</span>

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
                            onClick={() => setShowPurchaseSim(true)}
                            style={{ width: '100%', background: activeProfile.color, color: '#FFFFFF', border: 'none', padding: '7px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '4px' }}
                          >
                            Calcular MI caso
                          </button>
                        </div>

                        {hasUserSim && (
                          <div style={{ marginTop: '6px', padding: '10px', background: 'rgba(0, 240, 255, 0.12)', border: '1px solid rgba(0, 240, 255, 0.35)', borderRadius: '8px', fontSize: '12px', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease' }}>
                            <div>
                              <span style={{ color: '#BACCD6' }}>Con tus ingresos ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedIncome)}€/año):</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span>Serían <strong style={{ color: '#00F0FF' }}>{userAnios.toFixed(1)} años</strong> → <strong style={{ color: userAniosColor }}>{userAniosStatus}</strong></span>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userAniosColor }} />
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#BACCD6' }}>Con tus ahorros ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedSavings)}€):</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span>Entrada: <strong style={{ color: '#00F0FF' }}>{userEntradaPct.toFixed(0)}%</strong> → <strong style={{ color: userEntradaColor }}>{userEntradaStatus}</strong></span>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userEntradaColor }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeProfile.id === 'alquiler' && (() => {
                    const alquiler = kpiData.p_vivienda || 0;
                    const rentaMediaAnual = kpiData.renta_media || 0;
                    const rentaMediaMensual = rentaMediaAnual > 0 ? rentaMediaAnual / 12 : 0;
                    const dedicar = rentaMediaMensual > 0 ? (alquiler / rentaMediaMensual) * 100 : 0;

                    let statusColor = 'var(--azul-linea)';
                    if (dedicar > 0) {
                      if (dedicar < 25) statusColor = 'var(--azul-linea)';
                      else if (dedicar < 35) statusColor = 'var(--coral)';
                      else statusColor = 'var(--coral-texto)';
                    }

                    const parsedSalary = parseFloat(userRentSalary);
                    const hasUserSalary = !isNaN(parsedSalary) && parsedSalary > 0;
                    const userEffort = hasUserSalary ? (alquiler / parsedSalary) * 100 : 0;

                    let userStatusColor = 'var(--azul-linea)';
                    if (userEffort > 0) {
                      if (userEffort < 25) userStatusColor = 'var(--azul-linea)';
                      else if (userEffort < 35) userStatusColor = 'var(--coral)';
                      else userStatusColor = 'var(--coral-texto)';
                    }

                    return (
                      <div className="v2-kpi-card v2-effort-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--azul-linea)', letterSpacing: '0.5px' }}>ESFUERZO DE ALQUILER</label>
                            <InfoTooltip
                              title="Tasa de Esfuerzo Financiero en Alquiler"
                              description="El porcentaje del sueldo neto mensual que una persona o familia debe destinar a pagar el alquiler de la vivienda en esta zona."
                              example="Pon tu sueldo mensual (ej. 1.800€). Si el alquiler medio es 900€, tu esfuerzo sería del 50%. Con 3.000€, sería del 30%."
                              ruleOfThumb="El Banco de España recomienda no superar el 30%-35% del sueldo neto. Superar el 40% se considera sobreesfuerzo crítico."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Alquiler medio {selectedBarrio !== 'Todos' ? 'en el barrio' : (selectedDistrict !== 'Todos' ? 'en el distrito' : 'en Madrid')}: <strong style={{ display: 'block', fontSize: '15px', color: '#FFFFFF', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(alquiler)}€/mes</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Renta media {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ display: 'block', fontSize: '15px', color: '#FFFFFF', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(rentaMediaMensual)}€/mes <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>(dato INE)</span></strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Esfuerzo {selectedBarrio !== 'Todos' ? 'en este barrio' : (selectedDistrict !== 'Todos' ? 'en este distrito' : 'en Madrid')}:</span>
                          <strong style={{ fontSize: '18px', color: '#00F0FF', fontWeight: '800' }}>{dedicar > 0 ? dedicar.toFixed(0) + '%' : '-'}</strong>
                          <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                        </div>

                        <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid rgba(186, 204, 214, 0.16)' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>¿Cuál es TU renta?</label>
                          <input
                            type="number"
                            value={userRentSalary}
                            onChange={(e) => setUserRentSalary(e.target.value)}
                            placeholder="Sueldo neto mensual (€)"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#011024', color: '#FFFFFF', border: '1.5px solid rgba(0, 240, 255, 0.4)', fontSize: '12px', marginTop: '4px', outline: 'none' }}
                          />
                          <span style={{ fontSize: '10px', color: '#BACCD6', display: 'block', marginTop: '3px' }}>(Opcional, para comparar)</span>
                        </div>

                        {hasUserSalary && (
                          <div style={{ marginTop: '6px', padding: '10px', background: 'rgba(0, 240, 255, 0.12)', border: '1px solid rgba(0, 240, 255, 0.35)', borderRadius: '8px', fontSize: '12px', color: '#FFFFFF', animation: 'v2FadeIn 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span>Tu esfuerzo real sería: <strong style={{ color: '#00F0FF', fontSize: '14px' }}>{userEffort.toFixed(0)}%</strong></span>
                              <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: userStatusColor }} />
                            </div>
                            <span style={{ color: '#BACCD6', fontSize: '11px' }}>
                              ({userEffort < dedicar ? 'mucho mejor que la media' : 'peor que la media local'})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeProfile.id === 'inversion' && (() => {
                    const rent = kpiData.p_m2 || 0;
                    const grm = rent > 0 ? 1 / rent : 0;
                    const roiNeto = rent * 0.9 * 100;
                    const transacciones = kpiData.transacciones || 0;

                    let liquidezText = 'Liquidez baja';
                    let liquidezColor = 'var(--coral-texto)';
                    if (transacciones > 300) {
                      liquidezText = 'Liquidez alta (fácil vender)';
                      liquidezColor = 'var(--azul-linea)';
                    } else if (transacciones > 100) {
                      liquidezText = 'Liquidez media';
                      liquidezColor = 'var(--coral)';
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
                      <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--azul-linea)', letterSpacing: '0.5px' }}>OPORTUNIDAD DE INVERSIÓN</label>
                            <InfoTooltip
                              title="Oportunidad y Rentabilidad de Inversión"
                              description="Combina el rendimiento neto del alquiler con el volumen anual de transacciones para evaluar qué tan rápido y rentable es invertir aquí."
                              example="Una rentabilidad neta del 4,5% con alta liquidez permite ingresar rentas estables con facilidad para vender si necesitas recuperar el capital."
                              ruleOfThumb="A mayor liquidez (más de 300 transacciones/año), menor riesgo de quedarte atrapado con el inmueble en caso de querer venderlo."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          GRM {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ fontSize: '15px', color: '#FFFFFF', display: 'block', marginTop: '2px' }}>{grm > 0 ? grm.toFixed(1) : '-'} años <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#00F0FF' }}>(recuperación)</span></strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Rentabilidad neta esperada: <strong style={{ fontSize: '16px', display: 'block', color: '#00F0FF', fontWeight: '800', marginTop: '2px' }}>{roiNeto > 0 ? roiNeto.toFixed(1) : '-'}%/año</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#BACCD6' }}>
                          Volumen de transacciones: <strong style={{ fontSize: '15px', color: '#FFFFFF' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)}/año</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: liquidezColor }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: liquidezColor }} />
                          <span>{liquidezText}</span>
                        </div>

                        <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid rgba(186, 204, 214, 0.16)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>¿Quieres simular tu inversión?</span>

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
                            onClick={() => setShowInvSim(true)}
                            style={{ width: '100%', background: activeProfile.color, color: '#FFFFFF', border: 'none', padding: '7px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '4px' }}
                          >
                            Ver proyección
                          </button>
                        </div>

                        {hasInvSim && (
                          <div style={{ marginTop: '6px', padding: '10px', background: 'var(--blanco-humo)', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease', maxHeight: '180px', overflowY: 'auto' }}>
                            <strong style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--azul-linea)' }}>Estimación simulada</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--humo-2)', paddingBottom: '6px' }}>
                              {projectionRows.map(row => (
                                <div key={row.year} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Año {row.year}:</span>
                                  <span>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.from)}€ → <strong>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.to)}€</strong></span>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--azul-noche)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ganancia total:</span>
                                <strong style={{ color: 'var(--azul-linea)' }}>+{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(totalGain)}€ (+{gainPct.toFixed(0)}%)</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ganancia anual:</span>
                                <strong>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(annualGain)}€/año</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeProfile.id === 'venta' && (() => {
                    const transacciones = kpiData.transacciones || 0;
                    const velocity = transacciones ? Math.max(1.0, 933.8 / transacciones) : 0;

                    let velocityLabel = 'Lento';
                    let velocityColor = 'var(--coral-texto)'; // red
                    if (velocity > 0) {
                      if (velocity < 2.0) {
                        velocityLabel = 'Rápido';
                        velocityColor = 'var(--azul-linea)';
                      } else if (velocity < 3.0) {
                        velocityLabel = 'Moderado';
                        velocityColor = 'var(--coral)';
                      }
                    }

                    let demandText = 'Baja';
                    let demandColor = 'var(--coral-texto)';
                    if (transacciones > 300) {
                      demandText = 'Alta';
                      demandColor = 'var(--azul-linea)';
                    } else if (transacciones > 100) {
                      demandText = 'Moderada';
                      demandColor = 'var(--coral)';
                    }

                    const appRate = kpiData.v_anual || 0;
                    const gain6m = (appRate / 2).toFixed(1);

                    return (
                      <>
                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label>¿Cuánto tardará en venderse?</label>
                              <InfoTooltip
                                title="Velocidad Media de Venta"
                                description="Tiempo estimado promedio en meses que tarda una vivienda en cerrarse y firmarse ante notario en este distrito o barrio."
                                example="Si marca 1.5 meses, la vivienda se vende a buen ritmo. Si supera los 3 meses, la demanda es más selectiva o pausada."
                                ruleOfThumb="Menos de 2 meses indica un mercado rápido con compradores activos; más de 3 meses exige fijar un precio muy competitivo."
                              />
                            </div>
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span>{velocity > 0 ? (velocity % 1 === 0 ? velocity.toFixed(0) : velocity.toFixed(1)) + ' ' + (velocity === 1 ? 'mes' : 'meses') : '-'}</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: velocityColor }}>
                              ({velocityLabel})
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--azul-linea)', marginTop: '2px' }}>
                            Velocidad de venta estimada promedio
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label>¿Hay demanda en la zona?</label>
                              <InfoTooltip
                                title="Actividad y demanda local"
                                description="Número de operaciones de compraventa cerradas en el último año según los registros disponibles. Es un indicador de actividad, no un plazo garantizado de venta."
                                example="Más de 300 transacciones anuales indican un mercado más activo; no significa que cualquier vivienda vaya a venderse en un plazo concreto."
                                ruleOfThumb="Usa esta cifra junto al precio y a la demanda de la zona; no la interpretes como una promesa de velocidad."
                              />
                            </div>
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{transacciones > 0 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones) + ' trans./año' : '-'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: demandColor }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: demandColor }} />
                              {demandText}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--azul-linea)', marginTop: '2px' }}>
                            Interés y liquidez del mercado local
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label>Potencial de ganancia (6 meses)</label>
                              <InfoTooltip
                                title="Potencial de Ganancia (6 Meses)"
                                description="Estimación del incremento de valor que podría experimentar el inmueble si decides esperar un semestre antes de ponerlo a la venta."
                                example="Si el potencial es de +2.5% y tu vivienda vale 300.000€, posponer la venta podría aportarte unos 7.500€ adicionales de margen."
                                ruleOfThumb="En fases alcistas, posponer la venta puede aumentar el margen; en fases de ajuste, vender pronto protege tu beneficio."
                              />
                            </div>
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                          </div>
                          <div className="v2-val" style={{ color: 'var(--azul-linea)' }}>
                            {appRate > 0 ? `+${gain6m}%` : appRate < 0 ? `${gain6m}%` : '0.0%'}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--azul-linea)', marginTop: '2px' }}>
                            más de precio si esperas
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="v2-map-col">
                <div className="v2-map-card" data-dashboard-section="map">
                  <div className="v2-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div className="v2-pill">Mapas Interactivos</div>
                    <div className={`v2-data-status ${isProjectionPeriod ? 'is-projection' : 'is-real'}`} role="status" aria-live="polite">
                      <span className="v2-data-status-dot" aria-hidden="true" />
          <span><strong>{periodStatusLabel}</strong> · Último dato observado: {latestAvailablePeriod.month} de {latestAvailablePeriod.year} · estimaciones desde {MONTHS_ES[latestObservedMonthIndex + 1] || 'Enero'}</span>
                    </div>
                    <button
                      onClick={() => setShowMapHelpModal(true)}
                      style={{
                        background: 'rgba(1, 16, 36, 0.92)',
                        border: '1.5px solid #00F0FF',
                        borderRadius: '16px',
                        padding: '5px 14px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.16)';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(1, 16, 36, 0.92)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
                      }}
                    >
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        color: '#011024',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '800'
                      }}>i</span>
                      <span>¿Cómo usar el mapa?</span>
                    </button>
                    <FullscreenToggle targetSelector=".v2-map-card" />
                  </div>

                  <div className="v2-mobile-map-switch" role="group" aria-label="Nivel del mapa">
                    <button type="button" className={mapLevel === 'districts' ? 'active' : ''} aria-pressed={mapLevel === 'districts'} onClick={() => { setMapLevel('districts'); setSelectedMapFeature(null); }}>Distritos</button>
                    <button type="button" className={mapLevel === 'neighborhoods' ? 'active' : ''} aria-pressed={mapLevel === 'neighborhoods'} onClick={() => setMapLevel('neighborhoods')}>Barrios</button>
                  </div>
                  <div className="v2-dual-maps">
                    <div className="v2-map-sub" data-map-level="districts">
                      <span>Distritos · 21</span>
                      <div className="v2-map-placeholder" style={{ border: 'none' }}>
                        <MadridMap
                          key="districts-map"
                          type="districts"
                          data={mapData.districts}
                          selectedYear={Number(selectedYear)}
                          selectedMonth={selectedMonth}
                          selectedProfile={activeProfile.label}
                          selectedDistrict={selectedDistrict === 'Todos' ? null : selectedDistrict}
                          selectedBarrio={selectedBarrio === 'Todos' ? null : selectedBarrio}
                          onDistrictClick={(d) => { setSelectedDistrict(d || 'Todos'); setSelectedBarrio('Todos'); setMapLevel(d ? 'neighborhoods' : 'districts'); setSelectedMapFeature(d); }}
                        />
                      </div>
                    </div>
                    <div className="v2-map-sub" data-map-level="neighborhoods">
                      <span>Barrios · 131</span>
                      <div className="v2-map-placeholder" style={{ border: 'none' }}>
                        <MadridMap
                          key="neighborhoods-map"
                          type="neighborhoods"
                          data={mapData.neighborhoods}
                          selectedYear={Number(selectedYear)}
                          selectedMonth={selectedMonth}
                          selectedProfile={activeProfile.label}
                          selectedDistrict={selectedDistrict === 'Todos' ? null : selectedDistrict}
                          selectedBarrio={selectedBarrio === 'Todos' ? null : selectedBarrio}
                          onDistrictClick={(d) => { setSelectedDistrict(d || 'Todos'); setSelectedBarrio('Todos'); setMapLevel(d ? 'neighborhoods' : 'districts'); setSelectedMapFeature(d); }}
                          onBarrioClick={(b) => { setSelectedBarrio(b || 'Todos'); setSelectedMapFeature(b); }}
                        />
                      </div>
                    </div>
                  </div>
                  {selectedMapFeature && <div className="v2-map-bottom-sheet" role="status">
                    <div className="v2-map-sheet-heading"><strong>{selectedMapFeature}</strong><span>{mapFeatureRank ? `Puesto ${mapFeatureRank} de ${mapFeatureRows.length}` : 'Zona seleccionada'}</span></div>
                    <div className="v2-map-sheet-metrics"><span><strong>{mapFeatureItem?.precio_m2 ? `${formatNumber(Number(mapFeatureItem.precio_m2), 1)} €/m²` : '—'}</strong><small>{periodStatusLabel}</small></span><span><strong>{activeProfile.id === 'inversion' && mapFeatureItem?.rentabilidad ? `${(Number(mapFeatureItem.rentabilidad) * 100).toFixed(1)}%` : mapFeatureItem?.precio_vivienda ? `${formatNumber(Number(mapFeatureItem.precio_vivienda), 0)} ${activeProfile.id === 'alquiler' ? '€/mes' : '€'}` : '—'}</strong><small>{activeProfile.id === 'inversion' ? 'Rentabilidad' : activeProfile.id === 'alquiler' ? 'Alquiler medio' : 'Precio medio'}</small></span></div>
                    {mapFeatureDelta !== null && <span className="v2-map-sheet-delta">{mapFeatureDelta > 0 ? '+' : ''}{mapFeatureDelta.toFixed(1)}% frente a la media</span>}
                    <div className="v2-map-sheet-actions"><button type="button" onClick={() => { const level = mapFeatureIsDistrict ? 'Distritos' : 'Barrios'; const zones = level === 'Distritos' ? availableDistricts : availableBarrios; setCompareLevel(level); setSelectedZoneA(selectedMapFeature); if (selectedZoneB === selectedMapFeature) setSelectedZoneB(zones.find(zone => zone !== selectedMapFeature) || 'Todos'); setSelectedMapFeature(null); scrollToDashboardSection('compare'); }}>Ver evolución →</button><button type="button" onClick={() => { setSelectedMapFeature(null); setSelectedBarrio('Todos'); setSelectedDistrict('Todos'); setMapLevel('districts'); }}>Ver Madrid</button></div>
                    <button type="button" className="v2-map-sheet-close" aria-label="Cerrar ficha" onClick={() => setSelectedMapFeature(null)}>×</button>
                  </div>}
                  <div className="v2-map-legend" aria-label="Leyenda del mapa por precio por metro cuadrado">
                    <div className="v2-map-legend-title">Intensidad de precio · {activeProfile.id === 'inversion' ? '%' : activeProfile.id === 'venta' || activeProfile.id === 'compra' ? '€ / m²' : '€/m²'}</div>
                    <div className="v2-map-legend-scale" aria-label="Tramos de la escala de color">
                      <div className="v2-map-legend-swatches" aria-hidden="true">
                        <i className="tier-1" /><i className="tier-2" /><i className="tier-3" /><i className="tier-4" /><i className="tier-5" />
                      </div>
                    </div>
                    <div className="v2-map-legend-labels">
                      {getMapLegendLabels(activeProfile.id).map(label => <span key={label}>{label}</span>)}
                      <span className="no-data-label"><i /> Sin datos</span>
                    </div>
                    <small>Los tonos comparan las zonas del periodo seleccionado. Las áreas rayadas no tienen observación.</small>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. EXPLORACIÓN DE MERCADO (HEATMAP & RANKINGS) */}
            <div className="v2-explorer-grid">
              {/* COL 1: TITLE & TOGGLE */}
              <div className="v2-explorer-col v2-explorer-nav">
                <div className="v2-rank-title">
                  {activeProfile.id === 'venta'
                    ? 'Zonas con más demanda'
                    : activeProfile.id === 'inversion'
                      ? 'Vivienda más rentable'
                      : 'Zonas más asequibles'}
                </div>
                <div className="v2-rank-settings">
                  <div className="v2-tabs-bg small v2-level-switch v2-level-switch-full" role="group" aria-label="Nivel de zonas">
                    <span className="v2-indicator" style={{ transform: `translateX(${rankingLevel === 'Distritos' ? '0' : '100%'})`, backgroundColor: activeProfile.color }} />
                    <button type="button" aria-pressed={rankingLevel === 'Distritos'} className={`v2-tab-btn ${rankingLevel === 'Distritos' ? 'active' : ''}`} onClick={() => setRankingLevel('Distritos')}>Distritos</button>
                    <button type="button" aria-pressed={rankingLevel === 'Barrios'} className={`v2-tab-btn ${rankingLevel === 'Barrios' ? 'active' : ''}`} onClick={() => setRankingLevel('Barrios')}>Barrios</button>
                  </div>
                </div>
              </div>

              {/* COL 2: AFFORDABILITY / RENTABILITY / DEMAND RANKINGS */}
              <div className="v2-explorer-col v2-rankings-stack" data-dashboard-section="ranking" style={{ minWidth: '260px' }}>
                {activeProfile.id === 'venta' ? (
                  <div className="v2-rank-mini-card" style={{ background: '#011024', padding: '16px', borderRadius: '16px', border: '1px solid rgba(186, 204, 214, 0.16)', width: '100%' }}>
                    <div className="v2-rank-head">
                      <span>Top 10 · {rankingLevel === 'Distritos' ? 'distritos' : 'barrios'} con más demanda</span>
                    </div>
                    {selectedRankingZone && <span className="v2-highlighted-zone">{formatZoneOption(selectedRankingZone)} resaltada</span>}
                    <table className="v2-ranking-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: '#00F0FF' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '600' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>DEMANDA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.topDist : rankings.topBarr).map((item, i) => {
                          return (
                            <tr key={i} className={normalizeZoneName(item.name) === normalizeZoneName(highlightedRankingZone) ? 'is-filtered' : ''} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
                              <td style={{ padding: '8px 0', color: '#FFFFFF', fontWeight: '600' }}>
                                {i+1}. {formatMadridName(item.name)}
                              </td>
                              <td className="v2-ranking-value" style={{ padding: '8px 0', textAlign: 'right', color: '#00E5FF', fontWeight: '700' }}>
                                <i style={{ width: `${Math.max(0, Math.min(100, (Number(item.value) || 0) / rankingValueMax * 100))}%` }} /><span>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(item.value)} trans.</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : activeProfile.id !== 'inversion' ? (
                  <div className="v2-rank-mini-card" style={{ background: '#011024', padding: '16px', borderRadius: '16px', border: '1px solid rgba(186, 204, 214, 0.16)', width: '100%' }}>
                    <div className="v2-rank-head">
                      <span>Top 10 · {rankingLevel === 'Distritos' ? 'distritos' : 'barrios'} más asequibles</span>
                      <div className="v2-ranking-head-actions">
                        {activeProfile.id !== 'inversion' && <div className="v2-ranking-unit-switch" role="group" aria-label="Unidad mostrada">
                          <button type="button" className={rankingMetric === 'total' ? 'active' : ''} aria-pressed={rankingMetric === 'total'} onClick={() => setRankingMetric('total')}>{activeProfile.id === 'alquiler' ? '€/mes' : '€'}</button>
                          <button type="button" className={rankingMetric === 'unit' ? 'active' : ''} aria-pressed={rankingMetric === 'unit'} onClick={() => setRankingMetric('unit')}>€/m²</button>
                        </div>}
                      </div>
                    </div>
                    {selectedRankingZone && <span className="v2-highlighted-zone">{formatZoneOption(selectedRankingZone)} resaltada</span>}
                    <table className="v2-ranking-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: '#00F0FF' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '600' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>{activeProfile.id === 'alquiler' ? (rankingMetric === 'total' ? 'ALQUILER €/MES' : 'ALQUILER €/M²') : (rankingMetric === 'total' ? 'PRECIO €' : 'PRECIO €/M²')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.botDist : rankings.botBarr).map((item, i) => {
                          const price = item.value || 0;

                          return (
                            <tr key={i} className={normalizeZoneName(item.name) === normalizeZoneName(highlightedRankingZone) ? 'is-filtered' : ''} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
                              <td style={{ padding: '8px 0', color: '#FFFFFF', fontWeight: '600' }}>
                                {i+1}. {formatMadridName(item.name)}
                              </td>
                              <td className="v2-ranking-value" style={{ padding: '8px 0', textAlign: 'right', color: '#00F0FF', fontWeight: '700' }}>
                                <i style={{ width: `${Math.max(0, Math.min(100, price / rankingValueMax * 100))}%` }} /><span>{rankingMetric === 'unit' ? `${formatNumber(price, 0)} €/m²` : activeProfile.id === 'alquiler' ? `${formatEuro(price)}/mes` : formatEuro(price)}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="v2-rank-mini-card" style={{ background: '#011024', padding: '16px', borderRadius: '16px', border: '1px solid rgba(186, 204, 214, 0.16)', width: '100%' }}>
                    <div className="v2-rank-head">
                      <span>Top 10 · amortización por {rankingLevel === 'Distritos' ? 'distrito' : 'barrio'}</span>
                    </div>
                    {selectedRankingZone && <span className="v2-highlighted-zone">{formatZoneOption(selectedRankingZone)} resaltada</span>}
                    <table className="v2-ranking-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.2)', textAlign: 'left', color: '#00F0FF' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '600' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>AÑOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.topDist : rankings.topBarr).map((item, i) => {
                          const yearsVal = item.value > 0 ? (1 / item.value).toFixed(1) + ' años' : '-';
                          return (
                            <tr key={i} className={normalizeZoneName(item.name) === normalizeZoneName(highlightedRankingZone) ? 'is-filtered' : ''} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
                              <td style={{ padding: '8px 0', color: '#FFFFFF', fontWeight: '600' }}>
                                {i+1}. {formatMadridName(item.name)}
                              </td>
                              <td className="v2-ranking-value" style={{ padding: '8px 0', textAlign: 'right', color: '#00F0FF', fontWeight: '700' }}>
                                <i style={{ width: `${Math.max(0, Math.min(100, (Number(item.value) || 0) / rankingValueMax * 100))}%` }} /><span>{yearsVal}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* COL 3: HEATMAP */}
              <div className="v2-explorer-col v2-heatmap-area" data-dashboard-section="heatmap">
                <div className="v2-heatmap-card">
                  <div className="v2-heatmap-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span>{activeProfile.id === 'inversion' ? 'Evolución mensual de rentabilidad (%)' : activeProfile.id === 'alquiler' ? 'Evolución mensual del alquiler (€/m²)' : 'Evolución mensual de venta (€/m²)'}</span>
                    <FullscreenToggle targetSelector=".v2-heatmap-card" />
                    <button
                      onClick={() => setShowHeatmapHelpModal(true)}
                      style={{
                        background: 'rgba(1, 16, 36, 0.92)',
                        border: '1.5px solid #00F0FF',
                        borderRadius: '20px',
                        padding: '5px 14px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
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
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '15px',
                        height: '15px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        color: '#011024',
                        fontSize: '10px',
                        fontWeight: '900',
                        fontFamily: 'sans-serif'
                      }}>i</span>
                      <span style={{ color: '#FFFFFF', fontWeight: '700' }}>¿Cómo usar el mapa de calor?</span>
                    </button>
                  </div>
                  {Number(selectedYear) === 2026 && (
                    <div style={{ fontSize: '12px', color: '#dbe9f2', marginBottom: '12px', paddingLeft: '4px' }}>
                      * Nota: los datos reales llegan hasta <strong>{latestRealMonth} de {latestRealYear}</strong>; desde <strong>{firstProjectionMonth}</strong> son <strong>estimaciones</strong>. {activeProfile.id === 'inversion' ? 'El color más brillante indica mayor rentabilidad.' : 'El color más brillante indica un valor €/m² más alto.'}
                    </div>
                  )}
                  {Number(selectedYear) > 2026 && (
                    <div style={{ fontSize: '12px', color: '#dbe9f2', marginBottom: '12px', paddingLeft: '4px' }}>
                      * Nota: Los meses de {selectedYear} se muestran como <strong>estimaciones</strong> basadas en datos históricos. {activeProfile.id === 'inversion' ? 'El color más brillante indica mayor rentabilidad.' : 'El color más brillante indica un valor €/m² más alto.'}
                    </div>
                  )}
                  <input className="v2-heatmap-search" type="search" value={heatmapSearch} onChange={event => { setHeatmapSearch(event.target.value); setHeatmapVisibleCount(15); }} placeholder={`Buscar ${rankingLevel === 'Distritos' ? 'distrito' : 'barrio'}…`} aria-label={`Buscar ${rankingLevel === 'Distritos' ? 'distrito' : 'barrio'} en el mapa de calor`} />
                  <div className="v2-heatmap-scroll">
                    <table className="v2-heatmap-table">
                      <thead>
                        <tr>
                          <th>{rankingLevel === 'Distritos' ? 'Distrito' : 'Barrio'}</th>
                          {MONTHS_ES.map((month) => <th key={month}>{month.slice(0, 3)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHeatmapRows.length > 0 ? (
                          filteredHeatmapRows.map((row, idx) => {
                            let cellColor = '#00DDF0';
                            if (activeProfile.id === 'venta' || activeProfile.id === 'compra') cellColor = '#FF8B6A';

                            return (
                              <tr key={idx} className={idx >= heatmapVisibleCount ? 'v2-heatmap-extra-row' : undefined}>
                                <td className="zona-name">{row.zona}</td>
                                {[...Array(12)].map((_, i) => {
                                  const val = row[`m${i+1}`];
                                  const opacity = val > 0 ? 0.22 + ((val - heatmapMin) / (heatmapMax - heatmapMin || 1)) * 0.78 : 0;
                                  const bgColor = val > 0 ? colorWithAlpha(cellColor, opacity) : 'transparent';
                                  const textColor = opacity > 0.65 ? 'var(--blanco-humo)' : 'var(--azul-noche)';
                                  return (
                                    <td key={i+1} style={{ backgroundColor: bgColor, color: textColor }}>
                                      {val > 0
                                        ? activeProfile.id === 'inversion'
                                          ? formatNumber(val * 100, 1)
                                          : formatNumber(val, 1)
                                        : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })

                        ) : (
                          <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-linea)' }}>No hay datos disponibles para el año {selectedYear}</td></tr>
                        )}
                      </tbody>
                    </table>
                    {filteredHeatmapRows.length > heatmapVisibleCount && <button className="v2-heatmap-more" type="button" onClick={() => setHeatmapVisibleCount(count => count + 15)}>Mostrar 15 más</button>}
                  </div>
                </div>
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
                      <div className="v2-tabs-bg small">
                        <span className="v2-indicator" style={{ transform: `translateX(${liquidityLevel === 'distrito' ? '0' : '100%'})`, width: '80px' }} />
                        <button className={`v2-tab-btn ${liquidityLevel === 'distrito' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setLiquidityLevel('distrito')}>Distritos</button>
                        <button className={`v2-tab-btn ${liquidityLevel === 'barrio' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setLiquidityLevel('barrio')}>Barrios</button>
                      </div>
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
                            <th style={{ paddingBottom: '8px', fontWeight: '600', textAlign: 'right' }}>ACTIVIDAD OBSERVADA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(liquidityData) && liquidityData.length > 0 ? (
                            liquidityData.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(186, 204, 214, 0.12)' }}>
                                <td style={{ padding: '12px 0', color: '#FFFFFF', fontWeight: '600' }}>
                                  {idx + 1}. {formatMadridName(item.name)}
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'center', color: '#00F0FF', fontWeight: '700' }}>
                                  {item.transactions}
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                  {renderLightningBolts(item.stars, getActivityLabel(item.speed), item.color)}
                                </td>
                              </tr>
                            ))
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

                  {/* COLUMNA DERECHA: IMPACTO DE TIPOS DE INTERES */}
                  <div className="v2-connectivity-selectors" style={{ borderLeft: '1px solid rgba(186, 204, 214, 0.16)', paddingLeft: '40px', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                        Impacto de Tipos de Interés (Euríbor Trend)
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#BACCD6' }}>
                        Relación entre Euríbor y Precio m² de compraventa
                      </span>
                    </div>

                    {/* Contenedor del gráfico ChartJS */}
                    <div style={{ position: 'relative', height: '240px', width: '100%', marginBottom: '16px' }}>
                      <canvas id="v2-chart-euribor"></canvas>
                    </div>

                    {/* Scatter de riesgo y retorno */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(186, 204, 214, 0.16)' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                        Riesgo y retorno por zona
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--azul-linea)', marginBottom: '8px' }}>
                        Cada punto es una zona: índice de riesgo histórico frente a rentabilidad bruta observada.
                      </span>
                      <div style={{ position: 'relative', height: '240px', width: '100%' }}>
                        <canvas id="v2-chart-risk-return"></canvas>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

             {/* COMPARATIVAS SECTION */}
            <section className="v2-compare-section" data-dashboard-section="compare">
              <div className="v2-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="v2-compare-title-block">
                    <h2 style={{ margin: 0 }}>Comparar zonas</h2>
                    <span>Elige dos zonas y mira cómo se diferencian</span>
                  </div>
                </div>
                <div className="v2-tabs-container" style={{ flex: 'none' }}>
                  <div className="v2-tabs-bg v2-level-switch" role="group" aria-label="Nivel de comparación">
                    <span className="v2-indicator" style={{ transform: `translateX(${compareLevel === 'Distritos' ? '0' : '100%'})`, backgroundColor: activeProfile.color }} />
                    <button type="button" aria-pressed={compareLevel === 'Distritos'} className={`v2-tab-btn ${compareLevel === 'Distritos' ? 'active' : ''}`} onClick={() => handleLevelToggle('Distritos')}>Distritos</button>
                    <button type="button" aria-pressed={compareLevel === 'Barrios'} className={`v2-tab-btn ${compareLevel === 'Barrios' ? 'active' : ''}`} onClick={() => handleLevelToggle('Barrios')}>Barrios</button>
                  </div>
                </div>
              </div>

              <div className="v2-compare-zone-selectors v2-compare-selectors-sticky">
                <div className={`v2-dropdown-container v2-compare-zone-select ${activeDropdown === 'zoneA' ? 'v2-z-up' : ''}`}>
                  <span className="v2-filter-label zone-a-label"><i /> ZONA A</span>
                  <button type="button" className="v2-custom-select" aria-haspopup="dialog" aria-expanded={compareZoneSheet === 'A'} onClick={() => { setCompareZoneSearch(''); setCompareZoneSheet('A'); }}>
                    <span>{formatZoneOption(selectedZoneA)}</span>
                    <ChevronDown size={14} className="v2-select-chevron" />
                  </button>
                  {activeDropdown === 'zoneA' && (
                    <div className="v2-dropdown-menu" role="listbox" aria-label="Seleccionar Zona A">
                      {(compareLevel === 'Distritos' ? availableDistricts : availableBarrios).map(z => (
                        <button type="button" key={z} className="v2-dropdown-item" role="option" aria-selected={selectedZoneA === z} onClick={() => { setSelectedZoneA(z); setActiveDropdown(null); }}>{formatZoneOption(z)}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="v2-compare-swap" aria-label="Intercambiar zonas A y B" title="Intercambiar zonas" onClick={() => { setSelectedZoneA(selectedZoneB); setSelectedZoneB(selectedZoneA); }}><span>⇄</span></button>
                <div className={`v2-dropdown-container v2-compare-zone-select ${activeDropdown === 'zoneB' ? 'v2-z-up' : ''}`}>
                  <span className="v2-filter-label zone-b-label"><i /> ZONA B</span>
                  <button type="button" className="v2-custom-select" aria-haspopup="dialog" aria-expanded={compareZoneSheet === 'B'} onClick={() => { setCompareZoneSearch(''); setCompareZoneSheet('B'); }}>
                    <span>{formatZoneOption(selectedZoneB)}</span>
                    <ChevronDown size={14} className="v2-select-chevron" />
                  </button>
                  {activeDropdown === 'zoneB' && (
                    <div className="v2-dropdown-menu" role="listbox" aria-label="Seleccionar Zona B">
                      {(compareLevel === 'Distritos' ? availableDistricts : availableBarrios).map(z => (
                        <button type="button" key={z} className="v2-dropdown-item" role="option" aria-selected={selectedZoneB === z} onClick={() => { setSelectedZoneB(z); setActiveDropdown(null); }}>{formatZoneOption(z)}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="v2-compare-viewport" data-compare-view={compareDisplay}>
                <div className="v2-compare-map-panel">
                  <div className="v2-compare-map-heading">Selecciona zonas en el mapa</div>
                  <div className="v2-compare-map-target" role="group" aria-label="Zona que se asignará al tocar el mapa">
                    <button type="button" className={compareMapTarget === 'A' ? 'active zone-a' : 'zone-a'} onClick={() => setCompareMapTarget('A')}>A · {formatZoneOption(selectedZoneA)}</button>
                    <button type="button" className={compareMapTarget === 'B' ? 'active zone-b' : 'zone-b'} onClick={() => setCompareMapTarget('B')}>B · {formatZoneOption(selectedZoneB)}</button>
                  </div>
                  <div className="v2-compare-map-canvas">
                    <MadridMap
                      type={compareLevel === 'Distritos' ? 'districts' : 'neighborhoods'}
                      data={compareLevel === 'Distritos' ? mapData.districts : mapData.neighborhoods}
                      selectedYear={Number(selectedYear)} selectedMonth={selectedMonth} selectedProfile={activeProfile.label}
                      selectedDistrict={null} selectedBarrio={null}
                      compareZoneA={selectedZoneA} compareZoneB={selectedZoneB}
                      onDistrictClick={(zone) => {
                        if (!zone) return;
                        if (compareMapTarget === 'A') { setSelectedZoneA(zone); setCompareMapTarget('B'); }
                        else setSelectedZoneB(zone);
                      }}
                      onBarrioClick={(zone) => {
                        if (!zone) return;
                        if (compareMapTarget === 'A') { setSelectedZoneA(zone); setCompareMapTarget('B'); }
                        else setSelectedZoneB(zone);
                      }}
                    />
                  </div>
                </div>
                <div className="v2-compare-view-tabs" role="tablist" aria-label="Vista de la comparación">
                  {(['overlay', 'A', 'B'] as const).map(view => <button key={view} type="button" role="tab" aria-selected={compareDisplay === view} className={compareDisplay === view ? 'active' : ''} onClick={() => setCompareDisplay(view)}>{view === 'overlay' ? 'Superpuesto' : `Zona ${view}`}</button>)}
                </div>
                <div className="v2-compare-grid">
                  {/* ZONA A (IZQ) */}
                  <div className="v2-comp-col zone-a">
                    <div className="v2-chart-card">
                      <div className="v2-chart-head">
                        Evolución {getComparisonMetric(p.id).label} ({p.label}) - {selectedZoneA}
                      </div>
                      <div className="v2-chart-wrap"><ChartZoomControls chartId={`v2-chartA-${p.id}`} /><canvas id={`v2-chartA-${p.id}`}></canvas></div>
                    </div>
                    {(() => {
                      if (p.id === 'inversion') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('roi_neto', selectedZoneA)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad ? (kpiDataA.rentabilidad * 100 * 0.85).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                RENTABILIDAD NETA {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('grm', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad > 0 ? (1 / kpiDataA.rentabilidad).toFixed(1) + ' años' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                GRM {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('volatilidad', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {volatilityZoneA || 'N/A'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VOLATILIDAD {selectedZoneA.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'alquiler') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_alquiler', selectedZoneA)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiDataA.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('roi_alquiler', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad ? (kpiDataA.rentabilidad * 100).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                RENTABILIDAD BRUTA {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('esfuerzo', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.esfuerzo_compra ? kpiDataA.esfuerzo_compra.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ESFUERZO % {selectedZoneA.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'compra') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_compra', selectedZoneA)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(kpiDataA.precio_m2)) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('poder_adquisitivo', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.renta_media ? new Intl.NumberFormat('es-ES').format(Math.round(kpiDataA.renta_media)) + ' €' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PODER ADQUISITIVO {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('variacion_anual', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.variacion_anual !== undefined ? (kpiDataA.variacion_anual > 0 ? '+' : '') + kpiDataA.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'venta') {
                        const velocityA_num = kpiDataA.transacciones ? Math.max(1.0, 933.8 / kpiDataA.transacciones) : 0;
                        let velocityA_label = '';
                        if (velocityA_num > 0) {
                          if (velocityA_num < 2.0) velocityA_label = ' (Rápido)';
                          else if (velocityA_num < 3.0) velocityA_label = ' (Moderado)';
                          else velocityA_label = ' (Lento)';
                        }
                        const velocityA_formatted = velocityA_num > 0 ? (velocityA_num % 1 === 0 ? velocityA_num.toFixed(0) : velocityA_num.toFixed(1)) : '';
                        const velocityA_suffix = velocityA_num === 1 ? ' mes' : ' meses';
                        const velocityA_text = velocityA_num > 0 ? `${velocityA_formatted}${velocityA_suffix}${velocityA_label}` : '-';
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_venta', selectedZoneA)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(kpiDataA.precio_m2)) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('velocidad_venta', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {velocityA_text}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VELOCIDAD DE VENTA {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}`, position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('variacion_anual', selectedZoneA)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.variacion_anual !== undefined ? (kpiDataA.variacion_anual > 0 ? '+' : '') + kpiDataA.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return null;
                      }
                    })()}
                  </div>

                  {/* ZONA B (DER) */}
                  <div className="v2-comp-col zone-b">
                    <div className="v2-chart-card">
                      <div className="v2-chart-head">
                        Evolución {getComparisonMetric(p.id).label} ({p.label}) - {selectedZoneB}
                      </div>
                      <div className="v2-chart-wrap"><ChartZoomControls chartId={`v2-chartB-${p.id}`} /><canvas id={`v2-chartB-${p.id}`}></canvas></div>
                    </div>
                    {(() => {
                      if (p.id === 'inversion') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('roi_neto', selectedZoneB)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad ? (kpiDataB.rentabilidad * 100 * 0.85).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                RENTABILIDAD NETA {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('grm', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad > 0 ? (1 / kpiDataB.rentabilidad).toFixed(1) + ' años' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                GRM {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('volatilidad', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {volatilityZoneB || 'N/A'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VOLATILIDAD {selectedZoneB.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'alquiler') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_alquiler', selectedZoneB)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiDataB.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('roi_alquiler', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad ? (kpiDataB.rentabilidad * 100).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                RENTABILIDAD BRUTA {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('esfuerzo', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.esfuerzo_compra ? kpiDataB.esfuerzo_compra.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ESFUERZO % {selectedZoneB.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'compra') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_compra', selectedZoneB)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(kpiDataB.precio_m2)) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('poder_adquisitivo', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.renta_media ? new Intl.NumberFormat('es-ES').format(Math.round(kpiDataB.renta_media)) + ' €' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PODER ADQUISITIVO {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('variacion_anual', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.variacion_anual !== undefined ? (kpiDataB.variacion_anual > 0 ? '+' : '') + kpiDataB.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (p.id === 'venta') {
                        const velocityB_num = kpiDataB.transacciones ? Math.max(1.0, 933.8 / kpiDataB.transacciones) : 0;
                        let velocityB_label = '';
                        if (velocityB_num > 0) {
                          if (velocityB_num < 2.0) velocityB_label = ' (Rápido)';
                          else if (velocityB_num < 3.0) velocityB_label = ' (Moderado)';
                          else velocityB_label = ' (Lento)';
                        }
                        const velocityB_formatted = velocityB_num > 0 ? (velocityB_num % 1 === 0 ? velocityB_num.toFixed(0) : velocityB_num.toFixed(1)) : '';
                        const velocityB_suffix = velocityB_num === 1 ? ' mes' : ' meses';
                        const velocityB_text = velocityB_num > 0 ? `${velocityB_formatted}${velocityB_suffix}${velocityB_label}` : '-';
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('precio_m2_venta', selectedZoneB)}
                                  align="left"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(kpiDataB.precio_m2)) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('velocidad_venta', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {velocityB_text}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VELOCIDAD DE VENTA {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid var(--azul-noche)', position: 'relative', overflow: 'visible' }}>
                              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                <InfoTooltip
                                  {...getComparisonKpiInfo('variacion_anual', selectedZoneB)}
                                  align="right"
                                />
                              </div>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.variacion_anual !== undefined ? (kpiDataB.variacion_anual > 0 ? '+' : '') + kpiDataB.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Estimación</span>}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return null;
                      }
                    })()}
                  </div>
                </div>

                <div className="v2-overlay-wrapper">
                  <div className="v2-overlay-header">
                    <span>Comparativa · A {formatZoneOption(selectedZoneA)} · B {formatZoneOption(selectedZoneB)}</span>
                    <div className="v2-compare-legend" aria-label="Leyenda del gráfico">
                      <span><i className="zone-a" />A</span><span><i className="zone-b" />B</span><span><i className="real" />Real</span><span><i className="estimated" />Est.</span><span><i className="madrid" />Media</span>
                    </div>
                  </div>
                  <div className="v2-overlay-body">
                    <div className="v2-chart-wrap large">
                      <ChartZoomControls chartId={`v2-overlay-${p.id}`} />
                      <canvas id={`v2-overlay-${p.id}`}></canvas>
                    </div>
                    {p.id === 'alquiler' && (() => {
                      const priceA = Number(kpiDataA.precio_m2) || 0;
                      const priceB = Number(kpiDataB.precio_m2) || 0;
                      const yieldA = Number(kpiDataA.rentabilidad) || 0;
                      const yieldB = Number(kpiDataB.rentabilidad) || 0;
                      const effortA = Number(kpiDataA.esfuerzo_compra) || 0;
                      const effortB = Number(kpiDataB.esfuerzo_compra) || 0;
                      const percentDifference = (a: number, b: number) => b ? `${a > b ? '+' : ''}${((a - b) / b * 100).toFixed(1)}%` : '—';
                      const pointDifference = (a: number, b: number) => `${a > b ? '+' : ''}${((a - b) * 100).toFixed(1)} pt`;
                      const rows = [
                        { label: 'Precio m²', a: priceA ? `${formatNumber(priceA, 2)} €/m²` : '—', b: priceB ? `${formatNumber(priceB, 2)} €/m²` : '—', diff: percentDifference(priceA, priceB), aWins: priceA <= priceB },
                        { label: 'Rentabilidad', a: yieldA ? `${(yieldA * 100).toFixed(2)}%` : '—', b: yieldB ? `${(yieldB * 100).toFixed(2)}%` : '—', diff: pointDifference(yieldA, yieldB), aWins: yieldA >= yieldB },
                        { label: 'Esfuerzo', a: effortA ? `${effortA.toFixed(1)}%` : '—', b: effortB ? `${effortB.toFixed(1)}%` : '—', diff: pointDifference(effortA, effortB), aWins: effortA <= effortB },
                      ];
                      const pricePct = priceB ? Math.abs((priceA - priceB) / priceB * 100).toFixed(1) : null;
                      const cheaper = priceA <= priceB ? selectedZoneA : selectedZoneB;
                      const lessEffort = effortA <= effortB ? selectedZoneA : selectedZoneB;
                      return <div className="v2-compare-summary">
                        <table className="v2-compare-diff-table"><thead><tr><th>Métrica</th><th>{formatZoneOption(selectedZoneA)}</th><th>{formatZoneOption(selectedZoneB)}</th><th>Dif.</th></tr></thead>
                          <tbody>{rows.map(row => <tr key={row.label}><th>{row.label}</th><td className={row.aWins ? 'winner' : ''}>{row.a}</td><td className={!row.aWins ? 'winner' : ''}>{row.b}</td><td>{row.diff}</td></tr>)}</tbody>
                        </table>
                        {pricePct && <p>{cheaper} tiene el alquiler un {pricePct}% más bajo; {lessEffort} exige menos esfuerzo sobre la renta media.</p>}
                      </div>;
                    })()}
                  </div>
                </div>
              </div>
              {compareZoneSheet && <div className="v2-zone-picker-backdrop" role="presentation" onClick={() => window.history.back()}>
                <div className="v2-zone-picker-sheet" role="dialog" aria-modal="true" aria-label={`Seleccionar zona ${compareZoneSheet}`} onClick={event => event.stopPropagation()}>
                  <div className="v2-zone-picker-head"><div><strong>Seleccionar zona {compareZoneSheet}</strong><span>Busca por distrito o barrio</span></div><button type="button" aria-label="Cerrar" onClick={() => window.history.back()}>×</button></div>
                  <input autoFocus value={compareZoneSearch} onChange={event => setCompareZoneSearch(event.target.value)} placeholder="Buscar zona…" aria-label="Buscar zona" />
                  <div className="v2-zone-picker-options" role="listbox">
                    {(compareLevel === 'Distritos' ? availableDistricts : availableBarrios)
                      .filter(zone => zone !== 'Todos' && formatZoneOption(zone).toLocaleLowerCase('es').includes(compareZoneSearch.toLocaleLowerCase('es')))
                      .map(zone => <button type="button" role="option" aria-selected={zone === (compareZoneSheet === 'A' ? selectedZoneA : selectedZoneB)} key={zone} onClick={() => {
                        if (compareZoneSheet === 'A') setSelectedZoneA(zone); else setSelectedZoneB(zone);
                        window.history.back();
                      }}>{formatZoneOption(zone)}</button>)}
                  </div>
                </div>
              </div>}
            </section>            </div>
        ))}
      </main>

      {/* MODAL EXPLICATIVO: ¿CÓMO ENTENDER ESTOS PRECIOS? (LENGUAJE SENCILLO PARA EL CIUDADANO) */}
      {showHelpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'color-mix(in srgb, var(--azul-noche) 45%, transparent)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="v2-guide-modal"
            style={{
              backgroundColor: 'var(--blanco-humo)',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--azul-noche) 15%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--azul-noche) 8%, transparent)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--azul-noche)' }}>
                  ¿Cómo entender estos precios?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--azul-linea)' }}>
                  Guía rápida para interpretar las cifras sin rodeos matemáticos.
                </p>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{
                  background: 'var(--blanco-humo)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--azul-linea)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--humo-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--blanco-humo)')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Bloque 1: Real */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Datos reales hasta {latestRealMonth} de {latestRealYear}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Son precios observados extraídos del Banco de Datos del Ayuntamiento de Madrid. La etiqueta <strong style={{ color: 'var(--precio-subida)' }}>✓ DATO REAL</strong> identifica un registro histórico; las estimaciones del modelo se muestran separadas.
                  </div>
                </div>
              </div>

              {/* Bloque 2: Futuro */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--azul-linea)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Proyecciones desde {firstProjectionMonth}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Nuestros modelos estadísticos y predictivos analizan el histórico de más de 10.000 operaciones y viviendas, los tipos de interés y la demanda de cada barrio para proyectar qué precio cabe esperar en los próximos meses y años.
                  </div>
                </div>
              </div>

              {/* Bloque 3: Semáforo de Zonas */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--coral)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '4px' }}>
                    Semáforo de Fiabilidad por Zonas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.4 }}>
                    <div>
                      <strong style={{ color: 'var(--azul-linea)' }}>Zonas Muy Estables</strong> (ej. Retiro, Salamanca, Chamberí): Precios firmes y continuos. La estimación del modelo presenta una tendencia estable.
                    </div>
                    <div>
                      <strong style={{ color: 'var(--coral-texto)' }}>Zonas Rápidas o en Auge</strong> (ej. Centro, Usera, Moncloa, Villaverde): Barrios con gran rotación turística o familias mudándose desde el centro. Los precios reales se mueven con mayor dinamismo.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--precio-subida)',
                color: 'var(--blanco-humo)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR EL MAPA? */}
      {showMapHelpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'color-mix(in srgb, var(--azul-noche) 45%, transparent)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowMapHelpModal(false)}
        >
          <div
            className="v2-guide-modal"
            style={{
              backgroundColor: 'var(--blanco-humo)',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--azul-noche) 15%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--azul-noche) 8%, transparent)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--azul-noche)' }}>
                  ¿Cómo usar los mapas interactivos?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--azul-linea)' }}>
                  Guía para explorar distritos y barrios de Madrid sin perderte.
                </p>
              </div>
              <button
                onClick={() => setShowMapHelpModal(false)}
                style={{
                  background: 'var(--blanco-humo)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--azul-linea)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--humo-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--blanco-humo)')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Paso 1: Colores */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Escala de Colores
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Los <strong>tonos más brillantes y cian</strong> representan valores más altos según la métrica activa. Los <strong>tonos oscuros</strong> representan valores más bajos; el patrón rayado identifica zonas sin dato.
                  </div>
                </div>
              </div>

              {/* Paso 2: Clic para profundizar */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Haz clic en un distrito para ver sus barrios
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Al pulsar sobre cualquier distrito en el mapa izquierdo, la cámara enfoca automáticamente y el mapa de la derecha te muestra todos sus barrios al detalle. Si haces clic de nuevo sobre el mismo distrito, vuelves a la vista general de Madrid.
                  </div>
                </div>
              </div>

              {/* Paso 3: Pasar el cursor */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Precios al pasar el cursor
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Apoya el puntero o pulsa cualquier barrio o distrito para ver su precio por m², el coste estimado de una vivienda, su ranking y si es un dato real o una estimación.
                  </div>
                </div>
              </div>

              {/* Paso 4: Mapa Fijo */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Mapa Estático y Estable
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    El mapa está fijado para que puedas hacer scroll por la página con total tranquilidad sin riesgo de desplazar o perder de vista Madrid por accidente.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowMapHelpModal(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--precio-subida)',
                color: 'var(--blanco-humo)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR EL MAPA DE CALOR? */}
      {showHeatmapHelpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'color-mix(in srgb, var(--azul-noche) 45%, transparent)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowHeatmapHelpModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--blanco-humo)',
              borderRadius: '24px',
              maxWidth: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--azul-noche) 15%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--azul-noche) 8%, transparent)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--azul-noche)' }}>
                  ¿Cómo usar el mapa de calor?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--azul-linea)' }}>
                  Guía para interpretar la estacionalidad y los precios mes a mes.
                </p>
              </div>
              <button
                onClick={() => setShowHeatmapHelpModal(false)}
                style={{
                  background: 'var(--blanco-humo)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--azul-linea)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--humo-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--blanco-humo)')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Paso 1: Estructura */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Filas y Columnas Mensuales
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Cada fila de la matriz corresponde a un distrito o barrio de Madrid (puedes alternar la vista entre Distritos y Barrios con los botones de la parte superior del explorador). Las columnas numeradas del <strong>1 al 12</strong> representan los doce meses del año seleccionado, desde enero hasta diciembre.
                  </div>
                </div>
              </div>

              {/* Paso 2: Escala de Color */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Intensidad del Color
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Cuanto más <strong>brillante y cian</strong> es el fondo de la casilla, mayor es el valor (precio por m² más alto o rentabilidad más elevada). Los <strong>tonos oscuros</strong> señalan los meses o zonas más asequibles o con menor presión de precios.
                  </div>
                </div>
              </div>

              {/* Paso 3: Datos Oficiales vs Previsiones */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Datos Reales y Estimaciones
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    {Number(selectedYear) === latestRealYear ? (
                      <>En <strong>{latestRealYear}</strong>, los datos observados llegan hasta <strong>{latestRealMonth}</strong>. Desde <strong>{firstProjectionMonth}</strong>, los valores se muestran como <strong>estimaciones</strong> calculadas mediante modelos predictivos. La fecha de última carga se indica arriba y no equivale a la fecha del último dato observado.</>
                    ) : (
                      <>Para <strong>{selectedYear}</strong>, los meses sin observación histórica se muestran como <strong>estimaciones</strong> calculadas mediante modelos predictivos. Los datos observados llegan hasta <strong>{latestRealMonth} de {latestRealYear}</strong>.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Paso 4: Estacionalidad */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: 'var(--blanco-humo)', borderRadius: '16px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-noche)', marginBottom: '2px' }}>
                    Detectar Estacionalidad
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.45 }}>
                    Al observar una fila de izquierda a derecha puedes ver si una zona se encarece en primavera o después de verano (ej. inicio de curso universitario o mayor demanda de alquiler), lo que te ayuda a planificar compras o contrataciones en los meses más ventajosos.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHeatmapHelpModal(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--precio-subida)',
                color: 'var(--blanco-humo)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ¿CÓMO USAR LA COMPARACIÓN DE ZONAS? */}
      {showCompareHelpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'color-mix(in srgb, var(--azul-noche) 45%, transparent)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowCompareHelpModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--blanco-humo)',
              borderRadius: '24px',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--azul-noche) 15%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--azul-noche) 8%, transparent)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--azul-noche)' }}>
                  ¿Cómo usar la comparación de zonas?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--azul-linea)' }}>
                  Aprende a contrastar dos áreas y a interpretar sus tendencias paso a paso.
                </p>
              </div>
              <button
                onClick={() => setShowCompareHelpModal(false)}
                style={{
                  background: 'var(--blanco-humo)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--azul-linea)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--humo-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--blanco-humo)')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Sección: Modos de uso */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--precio-subida)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Modos de Uso y Navegación
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--blanco-humo)', borderRadius: '14px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      A
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-noche)' }}>
                        Selección por Distritos o Barrios
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.4, marginTop: '2px' }}>
                        Usa los botones superiores para elegir si deseas comparar a nivel de <strong>Distritos</strong> o de <strong>Barrios</strong>. En los desplegables de <strong>Zona A</strong> y <strong>Zona B</strong> puedes elegir libremente cualquier par de zonas de Madrid.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--blanco-humo)', borderRadius: '14px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      B
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-noche)' }}>
                        Comparativa Individual (Lado a Lado)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.4, marginTop: '2px' }}>
                        Muestra la curva histórica independiente de cada zona junto con sus tarjetas de resumen. <strong>Pasa el cursor sobre cualquier punto</strong> de la gráfica para ver el precio exacto, la variación porcentual frente al mes anterior y la comparación directa con la media de todo Madrid. Además, cada tarjeta de métrica cuenta con su propio botón <strong>(i)</strong> para consultar su explicación detallada.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'var(--blanco-humo)', borderRadius: '14px', border: '0.5px solid color-mix(in srgb, var(--azul-noche) 4%, transparent)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--precio-subida)', color: 'var(--blanco-humo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                      C
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-noche)' }}>
                        Comparativa Superpuesta (Gráfico Conjunto)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--azul-linea)', lineHeight: 1.4, marginTop: '2px' }}>
                        Al abrir la sección <em>&ldquo;Ver comparativa superpuesta&rdquo;</em>, ambas zonas se cruzan en un único gráfico bajo la misma escala junto a la media de Madrid. Te permite verificar inmediatamente cuál es más cara, cuál crece más deprisa y si hay cruces de tendencia a lo largo del año.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <button
              onClick={() => setShowCompareHelpModal(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--precio-subida)',
                color: 'var(--blanco-humo)',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--precio-subida)')}
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
};

export default MadridDashboardV2;
