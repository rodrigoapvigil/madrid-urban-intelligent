'use client';

import React, { useState } from 'react';
import { Scale, CheckCircle, Sparkles } from 'lucide-react';

interface DilemaVenderAlquilarProps {
  currentZoneName: string;
  rentPriceM2: number; // €/m² alquiler de la zona (pestaña Alquiler)
  salePriceM2: number; // €/m² venta de la zona
  className?: string;
}

const formatGroupedIntEs = (val: number) => {
  const sign = val < 0 ? '−' : '';
  return sign + Math.round(Math.abs(val)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatDecEs = (val: number, decimals = 1) =>
  val.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const DilemaVenderAlquilar: React.FC<DilemaVenderAlquilarProps> = ({
  currentZoneName,
  rentPriceM2,
  salePriceM2,
  className = '',
}) => {
  const [flatSizeM2, setFlatSizeM2] = useState<number>(80);
  const holdingYears = 5;

  // Usar siempre el €/m² de alquiler de la zona (nunca el precio de venta)
  const effectiveRentM2 = rentPriceM2 > 0 ? rentPriceM2 : 21.3;
  const effectiveSaleM2 = salePriceM2 > 0 ? salePriceM2 : 4200;

  // 1. ESCENARIO VENTA INMEDIATA
  const grossSalePrice = Math.round(effectiveSaleM2) * flatSizeM2;
  const plusvaliaMunicipal = Math.round(grossSalePrice * 0.015);
  const irpfEstimado = Math.round(grossSalePrice * 0.045);
  const netSaleProceeds = grossSalePrice - plusvaliaMunicipal - irpfEstimado;

  // 2. ESCENARIO ALQUILER A LARGO PLAZO
  const grossMonthlyRent = Math.round(effectiveRentM2 * flatSizeM2);
  const annualGrossRent = grossMonthlyRent * 12;
  const expenseRate = 0.22; // IBI, comunidad, mantenimiento y vacancia (~22 %)
  const annualExpenses = Math.round(annualGrossRent * expenseRate);
  const annualNetRent = annualGrossRent - annualExpenses;
  const monthlyNetRent = Math.round(annualNetRent / 12);

  // Rentabilidades reales calculadas desde el mismo precio bruto del Escenario A
  const grossYieldPct = grossSalePrice > 0 ? (annualGrossRent / grossSalePrice) * 100 : 0;
  const netYieldPct = grossSalePrice > 0 ? (annualNetRent / grossSalePrice) * 100 : 0;
  const perGrossYears = annualGrossRent > 0 ? grossSalePrice / annualGrossRent : 0;

  // Valor patrimonial a 5 años (revalorización anual del 2,2 %)
  const appreciationRate = 0.022;
  const cumulativeCashflow = annualNetRent * holdingYears;
  const projectedAssetValue = Math.round(grossSalePrice * Math.pow(1 + appreciationRate, holdingYears));
  const totalValueWithRent = cumulativeCashflow + projectedAssetValue;
  const diffFiveYears = totalValueWithRent - netSaleProceeds;

  // Punto de equilibrio real: años hasta que (rentas netas acumuladas + revalorización acumulada) >= capital líquido neto
  let breakevenYearsVal: number | null = null;
  if (grossSalePrice > 0 && netSaleProceeds > 0 && (annualNetRent > 0 || appreciationRate > 0)) {
    for (let step = 1; step <= 300; step += 1) {
      const t = step / 10;
      const accumulatedNetRent = annualNetRent * t;
      const accumulatedAppreciation = grossSalePrice * (Math.pow(1 + appreciationRate, t) - 1);
      if (accumulatedNetRent + accumulatedAppreciation >= netSaleProceeds) {
        breakevenYearsVal = t;
        break;
      }
    }
  }
  const breakevenText = breakevenYearsVal !== null ? `${formatDecEs(breakevenYearsVal, 1)} años` : 'más de 30 años';

  const formatEuro = (val: number) => `${formatGroupedIntEs(val)} €`;

  return (
    <div className={`v2-dilemma-container ${className}`}>
      {/* DILEMMA HEADER */}
      <div className="v2-dilemma-header">
        <div className="v2-dilemma-title-block">
          <span className="v2-dilemma-eyebrow">
            <Scale size={13} className="v2-dilemma-icon" />
            <span>DILEMA PATRIMONIAL DEL PROPIETARIO · BETA</span>
          </span>
          <h3>¿Vender hoy o Alquilar a largo plazo en {currentZoneName}?</h3>
          <p>
            Comparativa orientativa para propietarios: liquidez neta estimada de venta frente a rentas netas acumuladas y revalorización del inmueble.
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
        {/* ESCENARIO A: VENTA */}
        <div className="v2-scenario-card v2-scenario-card--sale">
          <div className="v2-scenario-badge v2-scenario-badge--sale">
            <span>ESCENARIO A</span>
            <strong>Venta Inmediata</strong>
          </div>

          <div className="v2-scenario-price">
            <span className="v2-scenario-label">Capital líquido neto estimado</span>
            <div className="v2-scenario-value">{formatEuro(netSaleProceeds)}</div>
            <span className="v2-scenario-sub">Precio bruto de mercado: {formatEuro(grossSalePrice)}</span>
          </div>

          <div className="v2-scenario-breakdown">
            <div className="v2-breakdown-row">
              <span>Valoración bruta ({flatSizeM2} m² · {formatGroupedIntEs(effectiveSaleM2)} €/m²)</span>
              <strong>{formatEuro(grossSalePrice)}</strong>
            </div>
            <div className="v2-breakdown-row">
              <span>Años de alquiler para amortizar venta (PER)</span>
              <strong style={{ color: '#ffd27a' }}>{perGrossYears > 0 ? `${formatDecEs(perGrossYears, 1)} años` : '—'}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--deduction">
              <span>Plusvalía municipal estimada (~1,5 %)</span>
              <strong>− {formatEuro(plusvaliaMunicipal)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--deduction">
              <span>IRPF ganancia patrimonial estimado (~4,5 %)</span>
              <strong>− {formatEuro(irpfEstimado)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--total">
              <span>Líquido neto estimado en cuenta</span>
              <strong className="v2-gold-text">{formatEuro(netSaleProceeds)}</strong>
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '11.5px', lineHeight: 1.45, color: '#9fb4c7' }}>
            Supuestos: plusvalía municipal (~1,5 %) e IRPF (~4,5 %) estimados con supuestos genéricos porque no conocemos tu precio ni año de compra. Orientativo; no es asesoramiento fiscal ni financiero.
          </p>
        </div>

        {/* ESCENARIO B: ALQUILER */}
        <div className="v2-scenario-card v2-scenario-card--rent">
          <div className="v2-scenario-badge v2-scenario-badge--rent">
            <span>ESCENARIO B</span>
            <strong>Alquiler a Largo Plazo</strong>
          </div>

          <div className="v2-scenario-price">
            <span className="v2-scenario-label">Ingreso neto mensual estimado</span>
            <div className="v2-scenario-value v2-cyan-text">{formatGroupedIntEs(monthlyNetRent)} €/mes</div>
            <span className="v2-scenario-sub">
              Renta bruta: {formatGroupedIntEs(grossMonthlyRent)} €/mes ({formatDecEs(effectiveRentM2, 2)} €/m²)
            </span>
          </div>

          <div className="v2-scenario-breakdown">
            <div className="v2-breakdown-row">
              <span>Flujo neto acumulado a {holdingYears} años</span>
              <strong>{formatEuro(cumulativeCashflow)}</strong>
            </div>
            <div className="v2-breakdown-row">
              <span>Revalorización patrimonial estimada (+2,2 % anual)</span>
              <strong>{formatEuro(projectedAssetValue - grossSalePrice)}</strong>
            </div>
            <div className="v2-breakdown-row">
              <span>Valor del inmueble en {holdingYears} años</span>
              <strong>{formatEuro(projectedAssetValue)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--total">
              <span>Valor patrimonial total (rentas + inmueble)</span>
              <strong className="v2-cyan-text">{formatEuro(totalValueWithRent)}</strong>
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '11.5px', lineHeight: 1.45, color: '#9fb4c7' }}>
            Supuestos: deducciones del 22 % ({formatEuro(annualExpenses)}/año por IBI, comunidad, mantenimiento y vacancia) y revalorización anual del 2,2 %. Orientativo; no es asesoramiento fiscal ni financiero.
          </p>
        </div>
      </div>

      {/* FINANCIAL BREAKEVEN VERDICT */}
      <div className="v2-dilemma-verdict-card">
        <div className="v2-verdict-indicator">
          <Sparkles size={20} className="v2-sparkle-icon" />
          <div className="v2-verdict-text">
            <h4>Punto de Equilibrio Financiero en {currentZoneName}</h4>
            <p>
              Con estos supuestos, los ingresos netos por alquiler más la revalorización acumulada igualan el capital líquido de la venta en <strong>{breakevenText}</strong>.
            </p>
          </div>
        </div>

        <div className="v2-verdict-recommendation">
          <div className="v2-rec-badge">
            <CheckCircle size={14} />
            <span>
              Con estos supuestos, a {holdingYears} años: Escenario A {formatEuro(netSaleProceeds)} · Escenario B {formatEuro(totalValueWithRent)} ({diffFiveYears >= 0 ? `+${formatEuro(diffFiveYears)}` : `−${formatEuro(Math.abs(diffFiveYears))}`})
            </span>
          </div>
          <small>
            Rentabilidad bruta: <strong>{formatDecEs(grossYieldPct, 1)} %</strong> · Rentabilidad neta: <strong>{formatDecEs(netYieldPct, 1)} %</strong> · Orientativo; no es asesoramiento fiscal ni financiero.
          </small>
        </div>
      </div>
    </div>
  );
};
