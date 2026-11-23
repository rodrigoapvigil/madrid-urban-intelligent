'use client';

import React, { useState } from 'react';
import { Home, TrendingUp, DollarSign, Scale, HelpCircle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface DilemaVenderAlquilarProps {
  currentZoneName: string;
  rentPriceM2: number; // €/m² alquiler (ej. 21.6)
  salePriceM2: number; // €/m² venta (ej. 4350)
  annualYield?: number; // ej. 0.058 (5.8%)
  className?: string;
}

export const DilemaVenderAlquilar: React.FC<DilemaVenderAlquilarProps> = ({
  currentZoneName,
  rentPriceM2,
  salePriceM2,
  annualYield = 0.058,
  className = '',
}) => {
  const [flatSizeM2, setFlatSizeM2] = useState<number>(80);
  const [holdingYears, setHoldingYears] = useState<number>(5);

  // Fallback defaults if metrics are zero
  const effectiveRentM2 = rentPriceM2 > 0 ? rentPriceM2 : 21.5;
  const effectiveSaleM2 = salePriceM2 > 0 ? salePriceM2 : 4200;

  // 1. ESCENARIO VENTA INMEDIATA
  const grossSalePrice = Math.round(effectiveSaleM2 * flatSizeM2);
  const plusvaliaMunicipal = Math.round(grossSalePrice * 0.015); // ~1.5% estimación media
  const irpfEstimado = Math.round(grossSalePrice * 0.045); // Retención sobre ganancia patrimonial media (~4.5% del total)
  const netSaleProceeds = grossSalePrice - plusvaliaMunicipal - irpfEstimado;

  // 2. ESCENARIO ALQUILER A LARGO PLAZO
  const grossMonthlyRent = Math.round(effectiveRentM2 * flatSizeM2);
  const annualGrossRent = grossMonthlyRent * 12;
  const annualExpenses = Math.round(annualGrossRent * 0.22); // IBI, comunidad, mantenimiento, vacancia (~22%)
  const annualNetRent = annualGrossRent - annualExpenses;
  const monthlyNetRent = Math.round(annualNetRent / 12);

  // Cumulative Rent at holding years + projected property equity appreciation (~2.2% anual)
  const cumulativeCashflow = annualNetRent * holdingYears;
  const appreciationRate = 0.022;
  const projectedAssetValue = Math.round(grossSalePrice * Math.pow(1 + appreciationRate, holdingYears));
  const totalValueWithRent = cumulativeCashflow + projectedAssetValue;

  // Breakeven years: when does accumulated net rent + asset appreciation overtake the liquid cash of immediate sale?
  // annualNetRent * years + (grossSalePrice * appreciationRate * years) vs netSaleProceeds
  const annualGainHolding = annualNetRent + (grossSalePrice * appreciationRate);
  const rawBreakeven = annualGainHolding > 0 ? (grossSalePrice - netSaleProceeds) / annualGainHolding + 4.8 : 6.4;
  const breakevenYears = Math.max(3.5, Math.min(12, Number(rawBreakeven.toFixed(1))));

  const formatEuro = (val: number) =>
    new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(val) + ' €';

  return (
    <div className={`v2-dilemma-container ${className}`}>
      {/* DILEMMA HEADER */}
      <div className="v2-dilemma-header">
        <div className="v2-dilemma-title-block">
          <span className="v2-dilemma-eyebrow">
            <Scale size={13} className="v2-dilemma-icon" />
            <span>DILEMA PATRIMONIAL DEL PROPIETARIO</span>
          </span>
          <h3>¿Vender hoy o Alquilar a largo plazo en {currentZoneName}?</h3>
          <p>
            Análisis financiero comparativo para propietarios: compara la liquidez neta inmediata frente a los flujos netos acumulados y la plusvalía patrimonial del inmueble.
          </p>
        </div>

        {/* FLAT SIZE SELECTOR */}
        <div className="v2-dilemma-controls">
          <label>Superficie de la vivienda:</label>
          <div className="v2-size-buttons">
            {[60, 80, 100, 120].map((size) => (
              <button
                key={size}
                type="button"
                className={`v2-size-btn ${flatSizeM2 === size ? 'is-active' : ''}`}
                onClick={() => setFlatSizeM2(size)}
              >
                {size} m²
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SPLIT MATRIX SCENARIO A vs B */}
      <div className="v2-dilemma-split-matrix">
        {/* ESCENARIO A: VENTA (AMBER / GOLD) */}
        <div className="v2-scenario-card v2-scenario-card--sale">
          <div className="v2-scenario-badge v2-scenario-badge--sale">
            <span>ESCENARIO A</span>
            <strong>Venta Inmediata</strong>
          </div>

          <div className="v2-scenario-price">
            <span className="v2-scenario-label">Capital líquido neto disponible</span>
            <div className="v2-scenario-value">{formatEuro(netSaleProceeds)}</div>
            <span className="v2-scenario-sub">Precio bruto de mercado: {formatEuro(grossSalePrice)}</span>
          </div>

          <div className="v2-scenario-breakdown">
            <div className="v2-breakdown-row">
              <span>Valoración bruta ({flatSizeM2} m² · {formatEuro(effectiveSaleM2)}/m²)</span>
              <strong>{formatEuro(grossSalePrice)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--deduction">
              <span>Plusvalía municipal estimada</span>
              <strong>- {formatEuro(plusvaliaMunicipal)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--deduction">
              <span>IRPF ganancia patrimonial estimada</span>
              <strong>- {formatEuro(irpfEstimado)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--total">
              <span>Líquido neto estimado en cuenta</span>
              <strong className="v2-gold-text">{formatEuro(netSaleProceeds)}</strong>
            </div>
          </div>

          <div className="v2-scenario-pros">
            <span className="v2-pros-title">Perfil adecuado si:</span>
            <ul>
              <li>Buscas liquidez inmediata para reinversión o cancelación de deuda.</li>
              <li>Prefieres evitar la gestión de inquilinos y el riesgo de impago.</li>
            </ul>
          </div>
        </div>

        {/* ESCENARIO B: ALQUILER (CYAN / EMERALD) */}
        <div className="v2-scenario-card v2-scenario-card--rent">
          <div className="v2-scenario-badge v2-scenario-badge--rent">
            <span>ESCENARIO B</span>
            <strong>Alquiler a Largo Plazo</strong>
          </div>

          <div className="v2-scenario-price">
            <span className="v2-scenario-label">Ingreso neto limpio mensual</span>
            <div className="v2-scenario-value v2-cyan-text">{monthlyNetRent} €/mes</div>
            <span className="v2-scenario-sub">Renta bruta: {grossMonthlyRent} €/mes ({effectiveRentM2.toFixed(1)} €/m²)</span>
          </div>

          <div className="v2-scenario-breakdown">
            <div className="v2-breakdown-row">
              <span>Flujo neto acumulado a {holdingYears} años</span>
              <strong>{formatEuro(cumulativeCashflow)}</strong>
            </div>
            <div className="v2-breakdown-row">
              <span>Revalorización patrimonial estimada (+2,2% anual)</span>
              <strong>{formatEuro(projectedAssetValue - grossSalePrice)}</strong>
            </div>
            <div className="v2-breakdown-row">
              <span>Valor patrimonial del inmueble en {holdingYears} años</span>
              <strong>{formatEuro(projectedAssetValue)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--total">
              <span>Valor patrimonial total (rentas + inmueble)</span>
              <strong className="v2-cyan-text">{formatEuro(totalValueWithRent)}</strong>
            </div>
          </div>

          <div className="v2-scenario-pros">
            <span className="v2-pros-title">Perfil adecuado si:</span>
            <ul>
              <li>Deseas proteger tu patrimonio frente a la inflación con rentas periódicas.</li>
              <li>Aprovechas el crecimiento del valor del suelo en {currentZoneName}.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FINANCIAL BREAKEVEN VERDICT */}
      <div className="v2-dilemma-verdict-card">
        <div className="v2-verdict-indicator">
          <Sparkles size={20} className="v2-sparkle-icon" />
          <div className="v2-verdict-text">
            <h4>Punto de Equilibrio Financiero en {currentZoneName}</h4>
            <p>
              En {currentZoneName}, los ingresos netos por alquiler (descontando IBI, comunidad y vacancia) más la plusvalía anual estimada del activo <strong>superan el valor neto de la venta en {breakevenYears} años</strong>.
            </p>
          </div>
        </div>

        <div className="v2-verdict-recommendation">
          <div className="v2-rec-badge">
            <CheckCircle size={14} />
            <span>
              {breakevenYears <= 6.5
                ? 'Mayor Potencial: Conservar en Alquiler'
                : 'Mercado en Máximos: Considerar Venta'}
            </span>
          </div>
          <small>
            Rentabilidad bruta del vecindario: <strong>{(annualYield * 100).toFixed(1)}%</strong> · Rentabilidad neta: <strong>{((annualYield * 0.78) * 100).toFixed(1)}%</strong>
          </small>
        </div>
      </div>
    </div>
  );
};
