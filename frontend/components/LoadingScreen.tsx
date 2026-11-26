"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import "./loading-screen.css";

export type LoadingScreenProps = {
  ready?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onExited?: () => void;
  onRetry?: () => void;
};

export default function LoadingScreen({
  ready = false,
  loadingMessage = "Calibrando telemetría y algoritmos de mercado…",
  error = null,
  onExited,
  onRetry,
}: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("Primera carga: preparando los mapas");
  
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    try {
      const visited = sessionStorage.getItem("dmiyc_visited");
      if (visited) {
        setIsFirstLoad(false);
        setCurrentPhase("Preparando los mapas de Madrid");
      } else {
        sessionStorage.setItem("dmiyc_visited", "1");
      }
    } catch {
      // fallback if storage is restricted
    }
  }, []);

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
      setCurrentPhase("Mercado de Madrid sincronizado.");
      if (ready && !completedRef.current) {
        completedRef.current = true;
        setLeaving(true);
        onExitedRef.current?.();
      }
      return;
    }

    const initialPhaseText = isFirstLoad
      ? "Primera carga: preparando los mapas"
      : "Preparando los mapas de Madrid";

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const minDisplayPassed = elapsed >= 1400;
      // Barrera real: el telón solo se retira cuando una barrera de promesas confirme que las geometrías y los datasets están disponibles en memoria
      const isReadyEffective = ready;

      if (!isReadyEffective || !minDisplayPassed) {
        // Hitos de sincronización del mercado
        setProgress((prev) => {
          let target = 25;
          let phase = initialPhaseText;

          if (elapsed >= 2200) {
            target = Math.min(88, 85 + (elapsed - 2200) * 0.003);
            phase = "Calibrando telemetría y algoritmos de mercado…";
          } else if (elapsed >= 1400) {
            target = 70 + ((elapsed - 1400) / 800) * 15;
            phase = "16.779 registros auditados sincronizados.";
          } else if (elapsed >= 850) {
            target = 50 + ((elapsed - 850) / 550) * 20;
            phase = "Cargando registros auditados (Colegio de Registradores)…";
          } else {
            target = 35 + ((elapsed - 350) / 500) * 15;
            phase = initialPhaseText;
          }

          setCurrentPhase(phase);
          const nextVal = prev + (target - prev) * 0.16;
          return Math.max(prev, Math.min(88, nextVal));
        });
      } else {
        // Datos 100% listos en memoria tras la barrera Promise.allSettled
        setProgress((prev) => {
          if (prev < 99) {
            setCurrentPhase("Mercado de Madrid sincronizado.");
            return prev + (100 - prev) * 0.4;
          }
          if (!completedRef.current) {
            completedRef.current = true;
            setCurrentPhase("Mercado de Madrid sincronizado.");
            // Pequeña pausa de gracia al 100% para apreciar la compleción + 400ms fade-out
            window.setTimeout(() => setLeaving(true), 350);
            window.setTimeout(() => onExitedRef.current?.(), 750);
          }
          return 100;
        });
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [failed, ready, isFirstLoad]);

  const displayProgress = Math.round(progress);

  return (
    <div className="dmiyc-ls" data-leaving={leaving} data-error={failed} aria-busy={!ready && !failed}>
      <header className="dmiyc-ls__top">
        <div className="dmiyc-ls__brand">
          <Image src="/dmiyc-logo-glow-transparent.png" alt="" width={42} height={42} priority unoptimized />
          <span className="dmiyc-ls__brand-copy"><b>DMIYC</b><span>DATOS DE MERCADO INMOBILIARIO Y CIERRES</span></span>
        </div>
      </header>

      <main className="dmiyc-ls__main">
        <section className="dmiyc-ls__experience" aria-labelledby="dmiyc-loading-title">
          <div className="dmiyc-ls__copy">
            <p className="dmiyc-ls__brand-line">Datos para decidir Madrid</p>
            <h1 id="dmiyc-loading-title" className="dmiyc-ls__headline">Madrid despierta.</h1>
            <p className="dmiyc-ls__message" role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}>
              {failed ? "No se han podido cargar los datos." : displayProgress >= 100 ? "Mercado de Madrid sincronizado." : loadingMessage}
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

            {failed && (
              <p className="dmiyc-ls__sub">
                {error}
              </p>
            )}

            {failed && onRetry && (
              <button type="button" className="dmiyc-ls__retry-btn" onClick={onRetry}>
                Reintentar conexión
              </button>
            )}
          </div>

          <aside className="dmiyc-ls__telemetry" aria-label="Telemetría de la capital">
            <div className="dmiyc-ls__telemetry-card">
              <div className="dmiyc-ls__telemetry-grid">
                <div className="dmiyc-ls__telemetry-item">
                  <strong>21</strong>
                  <span>Distritos</span>
                  <small>Cobertura territorial 100%</small>
                </div>
                <div className="dmiyc-ls__telemetry-item">
                  <strong>131</strong>
                  <span>Barrios</span>
                  <small>Detalle micro-zona</small>
                </div>
                <div className="dmiyc-ls__telemetry-item dmiyc-ls__telemetry-item--dual">
                  <strong>16.779</strong>
                  <span>Registros analizados</span>
                  <small className="dmiyc-ls__telemetry-subnote">10.794 compraventas · 5.985 fianzas</small>
                </div>
                <div className="dmiyc-ls__telemetry-item">
                  <strong>3,49 M</strong>
                  <span>Habitantes</span>
                  <small>Padrón oficial INE</small>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="dmiyc-ls__footer">
        <div className="dmiyc-ls__footer-content">
          <span className="dmiyc-ls__footer-sources">
            Fuentes: Colegio de Registradores de España · Banco de Datos del Ayuntamiento de Madrid · INE
          </span>
          <span className="dmiyc-ls__footer-privacy">
            <ShieldCheck size={14} className="dmiyc-ls__footer-icon" aria-hidden="true" />
            <span>Sin cookies de seguimiento ni publicidad</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
