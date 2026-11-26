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
  const [altReturnPct, setAltReturnPct] = useState<number>(3.0);
  const holdingYears = 5;

  // Usar siempre el €/m² de alquiler de la zona (nunca el precio de venta)
  const effectiveRentM2 = rentPriceM2 > 0 ? rentPriceM2 : 21.3;
  const effectiveSaleM2 = salePriceM2 > 0 ? salePriceM2 : 4200;
  const saleCostRate = 0.015 + 0.045; // Plusvalía (~1,5 %) + IRPF estimado (~4,5 %)

  // 1. ESCENARIO VENTA INMEDIATA (reinvertido al r % anual durante 5 años)
  const grossSalePrice = Math.round(effectiveSaleM2) * flatSizeM2;
  const plusvaliaMunicipal = Math.round(grossSalePrice * 0.015);
  const irpfEstimado = Math.round(grossSalePrice * 0.045);
  const netSaleProceeds = grossSalePrice - plusvaliaMunicipal - irpfEstimado;
  const altReturnRate = Math.max(0, Math.min(10, altReturnPct)) / 100;
  const scenarioAFiveYears = Math.round(netSaleProceeds * Math.pow(1 + altReturnRate, holdingYears));

  // 2. ESCENARIO ALQUILER A LARGO PLAZO (neto tras costes de venta al año 5; flujo neto no reinvertido)
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

  // Valor patrimonial neto a 5 años (revalorización anual del 2,2 %, descontando costes de venta futura)
  const appreciationRate = 0.022;
  const cumulativeCashflow = annualNetRent * holdingYears;
  const projectedAssetValue = Math.round(grossSalePrice * Math.pow(1 + appreciationRate, holdingYears));
  const futureSaleCosts = Math.round(projectedAssetValue * saleCostRate);
  const totalValueWithRent = cumulativeCashflow + projectedAssetValue - futureSaleCosts;
  const diffFiveYears = scenarioAFiveYears - totalValueWithRent;
  const winnerLabel = diffFiveYears >= 0 ? 'Escenario A (Venta)' : 'Escenario B (Alquiler)';

  // Rentabilidad alternativa de equilibrio r* donde A_5(r*) == B_5 neto
  const breakevenReturnPct = netSaleProceeds > 0 && totalValueWithRent > netSaleProceeds
    ? (Math.pow(totalValueWithRent / netSaleProceeds, 1 / holdingYears) - 1) * 100
    : 0;

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
            Comparativa neta a {holdingYears} años: capital líquido neto reinvertido frente a rentas netas acumuladas más venta futura neta del inmueble.
          </p>
        </div>

        {/* FLAT SIZE & ALTERNATIVE RETURN CONTROLS */}
        <div className="v2-dilemma-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <label htmlFor="v2-alt-return-input" style={{ margin: 0, fontSize: '12px', color: '#cfe0ee' }}>
              Rentabilidad anual alternativa del capital:
            </label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <input
                id="v2-alt-return-input"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={altReturnPct}
                onChange={(e) => {
                  const parsed = Number.parseFloat(e.target.value);
                  setAltReturnPct(Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)) : 0);
                }}
                style={{
                  width: '68px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  background: '#06182c',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#00e5ff' }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SPLIT MATRIX SCENARIO A vs B */}
      <div className="v2-dilemma-split-matrix">
        {/* ESCENARIO A: VENTA */}
        <div className="v2-scenario-card v2-scenario-card--sale">
          <div className="v2-scenario-badge v2-scenario-badge--sale">
            <span>ESCENARIO A</span>
            <strong>Venta Inmediata + Reinversión</strong>
          </div>

          <div className="v2-scenario-price">
            <span className="v2-scenario-label">Patrimonio neto en {holdingYears} años (al {formatDecEs(altReturnPct, 1)} % anual)</span>
            <div className="v2-scenario-value">{formatEuro(scenarioAFiveYears)}</div>
            <span className="v2-scenario-sub">Capital líquido inicial hoy: {formatEuro(netSaleProceeds)} (bruto {formatEuro(grossSalePrice)})</span>
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
              <span>Capital neto tras {holdingYears} años ({formatDecEs(altReturnPct, 1)} %)</span>
              <strong className="v2-gold-text">{formatEuro(scenarioAFiveYears)}</strong>
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.45, color: '#9fb4c7' }}>
            Supuestos: costes de venta hoy (~6,0 %: plusvalía ~1,5 % + IRPF ~4,5 % genéricos al no conocer tu precio ni año de compra) y reinversión al {formatDecEs(altReturnPct, 1)} % anual. Orientativo; no es asesoramiento fiscal ni financiero.
          </p>
        </div>

        {/* ESCENARIO B: ALQUILER */}
        <div className="v2-scenario-card v2-scenario-card--rent">
          <div className="v2-scenario-badge v2-scenario-badge--rent">
            <span>ESCENARIO B</span>
            <strong>Alquiler {holdingYears} Años + Venta Neta</strong>
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
              <span>Valor bruto del inmueble en {holdingYears} años (+2,2 %/año)</span>
              <strong>{formatEuro(projectedAssetValue)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--deduction">
              <span>Costes e impuestos de venta futura (~6,0 %)</span>
              <strong>− {formatEuro(futureSaleCosts)}</strong>
            </div>
            <div className="v2-breakdown-row v2-breakdown-row--total">
              <span>Valor patrimonial neto total ({holdingYears} años)</span>
              <strong className="v2-cyan-text">{formatEuro(totalValueWithRent)}</strong>
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.45, color: '#9fb4c7' }}>
            Supuestos: deducciones del 22 % ({formatEuro(annualExpenses)}/año por IBI, comunidad, mantenimiento y vacancia), revalorización del 2,2 % anual, costes de venta futura (~6,0 %) y el flujo neto del alquiler no se reinvierte. Orientativo; no es asesoramiento fiscal ni financiero.
          </p>
        </div>
      </div>

      {/* FINANCIAL BREAKEVEN VERDICT */}
      <div className="v2-dilemma-verdict-card">
        <div className="v2-verdict-indicator">
          <Sparkles size={20} className="v2-sparkle-icon" />
          <div className="v2-verdict-text">
            <h4>Rentabilidad alternativa de equilibrio en {currentZoneName}</h4>
            <p>
              Vender y reinvertir gana si tu capital rinde más de <strong>{formatDecEs(breakevenReturnPct, 1)} %</strong> al año. Con tu supuesto de <strong>{formatDecEs(altReturnPct, 1)} %</strong>, gana <strong>{winnerLabel}</strong> por <strong>{formatEuro(Math.abs(diffFiveYears))}</strong>.
            </p>
          </div>
        </div>

        <div className="v2-verdict-recommendation">
          <div className="v2-rec-badge">
            <CheckCircle size={14} />
            <span>
              A {holdingYears} años (neto): Escenario A {formatEuro(scenarioAFiveYears)} · Escenario B {formatEuro(totalValueWithRent)}
            </span>
          </div>
          <small>
            Rentabilidad bruta alquiler: <strong>{formatDecEs(grossYieldPct, 1)} %</strong> · Rentabilidad neta: <strong>{formatDecEs(netYieldPct, 1)} %</strong> · Orientativo; no es asesoramiento fiscal ni financiero.
          </small>
        </div>
      </div>
    </div>
  );
};
