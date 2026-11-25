'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  type: 'districts' | 'neighborhoods';
  data: any[]; // Data from /api/map
  selectedYear: number;
  selectedMonth: string;
  isProjection?: boolean;
  selectedProfile: string;
  selectedDistrict: string | null;
  selectedBarrio?: string | null;
  selectedZone?: string | null;
  selectedZoneType?: 'districts' | 'neighborhoods';
  drillDownOnSelection?: boolean;
  isMobile?: boolean;
  compareZoneA?: string;
  compareZoneB?: string;
  onDistrictClick: (districtName: string | null) => void;
  onBarrioClick?: (barrioName: string | null) => void;
  onZoneHover?: (zoneName: string | null, context?: MapZoneHoverContext) => void;
  onBackgroundClick?: () => void;
}

export type MapZoneHoverContext = {
  zoneId: string;
  zoneType: 'districts' | 'neighborhoods';
  item: any | null;
  rank: number;
  total: number;
  point: { x: number; y: number };
  bounds: { left: number; top: number; right: number; bottom: number };
};

const normalize = (str: string) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

const MADRID_NAME_EXCEPTIONS: Record<string, string> = {
  'Puente De Vallecas': 'Puente de Vallecas',
  'Villa De Vallecas': 'Villa de Vallecas',
  'Alameda De Osuna': 'Alameda de Osuna',
};
const formatMadridName = (value: string) => MADRID_NAME_EXCEPTIONS[value] || value;

const getChoroplethTier = (val: number, profile: string): number => {
  if (!val || val <= 0) return 0;
  const p = normalize(profile);

  if (p.includes('alquiler')) {
    if (val >= 25) return 4;
    if (val >= 22) return 3;
    if (val >= 19) return 2;
    if (val >= 16) return 1;
    return 0;
  }

  if (p.includes('compra') || p.includes('venta')) {
    if (val >= 6800) return 4;
    if (val >= 5200) return 3;
    if (val >= 3800) return 2;
    if (val >= 2500) return 1;
    return 0;
  }

  if (p.includes('inversion')) {
    if (val >= 0.065) return 4;
    if (val >= 0.057) return 3;
    if (val >= 0.050) return 2;
    if (val >= 0.043) return 1;
    return 0;
  }

  return 2;
};

interface TierConfig {
  size: number;
  r: number;
  baseFill: {
    alquiler: string;
    compra: string;
    venta: string;
    inversion: string;
  };
  dotColor: {
    alquiler: string;
    compra: string;
    venta: string;
    inversion: string;
  };
  hasGlow?: boolean;
}

const TIER_CONFIGS: TierConfig[] = [
  {
    size: 13,
    r: 1.05,
    baseFill: {
      alquiler: '#08254a',
      compra: '#3a200a',
      venta: '#042a17',
      inversion: '#33103d',
    },
    dotColor: {
      alquiler: '#023868',
      compra: '#522d0d',
      venta: '#073e23',
      inversion: '#481657',
    },
  },
  {
    size: 10.5,
    r: 1.25,
    baseFill: {
      alquiler: '#0a3b68',
      compra: '#783c07',
      venta: '#0b5732',
      inversion: '#571c66',
    },
    dotColor: {
      alquiler: '#025894',
      compra: '#964d09',
      venta: '#0e7041',
      inversion: '#712485',
    },
  },
  {
    size: 8.8,
    r: 1.4,
    baseFill: {
      alquiler: '#075d86',
      compra: '#b86a04',
      venta: '#13884e',
      inversion: '#872b9d',
    },
    dotColor: {
      alquiler: '#0077b6',
      compra: '#d47b06',
      venta: '#18aa62',
      inversion: '#a436be',
    },
  },
  {
    size: 7.2,
    r: 1.55,
    baseFill: {
      alquiler: '#058caf',
      compra: '#e59b12',
      venta: '#22be6f',
      inversion: '#be46dc',
    },
    dotColor: {
      alquiler: '#0099cc',
      compra: '#fab020',
      venta: '#2de085',
      inversion: '#d254f1',
    },
  },
  {
    size: 6.0,
    r: 1.75,
    baseFill: {
      alquiler: '#00c8e6',
      compra: '#ffc83b',
      venta: '#4eed9f',
      inversion: '#e879f9',
    },
    dotColor: {
      alquiler: '#00c8e6',
      compra: '#ffd359',
      venta: '#69f5b2',
      inversion: '#e879f9',
    },
  },
  {
    size: 4.8,
    r: 1.9,
    baseFill: {
      alquiler: '#00f0ff',
      compra: '#ffe58f',
      venta: '#88ffca',
      inversion: '#f8baff',
    },
    dotColor: {
      alquiler: '#00f0ff',
      compra: '#ffedb3',
      venta: '#aeffdc',
      inversion: '#fbcfff',
    },
    hasGlow: true,
  },
];

