# Blueprint — Madrid Urban Intelligence (Fase 2)
## Actualización de Datos Reales 2026, Auditoría de Drift y Reentrenamiento ML

---

### 1. Project Overview

#### 1.1 Current State
Madrid Urban Intelligence es una aplicación web analítica y predictiva operativa en `https://dmiyc.com/madrid` (Frontend en Next.js 14 alojado en Vercel, Backend en FastAPI alojado en Render).
Actualmente, la base de datos SQLite analítica (`data/madrid_intelligence.db`) almacena datos reales observados hasta **Marzo de 2026**. Para los meses posteriores, el backend recurre a un archivo estático precalculado (`data/predictions.csv`) que proyecta precios para todo 2026 y 2027 generados por modelos XGBoost v1 entrenados previamente.

#### 1.2 Target State
La Fase 2 transforma el repositorio incorporando:
1. Un scraper headless automatizado con Playwright que descarga de forma autónoma las series oficiales del Ayuntamiento de Madrid (`bancodatos.madrid.es`).
2. Un pipeline ETL que procesa los nuevos datos observados para **Abril, Mayo y Junio de 2026** y los ingesta en la base de datos analítica `Fact_Operacion` (garantizando CERO predicciones en la base).
3. Una auditoría de precisión y drift que contrasta las predicciones antiguas contra la realidad observada en 2026-Q2, emitiendo un Excel multi-pestaña (`auditoria_drift_2026.xlsx`) y un informe estadístico (`AUDITORIA_DRIFT_2026.md`) defendible en el TFM.
4. El reentrenamiento de los modelos XGBoost (Alquiler y Venta v2) incorporando el nuevo histórico.
5. La inferencia y generación de un nuevo horizonte de predicciones hasta **Diciembre de 2028** (24 meses vista) y un análisis comparativo de la evolución de expectativas para 2027.
6. El despliegue continuo de los nuevos artefactos a Render y Vercel con pruebas de humo automáticas.

---

### 2. Technical Architecture & System Patterns

El sistema utiliza un patrón de desacoplamiento analítico:
- **Capa Transaccional / ETL**: Scripts modulares en Python bajo `pipeline/`.
- **Capa de Almacenamiento Analítico**: SQLite relacional con esquema estrella optimizado para lecturas sin bloqueos (`WAL mode`).
- **Capa de Inferencia ML**: XGBoost 2.0+ desacoplado que persiste resultados en CSVs estáticos versionados en Git, reduciendo la latencia de la API a menos de 50ms en Render.
- **Capa de Visualización**: Componentes React en Next.js 14 con renderizado coroplético en Leaflet y gráficos dinámicos en Chart.js.

---

### 3. Directory Structure

```
madrid-urban-intelligent/
├── backend/
│   ├── main.py                  # API FastAPI (CORS, endpoints)
│   ├── data.py                  # Capa DAL y consultas analíticas SQLite/CSV
│   └── requirements.txt
├── data/
│   ├── madrid_intelligence.db   # Base de datos analítica maestra (SQLite)
│   ├── predictions.csv          # Proyecciones ML 2026-2028 (CSV)
│   ├── raw_update/              # Descargas brutas de bancodatos.madrid.es
│   └── auditoria_drift_2026.xlsx# Informe de auditoría Excel multi-pestaña
├── models/
│   ├── features_list.joblib     # Lista de 27 features del modelo
│   ├── model_xgb_alquiler_v2.json # Modelo reentrenado de alquiler
│   ├── model_xgb_venta_v2.json    # Modelo reentrenado de venta
│   └── scaler_minmax_global.joblib
├── pipeline/
│   ├── scrape_ayto_bancodatos.py# Scraper Playwright municipal
│   ├── clean_update_2026.py     # Parser ETL de nuevos meses 2026
│   ├── ingest_ground_truth_db.py# Ingesta en Fact_Operacion SQLite
│   ├── audit_prediction_drift.py# Generador de auditoría y Excel de drift
│   ├── train_xgb_models.py      # Script de reentrenamiento XGBoost v2
│   └── generate_predictions_2028.py # Inferencia mensual 2026-2028
└── frontend/
    └── components/
        ├── MadridDashboardV2.tsx# Dashboard principal
        └── MadridMap.tsx        # Visualizador coroplético Leaflet
```

