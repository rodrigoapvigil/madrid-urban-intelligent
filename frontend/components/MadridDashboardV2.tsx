'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChartJS from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './MadridDashboardV2.css';

ChartJS.register(ChartDataLabels);

const MadridMap = dynamic(() => import('./MadridMap'), { ssr: false });

const PROFILES = [
  { id: 'alquiler', label: 'Alquiler', color: '#005187', op: 'alquiler' },
  { id: 'compra', label: 'Compra', color: '#009d71', op: 'venta' },
  { id: 'venta', label: 'Venta', color: '#ff9f0a', op: 'venta' },
  { id: 'inversion', label: 'Inversión', color: '#af52de', op: 'inversion' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

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
      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" style={{ color: '#ff9f0a', marginRight: '2px' }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    );
  }
  
  let badgeColorClass = 'green';
  if (color === 'orange') badgeColorClass = 'orange';
  if (color === 'red') badgeColorClass = 'red';
  if (color === 'green-light') badgeColorClass = 'green'; // map green-light to green style badge

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{bolts}</div>
      <span className={`v2-connectivity-badge ${badgeColorClass}`} style={{ minWidth: '76px', fontSize: '11px', padding: '3px 8px' }}>
        {speed}
      </span>
    </div>
  );
};

const getZoneReliability = (district: string, isPrediction: boolean) => {
  if (!isPrediction) {
    return {
      type: 'real',
      tag: 'DATO OFICIAL',
      title: 'Dato Real Oficial',
      titleColor: '#0071e3',
      borderColor: 'rgba(0, 113, 227, 0.25)',
      bg: 'rgba(0, 113, 227, 0.06)',
      icon: '',
      description: 'Precio oficial registrado y certificado por el Banco de Datos del Ayuntamiento de Madrid.'
    };
  }
  
  const d = (district || '').toLowerCase();
  if (d.includes('centro') || d.includes('moncloa')) {
    return {
      type: 'hot',
      tag: 'PRECIOS RÁPIDOS',
      title: 'Zona de Alta Demanda (Precios Rápidos)',
      titleColor: '#b25e00',
      borderColor: 'rgba(255, 159, 10, 0.35)',
      bg: 'rgba(255, 159, 10, 0.08)',
      icon: '',
      description: 'Mucha rotación y estudiantes. Los precios se mueven rápido y pueden fluctuar más de lo habitual.'
    };
  }
  if (d.includes('usera') || d.includes('villaverde') || d.includes('carabanchel')) {
    return {
      type: 'growth',
      tag: 'EN AUGE',
      title: 'Zona en Auge (Fuerte Demanda)',
      titleColor: '#b25e00',
      borderColor: 'rgba(255, 159, 10, 0.35)',
      bg: 'rgba(255, 159, 10, 0.08)',
      icon: '',
      description: 'Desplazamiento de demanda hacia zonas con precios más accesibles, empujando la tendencia al alza.'
    };
  }
  if (d.includes('salamanca') || d.includes('retiro') || d.includes('chamberí') || d.includes('chamartín') || d.includes('arganzuela')) {
    return {
      type: 'stable',
      tag: 'ALTA FIABILIDAD',
      title: 'Zona Muy Estable (Previsión Fiable)',
      titleColor: '#007a55',
      borderColor: 'rgba(0, 157, 113, 0.35)',
      bg: 'rgba(0, 157, 113, 0.08)',
      icon: '',
      description: 'Barrio consolidado con precios firmes. La previsión estimada es altamente segura y predecible.'
    };
  }
  return {
    type: 'ai',
    tag: 'ESTIMACIÓN',
    title: 'Previsión Estimada',
    titleColor: '#6b21a8',
    borderColor: 'rgba(142, 45, 226, 0.25)',
    bg: 'rgba(142, 45, 226, 0.07)',
    icon: '',
    description: 'Previsión calculada analizando más de 10.000 operaciones y tendencias del mercado.'
  };
};

