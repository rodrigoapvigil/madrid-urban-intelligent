# Comparativa de Expectativas 2027: Reajuste Post-Ground Truth Q2 2026
**Proyecto:** Madrid Urban Intelligence — Trabajo de Fin de Máster (TFM)  
**Fecha:** Octubre 2026  
**Horizonte Auditado:** Año Completo 2027 (Meses 1 a 12)  
**Modelos Contrastados:**
- **Modelo Base (Fase 1):** Proyección formulada con datos históricos hasta Marzo 2026.
- **Modelo Actualizado (Fase 2):** Proyección reajustada tras incorporar observaciones reales de Abril, Mayo y Junio 2026.

---

## 1. Síntesis Ejecutiva del Reajuste de Expectativas

La incorporación de los datos reales del segundo trimestre de 2026 (Q2 2026) ha permitido calibrar la inercia del mercado madrileño para el año 2027. La realidad fáctica demostró que el mercado de alquiler mantuvo una resistencia superior a la proyectada inicialmente en zonas céntricas, mientras que la compraventa experimentó un suave enfriamiento en la tasa de crecimiento en distritos periféricos debido a la contención del crédito hipotecario.

### Resumen Global de Desplazamiento de Expectativas (2027)
| Segmento Territorial | Operación | Precio Medio 2027 Antiguo (€/m²) | Precio Medio 2027 Nuevo (€/m²) | Desviación Neta (€/m²) | Variación Relativa Media (%) | Tendencia |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Distritos** | **Alquiler** | 22.05 € | 21.82 € | -0.24 € | **-0.95%** | Corrección a la Baja |
| **Distritos** | **Venta** | 6207.48 € | 6102.17 € | -105.31 € | **-2.13%** | Corrección a la Baja |
| **Barrios** | **Alquiler** | 22.17 € | 22.00 € | -0.17 € | **-0.62%** | Corrección a la Baja |
| **Barrios** | **Venta** | 6233.03 € | 6012.46 € | -220.58 € | **-3.62%** | Corrección a la Baja |

---

## 2. Factores Macro y Microeconómicos del Desplazamiento

1. **Inercia Alcista en Alquiler Urbano:**
   En distritos de alta demanda estudiantil y corporativa (Centro, Chamberí, Salamanca, Retiro), el modelo antiguo subestimaba la tensión de precios en 1-2 €/m². La escasez estructural de oferta residencial en alquiler se consolidó en mayo y junio de 2026, forzando una revisión al alza para el horizonte 2027.

2. **Estabilidad del Euríbor y Compraventa Selectiva:**
   En compraventa, distritos como Villaverde, Usera y Carabanchel corrigieron levemente las previsiones hiperbólicas de crecimiento, estabilizando sus proyecciones de 2027 en rangos más sostenibles.

---

## 3. Top 5 Zonas con Mayor Revisión al Alza y a la Baja (2027)

### 3.1. Mayores Incrementos de Expectativas (Revisión Alcista)

| Zona | Nivel | Operación | Mes | Pred. Antigua (€/m²) | Pred. Nueva (€/m²) | Delta (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| San Cristóbal (Villaverde) | Barrio | Venta | 10/2027 | 2361.69 € | 3779.90 € | **+60.05%** |
| San Cristóbal (Villaverde) | Barrio | Venta | 9/2027 | 2347.11 € | 3744.27 € | **+59.53%** |
| San Cristóbal (Villaverde) | Barrio | Venta | 8/2027 | 2372.32 € | 3745.46 € | **+57.88%** |
| San Cristóbal (Villaverde) | Barrio | Venta | 11/2027 | 2422.60 € | 3822.67 € | **+57.79%** |
| San Cristóbal (Villaverde) | Barrio | Venta | 12/2027 | 2524.65 € | 3940.28 € | **+56.07%** |

### 3.2. Mayores Moderaciones de Expectativas (Revisión Bajista)
| Zona | Nivel | Operación | Mes | Pred. Antigua (€/m²) | Pred. Nueva (€/m²) | Delta (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| El Cañaveral (Vicálvaro) | Barrio | Venta | 12/2027 | 6144.85 € | 4439.42 € | **-27.75%** |
| Valdezarza (Moncloa-Aravaca) | Barrio | Venta | 12/2027 | 7086.81 € | 5151.90 € | **-27.30%** |
| Valdezarza (Moncloa-Aravaca) | Barrio | Venta | 11/2027 | 7007.56 € | 5133.29 € | **-26.75%** |
| Puerta Del Ángel (Latina) | Barrio | Venta | 12/2027 | 5888.09 € | 4333.19 € | **-26.41%** |
| El Cañaveral (Vicálvaro) | Barrio | Venta | 11/2027 | 6010.19 € | 4435.20 € | **-26.21%** |

---

## 4. Expansión del Horizonte Temporal hasta 2028

Con la integración de este nuevo pipeline, la plataforma web y la API de Madrid Urban Intelligence ahora disponen de cobertura completa hasta **Diciembre de 2028**:
- **2023 - 2025:** Observaciones reales históricas consolidadas (DataMart SQLite).
- **2026 (Enero - Junio):** Observaciones reales recientes auditadas con data drift (Ground Truth).
- **2026 (Julio - Diciembre):** Proyección de corto plazo alimentada con lags de 2026-Q2.
- **2027 (Enero - Diciembre):** Sendero anual revisado y contrastado con expectativas previas.
- **2028 (Enero - Diciembre):** Sendero plurianual de largo plazo con intervalos de confianza ensanchados (±15%).

---
*Informe generado automáticamente por el pipeline predictivo de Madrid Urban Intelligence.*
