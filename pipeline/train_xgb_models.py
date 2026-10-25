"""
pipeline/train_xgb_models.py
-----------------------------
Pipeline de reentrenamiento de modelos XGBoost (Alquiler y Venta v2) incorporando el histórico
completo de operaciones reales hasta Junio de 2026 (10.794 registros en Fact_Operacion).

Proceso:
1. Extrae datos del DataMart (Fact_Operacion + Dim_Barrio + Dim_Distrito) de data/madrid_intelligence.db.
2. Limpieza de outliers segmentada por Z-Score <= 3 por tipo de operación y distrito.
3. Generación de features espaciales: autocorrelación vecinal (precio_vecinos_m2 con libpysal Queen).
4. Target Encoding suavizado (barrio_encoded) segmentado por operación.
5. Escalado independiente: StandardScaler para variables monetarias y MinMaxScaler para distancias.
6. Ajuste de hiperparámetros con Early Stopping sobre el set de validación (2026-Q1/Q2).
7. Exportación de modelos a models/model_xgb_alquiler_v2.json y models/model_xgb_venta_v2.json,
   actualización de scalers y generación de models/model_metrics_v2.json.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
import pandas as pd
import numpy as np
import geopandas as gpd
import libpysal
from unidecode import unidecode
import joblib
import xgboost as xgb
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def normalize_name(text):
    if not isinstance(text, str): return ""
    return unidecode(text).strip().lower()

def prepare_feature_data(db_path: Path, geo_path: Path, models_dir: Path):
    print(f"[TRAIN] Conectando a {db_path}...")
    conn = sqlite3.connect(db_path)
    query = """
    SELECT f.*, b.nombre as barrio_nombre, d.nombre as distrito_nombre,
           b.dist_min_amenity_m, b.dist_min_public_transport_m, b.dist_min_leisure_m, b.dist_min_shop_m, b.dist_to_sol_m,
           b.count_amenity_500m, b.count_amenity_1km, b.count_amenity_2km, b.count_amenity_in_poly,
           b.dist_min_school_m, b.count_school_1km, b.dist_min_hospital_m, b.count_hospital_1km,
           b.dist_min_university_m, b.count_university_1km, b.dist_min_metro_m, b.count_metro_1km,
           b.dist_min_park_m, b.count_park_1km, b.dist_min_supermarket_m, b.count_supermarket_1km
    FROM Fact_Operacion f
    JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
    JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
    WHERE f.id_barrio > 0 AND f.precio_m2 > 0
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    print(f"[TRAIN] Registros cargados de barrios residenciales: {len(df)}")

    # 1. Limpieza de outliers Z-Score <= 3 por (tipo_operacion, distrito)
    df['z_score_precio'] = df.groupby(['tipo_operacion', 'distrito_nombre'])['precio_m2'].transform(
        lambda x: (x - x.mean()) / x.std() if x.std() > 0 else 0
    )
    initial_len = len(df)
    df = df[df['z_score_precio'].abs() <= 3].copy()
    print(f"[TRAIN] Outliers filtrados (|z| > 3): {initial_len - len(df)} filas eliminadas.")

    # 2. Efecto Vecindario Espacial (Queen Contiguity)
    if geo_path.exists():
        print(f"[TRAIN] Calculando autocorrelación espacial vecinal desde {geo_path}...")
        gdf = gpd.read_file(geo_path)
        gdf['barrio_norm'] = gdf['barrio'].apply(normalize_name)
        df['barrio_norm'] = df['barrio_nombre'].apply(normalize_name)

        w = libpysal.weights.Queen.from_dataframe(gdf)
        neighbors_map = {}
        for i, b_name in enumerate(gdf['barrio_norm']):
            n_idx = w.neighbors[i]
            n_names = gdf.iloc[n_idx]['barrio_norm'].tolist()
            neighbors_map[b_name] = n_names

        df_means = df.groupby(['id_tiempo', 'tipo_operacion', 'barrio_norm'])['precio_m2'].mean().reset_index()

        def compute_neighbor_mean(row):
            nbrs = neighbors_map.get(row['barrio_norm'], [])
            if not nbrs:
                return row['precio_m2']
            sub = df_means[(df_means['id_tiempo'] == row['id_tiempo']) & 
                           (df_means['tipo_operacion'] == row['tipo_operacion']) & 
                           (df_means['barrio_norm'].isin(nbrs))]['precio_m2']
            return sub.mean() if not sub.empty else row['precio_m2']

        df['precio_vecinos_m2'] = df.apply(compute_neighbor_mean, axis=1)
    else:
        df['precio_vecinos_m2'] = df['precio_m2']

    # 3. Target Encoding con Smoothing
    print("[TRAIN] Aplicando Target Encoding suavizado por barrio...")
    df_list = []
    smoothing = 10
    for op in df['tipo_operacion'].unique():
        df_op = df[df['tipo_operacion'] == op].copy()
        global_mean = df_op['precio_m2'].mean()
        agg = df_op.groupby('barrio_nombre')['precio_m2'].agg(['count', 'mean'])
        smooth_map = (agg['count'] * agg['mean'] + smoothing * global_mean) / (agg['count'] + smoothing)
        df_op['barrio_encoded'] = df_op['barrio_nombre'].map(smooth_map)
        df_list.append(df_op)
    df = pd.concat(df_list, ignore_index=True)

    # 4. Features Temporales
    df['ano'] = df['id_tiempo'] // 100
    df['mes'] = df['id_tiempo'] % 100
    df['trimestre'] = (df['mes'] - 1) // 3 + 1

    # 5. Escalado y guardado de Scalers
    print("[TRAIN] Ajustando y serializando scalers...")
    models_dir.mkdir(parents=True, exist_ok=True)
    std_cols = ['precio_m2', 'precio_vecinos_m2', 'barrio_encoded', 'superficie_media']
    
    scalers_dict = {}
    for op_name in ['venta', 'alquiler']:
        mask = df['tipo_operacion'] == op_name
        scaler = StandardScaler()
        df.loc[mask, std_cols] = scaler.fit_transform(df.loc[mask, std_cols])
        scaler_file = models_dir / f"scaler_std_{op_name}.joblib"
        joblib.dump(scaler, str(scaler_file))
        scalers_dict[op_name] = scaler

        p_scaler = StandardScaler()
        df.loc[mask, ['precio_promedio_vivienda']] = p_scaler.fit_transform(df.loc[mask, ['precio_promedio_vivienda']])
        joblib.dump(p_scaler, str(models_dir / f"scaler_total_{op_name}.joblib"))

    # Scaler MinMaxScaler para distancias
    minmax_cols = [c for c in df.columns if 'dist_min' in c or 'count_' in c or 'dist_to_sol' in c]
    scaler_minmax = MinMaxScaler()
    df[minmax_cols] = scaler_minmax.fit_transform(df[minmax_cols])
    joblib.dump(scaler_minmax, str(models_dir / "scaler_minmax_global.joblib"))

    # Lista de 27 features canónicas
    canonical_features = [
        'superficie_media', 'dist_min_amenity_m', 'dist_min_public_transport_m', 'dist_min_leisure_m',
        'dist_min_shop_m', 'dist_to_sol_m', 'count_amenity_500m', 'count_amenity_1km', 'count_amenity_2km',
        'count_amenity_in_poly', 'dist_min_school_m', 'count_school_1km', 'dist_min_hospital_m',
        'count_hospital_1km', 'dist_min_university_m', 'count_university_1km', 'dist_min_metro_m',
        'count_metro_1km', 'dist_min_park_m', 'count_park_1km', 'dist_min_supermarket_m',
        'count_supermarket_1km', 'precio_vecinos_m2', 'barrio_encoded', 'ano', 'mes', 'trimestre'
    ]
    joblib.dump(canonical_features, str(models_dir / "features_list.joblib"))

    return df, canonical_features, scalers_dict

