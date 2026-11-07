'use client';

import { useEffect, useState } from 'react';

type Point = [number, number];
type DistrictFeature = {
  properties?: { name?: string };
  geometry?: { type?: string; coordinates?: unknown };
};
type DistrictMapData = { features?: DistrictFeature[] };

const projectGeometry = (features: DistrictFeature[]) => {
  const rings: Array<{ name: string; points: Point[] }> = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry?.coordinates) continue;
    const polygons = geometry.type === 'Polygon'
      ? [geometry.coordinates as Point[][]]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates as Point[][][]
        : [];
    for (const polygon of polygons) {
      const exterior = polygon[0];
      if (exterior?.length) rings.push({ name: feature.properties?.name ?? '', points: exterior });
    }
  }
  if (!rings.length) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const { points } of rings) for (const [x, y] of points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const width = 520, height = 520, pad = 28;
  const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  return rings.map((ring, index) => {
    let centerX = 0, centerY = 0;
    for (const [x, y] of ring.points) { centerX += x; centerY += y; }
    centerX /= ring.points.length; centerY /= ring.points.length;
    return {
    name: ring.name,
    index,
    d: ring.points.map(([x, y], i) => `${i ? 'L' : 'M'}${(offsetX + (x - minX) * scale).toFixed(2)},${(height - offsetY - (y - minY) * scale).toFixed(2)}`).join(' ') + ' Z',
    cx: offsetX + (centerX - minX) * scale,
    cy: height - offsetY - (centerY - minY) * scale,
  }; });
};

export default function MadridDistrictMap() {
  const [districts, setDistricts] = useState<Array<{ name: string; index: number; d: string; cx: number; cy: number }>>([]);

  useEffect(() => {
    let active = true;
    fetch('/madrid_distritos.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el mapa');
        return response.json() as Promise<DistrictMapData>;
      })
      .then((data) => {
        if (active) setDistricts(projectGeometry(data.features ?? []));
      })
      .catch(() => {
        if (active) setDistricts([]);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="mi-district-map">
      {districts.length ? (
        <svg viewBox="0 0 520 520" role="img" aria-label="Mapa de los 21 distritos de Madrid">
          <title>Los 21 distritos de Madrid</title>
          <desc>Mapa municipal dividido por distritos con puntos animados que evocan actividad urbana.</desc>
          <g className="mi-district-map__shapes">
            {districts.map(({ name, index, d }) => <path key={`${name}-${index}`} d={d} className={index % 4 === 0 ? 'mi-district-map__district mi-district-map__district--accent' : 'mi-district-map__district'} />)}
          </g>
          {districts.filter(({ index }) => index % 3 === 0).map(({ cx, cy, index }) => (
            <g key={index} className="mi-district-map__beacon" style={{ animationDelay: `${index * 180}ms` }}>
              <circle cx={cx} cy={cy} r="10" className="mi-district-map__pulse" />
              <circle cx={cx} cy={cy} r="3" className="mi-district-map__point" />
            </g>
          ))}
        </svg>
      ) : <div className="mi-district-map__loading" aria-label="Cargando el mapa de Madrid" />}
      <div className="mi-district-map__caption"><span>Madrid</span><span>21 distritos</span></div>
    </div>
  );
}
