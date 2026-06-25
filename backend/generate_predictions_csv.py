import os
import sqlite3
import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
import unicodedata

# 1. Definición de rutas operativas
FASE5_DIR = r"c:\Users\FX517\OneDrive\Desktop\TFM\FASE 5"
DATA_DIR = os.path.join(FASE5_DIR, "02_fuente_operativa_modelo")
DB_PATH = os.path.join(FASE5_DIR, "01_fuente_original_real", "madrid_intelligence.db")
OUTPUT_CSV = os.path.join(FASE5_DIR, "08_madrid_urban_intelligent", "data", "predictions.csv")

print("=== [INICIO] CARGANDO DATOS PARA EL GENERADOR DE PREDICCIONES ===")

# Cargar datasets
train_barrio = pd.read_csv(os.path.join(DATA_DIR, 'train_barrio.csv'))
val_barrio = pd.read_csv(os.path.join(DATA_DIR, 'val_barrio.csv'))
df_interest = pd.read_csv(os.path.join(DATA_DIR, 'interest_rates_clean.csv'))
df_transactions = pd.read_csv(os.path.join(DATA_DIR, 'transactions_clean.csv'))

# Cargar renta media y mapear
df_renta = pd.read_csv(os.path.join(DATA_DIR, 'renta_media.csv'), sep=';', skiprows=5, header=None)
df_renta = df_renta.iloc[:, [0, 1, 19]]
df_renta.columns = ['Distrito_raw', 'Barrio_raw', 'renta_neta_hogar_2023']
df_renta = df_renta.dropna(subset=['Distrito_raw', 'Barrio_raw']).copy()
df_renta = df_renta[df_renta['Distrito_raw'] != 'Ciudad de Madrid']
df_renta = df_renta[df_renta['Distrito_raw'] != df_renta['Barrio_raw']]
df_renta['Barrio_str'] = df_renta['Barrio_raw'].str.extract(r'^\d+\.\s*(.*)')
df_renta['renta_neta_hogar_2023'] = pd.to_numeric(df_renta['renta_neta_hogar_2023'].astype(str).str.replace('.', '', regex=False), errors='coerce')

def normalize_str(s):
    if pd.isna(s): return s
    s = str(s).upper()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s.strip()

df_renta['Barrio_norm'] = df_renta['Barrio_str'].apply(normalize_str)
df_renta.loc[df_renta['Barrio_norm'] == 'VALDERRIVAS', 'Barrio_norm'] = 'VALDERRIBAS'

conn = sqlite3.connect(DB_PATH)
dim_barrio = pd.read_sql_query('SELECT id_barrio, id_distrito, nombre FROM Dim_Barrio WHERE id_barrio != -1', conn)
dim_distrito = pd.read_sql_query('SELECT id_distrito, nombre FROM Dim_Distrito WHERE id_distrito != -1', conn)
conn.close()

dim_barrio['Barrio_norm'] = dim_barrio['nombre'].apply(normalize_str)
df_renta_mapped = pd.merge(df_renta, dim_barrio[['id_barrio', 'id_distrito', 'Barrio_norm']], on='Barrio_norm', how='inner')

def aplicar_renta(df_original, df_renta_mapped):
    df = df_original.copy()
    df = pd.merge(df, df_renta_mapped[['id_distrito', 'id_barrio', 'renta_neta_hogar_2023']], on=['id_distrito', 'id_barrio'], how='left')
    df['renta_neta_hogar_2023'] = df['renta_neta_hogar_2023'].fillna(df['renta_neta_hogar_2023'].median())
    return df

train_barrio_renta = aplicar_renta(train_barrio, df_renta_mapped)
val_barrio_renta = aplicar_renta(val_barrio, df_renta_mapped)

# Unir train y val para entrenamiento final completo de los modelos
df_full_train = pd.concat([train_barrio_renta, val_barrio_renta], ignore_index=True)

