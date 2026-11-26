'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Wallet } from 'lucide-react';

interface StructuralDisparityBadgeProps {
  zoneAName: string;
  zoneBName: string;
  priceA: number;
  priceB: number;
  incomeA?: number;
  incomeB?: number;
  profileId?: string;
  className?: string;
  headerRight?: React.ReactNode;
}

const formatGroupedIntEs = (val: number) =>
  Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const StructuralDisparityBadge: React.FC<StructuralDisparityBadgeProps> = ({
  zoneAName,
  zoneBName,
  priceA,
  priceB,
  incomeA,
  incomeB,
  profileId = 'alquiler',
  className = '',
  headerRight,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderFallbackRight = () => {
    if (!headerRight) return null;
    return (
      <div className="v2-compare-view-switch-row" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', margin: '14px 0 16px' }}>
        {headerRight}
      </div>
    );
  };

  if (!priceA || !priceB || priceA <= 0 || priceB <= 0) return renderFallbackRight();

  // Calculate percentage gap
  const minPrice = Math.min(priceA, priceB);
  const maxPrice = Math.max(priceA, priceB);
  const diffPercent = Math.round(((maxPrice - minPrice) / minPrice) * 100);

  // Only display if gap is > 20%
  if (diffPercent < 20) return renderFallbackRight();

  const higherZone = priceA >= priceB ? zoneAName : zoneBName;
  const lowerZone = priceA < priceB ? zoneAName : zoneBName;
  const hasIncomeA = typeof incomeA === 'number' && Number.isFinite(incomeA) && incomeA > 0;
  const hasIncomeB = typeof incomeB === 'number' && Number.isFinite(incomeB) && incomeB > 0;

  return (
    <div className={`v2-disparity-container ${className}`} style={{ width: '100%', margin: '14px 0 16px' }}>
      <div className="v2-disparity-toolbar-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`v2-disparity-trigger ${isOpen ? 'is-active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="v2-disparity-details"
          title="Ver causas socioeconómicas de esta brecha de precios"
        >
          <span className="v2-disparity-pill">
            <span className="v2-disparity-delta">Δ +{diffPercent} %</span>
            <span className="v2-disparity-label">Disparidad Estructural Detectada</span>
          </span>
          <span className="v2-disparity-arrow">
            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </button>

        {headerRight && (
          <div className="v2-disparity-header-right" style={{ marginLeft: 'auto' }}>
            {headerRight}
          </div>
        )}
      </div>

      {isOpen && (
        <div id="v2-disparity-details" className="v2-disparity-details" role="region" style={{ marginTop: '12px' }}>
          <div className="v2-disparity-header">
            <AlertCircle size={15} className="v2-disparity-alert-icon" />
            <div>
              <strong>
                {profileId === 'inversion'
                  ? `¿Por qué la rentabilidad de ${higherZone} es un ${diffPercent} % mayor que la de ${lowerZone}?`
                  : `¿Por qué existe una diferencia del ${diffPercent} % entre ${zoneAName} y ${zoneBName}?`}
              </strong>
              <p>
                Parte de la diferencia puede explicarse por la renta de los hogares y por otros factores del entorno. Esta herramienta solo mide la renta.
              </p>
            </div>
          </div>

          <div className="v2-disparity-factors-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="v2-factor-card">
              <div className="v2-factor-title">
                <Wallet size={13} aria-hidden="true" />
                <span>Renta media del hogar (INE)</span>
              </div>
              <div className="v2-factor-comparison">
                <div>
                  <small>{zoneAName}</small>
                  <strong>{hasIncomeA ? `${formatGroupedIntEs(incomeA!)} €/año` : '—'}</strong>
                </div>
                <span className="v2-factor-vs">vs</span>
                <div>
                  <small>{zoneBName}</small>
                  <strong>{hasIncomeB ? `${formatGroupedIntEs(incomeB!)} €/año` : '—'}</strong>
                </div>
              </div>
              <p className="v2-factor-note">
                {profileId === 'alquiler'
                  ? 'La capacidad de pago del vecindario influye en la presión sobre las rentas mensuales.'
                  : 'La capacidad patrimonial de la zona influye en el nivel de precios de compraventa.'}
              </p>
              {(hasIncomeA || hasIncomeB) && (
                <span style={{ fontSize: '10px', color: '#688299', marginTop: 'auto' }}>Fuente: Atlas de Renta de los Hogares (INE)</span>
              )}
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#9fb4c7', lineHeight: 1.45 }}>
            Otros factores que suelen influir, no medidos aquí: antigüedad del parque, barreras urbanas y zonas verdes.
          </p>
        </div>
      )}
    </div>
  );
};
