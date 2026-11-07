# Auros Design Framework — Sistema de Diseño y Movimiento

> **Documento de especificación técnica y de movimiento extraído de la auditoría de [Auros](https://www.auros.global/)**  
> Diseñado para servir como base de implementación en **Decide Madrid: Invierte Y Compra (DMIYC)**, garantizando identidad gemela en Look & Feel, ritmo y experiencia cinematográfica, preservando los datos, marcas y códigos propios.

---

## 1. Tokens de Diseño Globales (`:root`)

```css
:root {
  /* ==========================================================================
     1. PALETA CROMÁTICA & SUPERFICIES (ABYSSAL TERMINAL)
     ========================================================================== */
  /* Lienzo principal y niveles de superficie */
  --surface-liquid-abyss: #012624; /* Nivel 0: Fondo dominante de toda la web */
  --surface-liquid-deep: #011d1c;  /* Nivel 1: Fondo recesivo (footer, marcos profundos) */
  --surface-liquid-kelp: #003734;  /* Nivel 2: Superficie elevada de tarjetas principales */
  --surface-slate-deep: #707777;   /* Nivel 3: Superficie de baja intensidad para elementos inactivos */

  /* Colores de texto y contraste */
  --color-platinum: #ffffff;       /* Blanco puro: H1-H3, enlaces activos, iconos clave */
  --color-liquid-mist: #edfffe;    /* Blanco frío con whisper cian: subtítulos, acentos de texto */
  --color-silver-mist: #bbc7c6;    /* Plata verdoso: texto secundario, descripciones, párrafos */
  --color-ash: #f2f2f2;            /* Gris neutro frío: citas y textos testimoniales */
  --color-lavender-phosphor: #fde9ff; /* Rosa fósforo: acento exclusivo de cifras clave y stats */

  /* Degradados de firma Auros */
  --gradient-bioluminescent: linear-gradient(90deg, rgb(0, 130, 124) 0%, rgb(203, 255, 252) 100%);
  --gradient-aurora: linear-gradient(90deg, rgb(203, 255, 252) 0%, rgb(237, 255, 254) 26.25%, rgb(255, 253, 250) 47.57%, rgb(250, 209, 255) 88.96%);
  --gradient-button-hover: linear-gradient(90deg, #00827c 0%, #cbfffc 100%);
  --gradient-surface-glow: radial-gradient(circle at 80% 30%, rgba(0, 130, 124, 0.35) 0%, rgba(1, 38, 36, 0.5) 45%, transparent 85%);

  /* ==========================================================================
     2. TIPOGRAFÍA & ESCALA
     ========================================================================== */
  --font-display: 'Matter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-fallback-ui: 'Arial', system-ui, sans-serif;

  /* Escala tipográfica */
  --text-kinetic-display: clamp(86px, 15vw, 295px);
  --text-h1-hero: clamp(38px, 5.2vw, 96px);
  --text-h2-editorial: clamp(32px, 4vw, 61px);
  --text-h3-module: clamp(20px, 2.2vw, 36px);
  --text-subheading: 24px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-eyebrow: 12px;
  --text-caption: 10px;

  /* Pesos e interlineados */
  --weight-regular: 400;
  --weight-medium: 500; /* Headings en Auros usan EXCLUSIVAMENTE peso 500, cero bold 700 */
  --leading-display: 1.0;
  --leading-heading: 1.05;
  --leading-body: 1.45;

  /* Tracking (Letter-spacing) */
  --tracking-kinetic: -0.046em;
  --tracking-h1: -0.04em;
  --tracking-h2: -0.035em;
  --tracking-eyebrow: 0.12em;
  --tracking-caption: 0.15em;

  /* ==========================================================================
     3. ESPACIADO & RADIOS (SHAPE VOCABULARY)
     ========================================================================== */
  --page-max-width: 1440px;
  --section-padding-y: clamp(88px, 11vw, 160px);
  --section-gap: 68px;
  --element-gap: 20px;

  /* Radios estrictos: vocabulario binario */
  --radius-button: 6px;  /* Botones y chips pequeños: 6px estricto (nunca píldoras de 9999px salvo badges) */
  --radius-card: 16px;    /* Tarjetas y módulos: 16px estricto */
  --radius-frame: 20px;   /* Marcos de sección amplia: 20px */

  /* ==========================================================================
     4. TIEMPOS & CURVAS DE ANIMACIÓN (GSAP / CSS)
     ========================================================================== */
  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-micro: 200ms;
  --duration-hover: 240ms;
  --duration-reveal: 600ms;
  --duration-scene: 1200ms;
}
```

---

## 2. Auditoría Bloque por Bloque de Auros

| Bloque | Estructura & Layout | Tratamiento Visual & Luces | Tipografía | Movimiento & Efectos |
|---|---|---|---|---|
| **1. Header & Menú** | Flex horizontal fijo/sticky (`height: 80px`). Logo izq, nav central, CTA derecha. | Fondo translúcido `rgba(1, 38, 36, 0.75)` con `backdrop-filter: blur(14px)`. Borde inferior muy sutil. | Nav items: `12px` Matter 400 uppercase, `letter-spacing: 0.12em`. | Scroll trigger: al bajar > 50px el fondo aumenta opacidad. Dropdown con fade & slide de 200ms. |
| **2. Hero** | Centrado editorial. Kicker superior, H1 en 2 líneas fluidas, descripción breve y botón primario. | Fondo `--surface-liquid-abyss` con halo radial cian detrás de la esfera 3D generativa. | H1 `clamp(42px, 6vw, 96px)` peso 500, `line-height: 1.0`, blanco `#ffffff`. | Esfera 3D interactiva que rota y reacciona al puntero; partículas flotantes en capas. |
| **3. Lema Cinético** | Escena fijada (`pinned`) de pantalla completa. Frases gigantes que cruzan el viewport. | Texto blanco recortado por los extremos de la pantalla sobre fondo abisal puro. | Display masivo: `clamp(110px, 18vw, 295px)`, tracking `-0.046em`. | GSAP ScrollTrigger con scrub sincronizado al scroll: la palabra superior se desplaza a la izquierda y la inferior a la derecha. |
| **4. Presentación** | Declaración editorial centrada (H2 de 3 líneas con spans de color). | Fondo continuo, sin cortes bruscos. | H2 `clamp(32px, 4.5vw, 64px)`, combinación de blanco puro y `--color-liquid-mist`. | Reveal suave al entrar en viewport (`y: 30px` a `0`, `opacity: 0` a `1`). |
| **5. Explore Auros** | Gran marco unificado (`--surface-liquid-deep`) de 2 columnas: Tarjeta elevada izquierda + Visual generativa derecha. | Tarjeta izquierda `--surface-liquid-kelp` (`#003734`, radius 16px). Glow radial derecho. Botón superior derecho `PARTNER WITH US ↗`. | Títulos de tarjeta a `20px` con botones cuadrados `32x32` con icono flecha diagonal `↗`. | Hover en filas activa resplandor de fondo y traslada suavemente la flecha `translate(2px, -2px)`. |
| **6. Cifras / Stats** | Layout asimétrico de 4 bloques. 1 bloque principal de gran escala + 3 módulos complementarios. | Tarjeta destacada con superficie elevada; números en color rosa fósforo `--color-lavender-phosphor` (`#fde9ff`). | Cifras en escala gigante (`54px - 72px`), etiquetas en mayúsculas `11px` con tracking `0.14em`. | Contadores numéricos animados que suben desde 0 al entrar en viewport (duración 1.2s easeOutExpo). |
| **7. Frase Transición** | Texto de puente a ancho completo, sin bordes de caja. | Resplandor sutil en el fondo. | `clamp(28px, 4vw, 54px)` centrado. | Entrada tipo reveal. |
| **8. Presencia / Red** | 2 columnas: copy editorial a la izquierda, globo interactivo o mapa de red a la derecha. | Superficie oscura con nodos interconectados y bioluminiscencia. | H2 `clamp(36px, 4vw, 56px)`, párrafos a `16px`. | Nodos que parpadean con desfase orgánico; rotación lenta. |
| **9. Testimonios** | Citas de impacto editorial con atribución técnica. | Superficie limpia, sin tarjetas pesadas. | Citas a `24px - 32px` en `--color-ash` (`#f2f2f2`). | Transición horizontal suave entre citas. |
| **10. Marquee** | Cinta continua de marcas/fuentes oficiales de datos. | Sin cortes: degradado de desvanecimiento a los lados (`mask-image: linear-gradient(...)`). | Monocromo con opacidad al 60%, 100% en hover. | Animación infinita CSS `translate3d` constante a velocidad baja (30s ciclo). Se pausa en hover. |
| **11. Insights** | Grid de 3 tarjetas de investigación/artículos. | Tarjetas con borde sutil, fondo `--surface-liquid-kelp`, radius `16px`. | H3 `18px - 22px`, extractos a `14px`, metadatos en mayúsculas `11px`. | Hover eleva la tarjeta `translateY(-4px)` y enciende el borde cian. |
| **12. CTA Cierre** | Marco profundo centrado con ambient glow y botón Aurora. | Fondo `--surface-liquid-deep`, botón con gradiente aurora horizontal (cian a rosa). | H2 `clamp(36px, 5vw, 68px)`. | Botón con microinteracción de brillo. |
| **13. Footer** | Grid de 4 columnas, padding vertical generoso (`120px`). | Fondo más oscuro de la página (`#011d1c`). | Enlaces en `13px` `--color-silver-mist`, hover a blanco puro. | Enlaces con transición de color instantánea (180ms). |

---

## 3. Catálogo de Componentes de Auros

### A. Botón Primario Aurora
- **Estructura:** Relleno de degradado aurora (cian → blanco → rosa fósforo) o relleno kelp con borde iluminado.
- **Forma:** `border-radius: 6px` estricto (no pill redondo gigante).
- **Tipografía:** `13px - 14px`, mayúsculas, tracking `0.06em`, peso 500.
- **Hover:** Brillo incrementado, contraste máximo de texto oscuro (#012624).

### B. Botón Icono Cuadrado (Arrow Button `32x32`)
- **Dimensiones:** `32px × 32px`, `border-radius: 6px`.
- **Fondo:** `rgba(3, 81, 75, 0.5)`.
- **Icono:** Flecha diagonal `ArrowUpRight` blanca de `15px`.
- **Hover:** Fondo transmuta a cian luminoso `#00827c`, icono se desplaza `translate(2px, -2px)`.

### C. Tarjeta de Superficie (Surface Card)
- **Fondo:** `--surface-liquid-kelp` (`#003734`).
- **Bordes:** Sin sombra proyectada (zero box-shadow). Toda la elevación se logra por contraste de matiz teal.
- **Bordes perimetrales:** `1px solid rgba(187, 199, 198, 0.12)`.
- **Radio:** `16px`.
- **Padding:** `36px - 48px`.

### D. Eyebrow / Kicker Label
- **Forma:** Mayúsculas compactas con tracking expandido (`0.12em - 0.15em`).
- **Tipografía:** `10px - 12px` Matter peso 500.
- **Color:** `--color-liquid-mist` (`#edfffe`) o `--color-silver-mist` (`#bbc7c6`).
- **Elemento decorativo:** Opcionalmente precedido de un punto de luz o línea milimétrica de 1px.

---

## 4. Guía de Movimiento y Animación

1. **Principio de Intención:** Ninguna animación existe para "decorar", sino para otorgar peso físico e instrumentación técnica a los datos.
2. **Scroll Scrubbing:** Las frases cinéticas monumentales se desplazan estrictamente con el progreso del scroll del usuario (Scrub: 0.6s), permitiendo reversibilidad inmediata.
3. **Contadores Numéricos:** Las cifras de impacto no se muestran estáticas: se animan desde 0 con función ease-out cuando el 30% del bloque entra en pantalla.
4. **Respeto a Preferencias:** Con `prefers-reduced-motion: reduce`, todas las transformaciones cinéticas se congelan en su posición neutral final.

---

## 5. Aspectos No Verificados

1. Código fuente JS minificado y shaders WebGL específicos de la esfera de partículas de Auros.
2. Versión exacta de GSAP (inferida versión 3.12+ por el uso de `matchMedia` y `ScrollTrigger`).
3. Algoritmo exacto de física de partículas en canvas secundario.
