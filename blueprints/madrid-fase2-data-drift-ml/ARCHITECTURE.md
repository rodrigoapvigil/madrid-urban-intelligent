# ARCHITECTURE.md — Madrid Urban Intelligence (Fase 2)
## Pipeline de Actualización de Datos, Auditoría de Drift y Reentrenamiento ML (2026–2028)

---

### 1. Contexto y Objetivos del Sistema

**Madrid Urban Intelligence** es una plataforma analítica y predictiva del mercado inmobiliario de Madrid (distritos y barrios).
La **Fase 2** tiene como objetivo extender el ciclo de vida del dato incorporando nuevas observaciones oficiales publicadas por el Ayuntamiento de Madrid (Abril, Mayo y Junio de 2026), auditar empíricamente la desviación (*drift*) de las predicciones previas contra la realidad observada, reentrenar los modelos de Gradient Boosting (XGBoost) y proyectar un nuevo horizonte temporal de 24 meses (hasta Diciembre de 2028).

---

### 2. Modelo de Datos y Esquema Relacional (SQLite)

La base de datos analítica (`data/madrid_intelligence.db`) sigue un esquema de constelación en estrella optimizado para consultas analíticas directas y sin estado.

#### 2.1 Esquema DDL

```sql
-- Dimensión Temporal
CREATE TABLE IF NOT EXISTS Dim_Tiempo (
    id_tiempo INTEGER PRIMARY KEY, -- Formato YYYYMM (ej. 202604)
    mes INTEGER NOT NULL,          -- 1 a 12
    anio INTEGER NOT NULL,         -- 2023, 2024, 2025, 2026
    trimestre INTEGER NOT NULL     -- 1 a 4
);

-- Dimensión Distritos
CREATE TABLE IF NOT EXISTS Dim_Distrito (
    id_distrito INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,   -- '01' a '21'
    nombre TEXT UNIQUE NOT NULL,   -- 'Centro', 'Arganzuela', etc.
    superficie_media_vivienda REAL,
    renta_media_hogar REAL
);

-- Dimensión Barrios
CREATE TABLE IF NOT EXISTS Dim_Barrio (
    id_barrio INTEGER PRIMARY KEY AUTOINCREMENT,
    id_distrito INTEGER NOT NULL,
    codigo TEXT UNIQUE NOT NULL,   -- '011', '012', etc. (-1 para distrital puro)
    nombre TEXT NOT NULL,
    superficie_media_vivienda REAL,
    renta_media_hogar REAL,
    dist_min_amenity_m REAL,
    dist_min_public_transport_m REAL,
    dist_min_leisure_m REAL,
    dist_min_shop_m REAL,
    dist_to_sol_m REAL,
    count_amenity_500m INTEGER,
    count_public_transport_500m INTEGER,
    FOREIGN KEY (id_distrito) REFERENCES Dim_Distrito(id_distrito)
);

-- Tabla de Hechos de Mercado Inmobiliario (Solo Datos Reales Observados)
CREATE TABLE IF NOT EXISTS Fact_Operacion (
    id_operacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tiempo INTEGER NOT NULL,
    id_distrito INTEGER NOT NULL,
    id_barrio INTEGER NOT NULL,    -- -1 indica registro consolidado a nivel distrito
    tipo_operacion TEXT NOT NULL,  -- 'alquiler' | 'venta'
    precio_m2 REAL NOT NULL,
    variacion_mensual REAL,
    variacion_trimestral REAL,
    variacion_anual REAL,
    superficie_media REAL,
    precio_promedio_vivienda REAL,
    total_anual REAL,
    rentabilidad_bruta REAL,
    num_transacciones INTEGER,
    FOREIGN KEY (id_tiempo) REFERENCES Dim_Tiempo(id_tiempo),
    FOREIGN KEY (id_distrito) REFERENCES Dim_Distrito(id_distrito),
    FOREIGN KEY (id_barrio) REFERENCES Dim_Barrio(id_barrio)
);

-- Tabla de Hechos Macroeconómicos
CREATE TABLE IF NOT EXISTS Fact_Economico (
    id_tiempo INTEGER PRIMARY KEY,
    euribor_1a REAL,
    tipo_interes_bde REAL,
    ipc REAL,
    hipoteca_media REAL,
    FOREIGN KEY (id_tiempo) REFERENCES Dim_Tiempo(id_tiempo)
);
```

