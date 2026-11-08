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
  onDistrictClick: (districtName: string | null) => void;
}

const normalize = (str: string) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

const getProfileAccentColor = (profile: string): string => {
  const p = normalize(profile);
  if (p.includes('alquiler')) return '#00F0FF';
  if (p.includes('compra')) return '#7928CA';
  if (p.includes('venta')) return '#FF5C5C';
  if (p.includes('inversion')) return '#00E5FF';
  return '#00F0FF';
};


const getChoroplethColor = (val: number, profile: string): string => {
  if (!val || val <= 0) return '#011833';
  const p = normalize(profile);

  if (p.includes('alquiler')) {
    if (val >= 24) return '#00F0FF';
    if (val >= 21) return '#00C8E6';
    if (val >= 18) return '#0099CC';
    if (val >= 15) return '#006699';
    if (val >= 12) return '#003D66';
    return '#012447';
  }

  if (p.includes('compra')) {
    if (val >= 7000) return '#A855F7';
    if (val >= 5500) return '#7928CA';
    if (val >= 4200) return '#00A3E0';
    if (val >= 3000) return '#006699';
    if (val >= 2000) return '#003D66';
    return '#012447';
  }

  if (p.includes('venta')) {
    if (val >= 7000) return '#FF3366';
    if (val >= 5500) return '#FF5C5C';
    if (val >= 4200) return '#00A3E0';
    if (val >= 3000) return '#006699';
    if (val >= 2000) return '#003D66';
    return '#012447';
  }

  if (p.includes('inversion')) {
    if (val >= 0.070) return '#00F0FF';
    if (val >= 0.060) return '#00C8E6';
    if (val >= 0.052) return '#0088CC';
    if (val >= 0.045) return '#005588';
    return '#012447';
  }

  return '#0088CC';
};