const InfoTooltip: React.FC<{
  title: string;
  description: string;
  example?: string;
  ruleOfThumb?: string;
}> = ({ title, description, example, ruleOfThumb }) => {
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
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '0.5px solid #c7c7cc',
          backgroundColor: open ? '#0071e3' : '#f5f5f7',
          color: open ? '#ffffff' : '#86868b',
          fontSize: '10px',
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
          style={{
            position: 'absolute',
            top: '22px',
            right: 0,
            width: '290px',
            backgroundColor: '#1d1d1f',
            color: '#f5f5f7',
            padding: '12px 14px',
            borderRadius: '12px',
            boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            zIndex: 1000,
            fontSize: '12px',
            lineHeight: 1.45,
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#ffffff', marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ color: '#d2d2d7', fontSize: '11.5px', marginBottom: ruleOfThumb || example ? '6px' : '0' }}>
            {description}
          </div>
          {example && (
            <div style={{ color: '#30d158', fontSize: '11px', fontWeight: '400', marginBottom: '4px', borderTop: '0.5px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
              <strong style={{ color: '#ffffff', fontWeight: '600' }}>Ejemplo:</strong> {example}
            </div>
          )}
          {ruleOfThumb && (
            <div style={{ color: '#ff9f0a', fontSize: '11px', fontWeight: '400', borderTop: example ? 'none' : '0.5px solid rgba(255,255,255,0.1)', paddingTop: example ? '0' : '5px' }}>
              <strong style={{ color: '#ffffff', fontWeight: '600' }}>Consejo:</strong> {ruleOfThumb}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MadridDashboardV2: React.FC = () => {
  const predBadgeStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: '600',
    color: '#8e2de2',
    backgroundColor: 'rgba(142, 45, 226, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
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
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedMonth, setSelectedMonth] = useState('Abril');
  const [selectedDistrict, setSelectedDistrict] = useState('Todos');
  const [selectedBarrio, setSelectedBarrio] = useState('Todos');
  const [selectedZoneA, setSelectedZoneA] = useState('Salamanca');
  const [selectedZoneB, setSelectedZoneB] = useState('Centro');

  // State: Dynamic Options
  const [availableYears, setAvailableYears] = useState<string[]>(['2023', '2024', '2025']);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(['Todos', 'Salamanca', 'Centro', 'Chamberí', 'Retiro']);
  const [availableBarrios, setAvailableBarrios] = useState<string[]>(['Todos']);

  // State: Real Data
  const [kpiData, setKpiData] = useState<any>({});
  const [kpiDataA, setKpiDataA] = useState<any>({});
  const [kpiDataB, setKpiDataB] = useState<any>({});
  const [seriesA, setSeriesA] = useState<any[]>([]);
  const [seriesB, setSeriesB] = useState<any[]>([]);
  const [seriesMadrid, setSeriesMadrid] = useState<any[]>([]);

  // State: Niveles Comparativa
  const [compareLevel, setCompareLevel] = useState<'Distritos' | 'Barrios'>('Distritos');
  const [isCompareTransitioning, setIsCompareTransitioning] = useState(false);
  const [compareSlideDir, setCompareSlideDir] = useState<'left' | 'right' | null>(null);

  const [isOverlayOpen, setIsOverlayOpen] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMapHelpModal, setShowMapHelpModal] = useState(false);
  const [mapData, setMapData] = useState<{districts: any[], neighborhoods: any[]}>({ districts: [], neighborhoods: [] });
  const [rankings, setRankings] = useState<{ topDist: any[], botDist: any[], topBarr: any[], botBarr: any[] }>({
    topDist: [], botDist: [], topBarr: [], botBarr: []
  });
  const [affordabilityData, setAffordabilityData] = useState<any[]>([]);
  const [seasonalTrend, setSeasonalTrend] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [rankingLevel, setRankingLevel] = useState<'Distritos' | 'Barrios'>('Distritos');
  const [scatterData, setScatterData] = useState<any[]>([]);
  const [connectivityData, setConnectivityData] = useState<any>(null);
  const [liquidityLevel, setLiquidityLevel] = useState<'distrito' | 'barrio'>('distrito');
  const [liquidityData, setLiquidityData] = useState<any[]>([]);
  
  // User simulation states
  const [userRentSalary, setUserRentSalary] = useState<string>('');
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

  const activeProfile = PROFILES[profileIdx];

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
    fetch(`${API_BASE}/filters`)
      .then(res => res.json())
      .then(data => {
        if (data.years) setAvailableYears(data.years.map(String));
        if (data.districts) setAvailableDistricts(['Todos', ...data.districts]);
      })
      .catch(err => console.error("Error loading filters:", err));
  }, []);

  // Fetch barrios when district changes
  useEffect(() => {
    fetch(`${API_BASE}/neighborhoods?district=${encodeURIComponent(selectedDistrict)}`)
      .then(res => res.json())
      .then(data => setAvailableBarrios(data))
      .catch(err => console.error("Error loading neighborhoods:", err));
  }, [selectedDistrict]);

  // Fetch KPIs and Series
  useEffect(() => {
    const op = activeProfile.op;
    
    fetch(`${API_BASE}/kpis?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.op}&district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(res => res.json())
      .then(data => setKpiData({
        p_m2: data.precio_m2,
        p_vivienda: data.precio_vivienda,
        v_mes: data.variacion_mensual,
        v_anual: data.variacion_anual,
        esfuerzo_compra: data.esfuerzo_compra,
        estado_mercado: data.estado_mercado,
        is_prediction: data.is_prediction,
        renta_media: data.renta_media,
        transacciones: data.transacciones
      }));

    // Series Madrid (Average)
    fetch(`${API_BASE}/series?year=${selectedYear}&op=${op}`)
      .then(res => res.json())
      .then(data => setSeriesMadrid(data));

    // Series Zone A
    fetch(`${API_BASE}/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(selectedZoneA)}&tipo_zona=${compareLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.json())
      .then(data => setSeriesA(data));

    // Series Zone B
    fetch(`${API_BASE}/series?year=${selectedYear}&op=${op}&zona=${encodeURIComponent(selectedZoneB)}&tipo_zona=${compareLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.json())
      .then(data => setSeriesB(data));

    // KPIs Zone A
    const zoneAParam = compareLevel === 'Distritos' ? `district=${encodeURIComponent(selectedZoneA)}` : `barrio=${encodeURIComponent(selectedZoneA)}`;
    fetch(`${API_BASE}/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneAParam}`)
      .then(res => res.json())
      .then(data => setKpiDataA(data));

    // KPIs Zone B
    const zoneBParam = compareLevel === 'Distritos' ? `district=${encodeURIComponent(selectedZoneB)}` : `barrio=${encodeURIComponent(selectedZoneB)}`;
    fetch(`${API_BASE}/kpis?year=${selectedYear}&month=${selectedMonth}&op=${op}&${zoneBParam}`)
      .then(res => res.json())
      .then(data => setKpiDataB(data));

    // Map Data
    fetch(`${API_BASE}/map?year=${selectedYear}&month=${selectedMonth}&interest=${activeProfile.id === 'alquiler' ? 'Alquiler' : activeProfile.id === 'compra' ? 'Compra-venta' : activeProfile.id === 'venta' ? 'Venta' : 'Inversión'}`)
      .then(res => res.json())
      .then(data => setMapData(data))
      .catch(err => console.error("Error loading map data:", err));

    // Rankings Data
    if (activeProfile.id === 'venta') {
      Promise.all([
        fetch(`${API_BASE}/liquidity?year=${selectedYear}&level=distrito`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/liquidity?year=${selectedYear}&level=barrio`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]).then(([dist, barr]) => {
        const mapLiquidity = (list: any[]) => list.map(item => ({
          name: item.name,
          value: item.transactions
        }));
        setRankings({
          topDist: mapLiquidity(dist || []).slice(0, 10),
          botDist: mapLiquidity(dist || []).slice(0, 10),
          topBarr: mapLiquidity(barr || []).slice(0, 10),
          botBarr: mapLiquidity(barr || []).slice(0, 10)
        });
      }).catch(err => console.error("Error loading rankings:", err));
    } else {
      const category = activeProfile.id === 'inversion' ? 'Rentabilidad' : 'Precio';
      Promise.all([
        fetch(`${API_BASE}/rankings?year=${selectedYear}&month=${selectedMonth}&op=${op}&level=distrito&category=${category}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/rankings?year=${selectedYear}&month=${selectedMonth}&op=${op}&level=barrio&category=${category}`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]).then(([dist, barr]) => {
        setRankings({
          topDist: (dist || []).slice(0, 10),
          botDist: [...(dist || [])].sort((a: any, b: any) => a.value - b.value).slice(0, 10),
          topBarr: (barr || []).slice(0, 10),
          botBarr: [...(barr || [])].sort((a: any, b: any) => a.value - b.value).slice(0, 10)
        });
      }).catch(err => console.error("Error loading rankings:", err));
    }

    if (activeProfile.id === 'alquiler') {
      fetch(`${API_BASE}/affordability?year=${selectedYear}&month=${selectedMonth}&op=${activeProfile.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAffordabilityData(Array.isArray(data) ? data : []))
        .catch(err => { console.error("Error loading affordability:", err); setAffordabilityData([]); });
        
      fetch(`${API_BASE}/seasonal-trend?anio=${selectedYear}&op=${activeProfile.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setSeasonalTrend(Array.isArray(data) ? data : []))
        .catch(err => { console.error("Error loading seasonal trend:", err); setSeasonalTrend([]); });
    }
    
    if (activeProfile.id !== 'inversion') {
      fetch(`${API_BASE}/scatter-opportunity?year=${selectedYear}&month=${selectedMonth}&op=${op}&level=${rankingLevel.toLowerCase().slice(0, -1)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setScatterData(Array.isArray(data) ? data : []))
        .catch(() => setScatterData([]));
    }
    
    fetch(`${API_BASE}/heatmap?year=${selectedYear}&op=${activeProfile.id}&level=${rankingLevel.toLowerCase().slice(0, -1)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setHeatmapData(Array.isArray(data) ? data : []))
      .catch(() => setHeatmapData([]));

    fetch(`${API_BASE}/connectivity-analysis?district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setConnectivityData(data))
      .catch(err => { console.error("Error loading connectivity:", err); setConnectivityData(null); });

  }, [selectedYear, selectedMonth, profileIdx, selectedDistrict, selectedBarrio, selectedZoneA, selectedZoneB, compareLevel, rankingLevel]);

  // Fetch liquidity data (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      fetch(`${API_BASE}/liquidity?year=${selectedYear}&level=${liquidityLevel}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setLiquidityData(data))
        .catch(err => { console.error("Error fetching liquidity data:", err); setLiquidityData([]); });
    }
  }, [selectedYear, liquidityLevel, activeProfile.id]);

  // Fetch interest rate impact data (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      fetch(`${API_BASE}/interest-rate-impact?district=${encodeURIComponent(selectedDistrict)}&barrio=${encodeURIComponent(selectedBarrio)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setInterestImpactData(data))
        .catch(err => { console.error("Error fetching interest rate impact data:", err); setInterestImpactData([]); });
    }
  }, [selectedDistrict, selectedBarrio, activeProfile.id]);

  // Fetch risk-return matrix data (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = liquidityLevel === 'distrito' ? 'distrito' : 'barrio';
      fetch(`${API_BASE}/risk-return-matrix?level=${level}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setRiskReturnData(data))
        .catch(err => { console.error("Error fetching risk return data:", err); setRiskReturnData([]); });
    }
  }, [liquidityLevel, selectedDistrict, activeProfile.id]);

  // Fetch zone comparative liquidities (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      fetch(`${API_BASE}/zone-liquidity?name=${encodeURIComponent(selectedZoneA)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneA(data.speed))
        .catch(() => setLiquidityZoneA('N/A'));
    }
  }, [selectedZoneA, compareLevel, activeProfile.id]);

  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      fetch(`${API_BASE}/zone-liquidity?name=${encodeURIComponent(selectedZoneB)}&level=${level}`)
        .then(res => res.ok ? res.json() : { speed: 'N/A' })
        .then(data => setLiquidityZoneB(data.speed))
        .catch(() => setLiquidityZoneB('N/A'));
    }
  }, [selectedZoneB, compareLevel, activeProfile.id]);

  // Fetch zone comparative volatilities (for Inversión profile only)
  useEffect(() => {
    if (activeProfile.id === 'inversion') {
      const level = compareLevel.toLowerCase() === 'distritos' ? 'distrito' : 'barrio';
      fetch(`${API_BASE}/risk-return-matrix?level=${level}&district=Todos`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const found = data.find((d: any) => d.name.toLowerCase() === selectedZoneA.toLowerCase());
          if (found) {
            setVolatilityZoneA(found.risk.toFixed(1) + '%');
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
      fetch(`${API_BASE}/risk-return-matrix?level=${level}&district=Todos`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const found = data.find((d: any) => d.name.toLowerCase() === selectedZoneB.toLowerCase());
          if (found) {
            setVolatilityZoneB(found.risk.toFixed(1) + '%');
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
      if (!(e.target as HTMLElement).closest('.v2-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inicialización de Gráficas (Chart.js)
  useEffect(() => {
    const initCharts = () => {
      chartsRef.current.forEach(c => c?.destroy());
      chartsRef.current = [];

      const profileId = activeProfile.id;
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
          color?: string
        ) => {
          const mainColor = color || activeProfile.color;
          const multiplier = activeProfile.id === 'inversion' ? 100 : 1;
          
          // Align data to exactly 12 months (1 to 12)
          const alignedPrices = Array.from({ length: 12 }, (_, i) => {
            const found = rawData.find(d => d.mes === i + 1);
            return found ? found.precio_m2 * multiplier : null;
          });

          return new ChartJS(ctx, {
            type: 'line',
            plugins: [
              {
                id: 'legendSpacing',
                beforeInit(chart) {
                  if (chart.legend) {
                    const originalFit = chart.legend.fit;
                    chart.legend.fit = function fit() {
                      originalFit.bind(chart.legend)();
                      this.height += 35; // margin below the legend
                    };
                  }
                }
              }
            ],
            data: {
              labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
              datasets: [
                { 
                  label, 
                  data: alignedPrices, 
                  borderColor: mainColor, 
                  tension: 0.4, 
                  borderWidth: 3, 
                  pointRadius: (context) => alignedPrices[context.dataIndex] === null ? 0 : 5,
                  pointHoverRadius: 8,
                  pointHitRadius: 25,
                  pointBackgroundColor: (context: any) => {
                    const idx = context.dataIndex;
                    const found = rawData.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return '#8e2de2';
                    return mainColor;
                  },
                  segment: {
                    borderColor: (context: any) => {
                      const found = rawData.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? '#8e2de2' : mainColor;
                    },
                    borderDash: (context: any) => {
                      const found = rawData.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? [5, 5] : undefined;
                    },
                  }
                },
                { 
                  label: 'Media Madrid', 
                  data: Array.from({ length: 12 }, (_, i) => {
                    const found = seriesMadrid.find(d => d.mes === i + 1);
                    return found ? found.precio_m2 * multiplier : null;
                  }), 
                  borderColor: '#d2d2d7', 
                  borderWidth: 1.5, 
                  pointRadius: 0,
                  borderDash: [5, 5],
                  segment: {
                    borderDash: (ctx: any) => [5, 5],
                  }
                },
                {
                  label: 'Proyección (Predicción)',
                  data: [],
                  borderColor: '#8e2de2',
                  borderDash: [5, 5],
                  borderWidth: 2.5,
                  pointRadius: 0
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
                    boxWidth: 24, 
                    usePointStyle: false, 
                    font: { size: 11, weight: 500 },
                    padding: 15
                  }
                }, 
                datalabels: {
                  align: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const madridVal = context.chart.data.datasets[1].data[context.dataIndex] as number;
                    return val >= madridVal ? 'top' : 'bottom';
                  },
                  anchor: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const madridVal = context.chart.data.datasets[1].data[context.dataIndex] as number;
                    return val >= madridVal ? 'end' : 'start';
                  },
                  offset: 8,
                  color: (context) => {
                    const idx = context.dataIndex;
                    const found = rawData.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return '#8e2de2';
                    return mainColor;
                  },
                  font: { size: 9, weight: 'bold' },
                  formatter: (value, context) => {
                    if (context.datasetIndex !== 0) return null;
                    if (value === null) return null;
                    const unit = activeProfile.id === 'inversion' ? '%' : '€';
                    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + unit;
                  }
                },
                tooltip: { 
                  enabled: true,
                  backgroundColor: 'rgba(29, 29, 31, 0.95)',
                  titleColor: '#ffffff',
                  titleFont: { size: 14, weight: 'bold' },
                  bodyColor: '#f5f5f7',
                  bodyFont: { size: 13, weight: 'normal' },
                  bodySpacing: 8,
                  padding: 14,
                  cornerRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  displayColors: false,
                  callbacks: {
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
                      const unit = activeProfile.id === 'inversion' ? '%' : '€/m²';

                      if (val === null || val === undefined) {
                        return 'Sin datos registrados por el Ayuntamiento de Madrid para este periodo';
                      }

                      // Línea 2: Media Madrid
                      if (context.datasetIndex === 1) {
                        const formatted = new Intl.NumberFormat('es-ES', { 
                          minimumFractionDigits: activeProfile.id === 'alquiler' ? 2 : 1, 
                          maximumFractionDigits: 2 
                        }).format(val);
                        return [
                          `Media Madrid: ${formatted} ${unit}`,
                          `Referencia oficial ponderada de la capital`
                        ];
                      }

                      // Línea principal de la zona
                      const found = rawData.find(d => d.mes === idx + 1);
                      const isPred = found ? Boolean(found.is_prediction) : false;
                      const tipoDato = isPred ? 'Predicción' : 'Dato Real Oficial';
                      const valFormatted = new Intl.NumberFormat('es-ES', { 
                        minimumFractionDigits: activeProfile.id === 'alquiler' ? 2 : 1, 
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

                      // 3. Comparativa con la otra zona si existe
                      if (otherLabel && otherRawData) {
                        const otherFound = otherRawData.find(d => d.mes === idx + 1);
                        const otherVal = otherFound ? otherFound.precio_m2 * multiplier : null;
                        if (otherVal !== null && otherVal > 0) {
                          const diffOther = ((val - otherVal) / otherVal) * 100;
                          const absDiffOther = Math.abs(diffOther).toFixed(1);
                          if (diffOther > 0.08) {
                            lines.push(`Comparativa con ${otherLabel}: Un ${absDiffOther}% más caro`);
                          } else if (diffOther < -0.08) {
                            lines.push(`Comparativa con ${otherLabel}: Un ${absDiffOther}% más barato`);
                          } else {
                            lines.push(`Comparativa con ${otherLabel}: Mismo nivel de precio`);
                          }
                        }
                      }

                      // 4. Comparativa vs Media de Madrid
                      const madridItem = seriesMadrid.find(d => d.mes === idx + 1);
                      const madridVal = madridItem ? madridItem.precio_m2 * multiplier : null;
                      if (madridVal !== null && madridVal !== undefined && madridVal > 0) {
                        const diffMadrid = ((val - madridVal) / madridVal) * 100;
                        const absDiffMadrid = Math.abs(diffMadrid).toFixed(1);
                        const madridFmt = new Intl.NumberFormat('es-ES', { 
                          minimumFractionDigits: activeProfile.id === 'alquiler' ? 2 : 1, 
                          maximumFractionDigits: 1 
                        }).format(madridVal);

                        if (Math.abs(diffMadrid) <= 2) {
                          lines.push(`Comparativa Madrid: En la media de Madrid (${madridFmt} ${unit})`);
                        } else if (diffMadrid > 0) {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% más caro que la media (${madridFmt} ${unit})`);
                        } else {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% más barato que la media (${madridFmt} ${unit})`);
                        }

                        // 5. Diagnóstico
                        if (diffMadrid >= 20) {
                          lines.push(`Diagnóstico: Zona prémium de alta cotización`);
                        } else if (diffMadrid > 5) {
                          lines.push(`Diagnóstico: Por encima del promedio`);
                        } else if (diffMadrid <= -20) {
                          lines.push(`Diagnóstico: Zona asequible y económica`);
                        } else if (diffMadrid < -5) {
                          lines.push(`Diagnóstico: Más accesible que el promedio`);
                        } else {
                          lines.push(`Diagnóstico: Precio en la media de la capital`);
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
                  ticks: { padding: 12 }
                }, 
                y: { 
                  grid: { color: '#f5f5f7' }, 
                  border: { display: false },
                  grace: '10%',
                  ticks: {
                    padding: 15,
                    callback: (value) => {
                      const unit = activeProfile.id === 'inversion' ? '%' : '€';
                      return new Intl.NumberFormat('es-ES').format(Number(value)) + unit;
                    }
                  }
                } 
              }
            }
          });
        };

        if (ctxA) chartsRef.current.push(createLineChart(ctxA, selectedZoneA, seriesA, selectedZoneB, seriesB));
        if (ctxB) chartsRef.current.push(createLineChart(ctxB, selectedZoneB, seriesB, selectedZoneA, seriesA, '#1d1d1f'));
        if (ctxOverlay) {
          chartsRef.current.push(new ChartJS(ctxOverlay, {
            type: 'line',
            plugins: [
              {
                id: 'legendSpacing',
                beforeInit(chart) {
                  if (chart.legend) {
                    const originalFit = chart.legend.fit;
                    chart.legend.fit = function fit() {
                      originalFit.bind(chart.legend)();
                      this.height += 35; // margin below the legend
                    };
                  }
                }
              }
            ],
            data: {
              labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
              datasets: [
                { 
                  label: selectedZoneA, 
                  data: Array.from({ length: 12 }, (_, i) => {
                    const found = seriesA.find(d => d.mes === i + 1);
                    return found ? found.precio_m2 * (activeProfile.id === 'inversion' ? 100 : 1) : null;
                  }), 
                  borderColor: activeProfile.color, 
                  borderWidth: 3, 
                  pointRadius: (context) => {
                    const found = seriesA.find(d => d.mes === context.dataIndex + 1);
                    return found ? 5 : 0;
                  }, 
                  pointHoverRadius: 8,
                  pointHitRadius: 25,
                  pointBackgroundColor: (context: any) => {
                    const idx = context.dataIndex;
                    const found = seriesA.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return '#8e2de2';
                    return activeProfile.color;
                  },
                  tension: 0.4,
                  segment: {
                    borderColor: (context: any) => {
                      const found = seriesA.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? '#8e2de2' : activeProfile.color;
                    },
                    borderDash: (context: any) => {
                      const found = seriesA.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? [5, 5] : undefined;
                    }
                  }
                },
                { 
                  label: selectedZoneB, 
                  data: Array.from({ length: 12 }, (_, i) => {
                    const found = seriesB.find(d => d.mes === i + 1);
                    return found ? found.precio_m2 * (activeProfile.id === 'inversion' ? 100 : 1) : null;
                  }), 
                  borderColor: '#1d1d1f', 
                  borderWidth: 2.5, 
                  pointRadius: (context) => {
                    const found = seriesB.find(d => d.mes === context.dataIndex + 1);
                    return found ? 5 : 0;
                  }, 
                  pointHoverRadius: 8,
                  pointHitRadius: 25,
                  pointBackgroundColor: (context: any) => {
                    const idx = context.dataIndex;
                    const found = seriesB.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return '#8e2de2';
                    return '#1d1d1f';
                  },
                  tension: 0.4,
                  segment: {
                    borderColor: (context: any) => {
                      const found = seriesB.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? '#8e2de2' : '#1d1d1f';
                    },
                    borderDash: (context: any) => {
                      const found = seriesB.find(d => d.mes === context.p0DataIndex + 1);
                      return found && found.is_prediction ? [5, 5] : undefined;
                    }
                  }
                },
                { 
                  label: 'Media Madrid', 
                  data: Array.from({ length: 12 }, (_, i) => {
                    const found = seriesMadrid.find(d => d.mes === i + 1);
                    return found ? found.precio_m2 * (activeProfile.id === 'inversion' ? 100 : 1) : null;
                  }), 
                  borderColor: '#d2d2d7', 
                  borderWidth: 1.5, 
                  pointRadius: 0, 
                  tension: 0.4,
                  borderDash: [5, 5],
                  segment: { borderDash: (ctx: any) => [5, 5] }
                },
                {
                  label: 'Proyección (Predicción)',
                  data: [],
                  borderColor: '#8e2de2',
                  borderDash: [5, 5],
                  borderWidth: 2.5,
                  pointRadius: 0
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
              layout: { padding: { top: 15, right: 30, bottom: 40, left: 10 } },
              scales: { 
                x: { 
                  grid: { display: false },
                  offset: true,
                  ticks: { padding: 12 }
                }, 
                y: { 
                  grid: { color: '#f5f5f7' }, 
                  border: { display: false },
                  grace: '10%',
                  ticks: {
                    padding: 15,
                    callback: (value) => {
                      const unit = activeProfile.id === 'inversion' ? '%' : '€';
                      return new Intl.NumberFormat('es-ES').format(Number(value)) + unit;
                    }
                  }
                } 
              },
              plugins: {
                legend: { 
                  display: true, 
                  position: 'top', 
                  align: 'end',
                  labels: { 
                    boxWidth: 24, 
                    usePointStyle: false, 
                    font: { size: 11, weight: 'bold' },
                    padding: 15
                  }
                }, 
                datalabels: {
                  align: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const otherIdx = context.datasetIndex === 0 ? 1 : 0;
                    const otherVal = context.chart.data.datasets[otherIdx].data[context.dataIndex] as number;
                    if (val > otherVal) return 'top';
                    if (val < otherVal) return 'bottom';
                    return context.datasetIndex === 0 ? 'top' : 'bottom';
                  },
                  anchor: (context) => {
                    const val = context.dataset.data[context.dataIndex] as number;
                    const otherIdx = context.datasetIndex === 0 ? 1 : 0;
                    const otherVal = context.chart.data.datasets[otherIdx].data[context.dataIndex] as number;
                    return val >= otherVal ? 'end' : 'start';
                  },
                  offset: 8,
                  font: { size: 9, weight: 'bold' },
                  color: (context) => {
                    const idx = context.dataIndex;
                    const dataset = context.datasetIndex === 0 ? seriesA : seriesB;
                    const found = dataset.find(d => d.mes === idx + 1);
                    if (found && found.is_prediction) return '#8e2de2';
                    return (context.dataset.borderColor as string);
                  },
                  formatter: (value, context) => {
                    if (context.datasetIndex === 2) return null; // No etiquetas para Madrid
                    if (value === null) return null;
                    const unit = activeProfile.id === 'inversion' ? '%' : '€';
                    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + unit;
                  }
                },
                tooltip: {
                  enabled: true,
                  backgroundColor: 'rgba(29, 29, 31, 0.95)',
                  titleColor: '#ffffff',
                  titleFont: { size: 14, weight: 'bold' },
                  bodyColor: '#f5f5f7',
                  bodyFont: { size: 13, weight: 'normal' },
                  bodySpacing: 8,
                  padding: 14,
                  cornerRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  displayColors: false,
                  callbacks: {
                    title: (items: any[]) => {
                      const monthNames = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      const idx = items[0]?.dataIndex ?? 0;
                      return `${monthNames[idx]} ${selectedYear} · Comparativa Superpuesta`;
                    },
                    label: (context: any) => {
                      const idx = context.dataIndex;
                      const val = context.parsed.y;
                      const unit = activeProfile.id === 'inversion' ? '%' : '€/m²';

                      if (val === null || val === undefined) {
                        return 'Sin datos registrados por el Ayuntamiento de Madrid para este periodo';
                      }

                      const valFormatted = new Intl.NumberFormat('es-ES', { 
                        minimumFractionDigits: activeProfile.id === 'alquiler' ? 2 : 1, 
                        maximumFractionDigits: 2 
                      }).format(val);

                      // Si es la media de Madrid
                      if (context.datasetIndex === 2) {
                        return [
                          `Media Madrid: ${valFormatted} ${unit}`,
                          `Referencia oficial de la capital`
                        ];
                      }

                      const isZoneA = context.datasetIndex === 0;
                      const currentZone = isZoneA ? selectedZoneA : selectedZoneB;
                      const otherZone = isZoneA ? selectedZoneB : selectedZoneA;
                      const currentDataset = isZoneA ? seriesA : seriesB;
                      const otherDataset = isZoneA ? seriesB : seriesA;

                      const found = currentDataset.find(d => d.mes === idx + 1);
                      const isPred = found ? Boolean(found.is_prediction) : false;
                      const tipoDato = isPred ? 'Predicción' : 'Dato Real Oficial';

                      const lines: string[] = [
                        `${currentZone}: ${valFormatted} ${unit} (${tipoDato})`
                      ];

                      // Variación vs mes anterior en esta zona
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
                      }

                      // Comparar con la otra zona
                      const otherItem = otherDataset.find(d => d.mes === idx + 1);
                      const otherVal = otherItem ? otherItem.precio_m2 * (activeProfile.id === 'inversion' ? 100 : 1) : null;
                      if (otherVal !== null && otherVal > 0) {
                        const diffOther = ((val - otherVal) / otherVal) * 100;
                        const absDiffOther = Math.abs(diffOther).toFixed(1);
                        if (diffOther > 0) {
                          lines.push(`Comparativa con ${otherZone}: Un ${absDiffOther}% más caro`);
                        } else if (diffOther < 0) {
                          lines.push(`Comparativa con ${otherZone}: Un ${absDiffOther}% más barato`);
                        } else {
                          lines.push(`Comparativa con ${otherZone}: Mismo nivel de precio`);
                        }
                      }

                      // Comparativa con la media de Madrid
                      const madridItem = seriesMadrid.find(d => d.mes === idx + 1);
                      const madridVal = madridItem ? madridItem.precio_m2 * (activeProfile.id === 'inversion' ? 100 : 1) : null;
                      if (madridVal !== null && madridVal > 0) {
                        const diffMadrid = ((val - madridVal) / madridVal) * 100;
                        const absDiffMadrid = Math.abs(diffMadrid).toFixed(1);
                        if (Math.abs(diffMadrid) <= 2) {
                          lines.push(`Comparativa Madrid: En la media general`);
                        } else if (diffMadrid > 0) {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% superior a la media`);
                        } else {
                          lines.push(`Comparativa Madrid: Un ${absDiffMadrid}% por debajo de la media`);
                        }
                      }

                      return lines;
                    }
                  }
                }
              }
            }
          }));
        }

        // ── Scatter plot (Opportunity Chart) ──────────────────────────────────
        const ctxScatter = document.getElementById(`v2-scatter-${activeProfile.id}`) as HTMLCanvasElement;
        if (ctxScatter && scatterData.length > 0) {
          const avgDist = scatterData.reduce((sum, d) => sum + (d.dist_transport || 0), 0) / scatterData.length;
          const avgPrice = scatterData.reduce((sum, d) => sum + (d.precio_m2 || 0), 0) / scatterData.length;

          const points = scatterData.map(d => {
            const x = d.dist_transport || 0;
            const y = d.precio_m2 || 0;
            let pointColor = '#ff9f0a';
            let isOportunidad = false;
            let isNoTocar = false;

            if (x < avgDist && y < avgPrice) {
              pointColor = '#009d71';
              isOportunidad = true;
            } else if (x > avgDist && y > avgPrice) {
              pointColor = '#ff453a';
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
                  color: '#1d1d1f',
                  font: { size: 9, weight: 'bold' },
                  formatter: (value) => {
                    return (value.isOportunidad || value.isNoTocar) ? value.name : '';
                  }
                },
                tooltip: {
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#d2d2d7',
                  padding: 12,
                  titleColor: '#1d1d1f',
                  bodyColor: '#4b4b4b',
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
                  grid: { color: '#f5f5f7' },
                  ticks: { callback: (v) => `${v}m` }
                },
                y: {
                  title: { display: true, text: 'Precio por m²', font: { size: 11, weight: 'bold', family: '-apple-system' } },
                  grid: { color: '#f5f5f7' },
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
                borderColor: '#0071e3',
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'yInteres',
                pointRadius: 4,
                pointBackgroundColor: '#0071e3',
                fill: false
              },
              {
                type: 'bar',
                label: 'Precio m²',
                data: interestImpactData.map(d => d.price_m2),
                backgroundColor: 'rgba(52, 199, 89, 0.2)',
                borderColor: '#34c759',
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
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1d1d1f',
                bodyColor: '#1d1d1f',
                borderColor: 'rgba(0, 0, 0, 0.1)',
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
                ticks: { color: '#86868b', font: { size: 10, weight: 'bold' } }
              },
              yInteres: {
                type: 'linear',
                position: 'left',
                ticks: {
                  color: '#86868b',
                  callback: (val) => val + '%',
                  font: { size: 9 }
                },
                grid: { color: 'rgba(0, 0, 0, 0.05)' }
              },
              yPrecio: {
                type: 'linear',
                position: 'right',
                ticks: {
                  color: '#86868b',
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
          
          let pointColor = '#8e2de2'; // Purple default
          let isIdeal = false;
          let isAvoid = false;
          
          if (x < avgRisk && y > avgRoi) {
            pointColor = '#34c759'; // Green (ideal: low risk, high return)
            isIdeal = true;
          } else if (x > avgRisk && y < avgRoi) {
            pointColor = '#ff3b30'; // Red (avoid: high risk, low return)
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

        // Sort points by ROI descending to make the bar chart clean and sorted
        const sortedPoints = points.sort((a, b) => b.y - a.y);

        chartsRef.current.push(new ChartJS(ctxRiskReturn, {
          data: {
            labels: sortedPoints.map(p => p.name),
            datasets: [
              {
                type: 'bar',
                label: 'ROI Esperado (%)',
                data: sortedPoints.map(p => p.y),
                backgroundColor: sortedPoints.map(p => p.isSelected ? '#ff9f0a' : p.color),
                borderRadius: 4,
                yAxisID: 'yROI',
                barThickness: sortedPoints.length > 15 ? 12 : 20
              },
              {
                type: 'line',
                label: 'Volatilidad (Riesgo)',
                data: sortedPoints.map(p => p.x),
                borderColor: '#0071e3',
                borderWidth: 2.5,
                tension: 0.3,
                yAxisID: 'yVolatilidad',
                pointRadius: sortedPoints.map(p => p.isSelected ? 7 : 3),
                pointBackgroundColor: sortedPoints.map(p => p.isSelected ? '#ff9f0a' : '#0071e3'),
                pointBorderColor: sortedPoints.map(p => p.isSelected ? '#ffffff' : 'transparent'),
                pointBorderWidth: sortedPoints.map(p => p.isSelected ? 2 : 0),
                fill: false
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
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#d2d2d7',
                padding: 12,
                titleColor: '#1d1d1f',
                bodyColor: '#4b4b4b',
                callbacks: {
                  label: (context: any) => {
                    const idx = context.dataIndex;
                    const p = sortedPoints[idx];
                    if (context.datasetIndex === 0) {
                      return `${p.name} (ROI): ${p.y.toFixed(2)}%${p.isSelected ? ' ★ (Seleccionado)' : ''}`;
                    } else {
                      return `${p.name} (Volatilidad): ${p.x.toFixed(1)}%`;
                    }
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: '#86868b',
                  font: { size: 8, weight: 'bold' },
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              yROI: {
                type: 'linear',
                position: 'left',
                title: { display: true, text: 'ROI esperado (%)', font: { size: 10, weight: 'bold' } },
                ticks: {
                  callback: (val) => val + '%',
                  font: { size: 9 }
                },
                grid: { color: 'rgba(0, 0, 0, 0.05)' }
              },
              yVolatilidad: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 100,
                title: { display: true, text: 'Volatilidad (Riesgo)', font: { size: 10, weight: 'bold' } },
                ticks: {
                  callback: (val) => {
                    if (val === 20) return 'Bajo';
                    if (val === 50) return 'Medio';
                    if (val === 80) return 'Alto';
                    return '';
                  },
                  font: { size: 9 }
                },
                grid: { drawOnChartArea: false }
              }
            }
          }
        }));
      }
    };
    // Solo inicializar cuando no estamos en medio de una transición de perfil
    if (isTransitioning) return;

    const timer = setTimeout(initCharts, 150);
    return () => clearTimeout(timer);
  }, [profileIdx, isTransitioning, compareLevel, activeProfile.color, seriesA, seriesB, seriesMadrid, activeProfile.id, scatterData, interestImpactData, riskReturnData, liquidityLevel, selectedDistrict, selectedBarrio]);

  const handleProfileChange = (newIdx: number) => {
    if (newIdx === profileIdx || isTransitioning) return;
    setPrevIdx(profileIdx);
    setProfileIdx(newIdx);
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 480);
  };

  const handleLevelToggle = (level: 'Distritos' | 'Barrios') => {
    if (level === compareLevel || isCompareTransitioning) return;
    setCompareSlideDir(level === 'Barrios' ? 'right' : 'left');
    setIsCompareTransitioning(true);
    setTimeout(() => {
      setCompareLevel(level);
      setIsCompareTransitioning(false);
      setCompareSlideDir(null);
    }, 480);
  };

  const getSlideClass = (idx: number) => {
    if (idx === profileIdx) return 'v2-active';
    if (idx === prevIdx && isTransitioning) return profileIdx > prevIdx ? 'v2-out-left' : 'v2-out-right';
    return profileIdx > idx ? 'v2-before' : 'v2-after';
  };

  return (
    <div className="v2-root">
      {/* 1. NAV BAR (APPLE STYLE GLASS) */}
      <nav className="v2-nav">
        <div className="v2-nav-content">
          <div className="v2-brand" onClick={() => router.push('/')}>
            Madrid Urban Intelligent
          </div>
          
          <div className="v2-tabs-container">
            <div className="v2-tabs-bg">
              <div className="v2-indicator" style={{ transform: `translateX(${profileIdx * 100}%)` }} />
              {PROFILES.map((p, i) => (
                <button key={p.id} className={`v2-tab-btn ${profileIdx === i ? 'active' : ''}`} onClick={() => handleProfileChange(i)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button className="v2-btn-profile">Mi Perfil</button>
        </div>
      </nav>

      {/* 2. FILTROS REFINADOS (CUSTOM APPLE DROPDOWNS) */}
      <div className="v2-filters">
        <div className="v2-filter-group">
          
          {/* AÑO */}
          <div className="v2-dropdown-container">
            <span className="v2-filter-label">Año</span>
            <div className={`v2-custom-select ${activeDropdown === 'year' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}>
              {selectedYear}
              {activeDropdown === 'year' && (
                <div className="v2-dropdown-menu">
                  {availableYears.map(y => (
                    <div key={y} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedYear(y); setActiveDropdown(null); }}>{y}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MES */}
          <div className="v2-dropdown-container">
            <span className="v2-filter-label">Mes</span>
            <div className={`v2-custom-select ${activeDropdown === 'month' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'month' ? null : 'month')}>
              {selectedMonth}
              {activeDropdown === 'month' && (
                <div className="v2-dropdown-menu">
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => (
                    <div key={m} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedMonth(m); setActiveDropdown(null); }}>{m}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DISTRITO */}
          <div className="v2-dropdown-container">
            <span className="v2-filter-label">Distrito</span>
            <div className={`v2-custom-select ${activeDropdown === 'dist' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'dist' ? null : 'dist')}>
              {selectedDistrict}
              {activeDropdown === 'dist' && (
                <div className="v2-dropdown-menu">
                  {availableDistricts.map(d => (
                    <div key={d} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedDistrict(d); setActiveDropdown(null); }}>{d}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BARRIO */}
          <div className="v2-dropdown-container">
            <span className="v2-filter-label">Barrio</span>
            <div className={`v2-custom-select ${activeDropdown === 'barrio' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'barrio' ? null : 'barrio')}>
              {selectedBarrio}
              {activeDropdown === 'barrio' && (
                <div className="v2-dropdown-menu">
                  {availableBarrios.map(b => (
                    <div key={b} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedBarrio(b); setActiveDropdown(null); }}>{b}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN GUÍA DE PRECIOS PARA EL CIUDADANO */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowHelpModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f5f5f7',
                border: '0.5px solid rgba(0,0,0,0.12)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#1d1d1f',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5ea')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f7')}
              title="Aprende a interpretar los precios oficiales y las previsiones estimadas"
            >
              <span style={{ 
                width: '15px', 
                height: '15px', 
                borderRadius: '50%', 
                backgroundColor: '#0071e3', 
                color: '#ffffff', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '10px', 
                fontWeight: '700',
                fontStyle: 'italic',
                fontFamily: 'serif' 
              }}>i</span>
              <span>¿Cómo entender estos precios?</span>
            </button>
          </div>

        </div>
      </div>


      {/* 4. CONTENIDO PRINCIPAL */}
      <main className="v2-viewport" style={{ height: containerHeight }}>
        {PROFILES.map((p, i) => (
          <div key={p.id} ref={i === profileIdx ? activePanelRef : null} className={`v2-panel ${getSlideClass(i)}`}>
            
            {/* KPI & MAPA SECTION */}
            <div className="v2-grid-main">
              <div className="v2-kpi-col">
                <div className="v2-kpi-stack">

                  {/* BARÓMETRO DE CLIMA INMOBILIARIO & FIABILIDAD (LENGUAJE CIUDADANO) */}
                  {(() => {
                    const info = getZoneReliability(selectedDistrict, Boolean(kpiData.is_prediction));
                    return (
                      <div 
                        style={{
                          backgroundColor: info.bg,
                          border: `0.5px solid ${info.borderColor}`,
                          borderRadius: '14px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: info.titleColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {info.title}
                          </span>
                          <span 
                            style={{ 
                              fontSize: '9px', 
                              fontWeight: '700', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: '#ffffff', 
                              color: info.titleColor,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                          >
                            {info.tag}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: '#3a3a3c', lineHeight: 1.35, fontWeight: '400' }}>
                          {info.description}
                        </p>
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
                            color: '#0071e3',
                            backgroundColor: 'rgba(0, 113, 227, 0.08)',
                            border: '0.5px solid rgba(0, 113, 227, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-block'
                          }}
                          title="Dato oficial del Ayuntamiento de Madrid"
                        >
                          ✓ DATO OFICIAL
                        </span>
                      )}
                    </div>
                    <div className="v2-val">
                      {activeProfile.id === 'inversion' 
                        ? (kpiData.p_m2 * 100).toFixed(2) + '%' 
                        : new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiData.p_m2 || 0) + '€'}
                    </div>
                  </div>
                  
                  <div className="v2-kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label>{activeProfile.id === 'inversion' ? 'Ticket de Inversión' : 'Ticket Medio'}</label>
                        <InfoTooltip 
                          title={activeProfile.id === 'inversion' ? 'Ticket de Inversión' : 'Ticket Medio de Vivienda'}
                          description="El coste total estimado de una vivienda completa estándar en este distrito o barrio (para un piso tipo de 75 a 85 m²)."
                          example="En lugar de calcular el coste por metro, te indica directamente cuánto dinero necesitas en total para comprar o alquilar un piso típico en esta zona."
                          ruleOfThumb="Te ayuda a saber de un vistazo si la zona entra dentro de tu presupuesto global."
                        />
                      </div>
                      {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                    </div>
                    <div className="v2-val">
                      {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpiData.p_vivienda || 0)}€
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
                        {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                      </div>
                      
                      <div className="v2-val" style={{ fontSize: '24px', margin: '4px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span>LTV: {ltvPercent}%</span>
                        <span style={{ fontSize: '11px', fontWeight: '500', color: '#86868b' }}>
                          Aporta: {100 - ltvPercent}%
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#1d1d1f', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#86868b' }}>Hipoteca Estimada:</span>
                          <span style={{ fontWeight: '600' }}>
                            {new Intl.NumberFormat('es-ES').format(Math.round((kpiData.p_vivienda || 0) * (ltvPercent / 100)))}€
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#86868b' }}>Aportación Comprador:</span>
                          <span style={{ fontWeight: '600' }}>
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
                                padding: '3px 0',
                                fontSize: '10px',
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: ltvPercent === val ? activeProfile.color : 'rgba(0,0,0,0.05)',
                                color: ltvPercent === val ? '#ffffff' : '#1d1d1f',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Preset: {val}%
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#86868b' }}>AJUSTE MANUAL LTV:</span>
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
                                  width: '38px',
                                  border: '0.5px solid #d2d2d7',
                                  borderRadius: '4px',
                                  padding: '1px 3px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  textAlign: 'center',
                                  color: '#1d1d1f',
                                  outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#1d1d1f' }}>%</span>
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
                              background: '#e5e5ea',
                              outline: 'none',
                              margin: '2px 0'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: '#86868b', fontWeight: '500', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ff9f0a', flexShrink: 0 }}>
                          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7.5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                          <path d="M9 18h6" />
                          <path d="M10 22h4" />
                        </svg>
                        <span style={{ color: '#1d1d1f', fontWeight: '600' }}>
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
                        {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                        </div>
                        <div className="v2-val" style={{ color: activeProfile.color }}>
                          {amortizacionAnios > 0 ? amortizacionAnios.toFixed(1) + ' años' : '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px', fontWeight: '500' }}>
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
                    let statusColor = '#86868b';
                    if (aniosRenta > 0) {
                      if (aniosRenta < 5) {
                        statusText = 'Asequible para habitantes típicos';
                        statusColor = '#009d71';
                      } else if (aniosRenta < 8) {
                        statusText = 'Moderado para habitantes típicos';
                        statusColor = '#ff9f0a';
                      } else {
                        statusText = 'Difícil para habitantes típicos';
                        statusColor = '#ff453a';
                      }
                    }

                    const parsedIncome = parseFloat(userPurchaseIncome);
                    const parsedSavings = parseFloat(userPurchaseSavings);
                    const hasUserSim = showPurchaseSim && !isNaN(parsedIncome) && parsedIncome > 0;
                    
                    const userAnios = hasUserSim ? precioMedio / parsedIncome : 0;
                    let userAniosStatus = '';
                    let userAniosColor = '#86868b';
                    if (userAnios > 0) {
                      if (userAnios < 3) {
                        userAniosStatus = 'Muy asequible';
                        userAniosColor = '#009d71';
                      } else if (userAnios < 6) {
                        userAniosStatus = 'Moderado';
                        userAniosColor = '#ff9f0a';
                      } else {
                        userAniosStatus = 'Poco asequible';
                        userAniosColor = '#ff453a';
                      }
                    }

                    const userEntradaPct = hasUserSim && precioMedio > 0 ? (parsedSavings / precioMedio) * 100 : 0;
                    let userEntradaStatus = '';
                    let userEntradaColor = '#86868b';
                    if (userEntradaPct > 0) {
                      if (userEntradaPct >= 30) {
                        userEntradaStatus = 'Hipoteca moderada';
                        userEntradaColor = '#009d71';
                      } else if (userEntradaPct >= 20) {
                        userEntradaStatus = 'Hipoteca estándar';
                        userEntradaColor = '#ff9f0a';
                      } else {
                        userEntradaStatus = 'Hipoteca de alto riesgo';
                        userEntradaColor = '#ff453a';
                      }
                    }

                    return (
                      <div className="v2-kpi-card" style={{ border: `1.5px solid ${activeProfile.color}44`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#86868b', letterSpacing: '0.5px' }}>
                              PODER ADQUISITIVO {selectedBarrio !== 'Todos' ? 'DEL BARRIO' : (selectedDistrict !== 'Todos' ? 'DEL DISTRITO' : 'DE MADRID')}
                            </label>
                            <InfoTooltip 
                              title="Poder Adquisitivo y Años de Renta"
                              description="Mide cuántos años de ingresos anuales brutos íntegros necesita una familia residente típica de esta zona para comprar una vivienda media."
                              example="Si un piso medio cuesta 350.000€ y la renta media del hogar en la zona es de 50.000€/año, se necesitan 7 años íntegros de sueldo."
                              ruleOfThumb="Menos de 5 años se considera asequible; entre 5 y 8 años moderado; más de 8 años supone un esfuerzo elevado."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Precio medio vivienda: <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(precioMedio)}€</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Renta media {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(rentaAnual)}€/año</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Años de renta media: <strong style={{ fontSize: '14px' }}>{aniosRenta > 0 ? aniosRenta.toFixed(1) : '-'} años</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: statusColor }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                          <span>{statusText}</span>
                        </div>

                        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #f5f5f7', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d1d1f' }}>¿Tu situación es diferente?</span>
                          
                          <div>
                            <label style={{ fontSize: '10px', color: '#86868b' }}>Ingresos anuales (€)</label>
                            <input 
                              type="number" 
                              value={userPurchaseIncome} 
                              onChange={(e) => { setUserPurchaseIncome(e.target.value); setShowPurchaseSim(false); }} 
                              placeholder="Ej: 80000" 
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                            />
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '10px', color: '#86868b' }}>Ahorros disponibles (€)</label>
                            <input 
                              type="number" 
                              value={userPurchaseSavings} 
                              onChange={(e) => { setUserPurchaseSavings(e.target.value); setShowPurchaseSim(false); }} 
                              placeholder="Ej: 150000" 
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                            />
                          </div>

                          <button 
                            onClick={() => setShowPurchaseSim(true)}
                            style={{ width: '100%', background: activeProfile.color, color: 'white', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '4px' }}
                          >
                            Calcular MI caso
                          </button>
                        </div>

                        {hasUserSim && (
                          <div style={{ marginTop: '6px', padding: '10px', background: '#f5f5f7', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease' }}>
                            <div>
                              <span style={{ color: '#86868b' }}>Con tus ingresos ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedIncome)}€/año):</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span>Serían <strong>{userAnios.toFixed(1)} años</strong> → <strong style={{ color: userAniosColor }}>{userAniosStatus}</strong></span>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userAniosColor }} />
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#86868b' }}>Con tus ahorros ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(parsedSavings)}€):</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span>Entrada: <strong>{userEntradaPct.toFixed(0)}%</strong> → <strong style={{ color: userEntradaColor }}>{userEntradaStatus}</strong></span>
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
                    
                    let statusColor = '#86868b';
                    if (dedicar > 0) {
                      if (dedicar < 25) statusColor = '#009d71';
                      else if (dedicar < 35) statusColor = '#ff9f0a';
                      else statusColor = '#ff453a';
                    }

                    const parsedSalary = parseFloat(userRentSalary);
                    const hasUserSalary = !isNaN(parsedSalary) && parsedSalary > 0;
                    const userEffort = hasUserSalary ? (alquiler / parsedSalary) * 100 : 0;
                    
                    let userStatusColor = '#86868b';
                    if (userEffort > 0) {
                      if (userEffort < 25) userStatusColor = '#009d71';
                      else if (userEffort < 35) userStatusColor = '#ff9f0a';
                      else userStatusColor = '#ff453a';
                    }
                    
                    return (
                      <div className="v2-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#86868b', letterSpacing: '0.5px' }}>ESFUERZO DE ALQUILER</label>
                            <InfoTooltip 
                              title="Tasa de Esfuerzo Financiero en Alquiler"
                              description="El porcentaje del sueldo neto mensual que una persona o familia debe destinar a pagar el alquiler de la vivienda en esta zona."
                              example="Pon tu sueldo mensual (ej. 1.800€). Si el alquiler medio es 900€, tu esfuerzo sería del 50%. Con 3.000€, sería del 30%."
                              ruleOfThumb="El Banco de España recomienda no superar el 30%-35% del sueldo neto. Superar el 40% se considera sobreesfuerzo crítico."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Alquiler medio {selectedBarrio !== 'Todos' ? 'en el barrio' : (selectedDistrict !== 'Todos' ? 'en el distrito' : 'en Madrid')}: <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(alquiler)}€/mes</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Renta media {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(rentaMediaMensual)}€/mes <span style={{ fontSize: '10px', color: '#86868b', fontWeight: 'normal' }}>(dato INE)</span></strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Esfuerzo {selectedBarrio !== 'Todos' ? 'en este barrio' : (selectedDistrict !== 'Todos' ? 'en este distrito' : 'en Madrid')}: <strong style={{ fontSize: '14px' }}>{dedicar > 0 ? dedicar.toFixed(0) + '%' : '-'}</strong>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                        </div>
                        
                        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #f5f5f7' }}>
                          <label style={{ fontSize: '10px', fontWeight: '600', color: '#86868b' }}>¿Cuál es TU renta?</label>
                          <input 
                            type="number" 
                            value={userRentSalary} 
                            onChange={(e) => setUserRentSalary(e.target.value)} 
                            placeholder="Sueldo neto mensual (€)" 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '11px', marginTop: '4px', outline: 'none' }}
                          />
                          <span style={{ fontSize: '9px', color: '#86868b', display: 'block', marginTop: '2px' }}>(Opcional, para comparar)</span>
                        </div>

                        {hasUserSalary && (
                          <div style={{ marginTop: '4px', padding: '8px', background: '#f5f5f7', borderRadius: '8px', fontSize: '11px', animation: 'v2FadeIn 0.2s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span>Tu esfuerzo real sería: <strong>{userEffort.toFixed(0)}%</strong></span>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: userStatusColor }} />
                            </div>
                            <span style={{ color: '#86868b', fontSize: '10px' }}>
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
                    let liquidezColor = '#ff453a';
                    if (transacciones > 300) {
                      liquidezText = 'Liquidez alta (fácil vender)';
                      liquidezColor = '#009d71';
                    } else if (transacciones > 100) {
                      liquidezText = 'Liquidez media';
                      liquidezColor = '#ff9f0a';
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
                            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#86868b', letterSpacing: '0.5px' }}>OPORTUNIDAD DE INVERSIÓN</label>
                            <InfoTooltip 
                              title="Oportunidad y Rentabilidad de Inversión"
                              description="Combina el rendimiento neto del alquiler con el volumen anual de transacciones para evaluar qué tan rápido y rentable es invertir aquí."
                              example="Un ROI neto del 4.5% con alta liquidez permite ingresar rentas estables con facilidad para vender si necesitas recuperar el capital."
                              ruleOfThumb="A mayor liquidez (más de 300 transacciones/año), menor riesgo de quedarte atrapado con el inmueble en caso de querer venderlo."
                            />
                          </div>
                          {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          GRM {selectedBarrio !== 'Todos' ? 'del barrio' : (selectedDistrict !== 'Todos' ? 'del distrito' : 'de Madrid')}: <strong style={{ fontSize: '14px', display: 'block', marginTop: '2px' }}>{grm > 0 ? grm.toFixed(1) : '-'} años <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#86868b' }}>(recuperación)</span></strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          ROI Neto esperado: <strong style={{ fontSize: '14px', display: 'block', color: '#009d71', marginTop: '2px' }}>{roiNeto > 0 ? roiNeto.toFixed(1) : '-'}%/año</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
                          Volumen de transacciones: <strong style={{ fontSize: '14px' }}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones)}/año</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: liquidezColor }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: liquidezColor }} />
                          <span>{liquidezText}</span>
                        </div>

                        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #f5f5f7', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d1d1f' }}>¿Quieres simular tu inversión?</span>
                          
                          <div>
                            <label style={{ fontSize: '10px', color: '#86868b' }}>Capital inicial (€)</label>
                            <input 
                              type="number" 
                              value={userInvCapital} 
                              onChange={(e) => { setUserInvCapital(e.target.value); setShowInvSim(false); }} 
                              placeholder="Ej: 300000" 
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                            />
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '10px', color: '#86868b' }}>Duración (años)</label>
                            <input 
                              type="number" 
                              value={userInvDuration} 
                              onChange={(e) => { setUserInvDuration(e.target.value); setShowInvSim(false); }} 
                              placeholder="Ej: 5" 
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '11px', marginTop: '2px', outline: 'none' }}
                            />
                          </div>

                          <button 
                            onClick={() => setShowInvSim(true)}
                            style={{ width: '100%', background: activeProfile.color, color: 'white', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '4px' }}
                          >
                            Ver proyección
                          </button>
                        </div>

                        {hasInvSim && (
                          <div style={{ marginTop: '6px', padding: '10px', background: '#f5f5f7', borderRadius: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'v2FadeIn 0.2s ease', maxHeight: '180px', overflowY: 'auto' }}>
                            <strong style={{ fontSize: '10px', textTransform: 'uppercase', color: '#86868b' }}>Proyección Simulada</strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid #d2d2d7', paddingBottom: '6px' }}>
                              {projectionRows.map(row => (
                                <div key={row.year} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Año {row.year}:</span>
                                  <span>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.from)}€ → <strong>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(row.to)}€</strong></span>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#1d1d1f' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ganancia total:</span>
                                <strong style={{ color: '#009d71' }}>+{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(totalGain)}€ (+{gainPct.toFixed(0)}%)</strong>
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
                    let velocityColor = '#ff453a'; // red
                    if (velocity > 0) {
                      if (velocity < 2.0) {
                        velocityLabel = 'Rápido';
                        velocityColor = '#009d71'; // green
                      } else if (velocity < 3.0) {
                        velocityLabel = 'Moderado';
                        velocityColor = '#ff9f0a'; // orange
                      }
                    }
                    
                    let demandText = 'Baja';
                    let demandColor = '#ff453a';
                    if (transacciones > 300) {
                      demandText = 'Alta';
                      demandColor = '#009d71';
                    } else if (transacciones > 100) {
                      demandText = 'Moderada';
                      demandColor = '#ff9f0a';
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
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span>{velocity > 0 ? (velocity % 1 === 0 ? velocity.toFixed(0) : velocity.toFixed(1)) + ' ' + (velocity === 1 ? 'mes' : 'meses') : '-'}</span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: velocityColor }}>
                              ({velocityLabel})
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
                            Velocidad de venta estimada promedio
                          </div>
                        </div>

                        <div className="v2-kpi-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label>¿Hay demanda en la zona?</label>
                              <InfoTooltip 
                                title="Demanda y Liquidez Local"
                                description="Número de operaciones de compraventa cerradas en el último año según los registros notariales oficiales."
                                example="Más de 300 transacciones anuales indican un barrio muy dinámico con compradores buscando activamente piso cada semana."
                                ruleOfThumb="Alta demanda facilita cerrar operaciones a precio de mercado sin necesidad de aplicar grandes rebajas."
                              />
                            </div>
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                          </div>
                          <div className="v2-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{transacciones > 0 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(transacciones) + ' trans./año' : '-'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: demandColor }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: demandColor }} />
                              {demandText}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
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
                            {kpiData.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                          </div>
                          <div className="v2-val" style={{ color: '#009d71' }}>
                            {appRate > 0 ? `+${gain6m}%` : appRate < 0 ? `${gain6m}%` : '0.0%'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>
                            más de precio si esperas
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <div className="v2-map-col">
                <div className="v2-map-card">
                  <div className="v2-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="v2-pill">Mapas Interactivos</div>
                    <button
                      onClick={() => setShowMapHelpModal(true)}
                      style={{
                        background: '#f5f5f7',
                        border: '0.5px solid #d2d2d7',
                        borderRadius: '16px',
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#1d1d1f',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5ea')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f7')}
                    >
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '15px', 
                        height: '15px', 
                        borderRadius: '50%', 
                        background: '#0071e3', 
                        color: '#fff', 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        fontStyle: 'italic', 
                        fontFamily: 'serif' 
                      }}>i</span>
                      <span>¿Cómo usar el mapa?</span>
                    </button>
                  </div>

                  <div className="v2-dual-maps">
                    <div className="v2-map-sub">
                      <span>Distritos</span>
                      <div className="v2-map-placeholder" style={{ border: 'none' }}>
                        <MadridMap 
                          type="districts"
                          data={mapData.districts}
                          selectedYear={Number(selectedYear)}
                          selectedMonth={selectedMonth} 
                          selectedProfile={activeProfile.label} 
                          selectedDistrict={selectedDistrict === 'Todos' ? null : selectedDistrict}
                          selectedBarrio={selectedBarrio === 'Todos' ? null : selectedBarrio}
                          onDistrictClick={(d) => setSelectedDistrict(d || 'Todos')}
                        />
                      </div>
                    </div>
                    <div className="v2-map-sub">
                      <span>Barrios</span>
                      <div className="v2-map-placeholder" style={{ border: 'none' }}>
                        <MadridMap 
                          type="neighborhoods"
                          data={mapData.neighborhoods}
                          selectedYear={Number(selectedYear)}
                          selectedMonth={selectedMonth} 
                          selectedProfile={activeProfile.label} 
                          selectedDistrict={selectedDistrict === 'Todos' ? null : selectedDistrict}
                          selectedBarrio={selectedBarrio === 'Todos' ? null : selectedBarrio}
                          onDistrictClick={(d) => setSelectedDistrict(d || 'Todos')}
                        />
                      </div>
                    </div>
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
                    ? 'Exploración de Demanda' 
                    : activeProfile.id === 'inversion' 
                      ? 'Exploración de Vivienda Rentable' 
                      : 'Exploración de Vivienda Asequible'}
                </div>
                <div className="v2-rank-settings">
                  <label>Ver por:</label>
                  <div className="v2-tabs-bg small">
                    <span className="v2-indicator" style={{ transform: `translateX(${rankingLevel === 'Distritos' ? '0' : '100%'})`, width: '80px' }} />
                    <button className={`v2-tab-btn ${rankingLevel === 'Distritos' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setRankingLevel('Distritos')}>Distritos</button>
                    <button className={`v2-tab-btn ${rankingLevel === 'Barrios' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setRankingLevel('Barrios')}>Barrios</button>
                  </div>
                </div>
                <div className="v2-rank-desc">
                  {activeProfile.id === 'venta'
                    ? `Analiza el volumen de transacciones y encuentra las zonas con mayor demanda para el año ${selectedYear}.`
                    : activeProfile.id === 'inversion' 
                      ? `Analiza la evolución mensual y encuentra las zonas con rentabilidad más alta para el año ${selectedYear}.` 
                      : `Analiza la evolución mensual y encuentra las zonas con precios más bajos para el año ${selectedYear}.`}
                </div>
              </div>

              {/* COL 2: AFFORDABILITY / RENTABILITY / DEMAND RANKINGS */}
              <div className="v2-explorer-col v2-rankings-stack" style={{ minWidth: '260px' }}>
                {activeProfile.id === 'venta' ? (
                  <div className="v2-rank-mini-card" style={{ background: '#fbfbfd', padding: '16px', borderRadius: '16px', border: '0.5px solid var(--v2-border)', width: '100%' }}>
                    <div className="v2-rank-head" style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700' }}>
                        {rankingLevel === 'Distritos' ? 'Distritos con mayor demanda' : 'Barrios con mayor demanda'}
                      </span>
                      <span className="v2-rank-sub">Top 10 zonas con mayor volumen de transacciones</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #d2d2d7', textAlign: 'left', color: '#86868b' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '500' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '500', textAlign: 'right' }}>DEMANDA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.topDist : rankings.topBarr).map((item, i) => {
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f5f5f7' }}>
                              <td style={{ padding: '8px 0', color: '#1d1d1f', fontWeight: '600' }}>
                                {i+1}. {item.name}
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', color: '#ff9f0a', fontWeight: '600' }}>
                                {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(item.value)} trans.
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : activeProfile.id !== 'inversion' ? (
                  <div className="v2-rank-mini-card" style={{ background: '#fbfbfd', padding: '16px', borderRadius: '16px', border: '0.5px solid var(--v2-border)', width: '100%' }}>
                    <div className="v2-rank-head" style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700' }}>
                        {rankingLevel === 'Distritos' ? 'Distritos más asequibles' : 'Barrios más asequibles'}
                      </span>
                      <span className="v2-rank-sub">Top 10 zonas con menor carga financiera</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #d2d2d7', textAlign: 'left', color: '#86868b' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '500' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '500', textAlign: 'right' }}>PRECIO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.botDist : rankings.botBarr).map((item, i) => {
                          const price = item.value || 0;
                          
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f5f5f7' }}>
                              <td style={{ padding: '8px 0', color: '#1d1d1f', fontWeight: '600' }}>
                                {i+1}. {item.name}
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', color: '#1d1d1f', fontWeight: '500' }}>
                                {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(price)}€
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="v2-rank-mini-card" style={{ background: '#fbfbfd', padding: '16px', borderRadius: '16px', border: '0.5px solid var(--v2-border)', width: '100%' }}>
                    <div className="v2-rank-head" style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700' }}>
                        {rankingLevel === 'Distritos' ? 'Amortización por Distrito' : 'Amortización por Barrio'}
                      </span>
                      <span className="v2-rank-sub">Menor tiempo de recuperación (GRM)</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #d2d2d7', textAlign: 'left', color: '#86868b' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: '500' }}>{rankingLevel === 'Distritos' ? 'DISTRITO' : 'BARRIO'}</th>
                          <th style={{ paddingBottom: '8px', fontWeight: '500', textAlign: 'right' }}>AÑOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rankingLevel === 'Distritos' ? rankings.topDist : rankings.topBarr).map((item, i) => {
                          const yearsVal = item.value > 0 ? (1 / item.value).toFixed(1) + ' años' : '-';
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f5f5f7' }}>
                              <td style={{ padding: '8px 0', color: '#1d1d1f', fontWeight: '600' }}>
                                {i+1}. {item.name}
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', color: '#af52de', fontWeight: '600' }}>
                                {yearsVal}
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
              <div className="v2-explorer-col v2-heatmap-area">
                <div className="v2-heatmap-card">
                  <div className="v2-heatmap-head">
                    {activeProfile.id === 'inversion' ? 'Evolución Mensual de Rentabilidad (Heatmap)' : 'Evolución Mensual de Precios (Heatmap)'}
                  </div>
                  {Number(selectedYear) === 2026 && (
                    <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '12px', paddingLeft: '4px' }}>
                      * Nota: Los datos del mes 1 al 6 son reales (Banco de Datos Ayto. de Madrid); del <strong>mes 7 al 12</strong> son <strong>estimaciones de nuestra IA</strong>.
                    </div>
                  )}
                  {Number(selectedYear) > 2026 && (
                    <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '12px', paddingLeft: '4px' }}>
                      * Nota: Todos los meses mostrados para el año {selectedYear} son <strong>predicciones de nuestra IA</strong> basadas en datos históricos.
                    </div>
                  )}
                  <div className="v2-heatmap-scroll">
                    <table className="v2-heatmap-table">
                      <thead>
                        <tr>
                          <th>{rankingLevel === 'Distritos' ? 'Distrito' : 'Barrio'}</th>
                          {[...Array(12)].map((_, i) => <th key={i+1}>{i+1}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(heatmapData) && heatmapData.length > 0 ? (
                          heatmapData.map((row, idx) => {
                            const vals = Object.keys(row).filter(k => k.startsWith('m')).map(k => row[k]).filter(v => v > 0);
                            const min = Math.min(...vals);
                            const max = Math.max(...vals);
                            
                            let rgbBase = '0, 81, 135'; // default alquiler
                            if (activeProfile.id === 'compra') rgbBase = '0, 157, 113';
                            else if (activeProfile.id === 'venta') rgbBase = '255, 159, 10';
                            else if (activeProfile.id === 'inversion') rgbBase = '175, 82, 222';
                            
                            return (
                              <tr key={idx}>
                                <td className="zona-name">{row.zona}</td>
                                {[...Array(12)].map((_, i) => {
                                  const val = row[`m${i+1}`];
                                  const opacity = val > 0 ? 0.2 + ((val - min) / (max - min || 1)) * 0.8 : 0;
                                  const bgColor = val > 0 ? `rgba(${rgbBase}, ${opacity})` : 'transparent';
                                  const textColor = opacity > 0.65 ? '#ffffff' : '#1d1d1f';
                                  return (
                                    <td key={i+1} style={{ backgroundColor: bgColor, color: textColor }}>
                                      {val > 0 
                                        ? activeProfile.id === 'inversion' 
                                          ? (val * 100).toFixed(1) + '%' 
                                          : val.toFixed(1) + '€' 
                                        : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })

                        ) : (
                          <tr><td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: '#86868b' }}>No hay datos disponibles para el año {selectedYear}</td></tr>
                        )}
                      </tbody>
                    </table>
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
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1d1d1f' }}>
                        Liquidez por {liquidityLevel === 'distrito' ? 'Distrito' : 'Barrio'}
                      </h3>
                      <div className="v2-tabs-bg small">
                        <span className="v2-indicator" style={{ transform: `translateX(${liquidityLevel === 'distrito' ? '0' : '100%'})`, width: '80px' }} />
                        <button className={`v2-tab-btn ${liquidityLevel === 'distrito' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setLiquidityLevel('distrito')}>Distritos</button>
                        <button className={`v2-tab-btn ${liquidityLevel === 'barrio' ? 'active' : ''}`} style={{ minWidth: '80px' }} onClick={() => setLiquidityLevel('barrio')}>Barrios</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#86868b', marginBottom: '20px' }}>
                      Responde: ¿Si necesito vender, cuánto tardo?
                    </div>
                    
                    <div className="v2-connectivity-list">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #d2d2d7', textAlign: 'left', color: '#86868b' }}>
                            <th style={{ paddingBottom: '8px', fontWeight: '500' }}>{liquidityLevel === 'distrito' ? 'DISTRITO' : 'BARRIO'}</th>
                            <th style={{ paddingBottom: '8px', fontWeight: '500', textAlign: 'center' }}>TRANSACCIONES/AÑO</th>
                            <th style={{ paddingBottom: '8px', fontWeight: '500', textAlign: 'right' }}>¿PUEDO VENDER RÁPIDO?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(liquidityData) && liquidityData.length > 0 ? (
                            liquidityData.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f5f5f7' }}>
                                <td style={{ padding: '12px 0', color: '#1d1d1f', fontWeight: '600' }}>
                                  {idx + 1}. {item.name}
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'center', color: '#1d1d1f', fontWeight: '500' }}>
                                  {item.transactions}
                                </td>
                                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                  {renderLightningBolts(item.stars, item.speed, item.color)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#86868b' }}>
                                No hay datos de liquidez disponibles.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* COLUMNA DERECHA: IMPACTO DE TIPOS DE INTERES */}
                  <div className="v2-connectivity-selectors" style={{ borderLeft: '0.5px solid var(--v2-border)', paddingLeft: '40px', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1d1d1f' }}>
                        Impacto de Tipos de Interés (Euríbor Trend)
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#86868b' }}>
                        Relación entre Euríbor y Precio m² de compraventa
                      </span>
                    </div>

                    {/* Contenedor del gráfico ChartJS */}
                    <div style={{ position: 'relative', height: '240px', width: '100%', marginBottom: '16px' }}>
                      <canvas id="v2-chart-euribor"></canvas>
                    </div>

                    {/* Matriz Riesgo-Retorno */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', paddingTop: '16px', borderTop: '0.5px solid var(--v2-border)' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1d1d1f' }}>
                        Matriz Riesgo-Retorno
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#86868b', marginBottom: '8px' }}>
                        Volatilidad histórica vs. ROI esperado
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
            <section className="v2-compare-section">
              <div className="v2-section-header">
                <h2>Comparación de zonas</h2>
                <div className="v2-tabs-container" style={{ flex: 'none' }}>
                  <div className="v2-tabs-bg">
                    <span className="v2-indicator" style={{ transform: `translateX(${compareLevel === 'Distritos' ? '0' : '100%'})`, width: '110px' }} />
                    <button className={`v2-tab-btn ${compareLevel === 'Distritos' ? 'active' : ''}`} style={{ minWidth: '110px' }} onClick={() => handleLevelToggle('Distritos')}>Distritos</button>
                    <button className={`v2-tab-btn ${compareLevel === 'Barrios' ? 'active' : ''}`} style={{ minWidth: '110px' }} onClick={() => handleLevelToggle('Barrios')}>Barrios</button>
                  </div>
                </div>
              </div>

              <div className="v2-compare-viewport">
                <div className="v2-compare-grid">
                  {/* ZONA A (IZQ) */}
                  <div className="v2-comp-col">
                    <div className={`v2-dropdown-container ${activeDropdown === 'zoneA' ? 'v2-z-up' : ''}`} style={{ marginBottom: '16px' }}>
                      <span className="v2-filter-label">Zona A</span>
                      <div className={`v2-custom-select ${activeDropdown === 'zoneA' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'zoneA' ? null : 'zoneA')}>
                        {selectedZoneA}
                        {activeDropdown === 'zoneA' && (
                          <div className="v2-dropdown-menu">
                            {(compareLevel === 'Distritos' ? availableDistricts : availableBarrios).map(z => (
                              <div key={z} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedZoneA(z); setActiveDropdown(null); }}>{z}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="v2-chart-card">
                      <div className="v2-chart-head">
                        Evolución {p.id === 'inversion' ? 'Rentabilidad' : 'Precio m²'} ({p.label}) - {selectedZoneA}
                      </div>
                      <div className="v2-chart-wrap"><canvas id={`v2-chartA-${p.id}`}></canvas></div>
                    </div>
                    {(() => {
                      if (p.id === 'inversion') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad ? (kpiDataA.rentabilidad * 100 * 0.85).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ROI NETO {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad > 0 ? (1 / kpiDataA.rentabilidad).toFixed(1) + ' años' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                GRM {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataA.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.rentabilidad ? (kpiDataA.rentabilidad * 100).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ROI % {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataA.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.renta_media ? new Intl.NumberFormat('es-ES').format(Math.round(kpiDataA.renta_media)) + ' €' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PODER ADQUISITIVO {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.variacion_anual !== undefined ? (kpiDataA.variacion_anual > 0 ? '+' : '') + kpiDataA.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataA.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {velocityA_text}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VELOCIDAD DE VENTA {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: `5px solid ${activeProfile.color}` }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataA.variacion_anual !== undefined ? (kpiDataA.variacion_anual > 0 ? '+' : '') + kpiDataA.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneA.toUpperCase()}
                                {kpiDataA.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                  <div className="v2-comp-col">
                    <div className={`v2-dropdown-container ${activeDropdown === 'zoneB' ? 'v2-z-up' : ''}`} style={{ marginBottom: '16px' }}>
                      <span className="v2-filter-label">Zona B</span>
                      <div className={`v2-custom-select ${activeDropdown === 'zoneB' ? 'open' : ''}`} onClick={() => setActiveDropdown(activeDropdown === 'zoneB' ? null : 'zoneB')}>
                        {selectedZoneB}
                        {activeDropdown === 'zoneB' && (
                          <div className="v2-dropdown-menu">
                            {(compareLevel === 'Distritos' ? availableDistricts : availableBarrios).map(z => (
                              <div key={z} className="v2-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedZoneB(z); setActiveDropdown(null); }}>{z}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="v2-chart-card">
                      <div className="v2-chart-head">
                        Evolución {p.id === 'inversion' ? 'Rentabilidad' : 'Precio m²'} ({p.label}) - {selectedZoneB}
                      </div>
                      <div className="v2-chart-wrap"><canvas id={`v2-chartB-${p.id}`}></canvas></div>
                    </div>
                    {(() => {
                      if (p.id === 'inversion') {
                        return (
                          <div className="v2-comp-kpis-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad ? (kpiDataB.rentabilidad * 100 * 0.85).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ROI NETO {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad > 0 ? (1 / kpiDataB.rentabilidad).toFixed(1) + ' años' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                GRM {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataB.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.rentabilidad ? (kpiDataB.rentabilidad * 100).toFixed(2) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                ROI % {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataB.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.renta_media ? new Intl.NumberFormat('es-ES').format(Math.round(kpiDataB.renta_media)) + ' €' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PODER ADQUISITIVO {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.variacion_anual !== undefined ? (kpiDataB.variacion_anual > 0 ? '+' : '') + kpiDataB.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.precio_m2 ? new Intl.NumberFormat('es-ES').format(kpiDataB.precio_m2) + ' €/m²' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                PRECIO M² {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {velocityB_text}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VELOCIDAD DE VENTA {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
                              </div>
                            </div>
                            <div className="v2-mini-kpi-card" style={{ borderTop: '5px solid #1d1d1f' }}>
                              <div className="v" style={{ fontSize: '20px' }}>
                                {kpiDataB.variacion_anual !== undefined ? (kpiDataB.variacion_anual > 0 ? '+' : '') + kpiDataB.variacion_anual.toFixed(1) + '%' : '-'}
                              </div>
                              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                VARIACIÓN ANUAL {selectedZoneB.toUpperCase()}
                                {kpiDataB.is_prediction && <span style={predBadgeStyle}>Predicción</span>}
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
                    <span>Ver comparativa superpuesta</span>
                  </div>
                  <div className="v2-overlay-body">
                    <div className="v2-chart-wrap large">
                      <canvas id={`v2-overlay-${p.id}`}></canvas>
                    </div>
                  </div>
                </div>
              </div>
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
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '0.5px solid rgba(0,0,0,0.08)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1d1d1f' }}>
                  ¿Cómo entender estos precios?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#86868b' }}>
                  Guía rápida para interpretar las cifras sin rodeos matemáticos.
                </p>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                style={{
                  background: '#f5f5f7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#86868b',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5ea')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f7')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Bloque 1: Real */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Precios Reales Oficiales (Hasta Junio 2026)
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                    Son precios fácticos extraídos directamente del Banco de Datos oficial del Ayuntamiento de Madrid. Si ves la etiqueta <strong style={{ color: '#0071e3' }}>✓ DATO OFICIAL</strong>, ese es el precio real registrado de los contratos y ventas.
                  </div>
                </div>
              </div>

              {/* Bloque 2: Futuro */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#af52de', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Previsiones Estimadas (Julio 2026 a 2028)
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                    Nuestros modelos estadísticos y predictivos analizan el histórico de más de 10.000 operaciones y viviendas, los tipos de interés y la demanda de cada barrio para proyectar qué precio cabe esperar en los próximos meses y años.
                  </div>
                </div>
              </div>

              {/* Bloque 3: Semáforo de Zonas */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ff9f0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>
                    Semáforo de Fiabilidad por Zonas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#515154', lineHeight: 1.4 }}>
                    <div>
                      <strong style={{ color: '#007a55' }}>Zonas Muy Estables</strong> (ej. Retiro, Salamanca, Chamberí): Precios firmes y continuos. La previsión estimada es altamente fiable.
                    </div>
                    <div>
                      <strong style={{ color: '#b25e00' }}>Zonas Rápidas o en Auge</strong> (ej. Centro, Usera, Moncloa, Villaverde): Barrios con gran rotación turística o familias mudándose desde el centro. Los precios reales se mueven con mayor dinamismo.
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
                backgroundColor: '#0071e3',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0077ed')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0071e3')}
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
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '0.5px solid rgba(0,0,0,0.08)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1d1d1f' }}>
                  ¿Cómo usar los mapas interactivos?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#86868b' }}>
                  Guía para explorar distritos y barrios de Madrid sin perderte.
                </p>
              </div>
              <button 
                onClick={() => setShowMapHelpModal(false)}
                style={{
                  background: '#f5f5f7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#86868b',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5ea')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f7')}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Paso 1: Colores */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Escala de Colores
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                    Los <strong>colores más oscuros e intensos</strong> representan las zonas con precios por m² o rentabilidades más elevadas (ej. Salamanca, Chamberí, Centro). Los <strong>tonos claros o pasteles</strong> señalan barrios más económicos y accesibles.
                  </div>
                </div>
              </div>

              {/* Paso 2: Clic para profundizar */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Haz clic en un distrito para ver sus barrios
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                    Al pulsar sobre cualquier distrito en el mapa izquierdo, la cámara enfoca automáticamente y el mapa de la derecha te muestra todos sus barrios al detalle. Si haces clic de nuevo sobre el mismo distrito, vuelves a la vista general de Madrid.
                  </div>
                </div>
              </div>

              {/* Paso 3: Pasar el cursor */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Precios al pasar el cursor
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
                    Apoya el puntero del ratón sobre cualquier barrio o distrito para ver su precio exacto por m², el coste estimado de una vivienda y si es un dato oficial certificado o una previsión.
                  </div>
                </div>
              </div>

              {/* Paso 4: Mapa Fijo */}
              <div style={{ display: 'flex', gap: '14px', padding: '14px', backgroundColor: '#f9f9fb', borderRadius: '16px', border: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0071e3', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>
                    Mapa Estático y Estable
                  </div>
                  <div style={{ fontSize: '12px', color: '#515154', lineHeight: 1.45 }}>
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
                backgroundColor: '#0071e3',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0077ed')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0071e3')}
            >
              ¡Entendido, gracias!
            </button>
          </div>
        </div>
      )}

      <button className="v2-btn-chat" onClick={() => router.push('/madrid/chat')}>
        <img src="/AMBI.png" alt="AMBI" style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
      </button>

      {/* FOOTER */}
      <footer className="apple-footer">
        <div className="footer-content">
          <div className="footer-brand">Madrid Urban Intelligent</div>
          <div className="footer-slogan">&ldquo;Transformando datos urbanos en decisiones inteligentes para todos los ciudadanos.&rdquo;</div>
          <div className="footer-bottom">
            <span>© 2026 Madrid Urban Intelligent. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MadridDashboardV2;