#### 3.1 Delta
- **Archivos Nuevos**:
  - `pipeline/scrape_ayto_bancodatos.py`
  - `pipeline/clean_update_2026.py`
  - `pipeline/ingest_ground_truth_db.py`
  - `pipeline/audit_prediction_drift.py`
  - `pipeline/train_xgb_models.py`
  - `pipeline/generate_predictions_2028.py`
  - `data/auditoria_drift_2026.xlsx`
  - `AUDITORIA_DRIFT_2026.md`
  - `COMPARATIVA_PREDICCIONES_2027.md`
- **Archivos Modificados**:
  - `data/madrid_intelligence.db` (actualizado con filas de 2026Q2 en `Fact_Operacion`)
  - `data/predictions.csv` (reemplazado con nuevas proyecciones 2026-2028)
  - `models/model_xgb_alquiler_v2.json`, `models/model_xgb_venta_v2.json`

---

### 4. Data Model

#### 4.1 Delta en la Base de Datos
- `Dim_Tiempo`: Se insertan `202604`, `202605`, `202606`.
- `Fact_Operacion`: Se insertan aproximadamente 400 nuevos registros reales correspondientes a los 21 distritos y 131 barrios para Abril, Mayo y Junio de 2026.
- CERO predicciones son insertadas en la base.

---

### 5. API Design

#### 5.1 Interfaces Held Constant
Los contratos de API preexistentes permanecen 100% estables para no alterar el frontend:
- `GET /api/filters` -> Retorna años disponibles (ahora incluye 2026 y 2027/2028 en proyecciones) y distritos.
- `GET /api/kpis?year=...&month=...&op=...&district=...&barrio=...` -> Indicadores agregados.
- `GET /api/heatmap?year=...&op=...&level=...` -> Matriz de 12 meses por zona.
- `GET /api/series?year=...&op=...&zona=...` -> Serie temporal mensual histórica + predicción.

---

### 6. External Integrations

- **Banco de Datos del Ayuntamiento de Madrid**:
  - Serie Alquiler: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000214`
  - Serie Venta: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000153`
  - Parámetros: Año=2026, Distritos=Todos excepto Ciudad de Madrid (21), Barrios=Todos (152), Meses=Todos (12).

---

### 7. Frontend Design & UX

- **NOT APPLICABLE** — El frontend ya fue adaptado quirúrgicamente en la fase previa con Esri Canvas y selectores dinámicos. Consume los nuevos datos de forma transparente mediante la API.

---

### 8. Security & Privacy

- Solo se manejan datos macro e índices agregados públicos del Ayuntamiento de Madrid e INE. Cero datos personales o PII.
- Acceso de base de datos de solo lectura en producción mediante permisos de archivo en Render.

---

### 9. Step-by-step Build Order

| Paso | Tarea | Artefacto Generado | Comando de Verificación |
| :--- | :--- | :--- | :--- |
| **Paso 1** | Scraper Playwright municipal | `pipeline/scrape_ayto_bancodatos.py` | `python pipeline/scrape_ayto_bancodatos.py` |
| **Paso 2** | Parser ETL de datos 2026 | `pipeline/clean_update_2026.py` | `python pipeline/clean_update_2026.py` |
| **Paso 3** | Ingesta real en SQLite | `data/madrid_intelligence.db` | `python pipeline/ingest_ground_truth_db.py` |
| **Paso 4** | Auditoría de Drift y Excel | `auditoria_drift_2026.xlsx` & `AUDITORIA_DRIFT_2026.md` | `python pipeline/audit_prediction_drift.py` |
| **Paso 5** | Dataset maestro operativo | `df_master_full.csv` | `python pipeline/generate_operational_dataset.py` |
| **Paso 6** | Reentrenamiento XGBoost | `model_xgb_*_v2.json` | `python pipeline/train_xgb_models.py` |
| **Paso 7** | Inferencia 2026-2028 | `data/predictions.csv` | `python pipeline/generate_predictions_2028.py` |
| **Paso 8** | Despliegue y QA en vivo | Commit Git + Render Deploy | Verificación HTTP 200 en producción |

