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
  return brand(svg);
}
function foundation() {
  return `<path class="iso-halo" d="${k.haloOf(k.insetPlan(basePlan, -6), -10, 4, P)}"/>` + slab(basePlan, -10, 7, "lo") + L(k.planOutline(k.insetPlan(basePlan, 7), -3, P, 5), { tone: "faint" });
}
function pipe(x0, y0, x1, y1, z = 14, lit = false) {
  const line = L(k.lineOnTop([x0, y0], [x1, y1], z, P), { tone: lit ? "lit" : "mid" });
  return line + D([at([x0, y0, z]), at([x1, y1, z])], { size: lit ? 1.2 : 0.8, tone: lit ? "lit" : "hi" });
}
function packet(x, y, z = 18, lit = true) {
  return D([at([x, y, z])], { size: lit ? 1.5 : 0.9, tone: lit ? "lit" : "hi" });
}
function database(x, y, lit = false, h = 58) {
  const body = S(k.cylinder(x, y, 24, 0, h, P, 40, 0.8), { tone: "mid" });
  const cap = L(k.ring(x, y, 21, h, P, 36), { tone: lit ? "lit" : "faint" }) + L(k.sideArc(x, y, 24, h * .5, P, 28), { tone: "faint" });
  return (lit ? brand(body + cap) : body + cap) + screw(x, y, h + 1, 1.3);
}
function sourcePortal(x, y, lit = false) {
  const body = crate(x, y, 14, lit);
  const antenna = L(k.lineOnTop([x, y], [x, y - 14], 32, P), { tone: "hi" }) + D([at([x, y - 14, 32])], { size: 1.1, tone: lit ? "lit" : "hi" });
  return body + antenna;
}
function filterStation(x, y) {
  const drum = database(x, y, true, 54);
  const bands = [18, 30, 42].map((z) => L(k.ring(x, y, 26, z, P, 36), { tone: "faint" })).join("");
  return drum + bands + L(k.planOutline(k.insetPlan({ x: x - 30, y: y - 30, w: 60, d: 60, r: 5 }, 4), 55, P, 4), { tone: "lit" });
}
function timeline(x0, x1, y, z = 8) {
  const line = L(k.lineOnTop([x0, y], [x1, y], z, P), { tone: "mid" });
  const marks = Array.from({ length: 7 }, (_, i) => {
    const x = x0 + ((x1 - x0) / 6) * i;
    return L(k.lineOnTop([x, y - 5], [x, y + 5], z + 1, P), { tone: i === 6 ? "lit" : "faint" }) + packet(x, y, z + 2, i === 6);
  }).join("");
  return line + marks;
}
function scene(kind) {
  setup();
  const out = [foundation()];
  if (kind === "extraction") {
    out.push(sourcePortal(-92, 36), sourcePortal(-18, 46), sourcePortal(58, 34, true));
    out.push(tower(0, -4, 0, 58, true));
    out.push(pipe(-92, 18, -38, 4, 30, true), pipe(-18, 28, -6, 4, 34, true), pipe(58, 16, 30, 2, 38, true));
    out.push(packet(-68, 27, 30), packet(-29, 14, 32), packet(24, 9, 37));
  } else if (kind === "transformation") {
    out.push(sourcePortal(-88, 34), filterStation(0, 0), crate(78, 34, 14, true));
    out.push(pipe(-64, 18, -28, 4, 34), pipe(28, 4, 66, 18, 44, true));
    out.push(packet(-55, 14, 35, false), packet(-38, 8, 37, false), packet(44, 10, 45));
    out.push(L(k.lineOnTop([46, 26], [88, 26], 31, P), { tone: "lit" }));
  } else if (kind === "load") {
    out.push(sourcePortal(-90, 36), sourcePortal(-42, 36), sourcePortal(6, 36));
    out.push(database(66, -2, true, 82), database(16, -2, false, 68));
    out.push(pipe(-72, 18, 26, 0, 34, true), pipe(-24, 18, 42, 0, 40, true), pipe(24, 18, 58, 0, 46, true));
    out.push(packet(-44, 11, 37), packet(5, 7, 42), packet(43, 4, 48));
  } else if (kind === "may-training") {
    out.push(database(-70, 0, false, 66), database(0, 0, true, 76), database(70, 0, false, 66));
    out.push(timeline(-92, 92, 36, 12));
    out.push(orb(0, -2, 80), pipe(-60, 0, 0, 0, 54, true), pipe(0, 0, 60, 0, 54, true));
  } else if (kind === "september-training") {
    out.push(database(-82, 0, false, 62), database(0, 0, true, 88), database(82, 0, false, 62));
    out.push(sourcePortal(-62, 38), sourcePortal(0, 42), sourcePortal(62, 38, true));
    out.push(pipe(-62, 18, -22, 2, 48), pipe(62, 18, 22, 2, 52, true), pipe(0, 28, 0, 2, 58, true));
    out.push(orb(0, -4, 96));
  } else if (kind === "validation") {
    out.push(database(-76, 0, false, 64), database(76, 0, true, 64));
    out.push(pipe(-58, 0, 58, 0, 48, true), pipe(-58, 22, 58, 22, 54, false));
    out.push(orb(0, 10, 54));
    for (const x of [-80, -52, -24, 24, 52, 80]) out.push(packet(x, -28, 5, x > 0));
    out.push(L(k.ring(0, 10, 31, 56, P, 6), { tone: "lit" }));
  } else if (kind === "datamart") {
    for (const x of [-82, -28, 28, 82]) out.push(database(x, 0, x === 82, 70));
    out.push(brand(L(k.lineOnTop([-104, 0], [104, 0], 74, P), { tone: "lit" })));
    out.push(slab({ x: -14, y: 30, w: 28, d: 16, r: 3 }, 70, 8, "lo"), L(k.planOutline({ x: -10, y: 34, w: 20, d: 8, r: 2 }, 78, P, 4), { tone: "lit" }));
  } else if (kind === "rag-ingest") {
    out.push(sourcePortal(-82, 30), sourcePortal(-24, 30), sourcePortal(34, 30));
    out.push(database(84, 0, true, 70));
    out.push(pipe(-62, 28, 58, 10, 36, true), pipe(-4, 28, 58, 10, 44, true), pipe(54, 28, 58, 10, 52, true));
    out.push(packet(-40, 22, 39), packet(12, 16, 46), packet(51, 12, 53));
    out.push(orb(84, 0, 76));
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
