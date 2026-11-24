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
    <div className={`v2-trust-telemetry-container ${isOpen ? 'is-active' : ''} ${className}`} ref={containerRef}>
      <button
        type="button"
        className="v2-topbar-estimate-chip"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Valores calculados mediante modelos predictivos contrastados con el Ayuntamiento de Madrid. Clic para ver trazabilidad o metodología."
      >
        <span className="v2-topbar-chip-status">Valores estimados</span>
        <span className="v2-topbar-chip-sep" aria-hidden="true">·</span>
        <span
          className="v2-topbar-chip-action"
          onClick={(e) => {
            if (onOpenMethodology) {
              e.stopPropagation();
              setIsOpen(false);
              onOpenMethodology();
            }
          }}
          title="Abrir Ficha Técnica y Metodología"
        >
          Ver metodología <span className="v2-topbar-chip-info" aria-hidden="true">ⓘ</span>
        </span>
      </button>

      {isOpen && (
        <div className="v2-telemetry-popover" role="dialog" aria-label="Trazabilidad y contraste de datos oficiales">
          <div className="v2-telemetry-popover__header">
            <div className="v2-telemetry-popover__title-wrap">
              <span className="v2-telemetry-led v2-telemetry-led--static" aria-hidden="true" />
              <strong>Contrastado con datos del Ayto. de Madrid</strong>
            </div>
            <span className="v2-telemetry-badge-status">3T 2026</span>
          </div>

          <p className="v2-telemetry-popover__desc">
            Precios y métricas calculados mediante modelos predictivos contrastados frente a los registros públicos oficiales del Ayuntamiento de Madrid y el Colegio de Registradores de la Propiedad.
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
                <Calendar size={11} aria-hidden="true" /> Última actualización
              </span>
              <strong className="v2-telemetry-item__val">15 / 11 / 2026</strong>
            </div>

            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <CheckCircle2 size={11} aria-hidden="true" /> Cobertura censal
              </span>
              <strong className="v2-telemetry-item__val">100% (21 distritos · 131 barrios)</strong>
            </div>

            <div className="v2-telemetry-item">
              <span className="v2-telemetry-item__label">
                <Activity size={11} aria-hidden="true" /> Datos reales registrados
              </span>
              <strong className="v2-telemetry-item__val">Hasta Julio 2026 (3T)</strong>
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