def train_operation_model(df_op: pd.DataFrame, features: list, op_name: str, scaler: StandardScaler):
    print(f"\n==========================================")
    print(f" ENTRENANDO MODELO XGBOOST v2: {op_name.upper()}")
    print(f"==========================================")

    # Train: 2023-2025 | Validation: 2026 (meses 1 a 6)
    train_mask = df_op['ano'] < 2026
    val_mask = df_op['ano'] == 2026

    X_train = df_op.loc[train_mask, features]
    y_train = df_op.loc[train_mask, 'precio_m2']
    X_val = df_op.loc[val_mask, features]
    y_val = df_op.loc[val_mask, 'precio_m2']

    print(f"Filas de Entrenamiento (2023-2025): {len(X_train)}")
    print(f"Filas de Validación (2026 Q1-Q2):    {len(X_val)}")

    # Hiperparámetros optimizados con Early Stopping
    model = xgb.XGBRegressor(
        n_estimators=1000,
        learning_rate=0.03,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        n_jobs=-1,
        random_state=42,
        early_stopping_rounds=50,
        eval_metric='rmse'
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )

    # Evaluación
    y_pred_scaled = model.predict(X_val)
    r2 = r2_score(y_val, y_pred_scaled)
    rmse_scaled = np.sqrt(mean_squared_error(y_val, y_pred_scaled))

    # Des-escalar para métricas reales en €/m2
    # El scaler std tiene precio_m2 en el índice 0
    scale_factor = scaler.scale_[0]
    mean_val = scaler.mean_[0]

    y_val_real = (y_val * scale_factor) + mean_val
    y_pred_real = (y_pred_scaled * scale_factor) + mean_val

    mae_euro = mean_absolute_error(y_val_real, y_pred_real)
    rmse_euro = np.sqrt(mean_squared_error(y_val_real, y_pred_real))
    mape = np.mean(np.abs((y_val_real - y_pred_real) / y_val_real)) * 100

    print(f"\n[MÉTRICAS VALIDACIÓN v2 {op_name.upper()}]")
    print(f"  R² Score:            {r2:.4f}")
    print(f"  RMSE (Estandarizado): {rmse_scaled:.4f}")
    print(f"  RMSE (€/m²):         {rmse_euro:.2f} €/m²")
    print(f"  MAE (€/m²):          {mae_euro:.2f} €/m²")
    print(f"  MAPE:                {mape:.2f}%")
    print(f"  Mejor iteración:     {model.best_iteration}")

    return model, {
        "operacion": op_name,
        "n_train": len(X_train),
        "n_val": len(X_val),
        "best_iteration": model.best_iteration,
        "r2_score": round(float(r2), 4),
        "rmse_std": round(float(rmse_scaled), 4),
        "rmse_euro": round(float(rmse_euro), 2),
        "mae_euro": round(float(mae_euro), 2),
        "mape_pct": round(float(mape), 2)
    }

