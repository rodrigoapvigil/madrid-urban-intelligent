'use client';

import React, { useState, useId } from 'react';
import { Sliders, Settings2, ChevronDown, ChevronUp, Sparkles, AlertCircle, Info } from 'lucide-react';

export interface ExpenseSettings {
  comunidadMensual: number; // €/mes (ej. 75)
  ibiAnual: number;          // €/año (ej. 450)
  vacanciaPercent: number;   // % (ej. 8)
  mantenimientoPercent: number; // % (ej. 5)
}

interface ExpenseYieldSimulatorProps {
  grossYield: number; // ej. 0.062 (6.2%)
  purchasePrice?: number; // ej. 280000 €
  monthlyRent?: number; // ej. 1450 €
  onNetYieldChange?: (netYield: number, isNet: boolean) => void;
  className?: string;
}

export const ExpenseYieldSimulator: React.FC<ExpenseYieldSimulatorProps> = ({
  grossYield,
  purchasePrice = 280000,
  monthlyRent = 1450,
  onNetYieldChange,
  className = '',
}) => {
  const [mode, setMode] = useState<'bruta' | 'neta'>('bruta');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseSettings>({
    comunidadMensual: 75,
    ibiAnual: 450,
    vacanciaPercent: 8,
    mantenimientoPercent: 5,
  });

  const comunidadId = useId();
  const ibiId = useId();
  const vacanciaId = useId();
  const mantenimientoId = useId();

  // Calculations
  const annualGrossRent = monthlyRent * 12;
  const annualComunidad = expenses.comunidadMensual * 12;
  const annualIbi = expenses.ibiAnual;
  const annualVacancia = annualGrossRent * (expenses.vacanciaPercent / 100);
  const annualMantenimiento = annualGrossRent * (expenses.mantenimientoPercent / 100);

  const totalAnnualDeductions = annualComunidad + annualIbi + annualVacancia + annualMantenimiento;
  const annualNetIncome = Math.max(0, annualGrossRent - totalAnnualDeductions);
  const monthlyNetIncome = Math.round(annualNetIncome / 12);

  // Net yield
  const effectivePrice = purchasePrice > 0 ? purchasePrice : (grossYield > 0 ? annualGrossRent / grossYield : 280000);
  const netYield = effectivePrice > 0 ? annualNetIncome / effectivePrice : grossYield * 0.76;

  const handleModeChange = (newMode: 'bruta' | 'neta') => {
    setMode(newMode);
    if (onNetYieldChange) {
      onNetYieldChange(newMode === 'neta' ? netYield : grossYield, newMode === 'neta');
    }
  };

  const handleExpenseChange = (key: keyof ExpenseSettings, val: number) => {
    const updated = { ...expenses, [key]: val };
    setExpenses(updated);
    if (mode === 'neta' && onNetYieldChange) {
      const uAnnualGross = monthlyRent * 12;
      const uDeductions = (updated.comunidadMensual * 12) + updated.ibiAnual + (uAnnualGross * (updated.vacanciaPercent / 100)) + (uAnnualGross * (updated.mantenimientoPercent / 100));
      const uNetIncome = Math.max(0, uAnnualGross - uDeductions);
      const uNetYield = effectivePrice > 0 ? uNetIncome / effectivePrice : grossYield * 0.76;
      onNetYieldChange(uNetYield, true);
    }
  };

  return (
    <div className={`v2-expense-simulator ${className}`}>
      {/* SEGMENTED SWITCH: BRUTA / NETA */}
      <div className="v2-yield-switch-row">
        <div className="v2-yield-toggle-group" role="radiogroup" aria-label="Tipo de cálculo de rentabilidad">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'bruta'}
            className={`v2-yield-toggle-btn v2-yield-toggle-btn--bruta ${mode === 'bruta' ? 'is-selected' : ''}`}
            onClick={() => handleModeChange('bruta')}
          >
            Rentabilidad Bruta
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'neta'}
            className={`v2-yield-toggle-btn v2-yield-toggle-btn--neta ${mode === 'neta' ? 'is-selected' : ''}`}
            onClick={() => handleModeChange('neta')}
          >
            <span className="v2-neta-sparkle">●</span>
            Rentabilidad Neta Real
          </button>
        </div>

        {mode === 'neta' && (
          <button
            type="button"
            className={`v2-config-costs-btn ${isConfigOpen ? 'is-open' : ''}`}
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            aria-expanded={isConfigOpen}
            aria-controls="v2-expenses-panel"
          >
            <Settings2 size={13} aria-hidden="true" />
            <span>Configurar gastos reales</span>
            {isConfigOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* METRIC CALLOUT WHEN IN NET MODE */}
      {mode === 'neta' && (
        <div className="v2-neta-highlight-pill">
          <span className="v2-neta-icon">✓</span>
          <span>
            Descontando gastos recurrentes (~{Math.round(totalAnnualDeductions)} €/año): ingreso neto limpio de <strong>{monthlyNetIncome} €/mes</strong> en tu cuenta.
          </span>
        </div>
      )}

      {/* EXPENSES ACCORDION CONFIG PANEL */}
      {mode === 'neta' && isConfigOpen && (
        <div id="v2-expenses-panel" className="v2-expenses-panel" role="region" aria-label="Configuración de costes netos">
          <div className="v2-expenses-panel__header">
            <div>
              <h5>Gastos Dedustibles del Alquiler (Media Madrid)</h5>
              <p>Ajusta las deducciones para adaptarlas a la realidad fiscal y técnica de tu inmueble.</p>
            </div>
            <button
              type="button"
              className="v2-expenses-reset-btn"
              onClick={() => {
                const defaults = { comunidadMensual: 75, ibiAnual: 450, vacanciaPercent: 8, mantenimientoPercent: 5 };
                setExpenses(defaults);
                if (onNetYieldChange) {
                  const uAnnualGross = monthlyRent * 12;
                  const uDeductions = (75 * 12) + 450 + (uAnnualGross * 0.08) + (uAnnualGross * 0.05);
                  const uNetIncome = Math.max(0, uAnnualGross - uDeductions);
                  const uNetYield = effectivePrice > 0 ? uNetIncome / effectivePrice : grossYield * 0.76;
                  onNetYieldChange(uNetYield, true);
                }
              }}
            >
              Restablecer medias
            </button>
          </div>

          <div className="v2-expenses-sliders-grid">
            {/* 1. Comunidad */}
            <div className="v2-slider-card">
              <div className="v2-slider-card__label-row">
                <label htmlFor={comunidadId}>Cuota de comunidad</label>
                <strong>{expenses.comunidadMensual} €/mes</strong>
              </div>
              <input
                id={comunidadId}
                type="range"
                min={0}
                max={250}
                step={5}
                value={expenses.comunidadMensual}
                onChange={(e) => handleExpenseChange('comunidadMensual', Number(e.target.value))}
                className="v2-slider-range"
              />
              <span className="v2-slider-hint">{expenses.comunidadMensual * 12} €/año deducibles</span>
            </div>

            {/* 2. IBI Anual */}
            <div className="v2-slider-card">
              <div className="v2-slider-card__label-row">
                <label htmlFor={ibiId}>IBI municipal anual</label>
                <strong>{expenses.ibiAnual} €/año</strong>
              </div>
              <input
                id={ibiId}
                type="range"
                min={100}
                max={1200}
                step={25}
                value={expenses.ibiAnual}
                onChange={(e) => handleExpenseChange('ibiAnual', Number(e.target.value))}
                className="v2-slider-range"
              />
              <span className="v2-slider-hint">~0,4% sobre valor catastral</span>
            </div>

            {/* 3. Tasa de vacancia */}
            <div className="v2-slider-card">
              <div className="v2-slider-card__label-row">
                <label htmlFor={vacanciaId}>Vacancia y rotación</label>
                <strong>{expenses.vacanciaPercent}% ({Math.round((expenses.vacanciaPercent / 100) * 12 * 10) / 10} m)</strong>
              </div>
              <input
                id={vacanciaId}
                type="range"
                min={0}
                max={20}
                step={1}
                value={expenses.vacanciaPercent}
                onChange={(e) => handleExpenseChange('vacanciaPercent', Number(e.target.value))}
                className="v2-slider-range"
              />
              <span className="v2-slider-hint">Período sin inquilino entre contratos</span>
            </div>

            {/* 4. Mantenimiento y seguro */}
            <div className="v2-slider-card">
              <div className="v2-slider-card__label-row">
                <label htmlFor={mantenimientoId}>Mantenimiento y seguro</label>
                <strong>{expenses.mantenimientoPercent}%</strong>
              </div>
              <input
                id={mantenimientoId}
                type="range"
                min={0}
                max={15}
                step={1}
                value={expenses.mantenimientoPercent}
                onChange={(e) => handleExpenseChange('mantenimientoPercent', Number(e.target.value))}
                className="v2-slider-range"
              />
              <span className="v2-slider-hint">Seguro de impago, reparaciones y averías</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