#### 2.2 Política de Integridad de Datos
- **Aislamiento de Predicciones**: `Fact_Operacion` contiene **exclusivamente datos históricos oficiales observados**. Las proyecciones del modelo se persisten y sirven de manera desacoplada a través de `data/predictions.csv`.
- **Imputación y Granularidad**: Cuando un barrio carece de observaciones muestrales en un mes puntual (`..`), el sistema mantiene integridad asignando `id_barrio = -1` (fallback al distrito de pertenencia).

---

### 3. Arquitectura por Capas

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Capa de Extracción y Scraping (Playwright Headless)     │
│    - servpub.madrid.es (Series 0504030000214 / 0504030000153)│
│    - Descarga automatizada de CSVs oficiales de 2026        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Capa de Procesamiento ETL e Ingesta Analítica             │
│    - Normalización de texto (unidecode, strip de prefijos) │
│    - Pivotado ancho a largo (melt de meses 1..12)           │
│    - Inserción transaccional atómica en Fact_Operacion      │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│ 3A. Auditoría de Drift y     │ │ 3B. Pipeline de             │
│     Calidad de Predicción     │ │     Reentrenamiento ML      │
│ - Ground Truth vs Pred #1    │ │ - 27 features calculadas    │
│ - APE, MAPE, RMSE            │ │ - XGBoost Alquiler & Venta  │
│ - auditoria_drift_2026.xlsx  │ │ - Inferencia 2026.07-2028.12│
│ - AUDITORIA_DRIFT_2026.md    │ │ - Export a predictions.csv  │
└──────────────────────────────┘ └──────────────┬──────────────┘
                                                │
┌───────────────────────────────────────────────▼──────────────┐
│ 4. Capa de Publicación y Despliegue en Producción            │
│    - Backend FastAPI (Render): Recarga de SQLite y CSVs      │
│    - Frontend Next.js 14 (Vercel): dmiyc.com/madrid          │
│    - Verificación HTTP 200 de los 21 distritos y 131 barrios │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Especificación del Pipeline ML (Features & Modelos)

#### 4.1 Conjunto de 27 Features del Modelo (`features_list.joblib`)
1. `superficie_media`
2. `dist_min_amenity_m`
3. `dist_min_public_transport_m`
4. `dist_min_leisure_m`
5. `dist_min_shop_m`
6. `dist_to_sol_m`
7. `count_amenity_500m`
8. `count_amenity_1km`
9. `count_amenity_2km`
10. `count_amenity_in_poly`
11. `dist_min_school_m`
12. `count_school_1km`
13. `dist_min_hospital_m`
14. `count_hospital_1km`
15. `dist_min_university_m`
16. `count_university_1km`
17. `dist_min_metro_m`
18. `count_metro_1km`
19. `dist_min_park_m`
20. `count_park_1km`
21. `dist_min_supermarket_m`
22. `count_supermarket_1km`
23. `precio_vecinos_m2` (Media espacial de distritos colindantes)
24. `barrio_encoded` (Target encoding ponderado)
25. `ano` (Tendencia secular)
26. `mes` (Estacionalidad mensual)
27. `trimestre` (Ciclicidad trimestral)

#### 4.2 Algoritmos y Artefactos
- **XGBoost Regressor v2** optimizado con objective `reg:squarederror`.
- **Hiperparámetros base**: `max_depth=6`, `learning_rate=0.03`, `n_estimators=600`, `subsample=0.85`, `colsample_bytree=0.85`.
- **Artefactos exportados**:
  - `models/model_xgb_alquiler_v2.json`
  - `models/model_xgb_venta_v2.json`
  - `models/scaler_minmax_global.joblib`
  - `data/predictions.csv` (formato canónico: `id_distrito`, `id_barrio`, `anio`, `mes`, `tipo_operacion`, `precio_m2_predicho`, `intervalo_inferior`, `intervalo_superior`).

---

### 5. Criterios de Aceptación y Auditoría de Drift

Para validar formalmente el desvío entre la realidad y la primera iteración del modelo:

$$\text{APE}_i = \left| \frac{\text{Precio Real}_i - \text{Precio Predicho}_i}{\text{Precio Real}_i} \right| \times 100$$

$$\text{MAPE} = \frac{1}{N} \sum_{i=1}^N \text{APE}_i$$

- **Umbral Distrital**: $\text{MAPE}_{\text{distrito}} \le 5.0\%$
- **Umbral de Barrio**: $\text{MAPE}_{\text{barrio}} \le 8.5\%$
- **Alerta de Drift**: Cualquier zona donde $\text{APE} > \text{Umbral}$ se clasifica en el reporte como *"Desvío Significativo"*, documentando el catalizador urbano correspondiente.
