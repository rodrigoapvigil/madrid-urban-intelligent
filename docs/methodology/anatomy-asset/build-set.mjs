import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../..");
const PUBLIC = join(ROOT, "frontend/public/assets/methodology");
const KIT = "C:/Users/FX517/.codex/skills/anatomy-asset/kit";
const k = await import(pathToFileURL(join(KIT, "iso-kit.mjs")).href);
const a = await import(pathToFileURL(join(KIT, "asset.mjs")).href);
mkdirSync(PUBLIC, { recursive: true });

const PAPER = "#02142b";
const BRAND = "#00f0ff";
const W = 640;
const H = 420;
let P;
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const brand = (svg) => `<g class="ac-brand">${svg}</g>`;
const ink = (svg) => `<g class="ac-led">${svg}</g>`;
const basePlan = { x: -140, y: -72, w: 280, d: 128, r: 8 };

function setup() {
  P = a.fitInto([...k.boxCorners(basePlan, -10, 76), [-145, -72, 94]], { x: 30, y: 25, w: 580, h: 350 }, { pad: 8, azimuth: 58 });
}
function slab(plan, z, h, tone = "mid") { return S(k.slabOf(plan, z, h, P, 5, 0.7), { tone }); }
function screw(x, y, z, r = 1.5) { return L(k.ring(x, y, r, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.5, tone: "hi" }); }
function crate(x, y, z = 11, lit = false) {
  const plan = { x: x - 20, y: y - 14, w: 40, d: 28, r: 3 };
  const body = slab(plan, z, 17, "hi");
  const lines = Array.from({ length: 4 }, (_, i) => L(k.lineOnTop([x - 12, y - 8 + i * 5], [x + 12, y - 8 + i * 5], z + 17.2, P), { tone: "lo" })).join("");
  const svg = body + L(k.planOutline(k.insetPlan(plan, 3), z + 17, P, 4), { tone: "faint" }) + lines + screw(x - 14, y - 8, z + 17) + screw(x + 14, y + 8, z + 17);
  return lit ? brand(svg) : svg;
}
function tower(x, y, z = 0, h = 65, lit = false) {
  const plan = { x: x - 24, y: y - 20, w: 48, d: 40, r: 4 };
  const svg = slab(plan, z, h, "mid") + L(k.planOutline(k.insetPlan(plan, 4), z + h, P, 4), { tone: "faint" }) + screw(x - 16, y - 13, z + h) + screw(x + 16, y + 13, z + h);
  return lit ? brand(svg) : svg;
}
function drum(x, y, r = 23, z = 0, lit = false) {
  const svg = S(k.cylinder(x, y, r, z, 42, P, 40, 0.7), { tone: "hi" }) + L(k.ring(x, y, r - 3, z + 42, P, 36), { tone: "faint" }) + L(k.sideArc(x, y, r, z + 22, P, 32), { tone: "faint" }) + screw(x, y, z + 42, 1.5);
  return lit ? brand(svg) : svg;
}
function orb(x, y, z = 20) {
  const svg = S(k.cylinder(x, y, 28, z, 34, P, 48, 0.8), { tone: "hi", lit: true }) + L(k.ring(x, y, 24, z + 34, P, 40), { tone: "lit" }) + D([at([x, y, z + 34])], { size: 1.1, tone: "lit" });
  return a.amPulse(brand(svg), { period: 4200, min: 0.72, max: 1 });
}
function foundation() {
  return `<path class="iso-halo" d="${k.haloOf(k.insetPlan(basePlan, -6), -10, 4, P)}"/>` + slab(basePlan, -10, 7, "lo") + L(k.planOutline(k.insetPlan(basePlan, 7), -3, P, 5), { tone: "faint" });
}
function pipe(x0, y0, x1, y1, z = 14, lit = false) {
  const line = L(k.lineOnTop([x0, y0], [x1, y1], z, P), { tone: lit ? "lit" : "mid" });
  return line + D([at([x0, y0, z]), at([x1, y1, z])], { size: lit ? 1.2 : 0.8, tone: lit ? "lit" : "hi" });
}
function scene(kind) {
  setup();
  const out = [foundation()];
  if (kind === "extraction") {
    out.push(tower(-72, -8, 0, 62), tower(0, -8, 0, 74), tower(72, -8, 0, 56));
    out.push(crate(-80, 36, 14), crate(-12, 36, 14), crate(58, 36, 14, true));
    out.push(pipe(-120, 32, -88, 20, 28, true), pipe(-48, 32, -20, 20, 28, true), pipe(24, 32, 52, 20, 28, true));
  } else if (kind === "transformation") {
    out.push(drum(-76, 0, 24), drum(0, 0, 24), drum(76, 0, 24, 0, true));
    out.push(crate(-82, 40, 12), crate(0, 40, 12), crate(78, 40, 12, true));
    out.push(pipe(-50, 0, -25, 0, 44), pipe(25, 0, 50, 0, 44, true));
  } else if (kind === "load") {
    out.push(tower(-74, 0, 0, 68), tower(0, 0, 0, 58), tower(74, 0, 0, 76, true));
    for (const x of [-74, -50, -26, 26, 50, 74]) out.push(screw(x, 38, 70));
    out.push(crate(-62, 40, 12), crate(24, 40, 12, true), pipe(-38, 2, 34, 2, 44, true));
  } else if (kind === "may-training") {
    out.push(tower(-84, 0, 0, 72), tower(0, 0, 0, 72), tower(84, 0, 0, 72));
    for (const x of [-84, -60, -36, -12, 12, 36, 60, 84]) out.push(ink(D([at([x, 34, 73])], { size: x === 12 ? 1.6 : 0.8, tone: "lit" })));
    out.push(crate(-42, 40, 10), crate(42, 40, 10, true), pipe(-65, 0, 65, 0, 47, true));
  } else if (kind === "september-training") {
    out.push(tower(-84, 0, 0, 72), tower(0, 0, 0, 82, true), tower(84, 0, 0, 72));
    out.push(crate(-70, 40, 10), crate(-22, 40, 10), crate(28, 40, 10), crate(76, 40, 10, true));
    out.push(pipe(-92, 0, -25, 0, 48), pipe(25, 0, 92, 0, 48, true));
    out.push(orb(0, -4, 42));
  } else if (kind === "validation") {
    out.push(tower(-82, 0, 0, 70), tower(0, 0, 0, 70), tower(82, 0, 0, 70));
    out.push(crate(-72, 40, 10), crate(72, 40, 10, true));
    out.push(pipe(-58, 0, 58, 0, 48, true));
    for (const x of [-80, -60, -40, 40, 60, 80]) out.push(D([at([x, -28, 3])], { size: 1.2, tone: "hi" }));
  } else if (kind === "datamart") {
    for (const x of [-82, -28, 28, 82]) out.push(S(k.cylinder(x, 0, 22, 0, 70, P, 36), { tone: "mid" }) + L(k.ring(x, 0, 19, 70, P, 32), { tone: "faint" }));
    out.push(brand(L(k.lineOnTop([-104, 0], [104, 0], 74, P), { tone: "lit" })));
    for (const x of [-82, -28, 28, 82]) out.push(screw(x, 0, 72));
  } else if (kind === "rag-ingest") {
    out.push(crate(-82, 28, 14), crate(-24, 28, 14), crate(34, 28, 14));
    out.push(tower(84, 0, 0, 66, true));
    out.push(pipe(-62, 28, 58, 10, 36, true), pipe(-4, 28, 58, 10, 44, true), pipe(54, 28, 58, 10, 52, true));
    out.push(orb(84, 0, 70));
  } else {
    out.push(tower(0, 0, 0, 66, true), orb(0, -2, 74));
    out.push(crate(-66, 38, 12), crate(66, 38, 12));
    out.push(pipe(-44, 20, -18, 12, 34, true), pipe(18, 12, 44, 20, 34, true));
    // A physical conversational console: screen, hinge and two control knobs.
    const screen = { x: -46, y: -32, w: 92, d: 8, r: 2 };
    out.push(slab(screen, 66, 4, "lo"), L(k.planOutline(k.insetPlan(screen, 4), 70, P, 4), { tone: "faint" }));
    for (const x of [-28, 28]) out.push(S(k.cylinder(x, -10, 7, 68, 7, P, 28), { tone: "hi" }));
    out.push(ink(D([at([0, -28, 70])], { size: 1.4, tone: "lit" })));
  }
  return out.join("");
}