def main():
    repo_dir = Path(__file__).resolve().parent.parent
    db_path = repo_dir / "data" / "madrid_intelligence.db"
    geo_path = repo_dir / "data" / "spatial" / "barrios_polygons.geojson"
    models_dir = repo_dir / "models"

    df, features, scalers = prepare_feature_data(db_path, geo_path, models_dir)

    all_metrics = {}

    for op in ['venta', 'alquiler']:
        df_op = df[df['tipo_operacion'] == op].copy()
        model, metrics = train_operation_model(df_op, features, op, scalers[op])
        
        # Guardar modelo v2
        v2_path = models_dir / f"model_xgb_{op}_v2.json"
        model.save_model(str(v2_path))
        print(f"[OK] Modelo guardado en: {v2_path}")

        # Guardar también como v1 activo para el servicio en producción
        v1_path = models_dir / f"model_xgb_{op}_v1.json"
        model.save_model(str(v1_path))
        
        all_metrics[op] = metrics

    # Guardar reporte de métricas JSON
    metrics_path = models_dir / "model_metrics_v2.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\n[OK] Metadatos de validación exportados a: {metrics_path}")

    # Validar acceptance criteria
    for op in ['venta', 'alquiler']:
        assert (models_dir / f"model_xgb_{op}_v2.json").exists(), f"Error: Modelo v2 para {op} no encontrado"
        assert all_metrics[op]['r2_score'] > 0.80, f"Error: R2 menor a 0.80 para {op}"
    print("[VERIFY] Modelos v2 reentrenados y validados con éxito.")

if __name__ == "__main__":
    main()