function getPatternDefsMarkup(instanceId: string): string {
  const profiles: ('alquiler' | 'compra' | 'venta' | 'inversion')[] = ['alquiler', 'compra', 'venta', 'inversion'];
  let markup = '';

  for (const prof of profiles) {
    TIER_CONFIGS.forEach((tier, index) => {
      const s = tier.size;
      const r = tier.r;
      const c = tier.dotColor[prof];
      const base = tier.baseFill[prof];
      const p1 = (s * 0.25).toFixed(2);
      const p2 = (s * 0.75).toFixed(2);
      const glowHtml = tier.hasGlow
        ? `<circle cx="${p1}" cy="${p1}" r="${(r * 0.5).toFixed(2)}" fill="#ffffff" /><circle cx="${p2}" cy="${p2}" r="${(r * 0.5).toFixed(2)}" fill="#ffffff" />`
        : '';

      markup += `<pattern id="dot-pat-${instanceId}-${prof}-${index}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${base}" fill-opacity="0.94" /><circle cx="${p1}" cy="${p1}" r="${r}" fill="${c}" /><circle cx="${p2}" cy="${p2}" r="${r}" fill="${c}" />${glowHtml}</pattern>`;
    });
  }

  // Explicit pattern for areas without an observation in the selected period.
  markup += `<pattern id="no-data-pat-${instanceId}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#17263b" /><path d="M-2 2L2-2M0 10L10 0M8 12L12 8" stroke="#71859a" stroke-width="0.8" opacity="0.48" /></pattern>`;

  // Hover pattern
  markup += `<pattern id="dot-pat-${instanceId}-hover" width="5.0" height="5.0" patternUnits="userSpaceOnUse"><rect width="5.0" height="5.0" fill="#003566" fill-opacity="0.96" /><circle cx="1.25" cy="1.25" r="2.0" fill="#00f0ff" /><circle cx="1.25" cy="1.25" r="1.0" fill="#ffffff" /><circle cx="3.75" cy="3.75" r="2.0" fill="#00f0ff" /><circle cx="3.75" cy="3.75" r="1.0" fill="#ffffff" /></pattern>`;

  // Selected pattern
  markup += `<pattern id="dot-pat-${instanceId}-selected" width="4.6" height="4.6" patternUnits="userSpaceOnUse"><rect width="4.6" height="4.6" fill="#004680" fill-opacity="0.98" /><circle cx="1.15" cy="1.15" r="2.1" fill="#00f0ff" /><circle cx="1.15" cy="1.15" r="1.05" fill="#ffffff" /><circle cx="3.45" cy="3.45" r="2.1" fill="#00f0ff" /><circle cx="3.45" cy="3.45" r="1.05" fill="#ffffff" /></pattern>`;

  return markup;
}

function injectPatternsIntoLeaflet(map: L.Map | null, instanceId: string) {
  if (!map) return;
  try {
    const pane = map.getPanes().overlayPane;
    const svg = pane?.querySelector('svg');
    if (!svg) return;

    const defsId = `defs-leaflet-${instanceId}`;
    let defs = svg.querySelector(`#${defsId}`);
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('id', defsId);
      svg.insertBefore(defs, svg.firstChild);
    }
    defs.innerHTML = getPatternDefsMarkup(instanceId);
  } catch (err) {
    console.warn('SVG defs injection error:', err);
  }
}

// In-memory GeoJSON cache to ensure instant renders
let cachedDistritosGeoJson: any = null;
let cachedBarriosGeoJson: any = null;

