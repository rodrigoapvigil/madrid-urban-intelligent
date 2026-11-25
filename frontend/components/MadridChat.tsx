'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Database, ShieldCheck, TrendingUp } from 'lucide-react';
import './MadridChat.css';
import { SiteFooter, SiteHeader } from './SiteChrome';

const TOP_YIELDS_PREVIEW = [
  { district: 'Usera', yieldLabel: '7,0 % bruto', barWidth: 100, tag: 'Líder', tone: 'high' },
  { district: 'Puente de Vallecas', yieldLabel: '6,9 % bruto', barWidth: 97, tag: 'Alta tracción', tone: 'high' },
  { district: 'Salamanca', yieldLabel: '3,2 % bruto', barWidth: 46, tag: 'Prime · >25 años', tone: 'prime' },
] as const;

const MadridChat: React.FC = () => {
  return (
    <div className="ambi-page-shell">
      <SiteHeader activePath="/madrid/chat" />

      <main className="ambi-main">
        <div className="ambi-terminal-grid" aria-hidden="true" />

        <div className="ambi-layout">
          {/* COLUMNA IZQUIERDA: IDENTIDAD & ACCESO */}
          <section className="ambi-identity-col" aria-labelledby="ambi-heading">
            <div className="ambi-brand-lockup">
              <div className="ambi-orb-emblem" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="ambiOrbGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#3DDC97" />
                    </linearGradient>
                    <linearGradient id="ambiOrbFill" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="rgba(0, 240, 255, 0.22)" />
                      <stop offset="100%" stopColor="rgba(61, 220, 151, 0.12)" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="28" fill="url(#ambiOrbFill)" stroke="url(#ambiOrbGrad)" strokeWidth="1.75" />
                  <path
                    d="M46 18.5A19.5 19.5 0 1 1 20.5 47.5"
                    stroke="rgba(0, 240, 255, 0.45)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M32 15L35.6 28.4L49 32L35.6 35.6L32 49L28.4 35.6L15 32L28.4 28.4L32 15Z"
                    fill="url(#ambiOrbGrad)"
                  />
                </svg>
              </div>

              <div className="ambi-brand-copy">
                <div className="ambi-title-row">
                  <h1 id="ambi-heading" className="ambi-title">AMBI</h1>
                  <span className="ambi-version-badge">v2.4 Kernel</span>
                </div>
                <p className="ambi-subtitle">Inteligencia Inmobiliaria de Madrid</p>
              </div>
            </div>

            <div className="ambi-divider" />

            <p className="ambi-lead">
              Motor conversacional especializado en microdatos urbanísticos, notariales y socioeconómicos de la Comunidad de Madrid.
            </p>

            <div className="ambi-status-pill" role="status">
              <span className="ambi-status-dot" aria-hidden="true" />
              <span>EN CALIBRACIÓN · LANZAMIENTO Q1 2027</span>
            </div>

            <p className="ambi-rigor-note">
              Para garantizar máxima precisión en cifras y referencias catastrales, el motor se audita antes de su apertura pública.
            </p>

            <div className="ambi-cta-group">
              <Link href="/madrid" className="ambi-cta-btn">
                <span>Abrir Dashboard Interactivo</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <div className="ambi-trust-strip" aria-label="Cobertura oficial de fuentes">
              <span>
                <Database size={14} aria-hidden="true" />
                Colegio de Registradores y Catastro
              </span>
              <span>
                <ShieldCheck size={14} aria-hidden="true" />
                131 barrios y 21 distritos
              </span>
            </div>
          </section>

          {/* COLUMNA DERECHA: PREVIEW TRANSLÚCIDO (GLASSMORPHISM) */}
          <section className="ambi-preview-col" aria-label="Vista previa de consulta ejecutiva en AMBI">
            <div className="ambi-glass-card">
              <div className="ambi-glass-topbar">
                <span className="ambi-amber-pill">
                  <span className="ambi-amber-dot" aria-hidden="true" />
                  CALIBRACIÓN PÚBLICA · ACCESO TEMPRANO
                </span>
                <span className="ambi-preview-tag">VISTA PREVIA · Q2 2026</span>
              </div>

              <div className="ambi-dialogue">
                <div className="ambi-msg-user-wrap">
                  <span className="ambi-msg-meta">Usuario · Consulta estratégica</span>
                  <div className="ambi-msg-user">
                    «¿Dónde es más rentable comprar un piso de 200.000 € en Madrid en 2026?»
                  </div>
                </div>

                <div className="ambi-msg-assistant">
                  <div className="ambi-msg-assistant-head">
                    <span className="ambi-assistant-badge">
                      <span aria-hidden="true">✦</span> AMBI
                    </span>
                    <span className="ambi-source-ref">Cierres Q2 2026 · Notarías e INE</span>
                  </div>

                  <p className="ambi-assistant-text">
                    Según cierres del <strong>Q2 2026</strong>, <strong>Usera (7,0 % bruto)</strong> y{' '}
                    <strong>Puente de Vallecas (6,9 %)</strong> lideran la rentabilidad. En distritos prime como{' '}
                    <strong>Salamanca (3,2 %)</strong>, la compresión de yields exige plazos superiores a 25 años.
                  </p>

                  {/* Mini-Card integrada */}
                  <div className="ambi-mini-card">
                    <div className="ambi-mini-card-head">
                      <span className="ambi-mini-title">
                        <TrendingUp size={14} aria-hidden="true" />
                        Top Yields Q2 2026 · Presupuesto 200.000 €
                      </span>
                      <span className="ambi-mini-badge">Microdatos reales</span>
                    </div>

                    <div className="ambi-yield-list">
                      {TOP_YIELDS_PREVIEW.map((item) => (
                        <div key={item.district} className="ambi-yield-row">
                          <div className="ambi-yield-meta">
                            <span className="ambi-yield-district">
                              <Building2 size={13} aria-hidden="true" />
                              {item.district}
                            </span>
                            <div className="ambi-yield-right">
                              <span className={`ambi-yield-tag ${item.tone}`}>{item.tag}</span>
                              <strong className={`ambi-yield-val ${item.tone}`}>{item.yieldLabel}</strong>
                            </div>
                          </div>
                          <div className="ambi-yield-track" aria-hidden="true">
                            <div
                              className={`ambi-yield-fill ${item.tone}`}
                              style={{ width: `${item.barWidth}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ambi-glass-footer">
                <span>Simulación estática pre-renderizada sobre series auditadas de la Comunidad de Madrid.</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default MadridChat;
