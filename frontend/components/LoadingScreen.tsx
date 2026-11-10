"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./loading-screen.css";

export type LoadingScreenProps = {
  ready?: boolean;
  estimatedSeconds?: number;
  onExited?: () => void;
  onRetry?: () => void;
};

type Phrase = { big: string; small: string };

const PHRASES: Phrase[] = [
  { big: "Madrid despierta.", small: "El servidor gratuito se está desperezando. Solo pasa en la primera carga." },
  { big: "131 barrios. Ni uno menos.", small: "Leyendo el precio de cada uno, mes a mes." },
  { big: "Precios de cierre. No ofertas infladas.", small: "Datos abiertos de Madrid, no anuncios de portales." },
  { big: "Lo pasado, medido. Lo futuro, estimado.", small: "Dato real y proyección van siempre por separado." },
  { big: "Sin registro. Sin cuentas. Solo datos.", small: "Entras, miras y decides." },
  { big: "¿Cuánto cuesta vivir aquí de verdad?", small: "Alquiler, compra, rentabilidad y esfuerzo, calculados para ti." },
  { big: "Dibujando el mapa.", small: "21 distritos, 131 barrios. Ya casi." },
];

const OVERTIME: Phrase[] = [
  { big: "Esto va más lento de lo normal.", small: "Seguimos en ello. No cierres la pestaña." },
  { big: "Los buenos datos se hacen esperar.", small: "Madrid tampoco se hizo en un día." },
  { big: "Aguanta un poco más.", small: "El servidor gratuito a veces tarda en arrancar." },
  { big: "Casi, casi, casi…", small: "Después de esta primera carga, todo suele responder mucho más rápido." },
];

