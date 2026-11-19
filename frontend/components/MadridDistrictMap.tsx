'use client';

import React, { useEffect, useState } from 'react';

type Position = [number, number, ...number[]];
type Ring = Position[];
type Polygon = Ring[];
type DistrictFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | Polygon[] };
};
type FeatureCollection = { type: 'FeatureCollection'; features: DistrictFeature[] };

type ProjectedDistrict = {
  name: string;
  path: string;
  tier: number;
};

const CHOROPLETH_COLORS = [
  '#08254a', // Nivel 1: Menor precio / Más accesible
  '#0a3b68', // Nivel 2: Medio-bajo
  '#075d86', // Nivel 3: Medio
  '#058caf', // Nivel 4: Medio-alto
  '#00c8e6', // Nivel 5: Mayor precio / Prime
];

const TIER_LABELS = [
  'Accesible',
  'Medio-bajo',
  'Medio',
  'Medio-alto',
  'Prime',
];

const DISTRICT_TIERS: Record<string, number> = {
  'centro': 4,
  'salamanca': 4,
  'chamberi': 4,
  'retiro': 4,
  'chamartin': 4,
  'moncloa-aravaca': 3,
  'moncloa aravaca': 3,
  'fuencarral-el pardo': 3,
  'fuencarral el pardo': 3,
  'arganzuela': 3,
  'tetuan': 3,
  'hortaleza': 3,
  'ciudad lineal': 2,
  'barajas': 2,
  'san blas': 2,
  'san blas-canillejas': 2,
  'san blas canillejas': 2,
  'moratalaz': 2,
  'latina': 1,
  'carabanchel': 1,
  'vicalvaro': 1,
  'puente de vallecas': 0,
  'usera': 0,
  'villaverde': 0,
  'villa de vallecas': 0,
};

function normalizeName(value: unknown): string {
  return String(value ?? '').replace(/^Distrito\s+/i, '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function MadridDistrictMap() {
  const [districts, setDistricts] = useState<ProjectedDistrict[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/madrid_distritos.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('GeoJSON no disponible');
        return response.json() as Promise<FeatureCollection>;
      })
      .then((data) => {
        if (cancelled) return;
        const cos = Math.cos((40.48 * Math.PI) / 180);
        const intermediate: Array<{ name: string; rings: Array<Array<{ x: number; y: number }>>; bounds: { minX: number; minY: number; maxX: number; maxY: number } }> = [];

        for (const feature of data.features) {
          const coords = feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates as Polygon]
            : (feature.geometry.coordinates as Polygon[]);

          const rings: Array<Array<{ x: number; y: number }>> = [];
          const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

          for (const poly of coords) {
            for (const ring of poly) {
              const projectedRing = ring.map(([lon, lat]) => ({
                x: (lon + 3.7) * 111.32 * cos,
                y: -(lat - 40.48) * 110.57,
              }));
              for (const p of projectedRing) {
                bounds.minX = Math.min(bounds.minX, p.x);
                bounds.maxX = Math.max(bounds.maxX, p.x);
                bounds.minY = Math.min(bounds.minY, p.y);
                bounds.maxY = Math.max(bounds.maxY, p.y);
              }
              rings.push(projectedRing);
            }
          }

          const rawName = normalizeName(
            feature.properties.name ??
            feature.properties.NAME_2 ??
            feature.properties.district ??
            feature.properties.distrito_nombre
          );

          intermediate.push({ name: rawName, rings, bounds });
        }

        const globalBounds = intermediate.reduce((b, d) => ({
          minX: Math.min(b.minX, d.bounds.minX),
          minY: Math.min(b.minY, d.bounds.minY),
          maxX: Math.max(b.maxX, d.bounds.maxX),
          maxY: Math.max(b.maxY, d.bounds.maxY),
        }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

        const scale = 940 / Math.max(globalBounds.maxX - globalBounds.minX, globalBounds.maxY - globalBounds.minY);
        const offsetX = (1000 - (globalBounds.maxX - globalBounds.minX) * scale) / 2 - globalBounds.minX * scale;
        const offsetY = (1000 - (globalBounds.maxY - globalBounds.minY) * scale) / 2 - globalBounds.minY * scale;

        const projectedList: ProjectedDistrict[] = intermediate.map((d) => {
          let svgPath = '';
          for (const ring of d.rings) {
            ring.forEach((p, i) => {
              const px = (p.x * scale + offsetX).toFixed(1);
              const py = (p.y * scale + offsetY).toFixed(1);
              svgPath += (i === 0 ? 'M' : 'L') + px + ',' + py;
            });
            svgPath += 'Z';
          }
          const tier = DISTRICT_TIERS[normalizeKey(d.name)] ?? 2;
          return { name: d.name, path: svgPath, tier };
        });

        setDistricts(projectedList);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeDistrict = hovered !== null ? districts[hovered] : null;

  return (
    <div className="mi-district-map">
      <div className="mi-district-map__svg-wrap">
        {activeDistrict && (
          <div className="mi-district-map__pill" role="status" aria-live="polite">
            <span className="mi-district-map__pill-dot" />
            <span className="mi-district-map__pill-name">
              {activeDistrict.name} · {TIER_LABELS[activeDistrict.tier]}
            </span>
          </div>
        )}

        {districts.length > 0 && (
          <svg
            viewBox="0 0 1000 1000"
            className="mi-district-map__svg"
            role="img"
            aria-label="Mapa coroplético interactivo de los 21 distritos de Madrid"
          >
            <defs>
              <filter id="choropleth-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00F0FF" floodOpacity="0.8" />
              </filter>
            </defs>
            {districts.map((d, index) => {
              const isHovered = hovered === index;
              const fill = isHovered ? '#00F0FF' : CHOROPLETH_COLORS[d.tier];
              return (
                <path
                  key={d.name}
                  d={d.path}
                  fill={fill}
                  stroke={isHovered ? '#FFFFFF' : 'rgba(0, 240, 255, 0.45)'}
                  strokeWidth={isHovered ? 2.8 : 1.2}
                  strokeLinejoin="round"
                  filter={isHovered ? 'url(#choropleth-glow)' : undefined}
                  className="mi-district-map__path"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    transition: 'fill 0.18s ease, stroke 0.18s ease, stroke-width 0.18s ease',
                    cursor: 'pointer',
                  }}
                >
                  <title>{`${d.name} (${TIER_LABELS[d.tier]})`}</title>
                </path>
              );
            })}
          </svg>
        )}

        {!districts.length && !error && (
          <div className="mi-district-map__loading" aria-label="Cargando mapa" />
        )}
        {error && (
          <div className="mi-district-map__error">No se pudo cargar el mapa de distritos.</div>
        )}
      </div>

      <div className="mi-district-map__legend-bar" aria-label="Escala de precios de menor a mayor">
        <span className="mi-district-map__legend-label">Menor precio</span>
        <div className="mi-district-map__legend-swatches" aria-hidden="true">
          {CHOROPLETH_COLORS.map((color, idx) => (
            <i key={idx} style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="mi-district-map__legend-label">Mayor precio</span>
      </div>

      <div className="mi-district-map__caption">
        <span>Madrid · mapa coroplético</span>
        <span>21 distritos</span>
      </div>
    </div>
  );
}
