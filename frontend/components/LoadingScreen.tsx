"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { RotateCw } from "lucide-react";
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
  loadingMessage = "Cargando datos de Madrid…",
  error = null,
  onExited,
  onRetry,
}: LoadingScreenProps) {
  const [leaving, setLeaving] = useState(false);
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
    const fade = window.setTimeout(() => setLeaving(true), 500);
    const exit = window.setTimeout(() => onExitedRef.current?.(), 950);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(exit);
    };
  }, [ready]);

  const failed = Boolean(error);

  return (
    <div className="dmiyc-ls" data-leaving={leaving} data-error={failed} aria-busy={!ready && !failed}>
      <header className="dmiyc-ls__top">
        <div className="dmiyc-ls__brand">
          <Image src="/dmiyc-logo-glow-transparent.png" alt="" width={42} height={42} priority unoptimized />
          <span className="dmiyc-ls__brand-copy"><b>DMIYC</b><span>DECIDE MADRID: INVIERTE Y COMPRA</span></span>
        </div>
      </header>

      <main className="dmiyc-ls__main">
        <section className="dmiyc-ls__card" aria-labelledby="dmiyc-loading-title">
          <div className="dmiyc-ls__pill" data-error={failed}>
            <i aria-hidden="true" />
            {failed ? "No se pudo completar la carga" : ready ? "Datos preparados" : "Primera carga"}
          </div>
          <p className="dmiyc-ls__brand-line">Madrid despierta.</p>
          <h1 id="dmiyc-loading-title" className="dmiyc-ls__headline" role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"}>
            {failed ? "No se han podido cargar los datos" : ready ? "Abriendo el mapa de Madrid…" : loadingMessage}
          </h1>
          {failed ? (
            <p className="dmiyc-ls__sub">{error} Puedes volver a intentarlo ahora.</p>
          ) : (
            <p className="dmiyc-ls__sub">Estamos preparando los datos iniciales del mercado. La duración depende de la conexión.</p>
          )}

          {!ready && !failed && (
            <div className="dmiyc-ls__progress-group">
              <div className="dmiyc-ls__progress" role="progressbar" aria-label="Carga de datos de Madrid" aria-valuetext="Progreso indeterminado">
                <span />
              </div>
              <span className="dmiyc-ls__progress-label">Carga en curso</span>
            </div>
          )}

          {onRetry && (
            <button className="dmiyc-ls__retry" type="button" onClick={onRetry}>
              <RotateCw size={15} aria-hidden="true" />
              {failed ? "Reintentar carga" : "¿No avanza? Reintentar"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