# Ingeniería de variables
def add_shock_weight_col(df, weight_mode='none'):
    df = df.copy()
    df['shock_weight'] = 0.0
    if weight_mode == 'aggressive_2025':
        df['shock_weight'] = np.where(df['anio'] >= 2025, 1.0, 0.0)
    elif weight_mode == 'progressive_ramp':
        mask_2025 = df['anio'] == 2025
        df.loc[mask_2025, 'shock_weight'] = df.loc[mask_2025, 'mes'] / 12.0
        df.loc[df['anio'] > 2025, 'shock_weight'] = 1.0
    return df

def extend_to_future_years(df, max_year=2027):
    df = df.copy()
    max_data_year = df['anio'].max()
    res = df.copy()
    for yr in range(max_data_year + 1, max_year + 1):
        extra = df[df['anio'] == max_data_year].copy()
        extra['anio'] = yr
        res = pd.concat([res, extra], ignore_index=True)
    return res

def merge_external_features(df, include_interest=True, include_trans=True):
    res = df.copy()
    if include_interest:
        interest = extend_to_future_years(df_interest).groupby(['id_distrito', 'anio'])[['hipoteca_media', 'tipo_interes_medio']].mean().reset_index()
        res = res.merge(interest, on=['id_distrito', 'anio'], how='left')
    if include_trans:
        trans = extend_to_future_years(df_transactions).groupby(['id_distrito', 'anio'])['num_transacciones'].mean().reset_index()
        res = res.merge(trans, on=['id_distrito', 'anio'], how='left')
    return res.fillna(0)

# Entrenar modelos definitivos
print("\n=== ENTRENANDO MODELOS DEFINITIVOS DE FASE C ===")

models = {}

# 1. VENTA (Algoritmo: XGBoost)
# Filtramos datos de venta
df_venta = df_full_train[df_full_train['tipo_operacion'] == 'venta'].copy()
df_venta = add_shock_weight_col(df_venta, weight_mode='progressive_ramp')
df_venta = merge_external_features(df_venta)

# Pesos de entrenamiento
w_venta = np.ones(len(df_venta))
w_venta = np.where(df_venta['anio'] == 2023, 1.0, w_venta)
w_venta = np.where(df_venta['anio'] == 2024, 1.2, w_venta)
w_venta = np.where(df_venta['anio'] == 2025, 1.8, w_venta)
w_venta = np.where(df_venta['anio'] == 2026, 2.5, w_venta)

# Features
feats_barrio = ['anio', 'mes', 'trimestre', 'id_distrito', 'dist_to_sol_m', 'dist_min_metro_m', 
                'superficie_media_vivienda', 'lag_1', 'lag_3', 'lag_12', 'rolling_mean_6',
                'hipoteca_media', 'tipo_interes_medio', 'num_transacciones', 'renta_neta_hogar_2023',
                'shock_weight', 'id_barrio']

feats_distrito = ['anio', 'mes', 'trimestre', 'id_distrito', 'dist_to_sol_m', 'dist_min_metro_m', 
                  'superficie_media_vivienda', 'lag_1', 'lag_3', 'lag_12', 'rolling_mean_6',
                  'hipoteca_media', 'tipo_interes_medio', 'num_transacciones', 'renta_neta_hogar_2023',
                  'shock_weight']

# XGBoost Barrio (Venta)
xgb_barrio = xgb.XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42)
xgb_barrio.fit(df_venta[feats_barrio], df_venta['precio_m2'], sample_weight=w_venta)
models[('venta', 'barrio')] = xgb_barrio

# XGBoost Distrito (Venta)
xgb_distrito = xgb.XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42)
xgb_distrito.fit(df_venta[feats_distrito], df_venta['precio_m2'], sample_weight=w_venta)
models[('venta', 'distrito')] = xgb_distrito


# 2. ALQUILER (Algoritmo: LightGBM)
df_alquiler = df_full_train[df_full_train['tipo_operacion'] == 'alquiler'].copy()
df_alquiler = add_shock_weight_col(df_alquiler, weight_mode='progressive_ramp')
df_alquiler = merge_external_features(df_alquiler)

