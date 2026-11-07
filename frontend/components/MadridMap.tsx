'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const getColor = (d: number, profile: string) => {
  if (profile === 'Alquiler') {
    return d > 20 ? 'var(--azul-linea)' : d > 16 ? 'var(--precio-subida)' : d > 13 ? 'var(--precio-subida)' : d > 10 ? 'var(--humo-2)' : 'var(--blanco-humo)';
  }
  if (profile === 'Compra') {
    return d > 6000 ? 'var(--azul-noche)' : d > 4500 ? 'var(--azul-noche-2)' : d > 3000 ? 'var(--azul-linea)' : d > 1500 ? 'var(--precio-subida)' : 'var(--texto-secundario-azul)';
  }
  if (profile === 'Inversión') {
    return d > 0.065 ? 'var(--azul-noche-2)' : d > 0.058 ? 'var(--azul-linea)' : d > 0.052 ? 'var(--precio-subida)' : d > 0.046 ? 'var(--texto-secundario-azul)' : d > 0.040 ? 'var(--humo-2)' : 'var(--blanco-humo)';
  }
  return d > 9000 ? 'var(--azul-noche)' : d > 7000 ? 'var(--azul-noche-2)' : d > 5000 ? 'var(--azul-linea)' : d > 3500 ? 'var(--precio-subida)' : d > 2000 ? 'var(--texto-secundario-azul)' : 'var(--blanco-humo)';
};

const MadridMap: React.FC<MapProps> = ({ 
  type, data, selectedYear, selectedMonth, selectedProfile, 
  selectedDistrict, selectedBarrio, onDistrictClick 
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const containerId = useRef(`map-${type}-${Math.random().toString(36).slice(2, 11)}`).current;

  const style = useCallback((feature: any) => {
    const props = feature.properties;
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

    const item = data.find(d => {
      const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
      const geoName = normalize(name);
      return dName === geoName || dName.includes(geoName) || geoName.includes(dName);
    });

    const isSelected = type === 'districts'
      ? Boolean(selectedDistrict && normalize(name) === normalize(selectedDistrict))
      : Boolean(selectedBarrio && normalize(name) === normalize(selectedBarrio));
    
    let val = 0;
    if (item) {
      val = selectedProfile === 'Inversión' ? item.rentabilidad : item.precio_m2;
    }

    return {
      fillColor: isExcluded ? 'var(--humo-2)' : isSelected ? 'var(--coral)' : getColor(val, selectedProfile),
      weight: isExcluded ? 0.5 : 1,
      opacity: isExcluded ? 0.2 : 1,
      color: 'var(--blanco-humo)',
      fillOpacity: isExcluded ? 0.1 : isSelected ? 0.82 : 0.7
    };
  }, [data, selectedProfile, selectedDistrict, selectedBarrio, type]);

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

      // Asegurar que no se pueda desplazar ni hacer zoom por error
      mapRef.current.dragging?.disable();
      mapRef.current.touchZoom?.disable();
      mapRef.current.doubleClickZoom?.disable();
      mapRef.current.scrollWheelZoom?.disable();
      mapRef.current.boxZoom?.disable();
      mapRef.current.keyboard?.disable();

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
      }).addTo(mapRef.current);
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
          const name = props.barrio || props.nombre || props.name || props.distrito_nombre || props.distrito || "Área de Madrid";
          const districtName = props.distrito || props.nombre || props.name || props.distrito_nombre;
          
          const isDatePredicted = selectedYear > 2026 || (selectedYear === 2026 && !['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'].includes(selectedMonth));
          
          const item = data.find(d => {
            const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
            const geoName = normalize(name);
            return dName === geoName || dName.includes(geoName) || geoName.includes(dName);
          });
          
          let popupContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 6px; min-width: 180px; border-radius: 12px;">`;
          popupContent += `<strong style="font-size: 15px; color: var(--azul-noche); display: block; margin-bottom: 8px; border-bottom: 0.5px solid var(--blanco-humo); padding-bottom: 4px;">${name}</strong>`;
          
          if (item) {
            const fmtPrice = (v: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v);
            const fmtYield = (v: number) => (v * 100).toFixed(2) + '%';
            
            popupContent += `<div style="color: var(--azul-linea); font-size: 13px; line-height: 1.6;">`;
            
            if (selectedProfile === 'Alquiler') {
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² Alquiler:</span> <span style="color: var(--precio-subida); font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Alquiler Promedio:</span> <span style="color: var(--azul-noche); font-weight: 600;">${fmtPrice(item.precio_vivienda)} €/mes${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            } else if (selectedProfile === 'Compra' || selectedProfile === 'Venta') {
              const label = selectedProfile === 'Compra' ? 'Compra' : 'Venta';
              const color = selectedProfile === 'Compra' ? 'var(--azul-linea)' : 'var(--coral)';
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² ${label}:</span> <span style="color: ${color}; font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Precio Vivienda:</span> <span style="color: var(--azul-noche); font-weight: 600;">${fmtPrice(item.precio_vivienda)} €${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            } else if (selectedProfile === 'Inversión') {
              const buyPriceM2 = item.precio_venta_m2 || item.precio_m2;
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² Compra:</span> <span style="color: var(--azul-linea); font-weight: 600;">${fmtPrice(buyPriceM2)} €/m²${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Rentabilidad:</span> <span style="color: var(--texto-secundario-azul); font-weight: 600;">${fmtYield(item.rentabilidad)}${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Alquiler Estimado:</span> <span style="color: var(--precio-subida); font-weight: 600;">${fmtPrice(item.precio_alquiler || item.precio_vivienda)} €/mes${isDatePredicted ? ' (Predicción)' : ''}</span></div>`;
            }
            
            popupContent += `</div>`;
          } else {
            popupContent += `<div style="color: var(--texto-secundario-azul); font-size: 12px; font-style: italic; margin-top: 4px;">Sin datos registrados por el Ayuntamiento de Madrid</div>`;
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
                color: 'var(--azul-linea)',
                fillOpacity: 0.9
              });
              l.openPopup();
            },
            mouseout: (e) => {
              geoJsonLayerRef.current?.resetStyle(e.target);
              e.target.closePopup();
            },
            click: (e) => {
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
          // Reducción calibrada del 15% adicional y desplace inferior para dar total holgura a la tarjeta superior de Fuencarral-El Pardo
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
  }, [type, data, selectedProfile, selectedDistrict, selectedBarrio, containerId, selectedMonth, selectedYear, onDistrictClick, style]);

  return <div id={containerId} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
};

export default MadridMap;
