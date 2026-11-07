# Gap Analysis: Decide Madrid vs. Auros Design Framework

> **Auditoría comparativa y evaluación de paridad visual y de movimiento**  
> Comparación rigurosa entre **Auros** (patrón de referencia 100%) y **Decide Madrid: Invierte Y Compra (DMIYC)**.

---

## 1. Puntuación Global de Paridad

| Dimensión | Puntuación Actual | Objetivo Auros | Estado |
|---|:---:|:---:|:---|
| **Paleta Cromática y Superficies** | **7.5 / 10** | 10 / 10 | Requiere adopción total de los tokens `#012624` (Abyss), `#011d1c` (Deep), `#003734` (Kelp) y `#fde9ff` (Rosa fósforo para stats). |
| **Tipografía y Escala Visual** | **8.0 / 10** | 10 / 10 | Ajustar titulares a peso `500` estricto (cero bold), interlineado `1.0` en display y tracking negativo (`-0.04em`). |
| **Arquitectura de Contenedores y Bordes** | **8.5 / 10** | 10 / 10 | Secciones Platform e Insight ya cuentan con marco exterior; falta extender a Audiencia, Stats e Insights. |
| **Movimiento y Parallax** | **7.0 / 10** | 10 / 10 | La escena cinética funciona excelente; falta animar los contadores de cifras y agregar parallax al skyline. |
| **Componentes Faltantes** | **6.0 / 10** | 10 / 10 | Faltan 2 bloques clave presentes en Auros: **Marquee infinito de fuentes oficiales** y **Sección Insights (3 artículos)**. |
| **TOTAL GENERAL** | **7.4 / 10 (74%)** | **10 / 10 (100%)** | **Plan de acción detallado para alcanzar el 100% de paridad.** |

---

## 2. Auditoría Sección por Sección

### Bloque 1: Header & Navegación
- **Puntuación:** `8 / 10`
- **Lo que se cumple:** Barra fija translúcida con logo, enlaces centrales y botón CTA a la derecha.
- **Diferencias identificadas:**
  - El fondo actual usa una mezcla genérica con blur en vez del token exacto `rgba(1, 38, 36, 0.78)` con `backdrop-filter: blur(16px)`.
  - El botón CTA `"Ver precios de cierre"` debe usar la forma de píldora contenida (`border-radius: 6px`), padding preciso `10px 20px`, y gradiente aurora o borde teal con brillo en hover.
- **Acción requerida:** Actualizar estilos del header con tokens exactos y estado hover reactivo.

---

### Bloque 2: Hero
- **Puntuación:** `8.5 / 10`
- **Lo que se cumple:** Composición centrada editorial, kicker en mayúsculas `DMIYC`, titular principal `No adivines. Decide con datos.` y botón primario.
- **Diferencias identificadas:**
  - En Auros, el fondo del hero tiene un resplandor bioluminiscente central que envuelve la escena.
  - La ilustración del skyline de Madrid necesita capas de parallax con micro-movimiento vertical desacoplado para dar la profundidad que tiene la esfera en Auros.
- **Acción requerida:** Integrar gradiente radial ambiental de profundidad y afinar las capas de movimiento del skyline.

---

### Bloque 3: Lema Cinético ("El precio que pide el anuncio...")
- **Puntuación:** `9.5 / 10`
- **Lo que se cumple:** Idéntico a *"We Drive Liquidity"* de Auros. Contenedor fijado (`pinned`) con scrub ligado al scroll donde la línea superior se desliza hacia la izquierda y la inferior hacia la derecha.
- **Diferencias identificadas:**
  - Ajuste milimétrico de tipografía: tamaño `clamp(96px, 16vw, 240px)`, tracking `-0.046em`, interlineado `0.92`.
- **Acción requerida:** Calibrar tipografía y asegurar suavidad en móviles.

---

### Bloque 4: Plataforma ("Elige tu objetivo. Domina los números.")
- **Puntuación:** `8.5 / 10`
- **Lo que se cumple:** Marco exterior (`.mi-platform__frame`) con lista de perfiles a la izquierda y mapa de distritos interactivo a la derecha.
- **Diferencias identificadas:**
  - Los botones de perfil deben llevar los botones cuadrados `32x32` con icono flecha `↗` idénticos a Auros.
  - El mapa de partículas interactivo debe integrarse con el halo radial bioluminiscente de fondo.
- **Acción requerida:** Estandarizar con la clase de botón `mi-auros-arrow` (32x32 con `border-radius: 6px`).

---

### Bloque 5: Predicción y Flujo ("Sabe hacia dónde va el precio...")
- **Puntuación:** `9.5 / 10`
- **Lo que se cumple:** Marco unificado con tarjeta elevada en Verde Kelp (`#003734`), 3 filas de características con botones cuadrados y tarjeta activa destacada, botón de cabecera `VER EVOLUCIÓN COMPLETA ↗`, y panel gráfico ampliado con resplandor en gradiente.
- **Diferencias identificadas:** Ya implementado con paridad de diseño Auros.
- **Acción requerida:** Mantener y verificar consistencia de tokens.

