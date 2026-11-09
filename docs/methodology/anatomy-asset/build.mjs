import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const KIT_ROOT = "C:/Users/FX517/.codex/skills/anatomy-asset/kit";
const k = await import(pathToFileURL(join(KIT_ROOT, "iso-kit.mjs")).href);
const a = await import(pathToFileURL(join(KIT_ROOT, "asset.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1600;
const H = 560;
const PAPER = "#02142b";
const BRAND = "#00f0ff";
const REGION = { x: 70, y: 54, w: 1460, h: 430 };

// A wide methodology scene: one physical data pipeline carrying three machines.
// The left machine extracts open data, the middle cleans and normalises it, and the
// right machine turns it into predictions and a grounded RAG memory for AMBI.
const FLOOR = { x: -430, y: -70, w: 860, d: 150, r: 8 };
const P = a.fitInto([...k.boxCorners(FLOOR, -12, 92), [-430, -70, 110], [430, 80, 100]], REGION, { pad: 12, azimuth: 58 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const depth = ([x, y, z = 0]) => k.depthOf([x, y, z], P);
const byDepth = (items, key = (x) => x) => [...items].sort((a0, b0) => depth(key(a0)) - depth(key(b0)));
const brand = (svg) => `<g class="ac-brand">${svg}</g>`;
const ink = (svg) => `<g class="ac-led">${svg}</g>`;

function screw(x, y, z, r = 1.7) {
  return L(k.ring(x, y, r, z, P, 16), { tone: "lo" }) + D([at([x, y, z])], { size: 0.55, tone: "hi" });
}

function slab(plan, z, h, tone = "mid") {
  return S(k.slabOf(plan, z, h, P, 5, 0.8), { tone });
}

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(FLOOR, -8), -12, 5, P)}"/>`];
  out.push(slab(FLOOR, -12, 8, "lo"));
  out.push(L(k.planOutline(k.insetPlan(FLOOR, 8), -4, P, 5), { tone: "faint" }));
  for (const [x, y] of byDepth(k.corners(FLOOR, 12))) {
    out.push(S(k.cylinder(x, y, 7, -20, 8, P, 24), { tone: "lo" }));
    out.push(screw(x, y, -12, 1.8));
  }
  // Conveyor rails make the three phases read as one pipeline.
  const railA = { x: -390, y: 22, w: 780, d: 10, r: 3 };
  const railB = { x: -390, y: 47, w: 780, d: 8, r: 3 };
  out.push(slab(railA, -4, 5, "mid"), slab(railB, -4, 5, "mid"));
  for (const x of [-360, -260, -160, -60, 40, 140, 240, 340]) {
    out.push(S(k.cylinder(x, 34, 5, 1, 3, P, 24), { tone: "hi" }));
    out.push(ink(D([at([x, 34, 4])], { size: 1.05, tone: "lit" })));
  }
  return out.join("");
}

function dataCrate(x, y, z, accentPart = false) {
  const plan = { x: x - 20, y: y - 14, w: 40, d: 28, r: 3 };
  const body = slab(plan, z, 18, "hi");
  const seams = L(k.planOutline(k.insetPlan(plan, 3), z + 18, P, 4), { tone: "faint" });
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push(L(k.lineOnTop([x - 13, y - 8 + i * 5], [x + 13, y - 8 + i * 5], z + 18.2, P), { tone: "lo" }));
  const svg = body + seams + slots.join("") + screw(x - 14, y - 8, z + 18, 1.2) + screw(x + 14, y + 8, z + 18, 1.2);
  return accentPart ? brand(svg) : svg;
}

function extraction() {
  const x = -275;
  const out = [];
  const frame = { x: x - 95, y: -45, w: 190, d: 80, r: 5 };
  out.push(slab(frame, -4, 54, "mid"));
  out.push(L(k.planOutline(k.insetPlan(frame, 8), 50, P, 5), { tone: "faint" }));
  for (const px of [x - 70, x, x + 70]) {
    out.push(S(k.cylinder(px, -6, 8, 50, 25, P, 28), { tone: "hi" }));
    out.push(L(k.ring(px, -6, 6, 75, P, 24), { tone: "faint" }));
    out.push(screw(px, -6, 76, 1.2));
  }
  // Open-data source cards arriving from the left.
  out.push(dataCrate(x - 56, 8, 17));
  out.push(dataCrate(x + 8, 12, 17));
  out.push(dataCrate(x + 58, 8, 17, true));
  out.push(brand(ink(D([at([x + 58, 8, 37])], { size: 1.5, tone: "lit" }))));
  return out.join("");
}

function transform() {
  const x = 0;
  const out = [];
  const body = { x: x - 94, y: -38, w: 188, d: 68, r: 7 };
  out.push(slab(body, -4, 42, "mid"));
  out.push(L(k.sideSeam(body, 8, P, 5), { tone: "faint" }));
  // Three cleaning drums: raw, normalised, validated.
  for (const [dx, rot] of [[-58, 0.4], [0, 1.7], [58, 2.8]]) {
    const drum = S(k.cylinder(x + dx, -2, 25, 38, 28, P, 40, 0.6), { tone: "hi" });
    const bands = L(k.sideArc(x + dx, -2, 25, 48, P, 34), { tone: "faint" });
    const mark = L(k.lineOnTop([x + dx, -2], [x + dx + Math.sin(rot) * 17, -2 - Math.cos(rot) * 17], 67, P), { tone: "mid" });
    out.push(drum + bands + mark);
    out.push(screw(x + dx, -2, 67, 1.4));
  }
  // The validated record leaves the drums and rides the conveyor.
  const record = dataCrate(x + 6, 38, 17, true);
  out.push(a.amSlide(record, [92, 0, 0], P, { period: 7200, delay: 900, halo: `<path class="iso-halo" d="${k.haloOf({ x: x - 14, y: 24, w: 40, d: 28, r: 3 }, 35, 0.1, P)}"/>` }));
  return out.join("");
}

function intelligence() {
  const x = 275;
  const out = [];
  const rack = { x: x - 92, y: -42, w: 184, d: 76, r: 5 };
  out.push(slab(rack, -4, 46, "mid"));
  out.push(L(k.planOutline(k.insetPlan(rack, 7), 42, P, 5), { tone: "faint" }));
  for (const dx of [-62, -21, 21, 62]) {
    const bay = { x: x + dx - 15, y: -26, w: 30, d: 48, r: 2 };
    out.push(slab(bay, 42, 5, "lo"));
    out.push(L(k.planOutline(k.insetPlan(bay, 3), 47, P, 4), { tone: "faint" }));
    out.push(ink(D([at([x + dx, -2, 47.5])], { size: dx === 21 ? 1.8 : 1.1, tone: "lit" })));
  }
  // A vector-memory sphere is the single illuminated moment of the scene.
  const orb = [
    S(k.cylinder(x, 8, 29, 50, 20, P, 48, 0.8), { tone: "hi", lit: true }),
    L(k.ring(x, 8, 25, 70, P, 40), { tone: "lit" }),
    L(k.sideArc(x, 8, 29, 58, P, 40), { tone: "faint" }),
    D([at([x, 8, 70])], { size: 1.2, tone: "lit" }),
  ].join("");
  out.push(a.amPulse(brand(orb), { period: 4200, min: 0.72, max: 1 }));
  out.push(dataCrate(x - 38, 34, 17));
  out.push(dataCrate(x + 34, 34, 17, true));
  return out.join("");
}

const body = [base(), extraction(), transform(), intelligence()].join("");
const name = "madrid-methodology-anatomy";
const svg = a.assetSvg({
  width: W,
  height: H,
  label: "Isometric data pipeline showing open-data extraction, transformation and validation, predictive models, and a grounded RAG memory for AMBI.",
  body,
  paper: PAPER,
  accents: { brand: BRAND, led: { hex: BRAND, mode: "ink" } },
  weight: 0.8,
  id: name,
});
writeFileSync(join(HERE, `${name}.svg`), svg);
writeFileSync(join(HERE, `${name}.html`), a.previewHtml({ title: name, svg, paper: PAPER, width: W }));
writeFileSync(join(HERE, "../../../frontend/public/assets", `${name}.svg`), svg);
console.log(`wrote ${name}.svg (${(svg.length / 1024).toFixed(0)} KB) and preview HTML`);
