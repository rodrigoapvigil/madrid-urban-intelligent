"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./loading-screen.css";

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
          </div>
        </section>
      </main>
    </div>
  );
}
