# Madrid Urban Intelligence — sistema visual

## Dirección

Una plataforma de inteligencia inmobiliaria para Madrid: precisa, clara y tecnológica. La base toma de Auros la profundidad azul, el espacio, las superficies por capas y la luz orbital; los adapta a la lectura de mapas, indicadores y series temporales.

## Paleta

| Token | Valor | Uso |
| --- | --- | --- |
| `--mui-blue-950` | `#07182E` | Cabecera, pie y fondos de alto contraste |
| `--mui-blue-900` | `#0B2B50` | Superficies azules secundarias |
| `--mui-blue-800` | `#124A82` | Enlaces y estados de navegación |
| `--mui-iris` | `#1676DF` | Acciones y estado activo |
| `--mui-sky` | `#0099FF` | Luz, foco y detalles luminosos |
| `--mui-iris-gradient` | `#0F5EAA → #0B58AD → #0754B7` | Gradiente de identidad para controles con texto blanco |
| `--mui-sand` | `#D5CEC0` | Acento mineral y líneas cálidas |
| `--mui-paper` | `#F5F2EB` | Fondo de lectura |
| `--mui-paper-raised` | `#FFFEFA` | Tarjetas y formularios |
| `--mui-coral` | `#F04923` | Acción destacada y énfasis breve |
| `--mui-coral-deep` | `#B93519` | Coral sobre superficies claras |
| `--mui-ink` | `#13243A` | Texto principal |
| `--mui-muted` | `#4B5B70` | Texto secundario |

El azul sostiene la identidad. Arena organiza la lectura y suaviza los fondos. Coral señala acciones y momentos puntuales. El gradiente Iris representa profundidad y luz azul.

## Tipografía y forma

- Inter y fuentes de sistema, con títulos de tracking cerrado y cifras tabulares.
- Tarjetas de 16 px de radio; controles de 10 px.
- Separación por color de superficie y líneas finas; sombras suaves en tarjetas interactivas.
- Foco visible Iris Blue y controles táctiles de al menos 44 px cuando el componente lo permita.
- Transiciones entre 140 y 200 ms; respetar `prefers-reduced-motion`.

## Aplicación por página

- **Landing:** hero azul inmersivo con el orbe de datos; perfiles y pasos sobre papel arena; datos y cierre en azul profundo; Coral para el CTA principal.
- **Dashboard:** navegación azul; filtros y panel de datos sobre papel cálido; tarjetas claras para conservar legibilidad; las series conservan su codificación y distinción de observación/proyección.
- **El Veredicto:** panel hero azul, formulario claro y resultados sobre superficies cálidas; los estados mantienen señales diferenciadas.
- **AMBI:** marco y navegación azules; conversación y visualizaciones sobre papel cálido; los colores de series siguen representando los perfiles del mercado.

## Interacción y accesibilidad

- Mantener comportamiento, navegación, filtros, menú, zoom y fórmulas actuales.
- No usar el color como única señal para datos reales, proyecciones o estados.
- Texto normal con contraste mínimo 4.5:1 y foco visible para teclado.
- El movimiento decorativo es estático o sutil; la reducción de movimiento deja contenido y controles disponibles.

## Referencia

Auros / Refero Styles: https://styles.refero.design/style/21cfe0c1-778d-4613-9f47-a5718eb929b3. Se toma la composición atmosférica y la jerarquía de superficies; se aplica la paleta de marca de Madrid Urban Intelligence.