---

### Bloque 6: Cifras y Rigor Analítico ("Una ciudad. Datos reales sin sesgo.")
- **Puntuación:** `7 / 10`
- **Lo que se cumple:** Grid asimétrico de 4 tarjetas con métricas de gran volumen (16.779 operaciones, 21 distritos, 131 barrios, 3,49M habitantes).
- **Diferencias identificadas:**
  - En Auros, las cifras numéricas clave usan el tono de acento **Rosa Fósforo** (`--color-lavender-phosphor: #fde9ff`), lo que genera un contraste hipnótico sobre el fondo oscuro.
  - Los números están estáticos; deben contar progresivamente desde 0 al entrar en el viewport (`CountUp` animation).
- **Acción requerida:** Aplicar color `#fde9ff` a los números e implementar contadores numéricos animados con IntersectionObserver / requestAnimationFrame.

---

### Bloque 7: Bloque Marquee Infinito de Fuentes Reales *(NUEVO)*
- **Puntuación:** `0 / 10 (Falta implementar)`
- **Lo que se cumple:** Ninguno en este momento.
- **Objetivo Auros:** Auros tiene una cinta horizontal continua con logos/partners. En Decide Madrid debe ser un **Marquee continuo de fuentes oficiales verificadas**:
  - *Ayuntamiento de Madrid · Portal de Datos Abiertos · Dirección General del Catastro · Colegio de Registradores de España · Instituto Nacional de Estadística (INE) · Empresa Municipal de la Vivienda y Suelo (EMVS)*.
- **Acción requerida:** Crear el componente `MadridMarquee.tsx` con scroll infinito CSS sin tirones, máscaras de desvanecimiento lateral y pausa en hover.

---

### Bloque 8: Audiencia ("A quién ayuda") y Honestidad Metodológica
- **Puntuación:** `8 / 10`
- **Lo que se cumple:** Bloques estructurados por perfiles (Compradores, Inquilinos, Propietarios, Inversores) y pasos de verificación de datos.
- **Diferencias identificadas:**
  - Falta unificar las tarjetas con el radio estricto de 16px, fondo `--surface-liquid-kelp` y microinteracción de elevación sutil en hover.
- **Acción requerida:** Actualizar clases y bordes.

---

### Bloque 9: Sección Insights / Artículos de Análisis *(NUEVO)*
- **Puntuación:** `0 / 10 (Falta implementar)`
- **Lo que se cumple:** Ninguno en este momento.
- **Objetivo Auros:** Grid de 3 tarjetas de investigación con imagen/gráfico abstracto, fecha/etiqueta técnica, titular y extracto.
  - Tarjeta 1: *Radiografía del esfuerzo financiero en la almendra central (2024-2026)*.
  - Tarjeta 2: *Impacto de la oferta congelada en distritos exteriores: Villaverde y Usera*.
  - Tarjeta 3: *Por qué el precio de anuncio se desvía un 14,2% del precio escriturado*.
- **Acción requerida:** Crear la sección `mi-insights-grid` con 3 tarjetas editoriales con hover luminoso y enlaces.

---

### Bloque 10: CTA de Cierre y Footer
- **Puntuación:** `7.5 / 10`
- **Lo que se cumple:** Frase de cierre y pie de página con enlaces institucionales.
- **Diferencias identificadas:**
  - El CTA final debe alojarse en un panel profundo con luz ambiental y el botón de firma con el degradado Aurora completo (`linear-gradient(90deg, #cbfffc, #edfffe, #fffdfa, #fad1ff)`).
  - El footer debe usar `--surface-liquid-deep: #011d1c` con columnas de navegación limpias y tipografía compacta (`13px`).
- **Acción requerida:** Estilizar el CTA final con botón Aurora y estructurar el footer abisal.

---

## 3. Plan de Implementación Quirúrgico (Fase 3)

1. **Variables y Tokens Globales (`MadridLanding.css`):**
   - Inyectar los tokens oficiales de Auros (`--surface-liquid-abyss`, `--surface-liquid-deep`, `--surface-liquid-kelp`, `--color-lavender-phosphor`, `--gradient-aurora`, etc.).
2. **Componente Marquee Infinito de Fuentes Oficiales:**
   - Crear e insertar entre Plataforma y Cifras.
3. **Contadores Numéricos en Stats:**
   - Animar 16.779, 21, 131 y 3,49M en `.mi-scale`.
4. **Sección Insights (3 Tarjetas Editoriales):**
   - Insertar antes del CTA final con contenido analítico del mercado de Madrid.
5. **CTA Final con Botón Aurora & Footer Abisal:**
   - Renovar con el gradiente y radios precisos.
