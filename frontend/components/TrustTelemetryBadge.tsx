'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Database, Calendar, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface TrustTelemetryBadgeProps {
  onOpenMethodology?: () => void;
  className?: string;
  variant?: 'pill' | 'compact' | 'map';
}

export const TrustTelemetryBadge: React.FC<TrustTelemetryBadgeProps> = ({
  onOpenMethodology,
  className = '',
  variant = 'pill',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`v2-trust-telemetry-container ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`v2-telemetry-pill v2-telemetry-pill--${variant} ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Ver auditoría y trazabilidad oficial de datos"
      >
        <span className="v2-telemetry-led" aria-hidden="true" />
        <span className="v2-telemetry-text">
          <strong>SISTEMA AUDITADO</strong>
          <span className="v2-telemetry-sep">·</span>
          <span>AYTO. MADRID Q3 2026</span>
        </span>
        <ShieldCheck size={13} className="v2-telemetry-icon" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="v2-telemetry-popover" role="dialog" aria-label="Trazabilidad y auditoría de datos oficiales">
          <div className="v2-telemetry-popover__header">
            <div className="v2-telemetry-popover__title-wrap">
              <span className="v2-telemetry-led v2-telemetry-led--static" aria-hidden="true" />
              <strong>Trazabilidad y Auditoría Oficial</strong>
            </div>
            <span className="v2-telemetry-badge-status">VALIDADO</span>
          </div>

          <p className="v2-telemetry-popover__desc">
            Datos depurados e integrados sin intermediarios a partir de fuentes públicas oficiales y registros de transacciones reales.
          </p>

          <div className="v2-telemetry-grid">
            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <Database size={11} aria-hidden="true" /> Registros analizados
              </span>
              <strong className="v2-telemetry-item__val">16.779 observaciones</strong>
            </div>

            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <Calendar size={11} aria-hidden="true" /> Última sincronización
              </span>
              <strong className="v2-telemetry-item__val">14 / 11 / 2026</strong>
            </div>

            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <CheckCircle2 size={11} aria-hidden="true" /> Cobertura censal
              </span>
              <strong className="v2-telemetry-item__val">100% (21 distritos · 131 barrios)</strong>
            </div>

            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <Activity size={11} aria-hidden="true" /> Próxima calibración
              </span>
              <strong className="v2-telemetry-item__val">Diciembre 2026 (Q4)</strong>
            </div>
          </div>

          <div className="v2-telemetry-sources">
            <span className="v2-telemetry-sources__title">Organismos de referencia:</span>
            <div className="v2-telemetry-sources__tags">
              <span>Ayuntamiento de Madrid</span>
              <span>Colegio de Registradores</span>
              <span>Catastro Inmobiliario</span>
              <span>INE</span>
            </div>
          </div>

          {onOpenMethodology && (
            <button
              type="button"
              className="v2-telemetry-methodology-btn"
              onClick={() => {
                setIsOpen(false);
                onOpenMethodology();
              }}
            >
              <span>Abrir Ficha Técnica y Metodología</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
