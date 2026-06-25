'use client';

import React, { useEffect, useRef, useState } from 'react';
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

const MadridMap: React.FC<MapProps> = ({ 
  type, data, selectedYear, selectedMonth, selectedProfile, 
  selectedDistrict, selectedBarrio, onDistrictClick 
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const containerId = `map-${type}-${Math.random().toString(36).substr(2, 9)}`;

  const normalize = (str: string) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  const getColor = (d: number, profile: string) => {
    // Alquiler: Blue tones (Price per m2) - Custom palette from image
    if (profile === 'Alquiler') {
      return d > 20  ? '#005187' :
             d > 16  ? '#4d82bc' :
             d > 13  ? '#84b6f4' :
             d > 10  ? '#c4dafa' :
                       '#fcffff';
    }
    // Compra: Green tones (Price per m2) - Custom palette from image
    if (profile === 'Compra') {
      return d > 6000 ? '#003817' :
             d > 4500 ? '#026842' :
             d > 3000 ? '#009d71' :
             d > 1500 ? '#5ccda7' :
                        '#98ffe0';
    }
    // Inversión: Fucsia/Purple tones (Yield/Rentabilidad)
    if (profile === 'Inversión') {
      return d > 0.065 ? '#7a0177' : // High yield (> 6.5%)
             d > 0.058 ? '#ae017e' : 
             d > 0.052 ? '#dd3497' :
             d > 0.046 ? '#f768a1' :
             d > 0.040 ? '#fbb4b9' : // Low yield (> 4%)
                         '#fff7f3';
    }
    // Venta: Orange tones (Price per m2) - Increased granularity for better contrast
    return d > 9000 ? '#8c2d04' : // Luxury areas
           d > 7000 ? '#d94801' :
           d > 5000 ? '#f16913' :
           d > 3500 ? '#fd8d3c' :
           d > 2000 ? '#fec44f' : // Yellowish-orange
                      '#fff5eb';
  };

  const style = (feature: any) => {
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
    
    let val = 0;
    if (item) {
      val = selectedProfile === 'Inversión' ? item.rentabilidad : item.precio_m2;
    }

    return {
      fillColor: isExcluded ? '#f0f0f0' : getColor(val, selectedProfile),
      weight: isExcluded ? 0.5 : 1,
      opacity: isExcluded ? 0.2 : 1,
      color: 'white',
      fillOpacity: isExcluded ? 0.1 : 0.7
    };
  };

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map(containerId, {
        center: [40.4168, -3.7038],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
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
          
          const isDatePredicted = selectedYear > 2026 || (selectedYear === 2026 && !['Enero', 'Febrero', 'Marzo'].includes(selectedMonth));
          
          const item = data.find(d => {
            const dName = normalize(type === 'districts' ? d.distrito : d.barrio);
            const geoName = normalize(name);
            return dName === geoName || dName.includes(geoName) || geoName.includes(dName);
          });
          
          let popupContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 6px; min-width: 180px; border-radius: 12px;">`;
          popupContent += `<strong style="font-size: 15px; color: #1d1d1f; display: block; margin-bottom: 8px; border-bottom: 0.5px solid #eee; padding-bottom: 4px;">${name}</strong>`;
          
          if (item) {
            const fmtPrice = (v: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v);
            const fmtYield = (v: number) => (v * 100).toFixed(2) + '%';
            
            popupContent += `<div style="color: #424245; font-size: 13px; line-height: 1.6;">`;
            
            if (selectedProfile === 'Alquiler') {
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² Alquiler:</span> <span style="color: #0071e3; font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Alquiler Promedio:</span> <span style="color: #1d1d1f; font-weight: 600;">${fmtPrice(item.precio_vivienda)} €/mes${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
            } else if (selectedProfile === 'Compra' || selectedProfile === 'Venta') {
              const label = selectedProfile === 'Compra' ? 'Compra' : 'Venta';
              const color = selectedProfile === 'Compra' ? '#34c759' : '#f59e0b';
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² ${label}:</span> <span style="color: ${color}; font-weight: 600;">${fmtPrice(item.precio_m2)} €/m²${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Precio Vivienda:</span> <span style="color: #1d1d1f; font-weight: 600;">${fmtPrice(item.precio_vivienda)} €${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
            } else if (selectedProfile === 'Inversión') {
              const buyPriceM2 = item.precio_venta_m2 || item.precio_m2;
              popupContent += `<div style="display: flex; justify-content: space-between;"><span>Precio m² Compra:</span> <span style="color: #34c759; font-weight: 600;">${fmtPrice(buyPriceM2)} €/m²${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Rentabilidad:</span> <span style="color: #af52de; font-weight: 600;">${fmtYield(item.rentabilidad)}${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
              popupContent += `<div style="display: flex; justify-content: space-between; margin-top: 2px;"><span>Alquiler Estimado:</span> <span style="color: #0071e3; font-weight: 600;">${fmtPrice(item.precio_alquiler || item.precio_vivienda)} €/mes${isDatePredicted ? ' (Pred.)' : ''}</span></div>`;
            }
            
            popupContent += `</div>`;
          } else {
            popupContent += `<div style="color: #999; font-size: 12px; font-style: italic; margin-top: 4px;">Sin datos disponibles</div>`;
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
                color: '#666',
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
        const bounds = geoJsonLayerRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current?.flyToBounds(bounds, { padding: [10, 10], duration: 1 });
        }
      }
    };

    loadGeoJson();

    return () => {
      resizeObserver.disconnect();
    };
  }, [type, data, selectedProfile, selectedDistrict, selectedBarrio]);

  return <div id={containerId} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
};

export default MadridMap;
