'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  type: 'districts' | 'neighborhoods';
  data: any[]; // Data from /api/map
  selectedYear: number;
  selectedMonth: string;
  selectedProfile: string;
  selectedDistrict: string | null;
  selectedBarrio?: string | null;
  selectedZone?: string | null;
  selectedZoneType?: 'districts' | 'neighborhoods';
  drillDownOnSelection?: boolean;
  compareZoneA?: string;
  compareZoneB?: string;
  onDistrictClick: (districtName: string | null) => void;
  onBarrioClick?: (barrioName: string | null) => void;
  onZoneHover?: (zoneName: string | null, context?: MapZoneHoverContext) => void;
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

const getProfileAccentColor = (profile: string): string => {
  const p = normalize(profile);
  if (p.includes('alquiler')) return '#00F0FF';
  if (p.includes('compra')) return '#A855F7';
  if (p.includes('venta')) return '#FF5C5C';
  if (p.includes('inversion')) return '#00E5FF';
  return '#00F0FF';
};

const getProfileKey = (profile: string): 'alquiler' | 'compra' | 'venta' | 'inversion' => {
  const p = normalize(profile);
  if (p.includes('compra')) return 'compra';
  if (p.includes('venta')) return 'venta';
  if (p.includes('invers')) return 'inversion';
  return 'alquiler';
};

