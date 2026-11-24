"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import "./loading-screen.css";

const WAITING_FACTS = [
  {
    fact: "16.779 registros auditados: 10.794 compraventas de notaría + 5.985 depósitos oficiales de fianza de alquiler en los 131 barrios.",
    source: "Colegio de Registradores de España y Banco de Datos del Ayuntamiento de Madrid",
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
  onRetry,
}: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [currentPhase, setCurrentPhase] = useState("Conectando con los datos de Madrid…");
  
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

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

  const failed = Boolean(error);

  useEffect(() => {
    if (failed) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(100);
      setCurrentPhase("Madrid preparado.");
      if (ready && !completedRef.current) {
        completedRef.current = true;
        setLeaving(true);
        onExitedRef.current?.();
      }
      return;
    }

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const minDisplayPassed = elapsed >= 1600;
      const isReadyEffective = ready || elapsed >= 4500;

      if (!isReadyEffective || !minDisplayPassed) {
        // Incremento asintótico gradual hacia el 92%
        setProgress((prev) => {
          let target = 25;
          let phase = "Conectando con los datos de Madrid…";

          if (elapsed >= 1400) {
            target = Math.min(92, 80 + (elapsed - 1400) * 0.008);
            phase = "Calibrando métricas predictivas…";
          } else if (elapsed >= 850) {
            target = 60 + ((elapsed - 850) / 550) * 20;
            phase = "Preparando capas de Alquiler, Compra, Venta e Inversión…";
          } else if (elapsed >= 350) {
            target = 35 + ((elapsed - 350) / 500) * 25;
            phase = "Sincronizando 131 barrios vectoriales…";
          } else {
            target = 15 + (elapsed / 350) * 20;
            phase = "Conectando con los datos de Madrid…";
          }

          setCurrentPhase(phase);
          const nextVal = prev + (target - prev) * 0.16;
          return Math.max(prev, Math.min(94, nextVal));
        });
      } else {
        // Datos listos y tiempo mínimo de lectura cumplido (1,6 s)
        setProgress((prev) => {
          if (prev < 99) {
            setCurrentPhase("Madrid preparado.");
            return prev + (100 - prev) * 0.35;
          }
          if (!completedRef.current) {
            completedRef.current = true;
            setCurrentPhase("Madrid preparado.");
            window.setTimeout(() => setLeaving(true), 350);
            window.setTimeout(() => onExitedRef.current?.(), 750);
          }
          return 100;
        });
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [failed, ready]);

  useEffect(() => {
    if (ready || failed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % WAITING_FACTS.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [failed, ready]);

  const displayProgress = Math.round(progress);

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
              {failed ? "Carga interrumpida" : displayProgress >= 100 ? "Datos preparados" : "Primera carga"}
            </div>
            <p className="dmiyc-ls__brand-line">Datos para decidir Madrid</p>
            <h1 id="dmiyc-loading-title" className="dmiyc-ls__headline">Madrid despierta.</h1>
            <p className="dmiyc-ls__message" role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}>
              {failed ? "No se han podido cargar los datos." : displayProgress >= 100 ? "Abriendo el mapa de Madrid…" : loadingMessage}
            </p>
            <p className="dmiyc-ls__sub">
              {failed ? (
                error
              ) : (
                <>
                  Preparamos el visor interactivo de{" "}
                  <span className="dmiyc-ls__accent dmiyc-ls__accent--alquiler">Alquiler</span>,{" "}
                  <span className="dmiyc-ls__accent dmiyc-ls__accent--compra">Compra</span>,{" "}
                  <span className="dmiyc-ls__accent dmiyc-ls__accent--venta">Venta</span> e{" "}
                  <span className="dmiyc-ls__accent dmiyc-ls__accent--inversion">Inversión</span> de Madrid.
                </>
              )}
            </p>

            {!failed && (
              <div className="dmiyc-ls__progress-container" aria-label="Progreso de sincronización">
                <div className="dmiyc-ls__progress-meta">
                  <span className="dmiyc-ls__progress-phase">{currentPhase}</span>
                  <span className="dmiyc-ls__progress-pct">{displayProgress}%</span>
                </div>
                <div
                  className="dmiyc-ls__progress"
                  role="progressbar"
                  aria-valuenow={displayProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`${displayProgress}% - ${currentPhase}`}
                >
                  <div
                    className="dmiyc-ls__progress-bar"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            )}

            {failed && onRetry && (
              <button type="button" className="dmiyc-ls__retry-btn" onClick={onRetry}>
                Reintentar conexión
              </button>
            )}

            {!failed && (
              <div key={phraseIndex} className="dmiyc-ls__fact" aria-hidden="true">
                <div className="dmiyc-ls__fact-header">
                  <span className="dmiyc-ls__fact-tag">Dato oficial contrastado</span>
                </div>
                <p className="dmiyc-ls__fact-text">{WAITING_FACTS[phraseIndex].fact}</p>
                <span className="dmiyc-ls__fact-source">{WAITING_FACTS[phraseIndex].source}</span>
              </div>
            )}
          </div>

          <aside className="dmiyc-ls__telemetry" aria-label="Telemetría de la capital">
            <div className="dmiyc-ls__telemetry-card">
              <div className="dmiyc-ls__telemetry-head">
                <span className="dmiyc-ls__telemetry-badge"><i /> Telemetría oficial · Madrid</span>
                <div className="dmiyc-ls__telemetry-live">
                  <span>🏛️ Datos Notaría: Hasta Jun 2026</span>
                  <span className="dmiyc-ls__telemetry-dot">·</span>
                  <span>✦ Algoritmo: Nov 2026</span>
                </div>
              </div>

              <div className="dmiyc-ls__telemetry-grid">
                <div className="dmiyc-ls__telemetry-item">
                  <strong>21</strong>
                  <span>Distritos capital</span>
                  <small>Cobertura territorial 100%</small>
                </div>
                <div className="dmiyc-ls__telemetry-item">
                  <strong>131</strong>
                  <span>Barrios auditados</span>
                  <small>Detalle micro-zona</small>
                </div>
                <div className="dmiyc-ls__telemetry-item dmiyc-ls__telemetry-item--dual">
                  <strong>16.779</strong>
                  <span>Registros auditados</span>
                  <div className="dmiyc-ls__subtags">
                    <span className="dmiyc-ls__subtag dmiyc-ls__subtag--compra">
                      <i className="dmiyc-ls__subtag-bullet" /> 10.794 Compraventas (Notaría)
                    </span>
                    <span className="dmiyc-ls__subtag dmiyc-ls__subtag--alquiler">
                      <i className="dmiyc-ls__subtag-bullet" /> 5.985 Fianzas (Alquiler Ayto.)
                    </span>
                  </div>
                </div>
                <div className="dmiyc-ls__telemetry-item">
                  <strong>3,49M</strong>
                  <span>Habitantes</span>
                  <small>Padrón oficial INE</small>
                </div>
              </div>

              <div className="dmiyc-ls__telemetry-foot">
                <div className="dmiyc-ls__telemetry-status">
                  <span className="dmiyc-ls__pulse-dot" />
                  <span>{currentPhase}</span>
                </div>
                <span className="dmiyc-ls__telemetry-source">Colegio de Registradores · Catastro · Ayto. de Madrid</span>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="dmiyc-ls__footer-note" aria-label="Compromiso de privacidad">
        <span className="dmiyc-ls__privacy-shield">🛡️</span>
        <span>DMIYC no utiliza cookies de seguimiento ni publicidad de terceros · 100% privado y transparente</span>
      </footer>
    </div>
  );
}
