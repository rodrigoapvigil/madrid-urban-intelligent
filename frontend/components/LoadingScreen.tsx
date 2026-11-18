"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { RotateCw } from "lucide-react";
import "./loading-screen.css";

const NEIGHBORHOOD_DOTS = Array.from({ length: 131 }, (_, index) => index);
const WAITING_PHRASES = [
  "Aguanta un poco más.",
  "Los buenos datos se hacen esperar.",
  "¿Cuánto cuesta vivir aquí de verdad?",
  "Entras, miras y decides.",
];

export type LoadingScreenProps = {
  ready?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onExited?: () => void;
  onRetry?: () => void;
};

export default function LoadingScreen({
  ready = false,
  loadingMessage = "Cargando datos de Madrid…",
  error = null,
  onExited,
  onRetry,
}: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      setLeaving(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLeaving(true);
      onExitedRef.current?.();
      return;
    }
    const fade = window.setTimeout(() => setLeaving(true), 500);
    const exit = window.setTimeout(() => onExitedRef.current?.(), 950);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(exit);
    };
  }, [ready]);

  const failed = Boolean(error);

  useEffect(() => {
    if (ready || failed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % WAITING_PHRASES.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [failed, ready]);

  return (
    <div className="dmiyc-ls" data-leaving={leaving} data-error={failed} aria-busy={!ready && !failed}>
      <header className="dmiyc-ls__top">
        <div className="dmiyc-ls__brand">
          <Image src="/dmiyc-logo-glow-transparent.png" alt="" width={42} height={42} priority unoptimized />
          <span className="dmiyc-ls__brand-copy"><b>DMIYC</b><span>DECIDE MADRID: INVIERTE Y COMPRA</span></span>
        </div>
      </header>

      <main className="dmiyc-ls__main">
        <section className="dmiyc-ls__experience" aria-labelledby="dmiyc-loading-title">
          <div className="dmiyc-ls__copy">
            <div className="dmiyc-ls__pill" data-error={failed}>
              <i aria-hidden="true" />
              {failed ? "Carga interrumpida" : ready ? "Datos preparados" : "Primera carga"}
            </div>
            <p className="dmiyc-ls__brand-line">Datos para decidir Madrid</p>
            <h1 id="dmiyc-loading-title" className="dmiyc-ls__headline">Madrid despierta.</h1>
            <p className="dmiyc-ls__message" role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}>
              {failed ? "No se han podido cargar los datos." : ready ? "Abriendo el mapa de Madrid…" : loadingMessage}
            </p>
            <p className="dmiyc-ls__sub">
              {failed ? error : "Preparamos el mapa de precios por distritos y barrios."}
            </p>
            {!failed && !ready && (
              <p key={phraseIndex} className="dmiyc-ls__mood" aria-hidden="true">
                {WAITING_PHRASES[phraseIndex]}
              </p>
            )}
            {onRetry && !ready && (
              <button className="dmiyc-ls__retry" type="button" onClick={onRetry}>
                <RotateCw size={15} aria-hidden="true" />
                {failed ? "Reintentar" : "¿Problemas? Reintentar"}
              </button>
            )}
          </div>

          <div className="dmiyc-ls__visuals" aria-hidden="true">
            <div className="dmiyc-ls__chart">
              <svg viewBox="0 0 600 150" preserveAspectRatio="none">
                <path className="dmiyc-ls__chart-area" d="M0 112 C36 88 46 92 72 98 S112 79 145 94 S185 109 220 86 S264 76 296 83 S342 99 374 72 S424 61 452 68 S488 73 518 49 S564 40 600 30 V150 H0 Z" />
                <path className="dmiyc-ls__chart-line" d="M0 112 C36 88 46 92 72 98 S112 79 145 94 S185 109 220 86 S264 76 296 83 S342 99 374 72 S424 61 452 68 S488 73 518 49 S564 40 600 30" />
                <circle className="dmiyc-ls__chart-point" cx="600" cy="30" r="5" />
              </svg>
              <span className="dmiyc-ls__visual-caption">Madrid · distritos y barrios</span>
            </div>
            <div className="dmiyc-ls__neighborhoods">
              {NEIGHBORHOOD_DOTS.map((dot) => <i key={dot} />)}
            </div>
          </div>

          {!ready && !failed && (
            <div className="dmiyc-ls__load-state">
              <span className="dmiyc-ls__spinner" aria-hidden="true" />
              <div>
                <strong>Carga en curso</strong>
                <span>Preparando el mapa de Madrid.</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
