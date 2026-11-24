'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, HelpCircle } from 'lucide-react';

interface HeaderMethodologyLinkProps {
  onOpenFullMethodology?: () => void;
  isMobile?: boolean;
}

export const HeaderMethodologyLink: React.FC<HeaderMethodologyLinkProps> = ({
  onOpenFullMethodology,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Lock body scroll when mobile bottom sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  return (
    <div className="v2-header-methodology-wrap" ref={containerRef}>
      <button
        type="button"
        className={`v2-header-methodology-link ${isOpen ? 'is-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Consultar fuentes y criterios de metodología"
      >
        <HelpCircle size={14} className="v2-header-methodology-icon" aria-hidden="true" />
        <span>Fuentes y metodología</span>
      </button>

      {isOpen && (
        <>
          {isMobile && (
            <div
              className="v2-methodology-backdrop"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
          )}

          <div
            className={`v2-methodology-popover ${isMobile ? 'is-mobile-sheet' : ''}`}
            role="dialog"
            aria-label="Fuentes y metodología"
            aria-modal={isMobile ? 'true' : undefined}
          >
            <div className="v2-methodology-popover-header">
              <div className="v2-methodology-popover-title">
                <strong>Fuentes y metodología</strong>
              </div>
              <button
                type="button"
                className="v2-methodology-popover-close"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar aviso"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="v2-methodology-popover-body">
              <div className="v2-methodology-point">
                <span className="v2-methodology-bullet" aria-hidden="true">●</span>
                <div>
                  <strong className="v2-methodology-term">Fuentes:</strong>{' '}
                  <span className="v2-methodology-desc">datos abiertos del Ayuntamiento de Madrid y de la Comunidad de Madrid.</span>
                </div>
              </div>

              <div className="v2-methodology-point">
                <span className="v2-methodology-bullet" aria-hidden="true">●</span>
                <div>
                  <strong className="v2-methodology-term">Dato oficial:</strong>{' '}
                  <span className="v2-methodology-desc">publicado por la fuente.</span>{' '}
                  <strong className="v2-methodology-term">Proyección:</strong>{' '}
                  <span className="v2-methodology-desc">estimación del modelo para meses aún no publicados.</span>
                </div>
              </div>

              <div className="v2-methodology-point">
                <span className="v2-methodology-bullet" aria-hidden="true">●</span>
                <div>
                  <strong className="v2-methodology-term">Zonas con tramado:</strong>{' '}
                  <span className="v2-methodology-desc">sin datos oficiales; no se estiman.</span>
                </div>
              </div>
            </div>

            {onOpenFullMethodology && (
              <div className="v2-methodology-popover-footer">
                <button
                  type="button"
                  className="v2-methodology-full-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullMethodology();
                  }}
                >
                  <span>Abrir ficha técnica detallada</span>
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