w_alquiler = np.ones(len(df_alquiler))
w_alquiler = np.where(df_alquiler['anio'] == 2023, 1.0, w_alquiler)
w_alquiler = np.where(df_alquiler['anio'] == 2024, 1.2, w_alquiler)
w_alquiler = np.where(df_alquiler['anio'] == 2025, 1.8, w_alquiler)
w_alquiler = np.where(df_alquiler['anio'] == 2026, 2.5, w_alquiler)

# LightGBM Barrio (Alquiler)
lgb_barrio = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=31, random_state=42, verbose=-1)
lgb_barrio.fit(df_alquiler[feats_barrio], df_alquiler['precio_m2'], sample_weight=w_alquiler)
models[('alquiler', 'barrio')] = lgb_barrio

# LightGBM Distrito (Alquiler)
lgb_distrito = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=31, random_state=42, verbose=-1)
lgb_distrito.fit(df_alquiler[feats_distrito], df_alquiler['precio_m2'], sample_weight=w_alquiler)
models[('alquiler', 'distrito')] = lgb_distrito

print("Modelos entrenados correctamente.")

# -------------------------------------------------------------------------
# PROYECCIÓN RECURSIVA MENSUAL (ABRIL 2026 A DICIEMBRE 2027)
# -------------------------------------------------------------------------
print("\n=== GENERANDO PREDICCIONES RECURSIVAS MENSUALES (2026-2027) ===")

# Obtener historial real de la base de datos para inicializar las predicciones
conn = sqlite3.connect(DB_PATH)
df_history = pd.read_sql_query("""
    SELECT f.id_barrio, b.id_distrito, f.tipo_operacion, t.anio, t.mes, f.precio_m2,
           b.dist_to_sol_m, b.dist_min_metro_m, b.superficie_media_vivienda, b.renta_media_hogar as renta_neta_hogar_2023
    FROM Fact_Operacion f
    JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
    JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
""", conn)
conn.close()

# Identificar barrios generalistas de bajo soporte (<20 muestras en train)
barrio_counts = df_full_train[df_full_train['tipo_operacion'] == 'venta'].groupby('id_barrio').size()
poor_barrios = barrio_counts[barrio_counts < 20].index.tolist()

# Extraer de forma estática los datos espaciales y socioeconómicos mapeados de df_full_train
barrio_static_info = {}
for _, row in df_full_train.groupby('id_barrio').first().reset_index().iterrows():
    b_id = int(row['id_barrio'])
    barrio_static_info[b_id] = {
        'id_distrito': int(row['id_distrito']),
        'dist_to_sol_m': float(row['dist_to_sol_m']),
        'dist_min_metro_m': float(row['dist_min_metro_m']),
        'superficie_media_vivienda': float(row['superficie_media_vivienda']),
        'renta_media_hogar': float(row['renta_neta_hogar_2023'])
    }

distrito_static_info = {}
for _, row in df_full_train.groupby('id_distrito').first().reset_index().iterrows():
    d_id = int(row['id_distrito'])
    df_d = df_full_train[df_full_train['id_distrito'] == d_id]
    distrito_static_info[d_id] = {
        'dist_to_sol_m': float(df_d['dist_to_sol_m'].mean()),
        'dist_min_metro_m': float(df_d['dist_min_metro_m'].mean()),
        'superficie_media_vivienda': float(df_d['superficie_media_vivienda'].mean()),
        'renta_neta_hogar_2023': float(df_d['renta_neta_hogar_2023'].mean())
    }

# Inicializar un diccionario para búsquedas eficientes del histórico y las nuevas proyecciones
price_tracker = {}
for _, row in df_history.iterrows():
    b_id = int(row['id_barrio'])
    d_id = int(row['id_distrito'])
    op = str(row['tipo_operacion'])
    y = int(row['anio'])
    m = int(row['mes'])
    p = float(row['precio_m2'])
    
    price_tracker[(b_id, op, y, m)] = p

