"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./loading-screen.css";

const WAITING_FACTS = [
  {
    fact: "16.779 registros auditados: 10.794 compraventas oficiales de cierre en los 131 barrios de Madrid.",
    source: "Banco de Datos Ayuntamiento de Madrid (Series 05040300) y Colegio de Registradores",
  },
  {
    fact: "Precisión empírica demostrada: margen de error medio del 3,30% en alquiler y 4,56% en compraventa.",
    source: "Auditoría empírica TFM contrastada contra observaciones reales (Q2 2026)",
  },
  {
    fact: "Cobertura total de la capital: 21 distritos y 131 barrios para 3,49 millones de habitantes.",
    source: "Padrón municipal continuo a 1 de enero de 2026, INE / Ayto. de Madrid",
  },
  {
    fact: "El precio real de cierre en notaría difiere de media entre un 8% y un 15% del precio anunciado en portales.",
    source: "Estadística Registral Inmobiliaria, Colegio de Registradores de España",
  },
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
      setPhraseIndex((current) => (current + 1) % WAITING_FACTS.length);
    }, 6500);
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
              <div className="dmiyc-ls__progress" aria-hidden="true">
                <div className="dmiyc-ls__progress-bar" />
              </div>
            )}
            {!failed && !ready && (
              <div key={phraseIndex} className="dmiyc-ls__fact" aria-hidden="true">
                <div className="dmiyc-ls__fact-header">
                  <span className="dmiyc-ls__fact-tag">Dato oficial contrastado</span>
                </div>
                <p className="dmiyc-ls__fact-text">{WAITING_FACTS[phraseIndex].fact}</p>
                <span className="dmiyc-ls__fact-source">{WAITING_FACTS[phraseIndex].source}</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