---

### 10. Bootstrap & Setup

```bash
# Instalar dependencias necesarias para scraping y auditoría
pip install playwright openpyxl
playwright install chromium
```

---

### 11. Testing Strategy

1. **Test de Integridad de Ingesta**: Comprobar que `Fact_Operacion` solo posea `tipo_operacion IN ('alquiler', 'venta')` y fechas válidas.
2. **Test de Cobertura de Predicciones**: Verificar que `predictions.csv` contenga exactamente las combinaciones de los 21 distritos y 131 barrios para todos los meses proyectados hasta Diciembre 2028.
3. **Smoke Test de Endpoints**: Consulta automatizada a `/api/heatmap?year=2026&op=alquiler` asegurando retorno de 21 distritos con datos reales en meses 1 a 6.

---

### 12. Release and Rollback

- **Release**: `git commit` de `data/madrid_intelligence.db` y `data/predictions.csv` seguido de `git push origin main`.
- **Rollback**: Si alguna predicción o dato introdujese anomalías, se puede revertir con `git revert HEAD` o restaurando el backup `madrid_intelligence_base.db`.

---

### 13. Observability & Monitoring

- Monitorización pasiva de endpoints de Render mediante UptimeRobot o curl periódico.
- Trazas de logging estructuradas en backend con FastAPI/Uvicorn.

---

### 14. Failure Modes & Mitigations

- **Fallo de conexión o cambio de HTML en el Banco de Datos**: El script Playwright implementa selectores resilientes basados en atributos de formulario (`name="anyo"`, `name="distrito"`). En caso de bloqueo por captcha o red, se activa la vía de contingencia mediante carga manual de los CSVs previamente descargados por el usuario.
- **Sobreajuste (*Overfitting*) en Reentrenamiento**: Se fija un split temporal estricto (datos hasta 2025 para entrenamiento, 2026 para validación con Early Stopping de 50 rondas).

---

### 15. Cost & Performance Optimization

- Las predicciones precalculadas en CSV permiten servir las consultas de inferencia en O(1) tiempo de lectura, manteniendo el servidor Render en su capa gratuita sin consumo intensivo de CPU.

---

### 16. Documentation & Knowledge Transfer

- Se generan dos documentos clave para la memoria del TFM:
  1. `AUDITORIA_DRIFT_2026.md`: Justificación estadística de precisión de la Fase 1 frente a la realidad observada en 2026Q2.
  2. `COMPARATIVA_PREDICCIONES_2027.md`: Evaluación del impacto de los nuevos datos en la senda proyectada para 2027.

---

### 17. Maintenance & Future Considerations

- En futuras iteraciones (ej. cuando se publiquen los datos del tercer trimestre de 2026), el proceso se ejecutará de forma desatendida ejecutando simplemente la secuencia de scripts de `pipeline/`.

---

### 18. Key Decisions Log

1. **Aislamiento de Predicciones**: Decisión técnica de no mezclar datos proyectados en `Fact_Operacion` para mantener la base de datos como una fuente única de verdad empírica.
2. **Márgenes de Aceptación**: Umbral formal de 5% distrital y 8.5% en barrios como cota de validez estadística.
3. **Horizonte 2028**: Extensión a 24 meses vista para maximizar el valor predictivo de cara a la defensa del TFM.

---

### 19. Appendix

- Enlace a serie oficial alquiler: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000214`
- Enlace a serie oficial venta: `https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000153`

---

### 20. Sign-off Checklist

- [x] Arquitectura confirmada por el usuario.
- [x] Reglas de selección de formulario documentadas con captura oficial.
- [x] Todas las tareas numeradas con criterios EARS y comandos de prueba en `tasks.json`.
- [x] Guía de reglas para desarrolladores generada en `CLAUDE.md`.
- [x] Esquemas relacionales y pipeline de features definidos rigurosamente.