const getChoroplethTier = (val: number, profile: string): number => {
  if (!val || val <= 0) return 0;
  const p = normalize(profile);

  if (p.includes('alquiler')) {
    if (val >= 25) return 5;
    if (val >= 22) return 4;
    if (val >= 19) return 3;
    if (val >= 16) return 2;
    return 1;
  }

  if (p.includes('compra') || p.includes('venta')) {
    if (val >= 6800) return 5;
    if (val >= 5400) return 4;
    if (val >= 4200) return 3;
    if (val >= 3100) return 2;
    if (val >= 2100) return 1;
    return 0;
  }

  if (p.includes('inversion')) {
    if (val >= 0.074) return 5;
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
  baseFill: string;
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
    baseFill: '#08254a',
    dotColor: {
      alquiler: '#023868',
      compra: '#201844',
      venta: '#38141c',
      inversion: '#023868',
    },
  },
  {
    size: 10.5,
    r: 1.25,
    baseFill: '#0a3b68',
    dotColor: {
      alquiler: '#025894',
      compra: '#3c207b',
      venta: '#5e1728',
      inversion: '#025894',
    },
  },
  {
    size: 8.8,
    r: 1.4,
    baseFill: '#075d86',
    dotColor: {
      alquiler: '#0077b6',
      compra: '#631fa0',
      venta: '#931834',
      inversion: '#0077b6',
    },
  },
  {
    size: 7.2,
    r: 1.55,
    baseFill: '#058caf',
    dotColor: {
      alquiler: '#0099cc',
      compra: '#8c24e6',
      venta: '#c81840',
      inversion: '#0099cc',
    },
  },
  {
    size: 6.0,
    r: 1.75,
    baseFill: '#00c8e6',
    dotColor: {
      alquiler: '#00c8e6',
      compra: '#b060ff',
      venta: '#f43f5e',
      inversion: '#00c8e6',
    },
  },
  {
    size: 4.8,
    r: 1.9,
    baseFill: '#00f0ff',
    dotColor: {
      alquiler: '#00f0ff',
      compra: '#d8b4fe',
      venta: '#ff5c77',
      inversion: '#00f0ff',
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
      const p1 = (s * 0.25).toFixed(2);
      const p2 = (s * 0.75).toFixed(2);
      const glowHtml = tier.hasGlow
        ? `<circle cx="${p1}" cy="${p1}" r="${(r * 0.5).toFixed(2)}" fill="#ffffff" /><circle cx="${p2}" cy="${p2}" r="${(r * 0.5).toFixed(2)}" fill="#ffffff" />`
        : '';

      markup += `<pattern id="dot-pat-${instanceId}-${prof}-${index}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${tier.baseFill}" fill-opacity="0.94" /><circle cx="${p1}" cy="${p1}" r="${r}" fill="${c}" /><circle cx="${p2}" cy="${p2}" r="${r}" fill="${c}" />${glowHtml}</pattern>`;
    });
  }

  // Explicit pattern for areas without an observation in the selected period.
  markup += `<pattern id="no-data-pat-${instanceId}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#17263b" /><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#71859a" stroke-width="1" opacity="0.65" /></pattern>`;

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
  type, data, selectedYear, selectedMonth, selectedProfile, 
  selectedDistrict, selectedBarrio, selectedZone = null, selectedZoneType, drillDownOnSelection = true, compareZoneA, compareZoneB, onDistrictClick, onBarrioClick, onZoneHover
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const onZoneHoverRef = useRef(onZoneHover);
  const hasInitialViewRef = useRef(false);
  const containerId = useRef(`map-${type}-${Math.random().toString(36).slice(2, 11)}`).current;
  const accentColor = getProfileAccentColor(selectedProfile);
  const profileKey = getProfileKey(selectedProfile);
  onZoneHoverRef.current = onZoneHover;

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
    return {
      // Use five solid choropleth steps so the map reads as data, not texture.
      fillColor: !hasObservedValue ? `url(#no-data-pat-${containerId})` : isCompareA ? '#00E5FF' : isCompareB ? '#FFB86B' : isSelected ? '#00F0FF' : TIER_CONFIGS[tier].baseFill,
      weight: isCompareA || isCompareB ? 2.5 : isSelected ? 2.5 : type === 'districts' ? 1.2 : 0.85,
      opacity: isExcluded ? 0.20 : 0.95,
      color: isCompareA ? '#00E5FF' : isCompareB ? '#FFB86B' : isSelected ? '#FFFFFF' : 'rgba(0, 240, 255, 0.45)',
      fillOpacity: isExcluded ? 0.25 : 1.0,
    };
  }, [data, selectedDistrict, selectedBarrio, selectedZone, selectedZoneType, type, selectedProfile, compareZoneA, compareZoneB]);

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
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      mapRef.current.dragging?.disable();
      mapRef.current.touchZoom?.disable();
      mapRef.current.doubleClickZoom?.disable();
      mapRef.current.scrollWheelZoom?.disable();
      mapRef.current.boxZoom?.disable();
      mapRef.current.keyboard?.disable();
    };
    initializeMap();

    const handleResize = () => {
      const map = mapRef.current;
      const container = document.getElementById(containerId);
      if (!map || !container?.clientWidth || !container.clientHeight) return;
      map.invalidateSize({ pan: false });
      window.requestAnimationFrame(() => {
        const layer = geoJsonLayerRef.current;
        if (!layer || !mapRef.current) return;
        let bounds = L.latLngBounds([]);
        if (selectedBarrio && type === 'neighborhoods') {
          layer.eachLayer((featureLayer: any) => {
            const name = featureLayer.feature?.properties?.barrio || featureLayer.feature?.properties?.name;
            if (name && normalize(name) === normalize(selectedBarrio)) bounds.extend(featureLayer.getBounds());
          });
        } else if (selectedDistrict) {
          layer.eachLayer((featureLayer: any) => {
            const props = featureLayer.feature?.properties || {};
            const featureName = type === 'districts'
              ? props.distrito || props.name || props.nombre || props.distrito_nombre
              : props.distrito || props.nombre || props.name || props.distrito_nombre;
            if (featureName && normalize(featureName) === normalize(selectedDistrict)) bounds.extend(featureLayer.getBounds());
          });
        }
        if (!bounds.isValid()) {
          bounds = type === 'districts'
            ? L.latLngBounds([40.285, -3.890], [40.640, -3.470])
            : layer.getBounds();
        }
        if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [12, 12], animate: false });
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
          
          const hasHoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
          layer.on({
            mouseover: (e) => {
              if (!hasHoverPointer) return;
              onZoneHoverRef.current?.(zoneId, getHoverContext(e));
              const l = e.target;
              l.setStyle({
                weight: 2,
                color: '#00F0FF',
                fillColor: '#00F0FF',
                fillOpacity: 1
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
            click: () => {
              if (type === 'districts') {
                const targetName = drillDownOnSelection ? districtName : zoneId;
                onDistrictClick(compareZoneA !== undefined ? targetName : normalize(targetName) === normalize(selectedDistrict) ? null : targetName);
              } else if (onBarrioClick) {
                const targetName = drillDownOnSelection ? name : zoneId;
                onBarrioClick(compareZoneA !== undefined ? targetName : normalize(targetName) === normalize(selectedBarrio) ? null : targetName);
              }
            }
          });
        }
      }).addTo(mapRef.current!);

      // Inject pattern defs into the Leaflet overlay SVG
      injectPatternsIntoLeaflet(mapRef.current, containerId);

      // Zoom logic
      if (drillDownOnSelection && selectedBarrio && type === 'neighborhoods') {
        const bounds = L.latLngBounds([]);
        geoJsonLayerRef.current.eachLayer((layer: any) => {
          const props = layer.feature.properties;
          const featureBarrio = props.barrio || props.name;
          if (featureBarrio && normalize(featureBarrio) === normalize(selectedBarrio)) {
            bounds.extend(layer.getBounds());
          }
        });
        if (bounds.isValid()) {
          mapRef.current?.flyToBounds(bounds, { padding: [40, 40], duration: 1.5 });
        }
      } else if (drillDownOnSelection && selectedDistrict) {
        const bounds = L.latLngBounds([]);
        geoJsonLayerRef.current.eachLayer((layer: any) => {
          const props = layer.feature.properties;
          const featureDistrict = props.distrito || props.nombre || props.name || props.distrito_nombre;
          if (normalize(featureDistrict) === normalize(selectedDistrict)) {
            bounds.extend(layer.getBounds());
          }
        });
        if (bounds.isValid()) {
          mapRef.current?.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
        }
      } else if (!hasInitialViewRef.current) {
        if (type === 'districts') {
          const urbanBounds = L.latLngBounds([40.285, -3.890], [40.640, -3.470]);
          mapRef.current?.flyToBounds(urbanBounds, { padding: [20, 15], duration: 1 });
        } else {
          const bounds = geoJsonLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current?.flyToBounds(bounds, { padding: [10, 10], duration: 1 });
          }
        }
        hasInitialViewRef.current = true;
      }
    };

    loadGeoJson();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('v2:fullscreen-open', redrawAfterFullscreenOpen);
    };
  }, [type, data, selectedProfile, selectedDistrict, selectedBarrio, selectedZone, drillDownOnSelection, containerId, selectedMonth, selectedYear, onDistrictClick, onBarrioClick, style, accentColor]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, minHeight: 0, borderRadius: '12px', overflow: 'hidden', background: 'transparent', border: 0 }}>
      <div 
        id={containerId} 
        style={{ 
          width: '100%', 
          height: '100%', 
          minWidth: 0,
          minHeight: 0,
          background: 'transparent'
        }} 
      />
      <div className="v2-map-location-label" style={{
        position: 'absolute',
        bottom: '8px',
        left: '12px',
        right: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 500,
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(186, 204, 214, 0.55)',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)'
      }}>
        <span>Madrid · Red Urbana</span>
        <span>{type === 'districts' ? '21 Distritos' : '131 Barrios'}</span>
      </div>
    </div>
  );
};

export default MadridMap;