const READY: Phrase = { big: "Listo.", small: "Abriendo el cuadro de mando." };
const TOTAL_BARRIOS = 131;
const OVERTIME_EVERY = 5;
const RETRY_AFTER = 2.4;
const W = 600;
const H = 150;
const PAD = 14;
const N = 28;
const SPLIT = 17;
const r1 = (n: number) => Math.round(n * 10) / 10;
const POINTS: [number, number][] = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  const v = 0.22 + 0.52 * t + 0.07 * Math.sin(i * 0.9) + 0.03 * Math.sin(i * 2.3);
  return [r1(t * W), r1(PAD + (1 - v) * (H - PAD * 2))];
});
const SEG = POINTS.slice(0, -1).map((p1, i) => {
  const p0 = POINTS[i - 1] ?? p1;
  const p2 = POINTS[i + 1];
  const p3 = POINTS[i + 2] ?? p2;
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${p2[0]},${p2[1]}`;
});
const start = (i: number) => `M${POINTS[i][0]},${POINTS[i][1]}`;
const REAL_D = `${start(0)} ${SEG.slice(0, SPLIT).join(" ")}`;
const PROJ_D = `${start(SPLIT)} ${SEG.slice(SPLIT).join(" ")}`;
const FULL_D = `${start(0)} ${SEG.join(" ")}`;
const AREA_D = `${FULL_D} L${W},${H} L0,${H} Z`;
const SPLIT_X = POINTS[SPLIT][0];
const SPLIT_FRAC = SPLIT / (N - 1);
const RANK = Array.from({ length: TOTAL_BARRIOS }, (_, i) => (i * 37) % TOTAL_BARRIOS);

function Words({ text }: { text: string }) {
  return <>{text.split(" ").map((word, i) => <span className="dmiyc-ls__w" key={`${word}-${i}`}><span style={{ animationDelay: `${i * 70}ms` }}>{word}</span></span>)}</>;
}

const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function LoadingScreen({ ready = false, estimatedSeconds = 25, onExited, onRetry }: LoadingScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(0);
  const onExitedRef = useRef(onExited);
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  onExitedRef.current = onExited;
  const gid = `ls${useId().replace(/:/g, "")}`;
  const est = Math.max(5, estimatedSeconds);

  useEffect(() => {
    if (ready) return;
    if (!startedAt.current) startedAt.current = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 100);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const fade = window.setTimeout(() => setLeaving(true), 700);
    const exit = window.setTimeout(() => onExitedRef.current?.(), 1400);
    return () => { window.clearTimeout(fade); window.clearTimeout(exit); };
  }, [ready]);

  const progress = ready ? 1 : elapsed <= est ? 0.94 * (1 - Math.pow(1 - elapsed / est, 2)) : 0.94 + 0.05 * (1 - Math.exp(-(elapsed - est) / 20));
  const pct = Math.round(progress * 100);
  const lit = ready ? TOTAL_BARRIOS : Math.round(progress * TOTAL_BARRIOS);
  const late = !ready && elapsed > est;
  const slot = late ? Math.floor((elapsed - est) / OVERTIME_EVERY) : Math.min(PHRASES.length - 1, Math.floor(elapsed / (est / PHRASES.length)));
  const phrase = ready ? READY : late ? OVERTIME[slot % OVERTIME.length] : PHRASES[slot];
  const phraseKey = ready ? "ready" : late ? `late-${slot}` : `normal-${slot}`;
  const showRetry = !ready && elapsed > est * RETRY_AFTER;

  useEffect(() => {
    const path = pathRef.current;
    const head = headRef.current;
    if (!path || !head) return;
    const targetX = progress * W;
    let low = 0;
    let high = path.getTotalLength();
    for (let i = 0; i < 14; i += 1) {
      const middle = (low + high) / 2;
      if (path.getPointAtLength(middle).x < targetX) low = middle; else high = middle;
    }
    const point = path.getPointAtLength(high);
    head.style.transform = `translate(${point.x}px, ${point.y}px)`;
  }, [progress]);

  return <div className="dmiyc-ls" data-leaving={leaving}>
    <span className="dmiyc-ls__sr" role="status">{ready ? "Datos cargados" : "Cargando el cuadro de mando"}</span>
    <div className="dmiyc-ls__top" aria-hidden="true">
      <div className="dmiyc-ls__brand"><i /><b>DMIYC</b><span>Decide Madrid</span></div>
      <div className="dmiyc-ls__clock"><b>{mmss(elapsed)}</b>{!ready && !late ? ` / ${mmss(est)}` : ""}</div>
    </div>
    <div className="dmiyc-ls__main">
      <div className="dmiyc-ls__pill" data-late={late}><i />{ready ? "Todo cargado" : late ? "Tardando más de lo normal" : "Primera carga"}</div>
      <h2 className="dmiyc-ls__headline" key={phraseKey}><Words text={phrase.big} /></h2>
      <p className="dmiyc-ls__sub" key={`${phraseKey}-sub`}>{phrase.small}</p>
      {showRetry && <button className="dmiyc-ls__retry" type="button" onClick={onRetry ?? (() => window.location.reload())}>¿Sigue sin cargar? Recargar</button>}
      <div className="dmiyc-ls__chart" aria-hidden="true">
        <svg className="dmiyc-ls__plot" viewBox={`0 0 ${W} ${H}`} style={{ clipPath: `inset(-24px ${((1 - progress) * 100).toFixed(2)}% -24px -24px)` }}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00e5ff" stopOpacity="0.28" /><stop offset="1" stopColor="#00e5ff" stopOpacity="0" /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} className="dmiyc-ls__grid" x1="0" x2={W} y1={H * f} y2={H * f} />)}
          <path d={AREA_D} fill={`url(#${gid})`} /><line className="dmiyc-ls__split" x1={SPLIT_X} x2={SPLIT_X} y1="6" y2={H} /><path className="dmiyc-ls__real" d={REAL_D} /><path className="dmiyc-ls__proj" d={PROJ_D} />
        </svg>
        <svg className="dmiyc-ls__headsvg" viewBox={`0 0 ${W} ${H}`}><path ref={pathRef} d={FULL_D} fill="none" stroke="none" /><g ref={headRef} className="dmiyc-ls__head" style={{ transform: `translate(0px, ${POINTS[0][1]}px)` }}><circle className="ring" r="5" /><circle r="4.5" /></g></svg>
        <div className="dmiyc-ls__legend"><span className="real" style={{ left: 0 }} data-on={progress > 0.08}>Dato real</span><span className="proj" style={{ left: `${(SPLIT_FRAC * 100).toFixed(1)}%` }} data-on={progress > SPLIT_FRAC + 0.05}>Proyección</span></div>
      </div>
    </div>
    <div className="dmiyc-ls__foot" aria-hidden="true"><div className="dmiyc-ls__dots">{RANK.map((rank, i) => <span key={i} className="dmiyc-ls__dot" data-on={rank < lit} />)}</div><div className="dmiyc-ls__meta"><strong>{pct}%</strong><span>{lit} / {TOTAL_BARRIOS} barrios</span></div></div>
  </div>;
}
