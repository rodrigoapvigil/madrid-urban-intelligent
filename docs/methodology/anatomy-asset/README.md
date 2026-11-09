# Anatomía visual de la metodología

Ilustración SVG isométrica para el apartado de metodología del proyecto.

La escena representa una tubería física de datos con tres estaciones:

1. **Extracción:** entrada de fuentes de datos abiertos y registros en bruto.
2. **Transformación:** limpieza, normalización, validación y homogeneización.
3. **Inteligencia:** modelos predictivos y memoria vectorial RAG que alimenta a AMBI.

La base de datos analítica conserva únicamente observaciones reales. Las proyecciones se calculan fuera del histórico y se sirven como una capa derivada; esa distinción debe acompañar a la ilustración en el texto de metodología.

## Regenerar

Desde la raíz del repositorio:

```bash
node docs/methodology/anatomy-asset/build.mjs
```

El comando genera:

- `madrid-methodology-anatomy.svg`: asset autónomo para `<img>` o herramientas de diseño.
- `madrid-methodology-anatomy.html`: vista previa de Anatomy Asset.
- `frontend/public/assets/madrid-methodology-anatomy.svg`: copia lista para la aplicación.
