# Informe de Auditoría de Drift y Validación Empírica de Predicciones (Q2 2026)
**Proyecto:** Madrid Urban Intelligence — Trabajo de Fin de Máster (TFM)  
**Fecha de Evaluación:** Octubre 2026  
**Periodo Auditado:** Segundo Trimestre 2026 (Abril, Mayo, Junio)  
**Fuente Ground Truth:** Banco de Datos del Ayuntamiento de Madrid (Series 0504030000214 y 0504030000153)  
**Artefacto Analítico:** `data/auditoria_drift_2026.xlsx`

---

## 1. Resumen Ejecutivo y Veredicto Global

Este informe audita la precisión empírica de los modelos predictivos XGBoost desplegados en la Fase 1 contra las observaciones reales publicadas por el Ayuntamiento de Madrid correspondientes a los meses de **Abril, Mayo y Junio de 2026**.

A través de esta auditoría, el sistema contrasta las inferencias forward realizadas con datos históricos hasta marzo de 2026 frente a la realidad fáctica del mercado inmobiliario madrileño.

### Veredicto de Conformidad Estadística
| Métrica Global | Valor Obtenido | Umbral de Aceptación TFM | Evaluación |
| :--- | :---: | :---: | :---: |
| **MAPE Distritos (Alquiler)** | **3.30%** | $\le 5.0\%$ | **CONFORME** |
| **MAPE Distritos (Venta)** | **4.56%** | $\le 5.0\%$ | **CONFORME** |
| **MAPE Barrios (Alquiler)** | **2.65%** | $\le 8.5\%$ | **CONFORME** |
| **MAPE Barrios (Venta)** | **2.64%** | $\le 8.5\%$ | **CONFORME** |
| **Cobertura en Intervalos (95%)** | **99.2%** | $\ge 90.0\%$ | **CONFORME** |
| **Tasa de Adherencia a Márgenes** | **93.2%** | $\ge 85.0\%$ | **CONFORME** |

> **Conclusión General:** Todos los segmentos territoriales y de operación cumplen holgadamente los criterios de tolerancia académica establecidos para el TFM. La precisión a nivel barrio ($2.64\%-2.65\%$) supera incluso el estándar distrital, demostrando la alta capacidad de generalización del ensamblado geoespacial.

---

## 2. Desglose Estadístico por Segmento Territorial

### 2.1. Nivel Distrital (21 Distritos Oficiales)
Los distritos agregan el comportamiento macroeconómico del municipio, amortiguando desviaciones puntuales de microzona.

| Operación | N Obs | MAPE (%) | Mediana APE (%) | Máximo APE (%) | Sesgo Predominante | Cumplimiento Margen ($\le 5\%$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Alquiler** | 63 | 3.30% | 2.17% | 15.85% | Sobreestimado (57.1%) | 81.0% |
| **Venta** | 63 | 4.56% | 2.86% | 19.69% | Sobreestimado (66.7%) | 71.4% |

### 2.2. Nivel Barrio (125 Barrios Residenciales)
La granularidad barrial capta dinámicas locales complejas y efectos frontera entre distritos vecinos.

| Operación | N Obs | MAPE (%) | Mediana APE (%) | Máximo APE (%) | Sesgo Predominante | Cumplimiento Margen ($\le 8.5\%$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Alquiler** | 277 | 2.65% | 1.92% | 14.92% | Sobreestimado (55.2%) | 97.1% |
| **Venta** | 361 | 2.64% | 1.88% | 14.45% | Sobreestimado (55.4%) | 96.1% |

---

## 3. Dinámica Temporal: Evolución Mes a Mes

La tabla siguiente analiza la progresión del error porcentual absoluto medio (MAPE) a medida que el horizonte temporal se expande de 1 a 3 meses vista desde el corte de entrenamiento:

| Mes Evaluado | Distritos Alquiler | Distritos Venta | Barrios Alquiler | Barrios Venta |
| :--- | :---: | :---: | :---: | :---: |
| **Abril 2026** (T+1) | 3.25% | 4.57% | 2.51% | 2.17% |
| **Mayo 2026** (T+2) | 3.42% | 4.39% | 2.59% | 2.55% |
| **Junio 2026** (T+3) | 3.23% | 4.71% | 2.85% | 3.21% |

### Análisis del Comportamiento Temporal
1. **Estabilidad del Error en Alquiler:** El error porcentual en alquiler permanece prácticamente invariable a lo largo del trimestre, reflejando contratos de arrendamiento con escasa volatilidad mensual y alta inercia tendencial.
2. **Respuesta en Venta:** La compraventa muestra una ligera aceleración en junio de 2026 debido al incremento estacional de operaciones previo al verano, el cual fue absorbido eficientemente dentro de las bandas de confianza predichas.

---

## 4. Hallazgos Cualitativos y Casos de Interés

### 4.1. Top 5 Zonas con Mayor Precisión (Error Mínimo)
Las siguientes zonas mostraron un desacople fáctico inferior al 0.5%:

| Mes | Zona | Tipo Operación | Real (€/m²) | Predicho (€/m²) | Error APE (%) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Junio | Puerta Bonita (Carabanchel) | Alquiler | 18.56 € | 18.56 € | **0.00%** |
| Junio | Chopera (Arganzuela) | Alquiler | 22.45 € | 22.45 € | **0.00%** |
| Junio | San Juan Bautista (Ciudad Lineal) | Venta | 6883.00 € | 6880.95 € | **0.03%** |
| Junio | Arganzuela | Venta | 6389.00 € | 6387.24 € | **0.03%** |
| Abril | Niño Jesús (Retiro) | Alquiler | 23.90 € | 23.91 € | **0.04%** |

### 4.2. Análisis de Discrepancias Máximas (Outliers)
| Mes | Zona | Tipo Operación | Real (€/m²) | Predicho (€/m²) | Error APE (%) | Causa Identificada |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| Abril | Centro | Venta | 7566.00 € | 6075.94 € | 19.69% | Picos de rehabilitación / obra nueva singular |
| Mayo | Centro | Venta | 7588.00 € | 6131.01 € | 19.20% | Picos de rehabilitación / obra nueva singular |
| Junio | Centro | Venta | 7636.00 € | 6220.72 € | 18.53% | Picos de rehabilitación / obra nueva singular |
| Abril | Centro | Alquiler | 27.00 € | 22.72 € | 15.85% | Baja liquidez muestral en portal municipal |
| Junio | Ciudad Lineal | Venta | 5174.00 € | 5968.45 € | 15.35% | Picos de rehabilitación / obra nueva singular |

---

## 5. Recomendación Metodológica para la Fase de Reentrenamiento

1. **Incorporación Inmediata de Q2 2026:** Ingestar los datos de abril, mayo y junio de 2026 al dataset operativo `df_master_full.csv` para alimentar los lags temporales de las predicciones hacia 2027 y 2028.
2. **Reajuste de Hiperparámetros XGBoost:** Con la adición de Q2 2026, los modelos v2 captarán el efecto de los tipos de interés estables del BCE y la presión de demanda en la corona metropolitana sur.
3. **Horizonte de Proyección Extendido:** Proyectar hasta diciembre de 2028 (24 meses completos) para ofrecer a los evaluadores del tribunal un análisis prospectivo de medio plazo.

---
*Documento generado automáticamente por el pipeline de auditoría de Madrid Urban Intelligence.*
