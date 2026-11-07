'use client';

import { useEffect, useState } from 'react';

type Point = [number, number];
type DistrictFeature = {
  properties?: { name?: string };
  geometry?: { type?: string; coordinates?: unknown };
};
type DistrictMapData = { features?: DistrictFeature[] };

type ProjectedDistrict = {
  name: string;
  index: number;
  d: string;
  cx: number;
  cy: number;
  points: Point[];
};

type MapParticle = { x: number; y: number; r: number; opacity: number; group: number };

const containsPoint = (point: Point, polygon: Point[]) => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
};

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
    const points = ring.points.map(([x, y]) => [
      offsetX + (x - minX) * scale,
      height - offsetY - (y - minY) * scale,
    ] as Point);
    return {
      name: ring.name,
      index,
      d: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ' Z',
      cx: offsetX + (centerX - minX) * scale,
      cy: height - offsetY - (centerY - minY) * scale,
      points,
    };
  });
};

const createParticles = (districts: ProjectedDistrict[]) => {
  const particles: MapParticle[] = [];
  const step = 5.3;
  districts.forEach(({ points, index }) => {
    const minX = Math.min(...points.map(([x]) => x));
    const maxX = Math.max(...points.map(([x]) => x));
    const minY = Math.min(...points.map(([, y]) => y));
    const maxY = Math.max(...points.map(([, y]) => y));
    const seed = (x: number, y: number) => {
      const value = Math.sin(x * 127.1 + y * 311.7 + index * 74.7) * 43758.5453;
      return value - Math.floor(value);
    };

    for (let row = 0; minY + row * step <= maxY; row += 1) {
      for (let column = 0; minX + column * step <= maxX; column += 1) {
        const jitterX = (seed(column, row) - 0.5) * 2.2;
        const jitterY = (seed(row + 19, column + 7) - 0.5) * 2.2;
        const x = minX + column * step + (row % 2) * step * 0.5 + jitterX;
        const y = minY + row * step + jitterY;
        if (!containsPoint([x, y], points)) continue;

        const distance = Math.hypot(x - 260, y - 260);
        const core = Math.exp(-(distance * distance) / 13500);
        const variation = seed(column + index * 13, row + index * 29);
        particles.push({
          x,
          y,
          r: 0.65 + variation * 0.65 + core * 0.35,
          opacity: Math.min(0.88, 0.12 + core * 0.58 + variation * 0.16),
          group: Math.floor(variation * 5),
        });
      }
    }
  });
  return particles;
};

export default function MadridDistrictMap() {
  const [districts, setDistricts] = useState<ProjectedDistrict[]>([]);

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

  const particles = districts.length ? createParticles(districts) : [];

  return (
    <div className="mi-district-map mi-district-map--network">
      {districts.length ? (
        <svg viewBox="0 0 520 520" role="img" aria-label="Mapa de los 21 distritos de Madrid">
          <title>Los 21 distritos de Madrid</title>
          <desc>Los límites oficiales de los distritos forman una red de puntos luminosos, más intensa en el centro de Madrid.</desc>
          <defs>
            <radialGradient id="madrid-map-core">
              <stop stopColor="#CBFFFC" stopOpacity=".2"/>
              <stop offset=".45" stopColor="#00BFB1" stopOpacity=".08"/>
              <stop offset="1" stopColor="#00BFB1" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle className="mi-district-map__core" cx="260" cy="260" r="112" fill="url(#madrid-map-core)" />
          <g className="mi-district-map__particles">
            {[0, 1, 2, 3, 4].map((group) => (
              <g key={group} className={`mi-district-map__particle-group mi-district-map__particle-group--${group}`}>
                {particles.filter((particle) => particle.group === group).map(({ x, y, r, opacity }, index) => (
                  <circle key={index} cx={x} cy={y} r={r} style={{ opacity }} />
                ))}
              </g>
            ))}
          </g>
          <g className="mi-district-map__outlines">
            {districts.map(({ name, index, d }) => <path key={`${name}-${index}`} d={d} className="mi-district-map__district" />)}
          </g>
          <circle className="mi-district-map__core-ring" cx="260" cy="260" r="25" />
          <circle className="mi-district-map__core-point" cx="260" cy="260" r="3" />
        </svg>
      ) : <div className="mi-district-map__loading" aria-label="Cargando el mapa de Madrid" />}
      <div className="mi-district-map__caption"><span>Madrid · Red urbana</span><span>21 distritos</span></div>
    </div>
  );
}