const assets = [
  ["01-extraccion", "Extracción de datos abiertos." , "extraction"],
  ["02-transformacion", "Transformación y normalización." , "transformation"],
  ["03-carga", "Carga de observaciones reales en el DataMart." , "load"],
  ["04-entrenamiento-mayo", "Primer entrenamiento: históricos hasta 2025 y validación posterior." , "may-training"],
  ["05-entrenamiento-septiembre", "Segundo entrenamiento con los nuevos datos disponibles de 2026." , "september-training"],
  ["06-validacion", "Validación temporal y protección frente a data leakage." , "validation"],
  ["07-datamart", "Histórico analítico inmutable: solo datos reales." , "datamart"],
  ["08-rag", "Ingesta documental y construcción de la memoria vectorial." , "rag-ingest"],
  ["09-ambi", "AMBI consulta la memoria RAG para conversar con contexto contrastado." , "ambi"],
];

for (const [name, label, kind] of assets) {
  const svg = a.assetSvg({ width: W, height: H, label, body: scene(kind), paper: PAPER, accents: { brand: BRAND, led: { hex: BRAND, mode: "ink" } }, weight: 0.6, id: `methodology-${name}` });
  writeFileSync(join(HERE, `${name}.svg`), svg);
  writeFileSync(join(PUBLIC, `${name}.svg`), svg);
}
console.log(`wrote ${assets.length} methodology assets to ${PUBLIC}`);