# Llenar promedios de distrito históricos en el tracker
df_hist_dist = df_history.groupby(['id_distrito', 'tipo_operacion', 'anio', 'mes'])['precio_m2'].mean().reset_index()
for _, row in df_hist_dist.iterrows():
    d_id = int(row['id_distrito'])
    op = str(row['tipo_operacion'])
    y = int(row['anio'])
    m = int(row['mes'])
    p = float(row['precio_m2'])
    
    price_tracker[(-1, d_id, op, y, m)] = p

def get_price_history(b_id, d_id, op, y, m):
    """Devuelve el precio_m2 buscando hacia atrás si es necesario (fallback)."""
    key = (b_id, op, y, m) if b_id != -1 else (-1, d_id, op, y, m)
    if key in price_tracker:
        return price_tracker[key]
    
    if b_id != -1:
        dist_key = (-1, d_id, op, y, m)
        if dist_key in price_tracker:
            return price_tracker[dist_key]
            
    prev_year_key = (b_id, op, y - 1, m) if b_id != -1 else (-1, d_id, op, y - 1, m)
    if prev_year_key in price_tracker:
        return price_tracker[prev_year_key]
        
    return 0.0

def compute_lags(b_id, d_id, op, y, m):
    """Calcula lag_1, lag_3, lag_12 y rolling_mean_6."""
    lm1, ly1 = (12, y - 1) if m == 1 else (m - 1, y)
    lag_1 = get_price_history(b_id, d_id, op, ly1, lm1)
    
    lm3, ly3 = (m - 3 + 12, y - 1) if m <= 3 else (m - 3, y)
    lag_3 = get_price_history(b_id, d_id, op, ly3, lm3)
    
    lag_12 = get_price_history(b_id, d_id, op, y - 1, m)
    
    rolling_prices = []
    curr_m, curr_y = m, y
    for _ in range(6):
        curr_m, curr_y = (12, curr_y - 1) if curr_m == 1 else (curr_m - 1, curr_y)
        p = get_price_history(b_id, d_id, op, curr_y, curr_m)
        if p > 0:
            rolling_prices.append(p)
    rolling_mean_6 = np.mean(rolling_prices) if rolling_prices else lag_1
    
    if lag_1 == 0:
        lag_1 = 15.0 if op == 'alquiler' else 2500.0
    if lag_3 == 0: lag_3 = lag_1
    if lag_12 == 0: lag_12 = lag_1
    
    return lag_1, lag_3, lag_12, rolling_mean_6

# Preparar las variables externas (macro)
df_interest_future = extend_to_future_years(df_interest, max_year=2027)
df_transactions_future = extend_to_future_years(df_transactions, max_year=2027)

macro_info = {}
for _, row in df_interest_future.iterrows():
    d_id = int(row['id_distrito'])
    y = int(row['anio'])
    macro_info[(d_id, y)] = {
        'hipoteca_media': float(row['hipoteca_media']),
        'tipo_interes_medio': float(row['tipo_interes_medio'])
    }

trans_info = {}
for _, row in df_transactions_future.iterrows():
    d_id = int(row['id_distrito'])
    y = int(row['anio'])
    trans_info[(d_id, y)] = float(row['num_transacciones'])

# Lista para guardar los registros resultantes
predictions_list = []

future_periods = []
for m in range(1, 13):
    future_periods.append((2026, m))
for m in range(1, 13):
    future_periods.append((2027, m))

