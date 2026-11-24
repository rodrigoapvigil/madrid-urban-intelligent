'use client';

import React from 'react';
import './CardLoadingOverlay.css';

export interface CardLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export const CardLoadingOverlay: React.FC<CardLoadingOverlayProps> = ({
  isLoading,
  message = 'Calibrando telemetría y algoritmos de mercado...',
  children,
  className = '',
}) => {
  return (
    <div className={`loading-container-wrapper ${className}`.trim()}>
      {/* Contenido subyacente que preserva la silueta y dimensiones del layout */}
      <div className={`content-layer ${isLoading ? 'is-blur-dimmed' : ''}`}>
        {children}
      </div>
      {/* Capa translúcida flotante con glassmorphism y spinner cian */}
      {isLoading && (
        <div className="glass-loading-backdrop" aria-busy="true" aria-live="polite">
          <div className="glass-loading-card">
            <div className="cyber-spinner" aria-hidden="true" />
            <span className="glass-loading-text">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardLoadingOverlay;
