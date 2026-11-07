# Framework visual y de movimiento para una landing editorial

> Guía de referencia basada en la landing pública de [Auros](https://www.auros.global/) y en las capturas compartidas durante el proyecto. Está escrita para ayudar a crear otra web con una sensación visual y un ritmo de interacción comparables, conservando marca, textos, datos, ilustraciones y código originales.
>
> **Alcance:** auditoría de la página pública de inicio, de arriba abajo. Las dimensiones de tipografía, tiempos y curvas de animación que no están publicadas se describen como rangos de implementación, no como medidas internas verificadas.

## 1. Lectura rápida de la dirección de arte

La landing se siente como una pieza editorial digital: una superficie oscura continua, navegación fina y horizontal, tipografía geométrica de gran escala, pausas deliberadas y unas pocas escenas visuales memorables. La narrativa alterna mensajes breves de gran tamaño con módulos informativos más concretos.

El efecto no depende de poner animación en todos los elementos. Funciona por contraste entre:

- Mucho espacio vacío y titulares que ocupan casi todo el ancho.
- Un fondo oscuro con focos de luz turquesa que dan profundidad.
- Texto y navegación pequeños, con tracking amplio, frente a titulares enormes.
- Cambios de escena lentos, seguidos de componentes de lectura más densos.
- Una llamada a la acción clara, repetida solo donde tiene sentido.

### Principios que conviene preservar

1. **Una sola atmósfera de página.** Las secciones cambian de composición, mientras el fondo mantiene continuidad cromática y lumínica.
2. **Jerarquía tipográfica extrema.** El display lidera; etiquetas, cuerpo y navegación se mantienen sobrios.
3. **Ritmo por escala.** Una frase gigante puede separar dos bloques mejor que un borde o una tarjeta adicional.
4. **Movimiento ligado a intención.** El scroll revela, fija o desplaza escenas; el hover confirma interacción y añade respuesta local.
5. **Color con economía.** El turquesa construye la identidad; el tono perla/lavanda funciona como contraste puntual, no como decoración general.

## 2. Recorrido de la página, de arriba abajo

La página pública presenta navegación de productos, soluciones, insights, carreras/equipo y contacto; el contenido incluye hero, lema cinético, exploración, cifras, presencia global, confianza de clientes, insights, CTA final y pie. El orden exacto de algunos elementos visuales se ha contrastado con las capturas disponibles; el texto indexado respalda las áreas y contenidos principales. [Página pública de Auros](https://www.auros.global/)

| Orden | Bloque | Función narrativa | Tratamiento visual/movimiento observado o inferido de las capturas |
|---|---|---|---|
| 1 | Barra de navegación | Orientar sin competir con el hero | Barra horizontal ancha, logo a la izquierda, navegación centrada y CTA a la derecha. Superficie teal translúcida, fija o persistente en las vistas compartidas. Altura contenida respecto al viewport; texto en mayúsculas pequeñas y espaciadas. |
| 2 | Hero | Explicar la propuesta de valor en una mirada | Fondo oscuro con halo teal amplio. Eyebrow centrado, titular de dos líneas, descripción breve y CTA. Gran esfera/red de partículas que emerge desde abajo o queda detrás del mensaje. Composición centrada y mucho aire. |
| 3 | Lema cinético “We Drive / Liquidity” | Convertir la marca en transición | Palabras de escala desproporcionada, recortadas por el viewport y desplazadas al bajar. El bloque ocupa una escena propia y hace de puente, no de encabezado convencional. |
| 4 | Presentación de la empresa | Dar contexto después del gesto visual | Frase central de varias líneas, grande y de peso medio, con variación de color dentro del texto. El contenido entra en una zona más oscura/teal y funciona como pausa. |
| 5 | Exploración de áreas | Ofrecer rutas a profundidad | Panel ancho en dos zonas: lista de soluciones a la izquierda y pieza visual generativa a la derecha. Las filas son módulos interactivos con título, descripción y acceso; una opción activa puede tener una superficie ligeramente elevada. |
| 6 | Cifras | Demostrar escala | Título y bajada centrados. Composición asimétrica de cuatro valores: una tarjeta clara grande junto a módulos oscuros de distinta proporción. Números de gran cuerpo y rótulos compactos. |
| 7 | Frase de transición | Recuperar la escala editorial | Una sentencia grande y centrada sobre fondo continuo, separando datos de red global. |
| 8 | Presencia global | Explicar la cobertura | Encabezado, breve descripción, CTA y visual de red/mapa/territorio. Bloque amplio con foco gráfico más luminoso que el fondo. |
| 9 | Confianza y testimonios | Añadir prueba social | Titular de gran tamaño y carrusel o secuencia de citas. Identidad del partner/persona subordinada a la cita; imágenes/logos aportan anclaje. Revisar controles de carrusel y navegación con teclado al implementarlo. |
| 10 | Cinta de marcas/recursos | Dar continuidad y densidad visual | Repetición horizontal de marcas o imágenes. Es razonable tratarla como cinta/marquee cuando se anima; velocidad lenta y pausa al interactuar son recomendaciones, no medidas internas verificadas. |
| 11 | Frase cinética secundaria | Marcar otro cambio de capítulo | Titular corto y de gran escala que desplaza el mensaje por la escena antes de Insights. |
| 12 | Insights | Mantener actualidad y profundidad | Encabezado, introducción y tarjetas de artículos con imagen, titular, extracto y fecha. Densidad mayor, pero con contención de color y tipografía. |
| 13 | CTA de cierre | Facilitar contacto | Mensaje principal y acción “Get in touch” sobre fondo teal oscuro y luz ambiental. |
| 14 | Footer | Cerrar navegación y confianza | Enlaces de áreas, recursos de marca, privacidad, autoría y copyright. Contraste contenido y columnas simples. |

La página pública enumera las áreas de trading, soluciones de liquidez y carreras; presenta Explore Auros, cifras, presencia global, testimonios, publicaciones, contacto y enlaces de privacidad en el footer. [Estructura y contenido público](https://www.auros.global/)

## 3. Color, superficies y luz

### Paleta funcional aproximada

La página se ve en una familia de teal muy oscuro, verde azulado, turquesa luminoso, blanco perla y un matiz lavanda/perla. Estos valores son **muestras orientativas**, no tokens oficiales extraídos del CSS:

| Token propuesto | Muestra aproximada | Uso |
|---|---:|---|
| `--abyss-950` | `#001713` | Fondo más profundo, extremos y zonas de reposo. |
| `--abyss-900` | `#00221F` | Base principal de escenas oscuras. |
| `--teal-800` | `#004B45` | Barra superior o superficie teal elevada. |
| `--teal-700` | `#006B62` | Foco de luz radial, halo y elementos gráficos. |
| `--aqua-400` | `#39C9BD` | Partículas, líneas y acento activo. |
| `--mist-100` | `#E7F3F1` | Texto claro y superficies perla puntuales. |
| `--lilac-100` | `#EADCF0` | Tono de contraste en acentos, cifras o gradientes muy localizados. |
| `--body-muted` | `#A9C0BC` | Copia secundaria sobre fondos oscuros. |

Los valores deben afinarse con capturas propias antes de producción. No se ha podido inspeccionar el CSS original ni obtener sus variables oficiales.

### Reglas de uso del fondo

- Construir el fondo como **un único lienzo continuo**: base abyss/teal oscuro y luces radiales grandes, suaves y de baja opacidad.
- Mover las luces lentamente con el scroll o una deriva ambiental muy leve. No cambiar el color base de cada sección de manera abrupta.
- Concentrar el brillo cerca de la forma 3D o del foco de cada escena; oscurecer bordes y zonas de lectura.
- Para transiciones, variar gradualmente posición, tamaño y opacidad del halo. Evitar bandas, líneas divisorias y rectángulos de gradiente claramente visibles.
- El gradiente aurora puede aparecer en un CTA o en un detalle pequeño; evitar usarlo como fondo dominante.
- Las tarjetas se distinguen con una diferencia pequeña de luminosidad, borde fino o blur contenido, no mediante sombras grandes.

### Receta CSS orientativa

```css
:root {
  --abyss-950: #001713;
  --abyss-900: #00221f;
  --teal-800: #004b45;
  --teal-700: #006b62;
  --aqua-400: #39c9bd;
  --mist-100: #e7f3f1;
  --lilac-100: #eadcf0;
  --body-muted: #a9c0bc;

  --page-atmosphere:
    radial-gradient(ellipse at 78% 36%, rgb(0 107 98 / 42%), transparent 38%),
    radial-gradient(ellipse at 14% 76%, rgb(0 75 69 / 46%), transparent 42%),
    linear-gradient(145deg, var(--abyss-900), var(--abyss-950) 72%);
}

html, body { background: var(--abyss-950); color: var(--mist-100); }
.page-atmosphere { background: var(--page-atmosphere); }
```

Los porcentajes del ejemplo son puntos de partida y no valores medidos del sitio fuente.

## 4. Tipografía y composición

### Jerarquía práctica

El aspecto observado usa una sans geométrica contemporánea: aperturas amplias, curvas redondas, titulares de peso medio y bloques con tracking negativo al crecer. Las capturas no permiten confirmar el nombre exacto de la fuente; no se debe presentar Matter, Inter u otra familia como tipografía de Auros sin inspeccionar sus estilos/carga de fuentes.

| Nivel | Rango de arranque recomendado | Peso/ritmo |
|---|---:|---|
| Display cinético | `clamp(7rem, 23vw, 19rem)` | 400–500; `line-height: .82–.94`; tracking entre `-.055em` y `-.035em`. |
| H1 hero | `clamp(3.5rem, 8vw, 8rem)` | 400–500; `line-height: .88–.98`; tracking negativo. |
| H2 editorial | `clamp(2.5rem, 5.3vw, 6rem)` | 400–500; interlineado cercano a 1. |
| H3 de módulos | `1.35–2rem` | 400–500; interlineado compacto. |
| Cuerpo | `1–1.125rem` | 400; `line-height: 1.45–1.65`. |
| Navegación/eyebrow | `0.65–0.8rem` | 500; uppercase; `letter-spacing: .08–.16em`. |
| Metadatos | `0.68–0.8rem` | 400–500; contraste y legibilidad antes que ornamentación. |

Todos son rangos de dirección, no medidas confirmadas de Auros. En móvil, ajustar display con `clamp()` y evitar que el texto desborde horizontalmente por defecto. El recorte de display debe ser intencional y solo existir dentro de una escena acotada.

### Espaciado y anchura

- Contenedor de escritorio: `min(92vw, 1440px)` como base; algunos módulos visuales pueden ser full-bleed.
- Márgenes laterales generosos; evitar que el copy y el visual queden apretados en el mismo eje.
- Ritmo vertical: hero y separadores tienen mucho aire; tarjetas y controles usan separación compacta y consistente.
- El contenido editorial puede alternar entre columna centrada y grid 2 columnas; no alinear cada sección con la misma plantilla si cambia la narrativa.
- Bordes y radios se mantienen discretos; las imágenes y paneles amplios se sienten integrados en la escena.

## 5. Lenguaje de movimiento

### Familias de animación

1. **Revelado por scroll:** opacidad y desplazamiento corto de títulos, texto, tarjetas y metadatos. El movimiento debe aclarar la jerarquía; no esconder contenido necesario.
2. **Scrub de display:** el lema enorme se mueve en horizontal/vertical relativo al avance de scroll, en una escena espaciosa. Se recomienda mapear `progress` a `xPercent`, `y` o `scale` con transformaciones, no animar `left/top`.
3. **Pinning narrativo:** fijar brevemente el contenedor del lema o de una visual generativa mientras el usuario recorre una distancia limitada; animar sus hijos y soltar la escena antes del siguiente bloque.
4. **Partículas/forma 3D:** rotación o deriva lenta, parallax sutil, puntos que se encienden y líneas que cambian de intensidad. El sistema debe seguir siendo decorativo y no competir con el texto.
5. **Entrada de escena:** escala sutil (`0.94–1`), blur pequeño a cero o desplazamiento de unas decenas de píxeles; usar solo una o dos propiedades por elemento.
6. **Hover/focus:** leve luminosidad, borde o desplazamiento de flecha en CTA/tarjetas. Mantener una respuesta equivalente con foco de teclado.
7. **Carruseles/cintas:** movimiento lento y constante solo si aporta contexto. Pausar en hover/focus y ofrecer controles explícitos si el contenido se desplaza automáticamente.

### Curvas y duraciones sugeridas

- Microinteracción: `160–260 ms`, ease-out.
- Entrada editorial no ligada a scroll: `500–850 ms`, ease suave, stagger bajo (`60–120 ms`).
- Elemento flotante: ciclo de varios segundos y amplitud reducida; no usar varios ciclos rápidos simultáneos.
- Animación ligada a scroll: la duración la define la distancia recorrida (`scrub`), no un temporizador independiente.
- Usar `power2.out`, `power3.out` o una curva equivalente como punto inicial. No se han medido los easings originales.

### Arquitectura GSAP recomendada

Usar ScrollTrigger para animaciones ligadas a scroll, `scrub` para sincronizar la progresión con la posición y `pin` solo en escenas que lo necesiten. La documentación oficial explica este modelo y el recálculo de start/end con `refresh()`. [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [refresh](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh/)

```js
gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".kinetic-scene",
      start: "top top",
      end: "+=150%",
      scrub: 0.7,
      pin: ".kinetic-scene__stage",
      invalidateOnRefresh: true,
    },
  });

  timeline
    .fromTo(".kinetic-scene__word-a", { xPercent: 12 }, { xPercent: -18, ease: "none" }, 0)
    .fromTo(".kinetic-scene__word-b", { xPercent: -10 }, { xPercent: 16, ease: "none" }, 0);

  return () => timeline.scrollTrigger?.kill();
});
```

Es un patrón reutilizable, **no una reconstrucción del JavaScript propietario de Auros**. En React, recoger y revertir animaciones/ScrollTriggers al desmontar; `gsap.context()` está diseñado para esa limpieza. [GSAP context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/)

## 6. Interacción de navegación y módulos

- Navegación principal: logo/marca a la izquierda; destinos en la zona central; CTA principal aislado a la derecha.
- Menú desplegable: abrir/cerrar de manera predecible, cierre con Escape y fuera del panel, foco visible y navegación por teclado.
- CTA: una acción primaria por escena; estados hover/focus/active coherentes; no depender del gradiente para indicar el foco.
- Tarjetas de Explore: toda la tarjeta puede ser enlace si el destino es único; si hay controles internos, separar sus áreas de interacción.
- Estadísticas: entradas discretas (contador opcional), sin hacer que el número tarde en quedar legible. El valor semántico debe estar disponible en HTML desde la carga inicial.
- Testimonios: si son carrusel, añadir botones anterior/siguiente, etiquetas accesibles y no forzar autoplay rápido.

## 7. Responsive y accesibilidad

### Escritorio

- Aprovechar amplitud con composiciones 2-columnas, texto display y gráficos generativos grandes.
- Mantener el menú en una sola línea, con espacios amplios entre grupos.
- Pinning y parallax pueden estar activos si las mediciones de rendimiento son buenas.

### Tablet

- Reducir display gradualmente; dejar que paneles Explore se conviertan en columna si ya no cabe el visual junto al texto.
- Reducir distancia de parallax y evitar pinning prolongado.
- Mantener titulares y textos legibles sin escalar la página horizontalmente.

### Móvil

- Convertir navegación en menú compacto accesible y hacer CTA visible sin ocupar todo el header.
- Apilar texto y visual; priorizar que la ilustración llegue antes y no quede relegada muy abajo.
- Sustituir pinning largo y escenas de partículas densas por reveals cortos o una imagen/animación ligera.
- Limitar el display a anchura viewport; usar tamaño fluido, `overflow: clip` solo en la escena y respetar safe areas.
- Reducir número de partículas, resolución del canvas y frecuencia de actualización.

### Movimiento reducido y teclado

Respetar `prefers-reduced-motion`: retirar parallax, pinning, scrub y desplazamientos amplios; mostrar directamente el estado final y conservar un fade breve si es útil. MDN explica que esta preferencia detecta el ajuste de movimiento reducido del sistema y permite ofrecer una versión con menos movimiento. [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)

Todo control debe tener nombre accesible y foco visible. El contenido no debe requerir hover, animación o lectura de una cifra animada para entenderse.

## 8. Rendimiento y robustez

- Preferir `transform` y `opacity`; evitar animar propiedades que reactivan layout en cada frame.
- Mantener Canvas/WebGL detrás del contenido, sin interceptar eventos de puntero, y limitar su DPR.
- Pausar la animación ambiental si la pestaña está oculta; bajar intensidad si el dispositivo es táctil o de baja capacidad.
- Evitar varios listeners de scroll independientes; centralizar animación en GSAP/ScrollTrigger o usar IntersectionObserver para reveals de una sola entrada.
- Cargar fuentes y recursos visuales con dimensiones conocidas para evitar saltos de layout.
- Tras cambiar imágenes, fuentes o contenido asíncrono, llamar a `ScrollTrigger.refresh()` cuando corresponda para recalcular posiciones. [Documentación de refresh](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh/)
- No usar smooth-scroll personalizado salvo que el proyecto realmente lo necesite; conservar scroll nativo mejora compatibilidad, accesibilidad y comportamiento móvil.

## 9. Checklist para construir una landing nueva con este framework

### Identidad y estructura

- [ ] Marca, copy, datos, imágenes, métricas y CTAs son propios del nuevo producto.
- [ ] Existe una narrativa clara: hero → frase cinética → explicación → explorador → datos → red/prueba social → contenido → CTA → footer.
- [ ] Fondo continuo y luz ambiental compartida entre secciones.
- [ ] Jerarquía tipográfica y escala display definidas en tokens CSS.

### Movimiento

- [ ] Cada animación tiene propósito: jerarquía, transición, feedback o visualización.
- [ ] El movimiento principal de scroll está ligado a progress y se puede recorrer en ambas direcciones.
- [ ] No hay elementos que desaparezcan antes de que su texto esencial pueda leerse.
- [ ] Pinned scenes tienen distancia y salida definidas; no secuestran el scroll.
- [ ] Hay fallback de movimiento reducido, tablet y móvil.
- [ ] GSAP contexts/timelines se limpian al desmontar y no se duplican en navegación SPA.

### Calidad

- [ ] Capturas revisadas al menos en 1440 px, 1024 px, 768 px y 390 px de ancho.
- [ ] Se comprobó teclado, foco, contraste y que todos los enlaces/controladores sean operables.
- [ ] Medir peso de imágenes, carga de fuentes, memoria GPU y fluidez del scroll.
- [ ] Evitar copiar textos, logos, ilustraciones, testimonios, métricas o animaciones propietarias exactas.

## 10. Evidencia, límites y certeza

### Confirmado en el contenido público

La extracción accesible de la página confirma: navegación de producto/soluciones/insights/carreras/equipo/contacto; hero “Making Digital Markets Liquid”; lema “We Drive Liquidity”; presentación de empresa; Explore Auros; cuatro categorías; cifras; Global Presence; testimonios; Insights; CTA de contacto y Privacy Policy en el footer. [Fuente pública consultada](https://www.auros.global/)

### Observado en capturas compartidas

Barra teal translúcida; fondo oscuro con brillos teal; esfera de partículas; titulares cinéticos de escala extrema; alternancia de frases y paneles; Explore con lista lateral y visual generativa; bloque de estadísticas asimétrico con tarjeta perla; grid de confianza/contenidos; composición de footer.

### Inferencia o no verificable desde esta inspección

- Familia tipográfica exacta, tamaños CSS y valores de tracking.
- Tokens exactos de color, transparencia, radios, blur y dimensiones.
- Biblioteca usada por Auros, configuración GSAP, keyframes, triggers, breakpoints y duraciones internas.
- Si un efecto concreto es Canvas, WebGL, vídeo, SVG o CSS.
- Cambios responsivos exactos en cada breakpoint.

Chrome estaba abierto en la página, pero la herramienta de control visual no pudo verificar la URL con suficiente confianza y se detuvo por política; por ello el análisis visual se apoya en las capturas compartidas y la extracción pública accesible. No se ha inspeccionado el código fuente, no se han descargado assets y no se afirma una equivalencia pixel-perfect.

## 11. Fuentes

- [Auros — página de inicio](https://www.auros.global/) — estructura y contenido público revisados el 8 de noviembre de 2026.
- [GSAP — ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) — `scrub`, pinning, triggers y comportamiento scroll-linked.
- [GSAP — ScrollTrigger.refresh](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh/) — recálculo de puntos de inicio y fin.
- [GSAP — gsap.context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/) — agrupación y limpieza de animaciones y ScrollTriggers.
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — adaptación a la preferencia de movimiento del sistema.

---

**Uso previsto:** tomar este documento como framework de dirección visual y movimiento para otra landing. Replicar ritmo, escala, continuidad de fondo y familias de interacción; crear el contenido y los activos propios de la nueva marca.
