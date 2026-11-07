'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Position = [number, number, ...number[]];
type Ring = Position[];
type Polygon = Ring[];
type DistrictFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | Polygon[] };
};
type FeatureCollection = { type: 'FeatureCollection'; features: DistrictFeature[] };
type ProjectedPolygon = { rings: { x: number; y: number }[][] };
type District = {
  name: string;
  area: number;
  centroid: { x: number; y: number };
  polygons: ProjectedPolygon[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};
type Layer = 'population' | 'density' | 'rent' | 'sale';

const SAMPLE: Record<string, { population: number; rent: number; sale: number }> = {
  Centro: { population: 140, rent: 23.8, sale: 5900 }, Arganzuela: { population: 156, rent: 19.5, sale: 5100 },
  Retiro: { population: 120, rent: 20.8, sale: 5900 }, Salamanca: { population: 150, rent: 23.5, sale: 7100 },
  'Chamartín': { population: 147, rent: 20.1, sale: 6200 }, Tetuán: { population: 160, rent: 19.1, sale: 4700 },
  Chamberí: { population: 140, rent: 21.6, sale: 6100 }, 'Fuencarral-El Pardo': { population: 250, rent: 15.8, sale: 3900 },
  'Moncloa-Aravaca': { population: 122, rent: 16.8, sale: 4500 }, Latina: { population: 239, rent: 14.1, sale: 3100 },
  Carabanchel: { population: 257, rent: 15.0, sale: 3200 }, Usera: { population: 144, rent: 16.2, sale: 3000 },
  'Puente de Vallecas': { population: 233, rent: 14.3, sale: 2900 }, Moratalaz: { population: 96, rent: 14.5, sale: 3200 },
  'Ciudad Lineal': { population: 220, rent: 16.8, sale: 3900 }, Hortaleza: { population: 197, rent: 17.2, sale: 4300 },
  Villaverde: { population: 161, rent: 13.4, sale: 2600 }, 'Villa de Vallecas': { population: 120, rent: 14.8, sale: 3000 },
  Vicálvaro: { population: 82, rent: 14.7, sale: 3200 }, 'San Blas-Canillejas': { population: 161, rent: 15.9, sale: 3500 },
  Barajas: { population: 50, rent: 15.5, sale: 3800 },
};

const LAYERS: { id: Layer; label: string; unit: string; min: number; max: number }[] = [
  { id: 'population', label: 'Población', unit: 'mil hab.', min: 50, max: 260 },
  { id: 'density', label: 'Densidad', unit: 'hab./km²', min: 2500, max: 30000 },
  { id: 'rent', label: 'Alquiler', unit: '€/m²', min: 13, max: 25 },
  { id: 'sale', label: 'Venta', unit: '€/m²', min: 2500, max: 7200 },
];

function normalizeName(value: unknown): string {
  return String(value ?? '').replace(/^Distrito\s+/i, '').replace(/\s+/g, ' ').trim();
}
function seeded(seed: number) {
  let n = seed >>> 0;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}
function ringArea(ring: { x: number; y: number }[]) {
  let twice = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) twice += ring[j].x * ring[i].y - ring[i].x * ring[j].y;
  return twice / 2;
}
function pointInRing(x: number, y: number, ring: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function pointInPolygon(x: number, y: number, polygon: ProjectedPolygon) {
  return !!polygon.rings.length && pointInRing(x, y, polygon.rings[0]) && !polygon.rings.slice(1).some((ring) => pointInRing(x, y, ring));
}
function metric(district: District, layer: Layer) {
  const sample = SAMPLE[district.name] ?? { population: 100, rent: 17, sale: 3500 };
  return layer === 'population' ? sample.population * 1000 : layer === 'density' ? sample.population * 1000 / district.area : sample[layer];
}

export default function MadridDistrictMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [layer, setLayer] = useState<Layer>('population');
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; index: number } | null>(null);
  const activePointer = useRef<{ x: number; y: number; until: number } | null>(null);
  const wakeAnimation = useRef<() => void>(() => {});
  const reducedMotion = useRef(false);
  const layerRef = useRef(layer);
  const pauseRef = useRef(paused);
  const hoveredRef = useRef(hovered);
  layerRef.current = layer; pauseRef.current = paused; hoveredRef.current = hovered;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = query.matches;
    if (query.matches) setPaused(true);
    const update = () => { reducedMotion.current = query.matches; if (query.matches) setPaused(true); };
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/madrid_distritos.geojson')
      .then((response) => { if (!response.ok) throw new Error('GeoJSON no disponible'); return response.json() as Promise<FeatureCollection>; })
      .then((data) => {
        if (cancelled) return;
        const projected: District[] = [];
        const cos = Math.cos(40.48 * Math.PI / 180);
        for (let idx = 0; idx < data.features.length; idx++) {
          const feature = data.features[idx];
          const coords = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates as Polygon] : feature.geometry.coordinates as Polygon[];
          const polygons: ProjectedPolygon[] = [];
          let totalArea = 0, cx = 0, cy = 0;
          const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
          for (const poly of coords) {
            const rings = poly.map((ring) => ring.map(([lon, lat]) => ({ x: (lon + 3.7) * 111.32 * cos, y: -(lat - 40.48) * 110.57 })));
            for (const ring of rings) for (const p of ring) { bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x); bounds.minY = Math.min(bounds.minY, p.y); bounds.maxY = Math.max(bounds.maxY, p.y); }
            const areas = rings.map((ring) => ringArea(ring));
            const area = Math.max(0, Math.abs(areas[0] ?? 0) - areas.slice(1).reduce((sum, value) => sum + Math.abs(value), 0));
            const outer = rings[0] ?? [];
            const center = outer.length ? outer.reduce((p, q) => ({ x: p.x + q.x / outer.length, y: p.y + q.y / outer.length }), { x: 0, y: 0 }) : { x: 0, y: 0 };
            totalArea += area; cx += center.x * area; cy += center.y * area;
            polygons.push({ rings });
          }
          projected.push({ name: normalizeName(feature.properties.name ?? feature.properties.NAME_2 ?? feature.properties.district ?? feature.properties.nom), area: totalArea, centroid: totalArea ? { x: cx / totalArea, y: cy / totalArea } : { x: 0, y: 0 }, polygons, bounds });
        }
        const bounds = projected.reduce((b, d) => ({ minX: Math.min(b.minX, d.bounds.minX), minY: Math.min(b.minY, d.bounds.minY), maxX: Math.max(b.maxX, d.bounds.maxX), maxY: Math.max(b.maxY, d.bounds.maxY) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        const scale = 940 / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        const offsetX = (1000 - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
        const offsetY = (1000 - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;
        for (const district of projected) {
          for (const polygon of district.polygons) for (const ring of polygon.rings) for (const p of ring) { p.x = p.x * scale + offsetX; p.y = p.y * scale + offsetY; }
          district.centroid = { x: district.centroid.x * scale + offsetX, y: district.centroid.y * scale + offsetY };
          district.bounds = { minX: district.bounds.minX * scale + offsetX, minY: district.bounds.minY * scale + offsetY, maxX: district.bounds.maxX * scale + offsetX, maxY: district.bounds.maxY * scale + offsetY };
        }
        setDistricts(projected); setError(false);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const layerConfig = useMemo(() => LAYERS.find((item) => item.id === layer)!, [layer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapRef.current;
    if (!canvas || !wrapper || !districts.length) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const rand = seeded(20261107);
    const points: { x: number; y: number; district: number; border: boolean; lamp: boolean; intensity: number }[] = [];
    districts.forEach((district, districtIndex) => {
      const target = Math.max(90, Math.round(38 * Math.pow(Math.max(district.area, 1), .55)));
      const step = Math.max(.012, Math.sqrt(Math.max(district.area, .01) / target));
      for (const polygon of district.polygons) {
        const outer = polygon.rings[0] ?? [];
        for (const ring of polygon.rings) {
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i], b = ring[(i + 1) % ring.length];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const count = Math.max(1, Math.ceil(len / .25));
            for (let j = 0; j < count; j++) {
              const t = j / count;
              points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, district: districtIndex, border: true, lamp: rand() < .2, intensity: rand() });
            }
          }
        }
        const minX = Math.min(...outer.map((p) => p.x)), maxX = Math.max(...outer.map((p) => p.x));
        const minY = Math.min(...outer.map((p) => p.y)), maxY = Math.max(...outer.map((p) => p.y));
        const pitchY = step * .866;
        let row = 0;
        for (let y = minY; y <= maxY; y += pitchY, row++) {
          const shift = row % 2 ? step / 2 : 0;
          for (let x = minX + shift; x <= maxX; x += step) {
            const px = x + (rand() - .5) * step * .9, py = y + (rand() - .5) * pitchY * .9;
            if (polygon.rings.length && pointInPolygon(px, py, polygon)) points.push({ x: px, y: py, district: districtIndex, border: false, lamp: rand() < .4, intensity: rand() });
          }
        }
      }
    });
    const xs = new Float32Array(points.length), ys = new Float32Array(points.length), light = new Float32Array(points.length);
    const districtIds = new Uint8Array(points.length), flags = new Uint8Array(points.length), intensities = new Float32Array(points.length);
    points.forEach((p, i) => { xs[i] = p.x; ys[i] = p.y; districtIds[i] = p.district; flags[i] = (p.border ? 1 : 0) | (p.lamp ? 2 : 0); intensities[i] = p.intensity; });
    const lampCanvas = document.createElement('canvas'); lampCanvas.width = lampCanvas.height = 72;
    const lampCtx = lampCanvas.getContext('2d');
    if (lampCtx) {
      const glow = lampCtx.createRadialGradient(36, 36, 0, 36, 36, 36);
      glow.addColorStop(0, 'rgba(215,255,252,.98)'); glow.addColorStop(.08, 'rgba(123,255,243,.92)');
      glow.addColorStop(.26, 'rgba(39,226,211,.54)'); glow.addColorStop(1, 'rgba(0,191,177,0)');
      lampCtx.fillStyle = glow; lampCtx.fillRect(0, 0, 72, 72);
    }
    let width = 0, height = 0, dpr = 1, raf = 0, last = 0, time = 0, flickerBucket = 0;
    let visible = true, pilotIndex = 0, pilotTime = 0, pilotX = districts[0].centroid.x, pilotY = districts[0].centroid.y;
    let cursorCanvas: { x: number; y: number; until: number } | null = null;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(wrapper); resize();
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); });
    intersection.observe(wrapper);
    const draw = (stamp: number) => {
      raf = 0;
      if (!visible) return;
      if (last && stamp - last < 40) { raf = requestAnimationFrame(draw); return; }
      const dt = Math.min(.05, last ? (stamp - last) / 1000 : .016); last = stamp; time += dt;
      const scale = Math.min(width, height) / 1000, ox = (width - 1000 * scale) / 2, oy = (height - 1000 * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, '#022f2b'); bg.addColorStop(1, '#011715'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
      const pointer = activePointer.current;
      if (!pauseRef.current && !reducedMotion.current) {
        pilotTime += dt;
        if (pilotTime >= 3.3) { pilotTime %= 3.3; pilotIndex = (pilotIndex + 1) % districts.length; }
        const target = districts[pilotIndex].centroid;
        pilotX += (target.x - pilotX) * Math.min(1, dt * 1.6); pilotY += (target.y - pilotY) * Math.min(1, dt * 1.6);
        flickerBucket += dt * 14;
        const flickers = Math.floor(flickerBucket); flickerBucket -= flickers;
        for (let i = 0; i < flickers; i++) { const index = Math.floor(rand() * points.length); light[index] = Math.max(light[index], .7 + rand() * .3); }
      }
      const pilotActive = !pauseRef.current && !reducedMotion.current && (!pointer || performance.now() > pointer.until);
      if (pilotActive) {
        const radius = 120;
        for (let i = 0; i < points.length; i++) {
          const dx = xs[i] - pilotX, dy = ys[i] - pilotY, dist = Math.hypot(dx, dy) * scale;
          if (dist < radius) light[i] = Math.max(light[i], (1 - dist / radius) ** 2 * ((flags[i] & 2) ? 1 : .28));
        }
      }
      const cursor = cursorCanvas && performance.now() < cursorCanvas.until ? cursorCanvas : pointer && performance.now() < pointer.until ? pointer : null;
      if (cursor) {
        const radius = Math.max(60, width * (width < 650 ? .11 : .07));
        const gradient = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, radius);
        gradient.addColorStop(0, 'rgba(30,224,205,.14)'); gradient.addColorStop(.46, 'rgba(0,191,177,.07)'); gradient.addColorStop(1, 'rgba(0,191,177,0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        const mx = (cursor.x - ox) / scale, my = (cursor.y - oy) / scale;
        for (let i = 0; i < points.length; i++) {
          const dist = Math.hypot(xs[i] - mx, ys[i] - my) * scale;
          if (dist < radius) light[i] = Math.max(light[i], (1 - dist / radius) ** 2 * ((flags[i] & 2) ? 1 : .28));
        }
      }
      const chosenLayer = layerRef.current, config = LAYERS.find((item) => item.id === chosenLayer)!;
      const selectedIndex = hoveredRef.current;
      for (let i = 0; i < points.length; i++) {
        light[i] = Math.max(0, light[i] - dt * .5);
        const district = districts[districtIds[i]], value = metric(district, chosenLayer);
        const norm = Math.max(0, Math.min(1, (value - config.min) / (config.max - config.min)));
        const border = (flags[i] & 1) !== 0, lamp = (flags[i] & 2) !== 0;
        const active = selectedIndex === districtIds[i];
        const radius = (border ? 1.45 : 1.08) * (.68 + norm * .62 + (active ? .45 : 0) + light[i] * .85) * scale;
        const alpha = Math.min(.97, (border ? .28 : .19) + norm * .28 + (active ? .30 : 0) + light[i] * .66);
        const px = ox + xs[i] * scale, py = oy + ys[i] * scale;
        if (lamp && light[i] > .04 && lampCtx) {
          ctx.globalCompositeOperation = 'lighter';
          const glowSize = radius * (7 + light[i] * 6);
          ctx.globalAlpha = Math.min(.9, light[i] * (active ? 1 : .86));
          ctx.drawImage(lampCanvas, px - glowSize / 2, py - glowSize / 2, glowSize, glowSize);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
        ctx.fillStyle = active ? '#b7fff8' : border ? '#50d4cb' : norm > .66 ? '#4edfd1' : '#309c96';
        ctx.beginPath(); ctx.arc(px, py, Math.max(.65, radius), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (!pauseRef.current || cursor) raf = requestAnimationFrame(draw);
    };
    wakeAnimation.current = () => { if (!raf) raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw);
    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      activePointer.current = { x, y, until: performance.now() + (event.pointerType === 'touch' ? 900 : 160) };
      cursorCanvas = activePointer.current;
      const scale = Math.min(width, height) / 1000, ox = (width - 1000 * scale) / 2, oy = (height - 1000 * scale) / 2;
      const mx = (x - ox) / scale, my = (y - oy) / scale;
      const index = districts.findIndex((district) => district.polygons.some((polygon) => pointInPolygon(mx, my, polygon)));
      setHovered(index >= 0 ? index : null);
      setTooltip(index >= 0 ? { x, y, index } : null);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const clearPointer = (event: PointerEvent) => { if (event.pointerType !== 'touch') { activePointer.current = null; setHovered(null); setTooltip(null); } };
    canvas.addEventListener('pointermove', updatePointer); canvas.addEventListener('pointerdown', updatePointer);
    canvas.addEventListener('pointerleave', clearPointer); canvas.addEventListener('pointerup', clearPointer);
    return () => { cancelAnimationFrame(raf); wakeAnimation.current = () => {}; resizeObserver.disconnect(); intersection.disconnect(); canvas.removeEventListener('pointermove', updatePointer); canvas.removeEventListener('pointerdown', updatePointer); canvas.removeEventListener('pointerleave', clearPointer); canvas.removeEventListener('pointerup', clearPointer); };
  }, [districts]);

  const activeDistrict = tooltip ? districts[tooltip.index] : null;
  const format = (district: District) => {
    const value = metric(district, layer);
    return layer === 'population' ? `${Math.round(value).toLocaleString('es-ES')} hab.` : layer === 'density' ? `${Math.round(value).toLocaleString('es-ES')} hab./km²` : `${value.toLocaleString('es-ES')}${layer === 'rent' ? ' €/m²' : ' €/m²'}`;
  };

  return (
    <div className="mi-district-map">
      <div className="mi-district-map__toolbar" role="group" aria-label="Capas de datos de ejemplo">
        {LAYERS.map((item) => <button key={item.id} type="button" className={layer === item.id ? 'is-active' : ''} aria-pressed={layer === item.id} onClick={() => setLayer(item.id)}>{item.label}</button>)}
        <span className="mi-district-map__sample-badge">Datos de ejemplo</span>
      </div>
      <div className="mi-district-map__canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label="Mapa interactivo de Madrid por distritos. Las intensidades muestran datos de ejemplo." role="img" />
        {!districts.length && !error && <div className="mi-district-map__loading" aria-label="Cargando mapa" />}
        {error && <div className="mi-district-map__error">No se pudo cargar el mapa de distritos.</div>}
        {activeDistrict && tooltip && <div className="mi-district-map__tooltip" style={{ left: `${Math.min(tooltip.x, (wrapRef.current?.clientWidth ?? 0) - 190)}px`, top: `${Math.max(12, tooltip.y - 92)}px` }}>
          <strong>{activeDistrict.name}</strong><span>{activeDistrict.area.toFixed(1)} km² · superficie real</span><b>{format(activeDistrict)}</b><small>Valor ilustrativo · no oficial</small>
        </div>}
        <button className="mi-district-map__pause" type="button" onClick={() => { setPaused((value) => !value); requestAnimationFrame(() => wakeAnimation.current()); }} aria-label={paused ? 'Reanudar animación del mapa' : 'Pausar animación del mapa'}>{paused ? 'Reanudar' : 'Pausar visual'}</button>
      </div>
      <div className="mi-district-map__legend"><span>Menos</span><i /><i /><i /><i /><i /><span>Más</span></div>
      <div className="mi-district-map__caption"><span>Madrid · red urbana</span><span>21 distritos</span></div>
    </div>
  );
}