const MadridMap: React.FC<MapProps> = ({ 
  type, data, selectedYear, selectedMonth, isProjection = false, selectedProfile, 
  selectedDistrict, selectedBarrio, selectedZone = null, selectedZoneType, drillDownOnSelection = true, isMobile = false, compareZoneA, compareZoneB, onDistrictClick, onBarrioClick, onZoneHover, onBackgroundClick
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const onZoneHoverRef = useRef(onZoneHover);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const hasInitialViewRef = useRef(false);
  const containerId = useRef(`map-${type}-${Math.random().toString(36).slice(2, 11)}`).current;
  onZoneHoverRef.current = onZoneHover;
  onBackgroundClickRef.current = onBackgroundClick;

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    geoJsonLayerRef.current = null;
  }, []);

  const style = useCallback((feature: any) => {
    const props = feature.properties || {};
    const name = props.barrio || props.name || props.distrito_nombre || props.nombre || props.distrito;
    const selectedFeatureId = type === 'districts'
      ? props.distrito || props.distrito_nombre || props.nombre || props.name
      : props.barrio || props.nombre || props.name;
    const nameForZoneSelection = selectedZoneType === type ? selectedFeatureId : name;
    
    // Check if this feature belongs to the selected district
    const featureDistrict = props.distrito || props.nombre || props.name || props.distrito_nombre;
    let isExcluded = Boolean(selectedDistrict && normalize(featureDistrict) !== normalize(selectedDistrict));

    if (selectedBarrio && type === 'neighborhoods') {
      const featureBarrio = props.barrio || props.name;
      if (featureBarrio && normalize(featureBarrio) !== normalize(selectedBarrio)) {
        isExcluded = true;
      }
    }

    const isSelected = Boolean(selectedZone && (!selectedZoneType || selectedZoneType === type) && normalize(nameForZoneSelection) === normalize(selectedZone)) || (type === 'districts'
      ? Boolean(selectedDistrict && normalize(name) === normalize(selectedDistrict))
      : Boolean(selectedBarrio && normalize(name) === normalize(selectedBarrio)));
    const isCompareA = Boolean(compareZoneA && normalize(name) === normalize(compareZoneA));
    const isCompareB = Boolean(compareZoneB && normalize(name) === normalize(compareZoneB));

    const item = data.find(d => {
      const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
      const geoName = normalize(name);
      return dName === geoName;
    });

    let val = 0;
    if (item) {
      val = selectedProfile === 'Inversión' ? (item.rentabilidad || 0) : (item.precio_m2 || 0);
    }
    const hasObservedValue = Number.isFinite(Number(val)) && Number(val) > 0;

    const tier = getChoroplethTier(val, selectedProfile);
    const pNorm = normalize(selectedProfile || '');
    const profileKey: 'alquiler' | 'compra' | 'venta' | 'inversion' =
      pNorm.includes('compra') ? 'compra' :
      pNorm.includes('venta') ? 'venta' :
      pNorm.includes('inversion') ? 'inversion' : 'alquiler';

    const defaultStrokeColor =
      type === 'districts'
        ? 'rgba(255, 255, 255, 0.95)'
        : 'rgba(255, 255, 255, 0.70)';

    return {
      // Use five solid choropleth steps so the map reads as data, not texture.
      fillColor: !hasObservedValue ? `url(#no-data-pat-${containerId})` : TIER_CONFIGS[tier].baseFill[profileKey],
      weight: isCompareA || isCompareB ? 2.5 : isSelected ? 3 : type === 'districts' ? 1.6 : 0.95,
      opacity: isExcluded ? 0.20 : 0.95,
      color: isCompareA ? '#00E5FF' : isCompareB ? '#FFB86B' : isSelected ? '#FFFFFF' : defaultStrokeColor,
      fillOpacity: isExcluded ? 0.25 : 1.0,
    };
  }, [data, selectedDistrict, selectedBarrio, selectedZone, selectedZoneType, type, selectedProfile, compareZoneA, compareZoneB, containerId]);

  useEffect(() => {
    const initializeMap = () => {
      if (mapRef.current) return;
      mapRef.current = L.map(containerId, {
        center: [40.440, -3.680],
        zoom: 11.0,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      mapRef.current.doubleClickZoom?.disable();
      mapRef.current.scrollWheelZoom?.disable();
      mapRef.current.boxZoom?.disable();
      mapRef.current.keyboard?.disable();
      if (isMobile) {
        mapRef.current.dragging?.disable();
      }
      mapRef.current.on('click', () => {
        onBackgroundClickRef.current?.();
      });
    };
    initializeMap();

    const getContextBounds = () => {
      const layer = geoJsonLayerRef.current;
      if (!layer) return null;
      const bounds = L.latLngBounds([]);
      if (drillDownOnSelection && selectedBarrio && type === 'neighborhoods') {
        layer.eachLayer((featureLayer: any) => {
          const props = featureLayer.feature?.properties || {};
          const name = props.barrio || props.name || props.nombre;
          if (name && normalize(name) === normalize(selectedBarrio)) bounds.extend(featureLayer.getBounds());
        });
      } else if (drillDownOnSelection && selectedDistrict) {
        layer.eachLayer((featureLayer: any) => {
          const props = featureLayer.feature?.properties || {};
          const name = type === 'districts'
            ? props.distrito || props.name || props.nombre || props.distrito_nombre
            : props.distrito || props.nombre || props.name || props.distrito_nombre;
          if (name && normalize(name) === normalize(selectedDistrict)) bounds.extend(featureLayer.getBounds());
        });
      }
      return bounds.isValid() ? bounds : layer.getBounds();
    };
    const fitMapToContext = () => {
      const map = mapRef.current;
      const bounds = getContextBounds();
      if (!map || !bounds?.isValid()) return false;
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return false;
      const padding: [number, number] = [Math.max(34, Math.round(size.y * 0.055)), Math.max(18, Math.round(size.x * 0.03))];
      const hasSelectedContext = drillDownOnSelection && Boolean(selectedBarrio || selectedDistrict);
      map.fitBounds(bounds, {
        padding,
        ...(hasSelectedContext ? { maxZoom: type === 'neighborhoods' && selectedBarrio ? 12.2 : 11.5 } : {}),
        animate: false,
      });
      return true;
    };

    const handleResize = () => {
      const map = mapRef.current;
      const container = document.getElementById(containerId);
      if (!map || !container?.clientWidth || !container.clientHeight) return;
      map.invalidateSize({ pan: false });
      if (!hasInitialViewRef.current) window.requestAnimationFrame(() => {
        if (fitMapToContext()) hasInitialViewRef.current = true;
      });
    };

    const container = document.getElementById(containerId);
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    const redrawAfterFullscreenOpen = () => {
      if (!container?.closest('dialog')) return;
      window.requestAnimationFrame(() => {
        // Recreate the Leaflet instance after a hidden panel enters the dialog.
        // Some initial zero-size renders keep empty SVG paths after invalidateSize.
        mapRef.current?.remove();
        mapRef.current = null;
        geoJsonLayerRef.current = null;
        hasInitialViewRef.current = false;
        initializeMap();
        window.setTimeout(() => { void loadGeoJson(); }, 40);
      });
    };
    window.addEventListener('v2:fullscreen-open', redrawAfterFullscreenOpen);

    if (container) {
      resizeObserver.observe(container);
    }

    const onTouchStartOrMove = (event: TouchEvent) => {
      const map = mapRef.current;
      if (!isMobile || !map) return;
      if (event.touches.length >= 2) {
        map.dragging?.enable();
        map.touchZoom?.enable();
      } else {
        map.dragging?.disable();
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      const map = mapRef.current;
      if (!isMobile || !map) return;
      if (event.touches.length < 2) {
        map.dragging?.disable();
      }
    };
    if (container && isMobile) {
      container.addEventListener('touchstart', onTouchStartOrMove, { passive: true });
      container.addEventListener('touchmove', onTouchStartOrMove, { passive: true });
      container.addEventListener('touchend', onTouchEnd, { passive: true });
      container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    const loadGeoJson = async () => {
      let geoData: any = type === 'districts' ? cachedDistritosGeoJson : cachedBarriosGeoJson;
      if (!geoData) {
        const url = type === 'districts' ? '/madrid_distritos.geojson' : '/barrios_polygons.geojson';
        const response = await fetch(url);
        geoData = await response.json();
        if (type === 'districts') cachedDistritosGeoJson = geoData;
        else cachedBarriosGeoJson = geoData;
      }

      if (geoJsonLayerRef.current) {
        mapRef.current?.removeLayer(geoJsonLayerRef.current);
      }
      const rankedMapRows = data
        .filter(entry => Number.isFinite(Number(selectedProfile === 'Inversión' ? entry.rentabilidad : entry.precio_m2)) && Number(selectedProfile === 'Inversión' ? entry.rentabilidad : entry.precio_m2) > 0)
        .sort((a, b) => Number(selectedProfile === 'Inversión' ? b.rentabilidad : b.precio_m2) - Number(selectedProfile === 'Inversión' ? a.rentabilidad : a.precio_m2));

      geoJsonLayerRef.current = L.geoJSON(geoData, {
        style: style,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const rawName = props.barrio || props.nombre || props.name || props.distrito_nombre || props.distrito || 'Área de Madrid';
          const name = formatMadridName(rawName);
          const rawZoneId = String(type === 'districts' ? props.distrito || props.distrito_nombre || props.nombre || props.name || rawName : props.barrio || props.nombre || props.name || rawName);
          const districtName = props.distrito || props.nombre || props.name || props.distrito_nombre;
          
          const exactItem = data.find(d => normalize(type === 'districts' ? d.distrito : d.barrio) === normalize(rawZoneId));
          const item = exactItem;
          const zoneId = String(item?.[type === 'districts' ? 'distrito' : 'barrio'] || rawZoneId);
          const zoneRank = rankedMapRows.findIndex(entry => normalize(String(entry[type === 'districts' ? 'distrito' : 'barrio'] || '')) === normalize(zoneId)) + 1;
          const mapValue = Number(selectedProfile === 'Inversión' ? item?.rentabilidad : item?.precio_m2) || 0;
          const hasMapValue = Number.isFinite(mapValue) && mapValue > 0;
          const selectedFeatureId = type === 'districts'
            ? props.distrito || props.distrito_nombre || props.nombre || props.name
            : props.barrio || props.nombre || props.name;
          const nameForZoneSelection = selectedZoneType === type ? selectedFeatureId : rawName;
          const isSelected = Boolean(selectedZone && (!selectedZoneType || selectedZoneType === type) && normalize(nameForZoneSelection) === normalize(selectedZone)) || (type === 'districts'
            ? Boolean(selectedDistrict && normalize(rawName) === normalize(selectedDistrict))
            : Boolean(selectedBarrio && normalize(rawName) === normalize(selectedBarrio)));

          const getHoverContext = (event: any): MapZoneHoverContext | undefined => {
            const nativeEvent = event?.originalEvent;
            const mapElement = mapRef.current?.getContainer();
            const mapCard = mapElement?.closest<HTMLElement>('.v2-map-sub') || mapElement;
            if (!nativeEvent || !mapCard) return undefined;
            const rect = mapCard.getBoundingClientRect();
            return {
              zoneId,
              zoneType: type,
              item: item || null,
              rank: zoneRank,
              total: rankedMapRows.length,
              point: { x: nativeEvent.clientX, y: nativeEvent.clientY },
              bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
            };
          };

          const activateFeature = () => {
            if (type === 'districts') {
              const targetName = drillDownOnSelection ? districtName : zoneId;
              onDistrictClick(compareZoneA !== undefined ? targetName : normalize(targetName) === normalize(selectedDistrict) ? null : targetName);
            } else if (onBarrioClick) {
              const targetName = drillDownOnSelection ? name : zoneId;
              onBarrioClick(compareZoneA !== undefined ? targetName : normalize(targetName) === normalize(selectedBarrio) ? null : targetName);
            }
          };
          
          const hasHoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
          layer.on({
            mouseover: (e) => {
              if (!hasHoverPointer) return;
              onZoneHoverRef.current?.(zoneId, getHoverContext(e));
              const l = e.target;
              l.setStyle({
                weight: 2,
                color: '#FFFFFF'
              });
            },
            mouseout: (e) => {
              if (hasHoverPointer) {
                onZoneHoverRef.current?.(null);
                geoJsonLayerRef.current?.resetStyle(e.target);
              }
            },
            mousemove: (e) => {
              if (!hasHoverPointer) return;
              onZoneHoverRef.current?.(zoneId, getHoverContext(e));
            },
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              activateFeature();
            },
            add: () => {
              const path = (layer as L.Path).getElement() as SVGPathElement | null;
              if (!path) return;
              const mapPaths = path.ownerSVGElement?.querySelectorAll<SVGPathElement>('path[role="button"]');
              path.setAttribute('tabindex', mapPaths?.[0] === path ? '0' : '-1');
              path.setAttribute('role', 'button');
              path.setAttribute('aria-pressed', String(isSelected));
              const unit = selectedProfile === 'Inversión' ? '%' : '€/m²';
              const displayValue = hasMapValue
                ? selectedProfile === 'Inversión'
                  ? `${(mapValue * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}`
                  : `${mapValue.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}`
                : 'sin datos disponibles';
              const levelName = type === 'districts' ? 'Distrito' : 'Barrio';
              const periodName = `${selectedMonth} ${selectedYear}${isProjection ? ', estimación' : hasMapValue ? ', dato observado' : ', sin dato publicado'}`;
              path.setAttribute('aria-label', `${levelName} ${formatMadridName(name)}: ${displayValue}, ${periodName}. Usa las flechas para recorrer zonas y pulsa Intro para seleccionar.`);
              const onPathKeyDown = (event: KeyboardEvent) => {
                if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  const paths = Array.from(path.ownerSVGElement?.querySelectorAll<SVGPathElement>('path[role="button"]') || []);
                  const currentIndex = paths.indexOf(path);
                  const nextIndex = event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? paths.length - 1
                      : (currentIndex + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + paths.length) % paths.length;
                  paths.forEach((entry, index) => entry.setAttribute('tabindex', index === nextIndex ? '0' : '-1'));
                  paths[nextIndex]?.focus();
                  return;
                }
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateFeature();
                }
              };
              path.addEventListener('keydown', onPathKeyDown);
              layer.once('remove', () => path.removeEventListener('keydown', onPathKeyDown));
            }
          });
        }
      }).addTo(mapRef.current!);

      // Inject pattern defs into the Leaflet overlay SVG
      injectPatternsIntoLeaflet(mapRef.current, containerId);

      // Both maps use their GeoJSON extent so the city framing stays aligned.
      // A map hidden on first render is fitted by ResizeObserver when it becomes visible.
      if (drillDownOnSelection && (selectedBarrio || selectedDistrict)) {
        if (fitMapToContext()) hasInitialViewRef.current = true;
      } else if (!hasInitialViewRef.current && fitMapToContext()) {
        hasInitialViewRef.current = true;
      }
    };

    loadGeoJson();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('v2:fullscreen-open', redrawAfterFullscreenOpen);
      if (container && isMobile) {
        container.removeEventListener('touchstart', onTouchStartOrMove);
        container.removeEventListener('touchmove', onTouchStartOrMove);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
      }
    };
  }, [type, data, selectedProfile, selectedDistrict, selectedBarrio, selectedZone, drillDownOnSelection, isMobile, containerId, selectedMonth, selectedYear, onDistrictClick, onBarrioClick, style]);

  const resetMapView = () => {
    const map = mapRef.current;
    const bounds = geoJsonLayerRef.current?.getBounds();
    if (!map || !bounds?.isValid()) return;
    const size = map.getSize();
    map.fitBounds(bounds, {
      padding: [Math.max(34, Math.round(size.y * 0.055)), Math.max(18, Math.round(size.x * 0.03))],
      animate: false,
    });
  };

  return (
    <div className="v2-map-canvas" style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, minHeight: 0, borderRadius: '12px', overflow: 'hidden', background: 'transparent', border: 0 }}>
      <div 
        id={containerId} 
        className="v2-leaflet-map"
        style={{ 
          width: '100%', 
          height: '100%', 
          minWidth: 0,
          minHeight: 0,
          background: 'transparent',
          touchAction: isMobile ? 'pan-y' : undefined
        }} 
      />
      <div className="v2-map-zoom-controls" role="group" aria-label={`Controles del mapa de ${type === 'districts' ? 'distritos' : 'barrios'}`}>
        <button type="button" aria-label="Acercar mapa" title="Acercar" onClick={() => mapRef.current?.zoomIn(0.75)}>+</button>
        <button type="button" aria-label="Alejar mapa" title="Alejar" onClick={() => mapRef.current?.zoomOut(0.75)}>−</button>
        <button type="button" aria-label="Restablecer vista de Madrid" title="Ver Madrid completa" onClick={resetMapView}>⌖</button>
      </div>
    </div>
  );
};

export default MadridMap;