const MadridMap: React.FC<MapProps> = ({ 
  type, data, selectedYear, selectedMonth, selectedProfile, 
  selectedDistrict, selectedBarrio, onDistrictClick 
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const containerId = useRef(`map-${type}-${Math.random().toString(36).slice(2, 11)}`).current;
  const accentColor = getProfileAccentColor(selectedProfile);

  const style = useCallback((feature: any) => {
    const props = feature.properties || {};
    const name = props.barrio || props.name || props.distrito_nombre || props.nombre || props.distrito;
    
    // Check if this feature belongs to the selected district
    const featureDistrict = props.distrito || props.nombre || props.name || props.distrito_nombre;
    let isExcluded = selectedDistrict && normalize(featureDistrict) !== normalize(selectedDistrict);

    if (selectedBarrio && type === 'neighborhoods') {
      const featureBarrio = props.barrio || props.name;
      if (featureBarrio && normalize(featureBarrio) !== normalize(selectedBarrio)) {
        isExcluded = true;
      }
    }

    const isSelected = type === 'districts'
      ? Boolean(selectedDistrict && normalize(name) === normalize(selectedDistrict))
      : Boolean(selectedBarrio && normalize(name) === normalize(selectedBarrio));

    const item = data.find(d => {
      const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
      const geoName = normalize(name);
      return dName === geoName || dName.includes(geoName) || geoName.includes(dName);
    });

    let val = 0;
    if (item) {
      val = selectedProfile === 'Inversión' ? (item.rentabilidad || 0) : (item.precio_m2 || 0);
    }

    const choroplethFill = getChoroplethColor(val, selectedProfile);

    return {
      fillColor: isSelected ? accentColor : choroplethFill,
      weight: isSelected ? 2.5 : 1,
      opacity: isExcluded ? 0.18 : 0.95,
      color: isSelected ? '#FFFFFF' : 'rgba(0, 240, 255, 0.45)',
      fillOpacity: isExcluded ? 0.10 : isSelected ? 0.85 : 0.65
    };
  }, [data, selectedDistrict, selectedBarrio, type, accentColor, selectedProfile]);

  useEffect(() => {
    if (!mapRef.current) {
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
    }

    const handleResize = () => {
      mapRef.current?.invalidateSize();
    };

    const container = document.getElementById(containerId);
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (container) {
      resizeObserver.observe(container);
    }

    const loadGeoJson = async () => {
      const url = type === 'districts' ? '/madrid_distritos.geojson' : '/barrios_polygons.geojson';
      const response = await fetch(url);
      const geoData = await response.json();

      if (geoJsonLayerRef.current) {
        mapRef.current?.removeLayer(geoJsonLayerRef.current);
      }

      geoJsonLayerRef.current = L.geoJSON(geoData, {
        style: style,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const name = props.barrio || props.nombre || props.name || props.distrito_nombre || props.distrito || 'Área de Madrid';
          const districtName = props.distrito || props.nombre || props.name || props.distrito_nombre;
          
          const isDatePredicted = selectedYear > 2026 || (selectedYear === 2026 && !['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'].includes(selectedMonth));
          
          const item = data.find(d => {
            const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
            const geoName = normalize(name);
            return dName === geoName || dName.includes(geoName) || geoName.includes(dName);
          });
          
          let popupContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px; min-width: 190px; border-radius: 12px; color: #FFFFFF;">`;
          popupContent += `<strong style="font-size: 14px; font-weight: 600; color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid rgba(186, 204, 214, 0.2); padding-bottom: 4px;">${name}</strong>`;
          
          if (item) {
            const fmtPrice = (v: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v);
            const fmtYield = (v: number) => (v * 100).toFixed(2) + '%';
            
            popupContent += `<div style="color: rgba(186, 204, 214, 0.9); font-size: 13px; line-height: 1.6;">`;
            
            if (selectedProfile === 'Alquiler') {
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px;"><span>Precio m² Alquiler:</span> <span style="color: ${accentColor}; font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;"><span>Alquiler Promedio:</span> <span style="color: #FFFFFF; font-weight: 600;">${fmtPrice(item.precio_vivienda)} €/mes${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            } else if (selectedProfile === 'Compra' || selectedProfile === 'Venta') {
              const label = selectedProfile === 'Compra' ? 'Compra' : 'Venta';
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px;"><span>Precio m² ${label}:</span> <span style="color: ${accentColor}; font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;"><span>Precio Vivienda:</span> <span style="color: #FFFFFF; font-weight: 600;">${fmtPrice(item.precio_vivienda)} €${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            } else if (selectedProfile === 'Inversión') {
              const buyPriceM2 = item.precio_venta_m2 || item.precio_m2;
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px;"><span>Precio m² Compra:</span> <span style="color: rgba(186, 204, 214, 0.95); font-weight: 600;">${fmtPrice(buyPriceM2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;"><span>Rentabilidad:</span> <span style="color: ${accentColor}; font-weight: 600;">${fmtYield(item.rentabilidad)}${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;"><span>Alquiler Estimado:</span> <span style="color: #00F0FF; font-weight: 600;">${fmtPrice(item.precio_alquiler || item.precio_vivienda)} €/mes${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            }
            
            popupContent += `</div>`;
          } else {
            popupContent += `<div style="color: rgba(186, 204, 214, 0.6); font-size: 12px; font-style: italic; margin-top: 4px;">Sin datos registrados por el Ayuntamiento de Madrid</div>`;
          }
          popupContent += `</div>`;
          
          layer.bindPopup(popupContent, {
            className: 'apple-popup',
            closeButton: false,
            offset: L.point(0, -10),
            autoPan: false
          });
          
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                weight: 2,
                color: accentColor,
                fillColor: accentColor,
                fillOpacity: 0.75
              });
              l.openPopup();
            },
            mouseout: (e) => {
              geoJsonLayerRef.current?.resetStyle(e.target);
              e.target.closePopup();
            },
            click: () => {
              if (type === 'districts') {
                const targetName = districtName;
                onDistrictClick(normalize(targetName) === normalize(selectedDistrict) ? null : targetName);
              }
            }
          });
        }
      }).addTo(mapRef.current!);

      // Zoom logic
      if (selectedBarrio && type === 'neighborhoods') {
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
      } else if (selectedDistrict) {
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
      } else {
        if (type === 'districts') {
          const urbanBounds = L.latLngBounds([40.285, -3.890], [40.640, -3.470]);
          mapRef.current?.flyToBounds(urbanBounds, { padding: [20, 15], duration: 1 });
        } else {
          const bounds = geoJsonLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current?.flyToBounds(bounds, { padding: [10, 10], duration: 1 });
          }
        }
      }
    };

    loadGeoJson();

    return () => {
      resizeObserver.disconnect();
    };
  }, [type, data, selectedProfile, selectedDistrict, selectedBarrio, containerId, selectedMonth, selectedYear, onDistrictClick, style, accentColor]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: '#011024', border: '1px solid rgba(186, 204, 214, 0.14)' }}>
      <div 
        id={containerId} 
        style={{ 
          width: '100%', 
          height: '100%', 
          background: '#011024' 
        }} 
      />
      <div style={{
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
