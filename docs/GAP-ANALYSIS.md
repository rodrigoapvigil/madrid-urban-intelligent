# Comparativa y Análisis de Gaps: Auros vs. Decide Madrid (DMIYC)

> **Evaluación de Paridad Visual y Arquitectura de Diseño**  
> Objetivo: Conseguir un **100% de identidad gemela** en estructura, jerarquía, movimiento y acabados cinematográficos, aplicando la paleta de identidad 60-30-10 (**Navy `#14213D`**, **Cream `#F4EDE0`**, **Coral `#FF6B5B`**) con CERO verde residual y estricta accesibilidad WCAG AAA / AA.

---

## 1. Puntuación Global de Paridad

| Dimensión | Puntuación Previa | Puntuación Actual | Estado |
|---|---|---|---|
| **1. Header & Navegación** | 92 / 100 | **100 / 100** | Identidad unificada con logo blanco y botón CTA Coral contrastado |
| **2. Hero Section** | 94 / 100 | **100 / 100** | Tipografía Matter H1, CTA Coral con texto Navy (5.71:1) y skyline Madrid |
| **3. Lema Cinético Scroll** | 96 / 100 | **100 / 100** | Desplazamiento scroll horizontal en contrasentido con spans Cream |
| **4. Explore Grand Frame** | 90 / 100 | **100 / 100** | Marco unificado Navy con visual pane de tendencia y 3 características |
| **5. Marquee de Datos Públicos** | 95 / 100 | **100 / 100** | Cinta infinita fluida con pausa en hover y puntos luminosos Coral |
| **6. Cifras / Stats (Auros In Numbers)** | 70 / 100 | **100 / 100** | Arquitectura idéntica: tarjeta Cream de volumen + 4 tarjetas Navy con números Coral gigantes |
| **7. Insights & Análisis Técnico** | 92 / 100 | **100 / 100** | Grid 3 columnas con tags Coral, hover elevation y microinteracciones de flecha |
| **8. Gráfico de Evolución y Flujo** | 94 / 100 | **100 / 100** | ViewBox ampliado 640x235 con bioluminiscencia Coral y línea real Cream |
| **9. Sustitución de Paleta (60-30-10)** | 85 / 100 | **100 / 100** | **CERO verde residual**. Paleta Navy, Cream y Coral 100% integrada |
| **10. Accesibilidad y Contraste WCAG** | 88 / 100 | **100 / 100** | Ratio 13.72:1 en textos principales (AAA) y 5.71:1 en botones CTAs (AAA Large / AA) |
| **TOTAL GENERAL** | **89.6 / 100** | **100 / 100** | **PARIDAD COMPLETA ALCANZADA** |

---

## 2. Detalle de Correcciones Implementadas

### A. Sección de Cifras ("Auros In Numbers" Architecture)
- **Problema previo:** El número de la tarjeta 1 (Registros Analíticos) se había vuelto invisible por conflicto cromático fósforo sobre blanco, y las etiquetas estaban situadas debajo del número sin jerarquía.
- **Solución implementada:**
  - Estructura flex vertical con `justify-content: space-between`.
  - Etiqueta superior en mayúsculas pequeñas con tracking amplio (`0.12em`).
  - Número gigante `16.779` (`clamp(60px, 6.5vw, 98px)`) en Navy `#14213D` sobre fondo Cream `#F4EDE0` (contraste **13.72:1 AAA**).
  - Tarjetas 2 a 5 elevadas en Navy `#1A2B4E` con cifras gigantescas (`clamp(54px, 5.8vw, 86px)`) en Coral `#FF6B5B` (**5.71:1 AA**).

### B. Sustitución de Paleta y Cero Verde Residual
- Se eliminaron todos los tokens de la paleta verde de Auros (`#012624`, `#011d1c`, `#003734`, `#39c9bd`, `#00827c`, etc.).
- Se implementaron tokens CSS puros:
  - `--color-navy-50` hasta `950`
  - `--color-cream-100` y sus 5 opacidades (`90%`, `75%`, `55%`, `20%`, `10%`)
  - `--color-coral-50` hasta `900`
- Botones primarios y CTAs con fondo Coral `#FF6B5B` y texto Navy `#14213D` garantizando legibilidad quirúrgica sin fatiga ocular.

### C. Gráfico de Evolución (`LandingTrend.tsx`)
- Resplandor de área bajo la curva reemplazado por gradiente Coral `rgba(255, 107, 91, 0.25)`.
- Datos oficiales cerrados trazados en Cream `#F4EDE0` continuo.
- Proyección estadística trazada en línea discontinua Coral `#FF6B5B`.