# Ejecutar el forecast recursivo
for y, m in future_periods:
    trimestre = (m - 1) // 3 + 1
    shock_weight = 1.0
    
    for op in ['venta', 'alquiler']:
        # A. PREDICCIÓN DE DISTRITO
        for _, d_row in dim_distrito.iterrows():
            d_id = int(d_row['id_distrito'])
            lag_1, lag_3, lag_12, rolling_mean_6 = compute_lags(-1, d_id, op, y, m)
            
            static = distrito_static_info[d_id]
            macro = macro_info.get((d_id, y), {'hipoteca_media': 120000.0, 'tipo_interes_medio': 3.2})
            trans = trans_info.get((d_id, y), 500.0)
            
            input_data = pd.DataFrame([{
                'anio': y, 'mes': m, 'trimestre': trimestre, 'id_distrito': d_id,
                'dist_to_sol_m': static['dist_to_sol_m'],
                'dist_min_metro_m': static['dist_min_metro_m'],
                'superficie_media_vivienda': static['superficie_media_vivienda'],
                'lag_1': lag_1, 'lag_3': lag_3, 'lag_12': lag_12, 'rolling_mean_6': rolling_mean_6,
                'hipoteca_media': macro['hipoteca_media'],
                'tipo_interes_medio': macro['tipo_interes_medio'],
                'num_transacciones': trans,
                'renta_neta_hogar_2023': static['renta_neta_hogar_2023'],
                'shock_weight': shock_weight
            }])
            
            model_dist = models[(op, 'distrito')]
            pred_val = float(model_dist.predict(input_data[feats_distrito])[0])
            
            price_tracker[(-1, d_id, op, y, m)] = pred_val
            
            predictions_list.append({
                'id_distrito': d_id,
                'id_barrio': -1,
                'tipo_operacion': op,
                'anio': y,
                'mes': m,
                'precio_m2_predicho': pred_val,
                'intervalo_inferior': pred_val * 0.85,
                'intervalo_superior': pred_val * 1.15
            })
            
        # B. PREDICCIÓN DE BARRIO (Con Fallback)
        for _, b_row in dim_barrio.iterrows():
            b_id = int(b_row['id_barrio'])
            d_id = int(b_row['id_distrito'])
            
            if b_id in poor_barrios:
                pred_val = price_tracker[(-1, d_id, op, y, m)]
            else:
                lag_1, lag_3, lag_12, rolling_mean_6 = compute_lags(b_id, d_id, op, y, m)
                
                static = barrio_static_info[b_id]
                macro = macro_info.get((d_id, y), {'hipoteca_media': 120000.0, 'tipo_interes_medio': 3.2})
                trans = trans_info.get((d_id, y), 500.0)
                
                input_data = pd.DataFrame([{
                    'anio': y, 'mes': m, 'trimestre': trimestre, 'id_distrito': d_id,
                    'dist_to_sol_m': static['dist_to_sol_m'],
                    'dist_min_metro_m': static['dist_min_metro_m'],
                    'superficie_media_vivienda': static['superficie_media_vivienda'],
                    'lag_1': lag_1, 'lag_3': lag_3, 'lag_12': lag_12, 'rolling_mean_6': rolling_mean_6,
                    'hipoteca_media': macro['hipoteca_media'],
                    'tipo_interes_medio': macro['tipo_interes_medio'],
                    'num_transacciones': trans,
                    'renta_neta_hogar_2023': static['renta_media_hogar'],
                    'shock_weight': shock_weight,
                    'id_barrio': b_id
                }])
                
                model_barr = models[(op, 'barrio')]
                pred_val = float(model_barr.predict(input_data[feats_barrio])[0])
            
            price_tracker[(b_id, op, y, m)] = pred_val
            
            predictions_list.append({
                'id_distrito': d_id,
                'id_barrio': b_id,
                'tipo_operacion': op,
                'anio': y,
                'mes': m,
                'precio_m2_predicho': pred_val,
                'intervalo_inferior': pred_val * 0.85,
                'intervalo_superior': pred_val * 1.15
            })

# Guardar en CSV
df_predictions = pd.DataFrame(predictions_list)
df_predictions = df_predictions[['id_distrito', 'id_barrio', 'tipo_operacion', 'anio', 'mes', 'precio_m2_predicho', 'intervalo_inferior', 'intervalo_superior']]
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
df_predictions.to_csv(OUTPUT_CSV, index=False)

print(f"\n=== [FIN] PREDICCIONES GENERADAS CON EXITO EN: {OUTPUT_CSV} ===")
print(f"Total registros predichos: {len(df_predictions)}")
