# CLAUDE.md — Guía del Proyecto (Madrid Urban Intelligence - Fase 2)

Este archivo define las reglas de ingeniería, convenciones y comandos de verificación para cualquier agente o programador que trabaje en el repositorio.

---

## 1. Principios de Ingeniería y Directrices (Andrej Karpathy 24/7)

1. **Think Before Coding (Pensar antes de actuar / Cero Suposiciones)**:
   - Antes de escribir una sola línea de código, verifica la existencia de archivos, tablas de la base de datos o dependencias en el entorno.
   - Si un valor o parámetro es ambiguo, utiliza siempre los datos verificados del repositorio.

2. **Simplicity First (Simplicidad ante todo)**:
   - La solución mínima, modular y directa que resuelva exactamente la tarea asignada.
   - Prohibido agregar arquitecturas especulativas, microservicios innecesarios o capas de abstracción no solicitadas.

3. **Surgical Changes (Cambios quirúrgicos)**:
   - Modifica ÚNICAMENTE los archivos y funciones asignados en la tarea correspondiente.
   - Respeta escrupulosamente el estilo y la estructura de código preexistente (`clean_ayto_2.py`, `data.py`, `MadridDashboardV2.tsx`).

4. **Goal-Driven Execution (Ejecución orientada a objetivos con verificación empírica)**:
   - Cada tarea debe concluir con la ejecución exitosa de su comando de verificación correspondiente (`verify_command`), el cual debe finalizar con código de salida 0.

---

## 2. Reglas Estrictas del Dominio de Datos (TFM Madrid)

- **Regla de Oro de la Base Analítica**: 
  - La base de datos SQLite (`data/madrid_intelligence.db`, tabla `Fact_Operacion`) contiene **ÚNICAMENTE DATOS REALES OBSERVADOS**.
  - **ESTÁ ESTRICTAMENTE PROHIBIDO insertar proyecciones o predicciones generadas por el modelo en `Fact_Operacion`**.
  - Las predicciones residen exclusivamente en `data/predictions.csv` y son servidas por el backend FastAPI en tiempo de consulta.
- **Tratamiento de Datos Faltantes (`..`)**:
  - En los CSVs oficiales del Ayuntamiento, cuando un barrio carece de muestra suficiente en un mes aparece indicado como `..`.
  - El parser debe convertir esos registros a `NaN` mediante `pd.to_numeric(errors='coerce')` y descartar la fila a nivel barrio.
  - La API y el frontend resuelven automáticamente la ausencia consultando el registro consolidado a nivel distrito (`id_barrio = -1`).
- **Normalización de Operación**:
  - En la base de datos y CSVs, las transacciones inmobiliarias de compra/venta se denominan exclusivamente `'venta'`.
  - Toda función que reciba `'compra'` o `'compra-venta'` debe normalizarla internamente a `'venta'` mediante `_clean_op()`.

---

## 3. Comandos Esenciales de Verificación y Compilación

### Backend & Pipeline ML (Python)
```bash
# Verificar entorno y sintaxis del backend
python -c "import sys; sys.path.insert(0, 'backend'); import data; print('OK')"

# Probar consultas analíticas clave (Heatmap y KPIs)
python -c "import sys; sys.path.insert(0, 'backend'); import data; assert len(data.get_heatmap_data(2024, 'alquiler', 'distrito')) == 21"

# Ejecutar auditoría de drift (cuando se complete el script)
python pipeline/audit_prediction_drift.py
```

### Frontend (Next.js 14)
```bash
# Verificación de linting
cd frontend && npm run lint

# Compilación de producción
cd frontend && npm run build
```

---

## 4. Fuentes Oficiales de Extracción Automatizada

- **Portal**: Banco de Datos del Ayuntamiento de Madrid (`servpub.madrid.es`)
- **Serie Alquiler**: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000214`
  - *4.3.21.D. Evolución del precio de oferta de alquiler de la vivienda (€/m2) por Distrito, Barrio y Mes*
- **Serie Venta**: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000153`
  - *4.3.15.C. Evolución del precio de oferta de venta de la vivienda (€/m2) por Distrito, Barrio y Mes*
- **Parámetros de Selección en Formulario**:
  - **Año**: `2026`
  - **Distritos**: Todos excepto *"Total Ciudad de Madrid"* (21 distritos seleccionados).
  - **Barrios**: Todos (checkboxes *"Todos"* y *"Totales"* activos, 152 ítems).
  - **Meses**: Todos (checkbox *"Todos"* activo, 12 meses).
  - **Orientación**: Filas: AÑO, DISTRITO*, BARRIO* / Columnas: MES.
