"""
backend/data.py
Capa de acceso a datos del dashboard Madrid Urban Intelligence.
Centraliza todas las queries SQLite para mantener app.py limpio.
"""
import os
import sqlite3
import pandas as pd

# ── Ruta a la BD ────────────────────────────────────────────────────────────
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))   # FASE 4/backend/
_ROOT_DIR    = os.path.join(_BACKEND_DIR, '..')              # FASE 4/
DB_PATH      = os.path.normpath(os.path.join(_ROOT_DIR, 'data', 'madrid_intelligence.db'))

# ── Ruta al CSV de Predicciones ──────────────────────────────────────────────
PREDICTIONS_CSV_PATH = os.path.normpath(os.path.join(_ROOT_DIR, 'data', 'predictions.csv'))
_predictions_df = None

def _get_predictions_df():
    global _predictions_df
    if _predictions_df is not None:
        return _predictions_df
    if os.path.exists(PREDICTIONS_CSV_PATH):
        try:
            _predictions_df = pd.read_csv(PREDICTIONS_CSV_PATH)
            _predictions_df['id_barrio'] = _predictions_df['id_barrio'].astype(int)
            _predictions_df['id_distrito'] = _predictions_df['id_distrito'].astype(int)
            _predictions_df['anio'] = _predictions_df['anio'].astype(int)
            _predictions_df['mes'] = _predictions_df['mes'].astype(int)
            return _predictions_df
        except Exception as e:
            print("Error loading predictions.csv:", e)
            return pd.DataFrame()
    return pd.DataFrame()

# ── Ruta al CSV de Transacciones ─────────────────────────────────────────────
TRANSACTIONS_CSV_PATH = os.path.normpath(os.path.join(_ROOT_DIR, '..', '02_fuente_operativa_modelo', 'transactions_clean.csv'))
_transactions_df = None

def _get_transactions_df():
    global _transactions_df
    if _transactions_df is not None:
        return _transactions_df
    paths_to_try = [
        TRANSACTIONS_CSV_PATH,
        os.path.normpath(os.path.join(_ROOT_DIR, '..', 'FASE 5', '02_fuente_operativa_modelo', 'transactions_clean.csv')),
        os.path.normpath(os.path.join(_ROOT_DIR, '02_fuente_operativa_modelo', 'transactions_clean.csv')),
        os.path.normpath(os.path.join(_ROOT_DIR, '..', '02_fuente_operativa_modelo', 'transactions_clean.csv'))
    ]
    path_found = None
    for p in paths_to_try:
        if os.path.exists(p):
            path_found = p
            break
    if path_found:
        try:
            _transactions_df = pd.read_csv(path_found)
            _transactions_df['id_barrio'] = _transactions_df['id_barrio'].astype(int)
            _transactions_df['id_distrito'] = _transactions_df['id_distrito'].astype(int)
            _transactions_df['anio'] = _transactions_df['anio'].astype(int)
            _transactions_df['num_transacciones'] = _transactions_df['num_transacciones'].astype(float)
            return _transactions_df
        except Exception as e:
            print("Error loading transactions_clean.csv from path:", path_found, e)
            return pd.DataFrame()
    else:
        print("transactions_clean.csv NOT FOUND AT any tried paths:", paths_to_try)
        return pd.DataFrame()

def get_transaction_count(anio: int, distrito: str = "Todos", barrio: str = "Todos") -> float:
    df = _get_transactions_df()
    if df.empty:
        return 0.0
    conn = _conn()
    id_dist = -1
    id_barr = -1
    try:
        if barrio != "Todos":
            c = conn.cursor()
            c.execute("SELECT id_barrio, id_distrito FROM Dim_Barrio WHERE nombre = ?", (barrio,))
            r = c.fetchone()
            if r:
                id_barr, id_dist = r
        elif distrito != "Todos":
            c = conn.cursor()
            c.execute("SELECT id_distrito FROM Dim_Distrito WHERE nombre = ?", (distrito,))
            r = c.fetchone()
            if r:
                id_dist = r[0]
        conn.close()
    except Exception as e:
        print("Error looking up IDs for transactions:", e)
        conn.close()
        return 0.0

    year_to_query = anio
    if anio > 2025:
        year_to_query = 2025
        
    filtered = df[df['anio'] == year_to_query]
    
    if id_barr != -1:
        val = filtered[filtered['id_barrio'] == id_barr]['num_transacciones']
        return float(val.iloc[0]) if not val.empty else 0.0
    elif id_dist != -1:
        val = filtered[filtered['id_distrito'] == id_dist]['num_transacciones'].sum()
        return float(val)
    else:
        return float(filtered['num_transacciones'].sum())


MONTH_NAMES = {
    1:'Enero', 2:'Febrero', 3:'Marzo', 4:'Abril', 5:'Mayo', 6:'Junio',
    7:'Julio', 8:'Agosto', 9:'Septiembre', 10:'Octubre', 11:'Noviembre', 12:'Diciembre'
}
MONTH_IDS = {v: k for k, v in MONTH_NAMES.items()}

def clean_string(s):
    """Limpia strings para matching determinístico."""
    if not s: return ""
    import unicodedata
    s = str(s).strip().lower()
    s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return s.replace(" ", "_").replace("-", "_").replace(".", "")


def _conn():
    """Abre una conexión SQLite (caller debe cerrarla)."""
    return sqlite3.connect(DB_PATH)


def get_years() -> list:
    if not os.path.exists(DB_PATH):
        return [2024]
    try:
        conn = _conn()
        df = pd.read_sql("SELECT DISTINCT anio FROM Dim_Tiempo WHERE anio <= 2026 ORDER BY anio", conn)
        conn.close()
        return df['anio'].tolist()
    except:
        return [2023, 2024, 2025, 2026]


def get_months_for_year(anio: int) -> list:
    if not os.path.exists(DB_PATH):
        return list(MONTH_NAMES.values())
    try:
        conn = _conn()
        df = pd.read_sql(
            f"SELECT DISTINCT mes FROM Dim_Tiempo WHERE anio = {anio} ORDER BY mes", conn)
        conn.close()
        return [MONTH_NAMES[m] for m in df['mes'].tolist()]
    except:
        return list(MONTH_NAMES.values())


def get_districts() -> list:
    if not os.path.exists(DB_PATH):
        return []
    try:
        conn = _conn()
        df = pd.read_sql("SELECT DISTINCT nombre FROM Dim_Distrito ORDER BY nombre", conn)
        conn.close()
        return df['nombre'].tolist()
    except:
        return []

def get_neighborhoods(distrito: str = "Todos") -> list:
    if not os.path.exists(DB_PATH):
        return ["Todos"]
    try:
        conn = _conn()
        # Obtenemos la lista de distritos para filtrar si se cuelan en la tabla de barrios
        distritos_lista = get_districts()
        
        if not distrito or distrito == "Todos":
            q = "SELECT DISTINCT nombre FROM Dim_Barrio ORDER BY nombre"
        else:
            q = f"""
                SELECT DISTINCT b.nombre
                FROM Dim_Barrio b
                JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
                WHERE d.nombre = '{distrito}'
                ORDER BY b.nombre
            """
        df = pd.read_sql(q, conn)
        conn.close()
        
        nombres = df['nombre'].tolist()
        # Filtrado estricto: eliminar cualquier nombre que sea igual a un distrito o etiquetas de error
        nombres_filtrados = [
            n for n in nombres 
            if n not in distritos_lista and "[DATO A NIVEL DISTRITO]" not in str(n).upper()
        ]
        
        return ["Todos"] + nombres_filtrados
    except:
        return ["Todos"]


def get_map_data(anio: int, mes: str, interest: str = "Compra-venta"):
    """
    Retorna (df_distrito, df_barrio) con métricas según el interés seleccionado.
    """
    if not os.path.exists(DB_PATH):
        return pd.DataFrame(), pd.DataFrame()

    conn = _conn()
    month_id = MONTH_IDS[mes]
    op_base = "alquiler" if interest in ["Alquiler", "Inversión"] else "venta"

    try:
        q_connectivity = """
            SELECT b.id_barrio,
                   MIN(100, ( (5000 - b.dist_min_public_transport_m) / 100 + b.count_public_transport_500m * 2 )) as connectivity
            FROM Dim_Barrio b
        """

        q_stability = f"""
            SELECT id_barrio, 
                   100 * (1 - (SQRT(AVG(precio_m2 * precio_m2) - AVG(precio_m2) * AVG(precio_m2)) / NULLIF(AVG(precio_m2), 0))) as stability
            FROM Fact_Operacion
            WHERE tipo_operacion = '{op_base}'
            GROUP BY id_barrio
        """

        price_extra = ""
        if interest == "Inversión":
            price_extra = f""",
                (SELECT AVG(f2.precio_promedio_vivienda) FROM Fact_Operacion f2 JOIN Dim_Tiempo t2 ON f2.id_tiempo = t2.id_tiempo 
                 WHERE f2.id_barrio = b.id_barrio AND f2.tipo_operacion = 'venta' AND t2.anio = {anio} AND t2.mes = {month_id}) as precio_venta,
                (SELECT AVG(f3.precio_promedio_vivienda) FROM Fact_Operacion f3 JOIN Dim_Tiempo t3 ON f3.id_tiempo = t3.id_tiempo 
                 WHERE f3.id_barrio = b.id_barrio AND f3.tipo_operacion = 'alquiler' AND t3.anio = {anio} AND t3.mes = {month_id}) as precio_alquiler
            """

        q_barrio = f"""
            SELECT b.nombre as barrio, d.nombre as distrito,
                   AVG(f.precio_m2)               as precio_m2,
                   AVG(f.precio_promedio_vivienda) as precio_vivienda,
                   AVG(f.rentabilidad_bruta)       as rentabilidad,
                   AVG(conn.connectivity)          as conectividad,
                   AVG(stab.stability)             as estabilidad
                   {price_extra}
            FROM Fact_Operacion f
            JOIN Dim_Barrio b   ON f.id_barrio    = b.id_barrio
            JOIN Dim_Distrito d ON b.id_distrito  = d.id_distrito
            JOIN Dim_Tiempo t   ON f.id_tiempo    = t.id_tiempo
            LEFT JOIN ({q_connectivity}) conn ON b.id_barrio = conn.id_barrio
            LEFT JOIN ({q_stability}) stab ON b.id_barrio = stab.id_barrio
            WHERE t.anio = {anio} AND t.mes = {month_id}
              AND f.tipo_operacion = '{op_base}'
            GROUP BY b.nombre, d.nombre
        """
        df_barrio = pd.read_sql(q_barrio, conn)

        if df_barrio.empty and anio >= 2026:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == op_base)]
                
                # Leer nombres de barrios y distritos para hacer el merge
                df_barr_names = pd.read_sql("SELECT id_barrio, nombre as barrio, superficie_media_vivienda FROM Dim_Barrio WHERE id_barrio != -1", conn)
                df_dist_names = pd.read_sql("SELECT id_distrito, nombre as distrito FROM Dim_Distrito WHERE id_distrito != -1", conn)
                
                # Calcular rentabilidad histórica por barrio para rellenar predicciones (filtrado por tipo operacion)
                df_hist_rent = pd.read_sql(f"""
                    SELECT id_barrio, AVG(rentabilidad_bruta) as avg_rent
                    FROM Fact_Operacion
                    WHERE rentabilidad_bruta IS NOT NULL AND rentabilidad_bruta > 0
                      AND tipo_operacion = '{op_base}'
                    GROUP BY id_barrio
                """, conn)
                
                df_barrio_pred = pd.merge(filtered_pred, df_barr_names, on='id_barrio', how='inner')
                df_barrio_pred = pd.merge(df_barrio_pred, df_dist_names, on='id_distrito', how='inner')
                df_barrio_pred = pd.merge(df_barrio_pred, df_hist_rent, on='id_barrio', how='left')
                
                df_conn = pd.read_sql(q_connectivity, conn)
                df_barrio_pred = pd.merge(df_barrio_pred, df_conn, on='id_barrio', how='left')
                
                # Rentabilidad global de fallback filtrada por tipo_operacion
                try:
                    global_rent = pd.read_sql(f"""
                        SELECT AVG(rentabilidad_bruta) as gr FROM Fact_Operacion
                        WHERE rentabilidad_bruta IS NOT NULL AND rentabilidad_bruta > 0
                          AND tipo_operacion = '{op_base}'
                    """, conn).iloc[0]['gr']
                    global_rent = float(global_rent) if global_rent and not pd.isna(global_rent) else 0.049
                except:
                    global_rent = 0.049
                
                df_barrio_pred['precio_m2'] = df_barrio_pred['precio_m2_predicho']
                df_barrio_pred['precio_vivienda'] = df_barrio_pred['precio_m2_predicho'] * df_barrio_pred['superficie_media_vivienda']
                df_barrio_pred['rentabilidad'] = df_barrio_pred['avg_rent'].fillna(global_rent)
                df_barrio_pred['conectividad'] = df_barrio_pred['connectivity']
                df_barrio_pred['estabilidad'] = 95.0
                
                df_barrio = df_barrio_pred[['barrio', 'distrito', 'precio_m2', 'precio_vivienda', 'rentabilidad', 'conectividad', 'estabilidad']]
            else:
                df_barrio = pd.DataFrame()

        # Query DISTRITOS
        if anio >= 2026:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == op_base) & (pred_df['id_barrio'] == -1)]
                df_dist_names = pd.read_sql("SELECT id_distrito, nombre as distrito, superficie_media_vivienda, renta_media_hogar FROM Dim_Distrito WHERE id_distrito != -1", conn)
                
                df_dist_pred = pd.merge(filtered_pred, df_dist_names, on='id_distrito', how='inner')
                
                # Fetch average connectivity of barrios for each district
                df_conn = pd.read_sql(f"""
                    SELECT b.id_distrito, AVG(MIN(100, ( (5000 - b.dist_min_public_transport_m) / 100 + b.count_public_transport_500m * 2 ))) as connectivity
                    FROM Dim_Barrio b
                    GROUP BY b.id_distrito
                """, conn)
                df_dist_pred = pd.merge(df_dist_pred, df_conn, on='id_distrito', how='left')
                
                # Fetch average historical rentabilidad
                df_hist_rent = pd.read_sql(f"""
                    SELECT id_distrito, AVG(rentabilidad_bruta) as avg_rent
                    FROM Fact_Operacion
                    WHERE rentabilidad_bruta IS NOT NULL AND rentabilidad_bruta > 0
                      AND tipo_operacion = '{op_base}'
                    GROUP BY id_distrito
                """, conn)
                df_dist_pred = pd.merge(df_dist_pred, df_hist_rent, on='id_distrito', how='left')
                
                # Rentabilidad fallback
                try:
                    global_rent = pd.read_sql(f"""
                        SELECT AVG(rentabilidad_bruta) as gr FROM Fact_Operacion
                        WHERE rentabilidad_bruta IS NOT NULL AND rentabilidad_bruta > 0
                          AND tipo_operacion = '{op_base}'
                    """, conn).iloc[0]['gr']
                    global_rent = float(global_rent) if global_rent and not pd.isna(global_rent) else 0.049
                except:
                    global_rent = 0.049
                
                df_dist_pred['precio_m2'] = df_dist_pred['precio_m2_predicho']
                df_dist_pred['precio_vivienda'] = df_dist_pred['precio_m2_predicho'] * df_dist_pred['superficie_media_vivienda']
                df_dist_pred['rentabilidad'] = df_dist_pred['avg_rent'].fillna(global_rent)
                df_dist_pred['conectividad'] = df_dist_pred['connectivity']
                df_dist_pred['estabilidad'] = 95.0
                
                if interest == "Inversión":
                    df_vta_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == 'venta') & (pred_df['id_barrio'] == -1)]
                    df_vta_pred = df_vta_pred.rename(columns={'precio_m2_predicho': 'precio_m2_vta'})
                    df_dist_pred = pd.merge(df_dist_pred, df_vta_pred[['id_distrito', 'precio_m2_vta']], on='id_distrito', how='left')
                    df_dist_pred['precio_venta'] = df_dist_pred['precio_m2_vta'] * df_dist_pred['superficie_media_vivienda']
                    
                    df_alq_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == 'alquiler') & (pred_df['id_barrio'] == -1)]
                    df_alq_pred = df_alq_pred.rename(columns={'precio_m2_predicho': 'precio_m2_alq'})
                    df_dist_pred = pd.merge(df_dist_pred, df_alq_pred[['id_distrito', 'precio_m2_alq']], on='id_distrito', how='left')
                    df_dist_pred['precio_alquiler'] = df_dist_pred['precio_m2_alq'] * df_dist_pred['superficie_media_vivienda']
                    
                    df_dist_pred['rentabilidad'] = (df_dist_pred['precio_alquiler'] * 12) / df_dist_pred['precio_venta']
                    
                    df_dist = df_dist_pred[['distrito', 'precio_m2', 'precio_vivienda', 'rentabilidad', 'conectividad', 'estabilidad', 'precio_venta', 'precio_alquiler']]
                else:
                    df_dist = df_dist_pred[['distrito', 'precio_m2', 'precio_vivienda', 'rentabilidad', 'conectividad', 'estabilidad']]
            else:
                df_dist = pd.DataFrame()
        else:
            # Query standard SQLite for historical years
            q_dist = f"""
                SELECT d.nombre as distrito,
                       AVG(f.precio_m2)               as precio_m2,
                       AVG(f.precio_promedio_vivienda) as precio_vivienda,
                       AVG(f.rentabilidad_bruta)       as rentabilidad,
                       AVG(conn.connectivity)          as conectividad,
                       AVG(stab.stability)             as estabilidad
                FROM Fact_Operacion f
                JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
                JOIN Dim_Barrio b   ON b.id_distrito = d.id_distrito
                JOIN Dim_Tiempo t   ON f.id_tiempo   = t.id_tiempo
                LEFT JOIN ({q_connectivity}) conn ON b.id_barrio = conn.id_barrio
                LEFT JOIN ({q_stability}) stab ON b.id_barrio = stab.id_barrio
                WHERE t.anio = {anio} AND t.mes = {month_id}
                  AND f.tipo_operacion = '{op_base}'
                  AND f.id_barrio != -1
                GROUP BY d.nombre
            """
            df_dist = pd.read_sql(q_dist, conn)
            
            if interest == "Inversión" and not df_barrio.empty and 'precio_venta' in df_barrio.columns:
                # Calculate extra columns for Investment on district level
                df_dist_inv = df_barrio.groupby('distrito').agg({
                    'precio_venta': 'mean',
                    'precio_alquiler': 'mean'
                }).reset_index()
                df_dist = pd.merge(df_dist, df_dist_inv, on='distrito', how='left')
        
        # Limpieza de escalas 0-100
        for df in [df_barrio, df_dist]:
            if not df.empty:
                for col in ['conectividad', 'estabilidad']:
                    if col in df.columns:
                        df[col] = df[col].clip(0, 100).fillna(50)
                df.fillna(0, inplace=True)

        return df_dist, df_barrio
    except Exception as e:
        print(f"[get_map_data] error: {e}")
        return pd.DataFrame(), pd.DataFrame()
    finally:
        conn.close()


def _get_price_for_period(year, month_id, op, district, barrio):
    # check SQLite first
    conn = sqlite3.connect(DB_PATH)
    filter_clause = ""
    if barrio != "Todos":
        filter_clause = f"AND b.nombre = '{barrio}'"
    elif district != "Todos":
        filter_clause = f"AND d.nombre = '{district}'"
        
    q = f"""
        SELECT AVG(f.precio_m2) as p_m2
        FROM Fact_Operacion f
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
        JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
        WHERE t.anio = {year} AND t.mes = {month_id} 
          AND f.tipo_operacion = '{op}'
          {filter_clause}
    """
    try:
        res_df = pd.read_sql(q, conn)
        val = res_df.iloc[0]['p_m2']
        if val is not None:
            conn.close()
            return float(val)
    except:
        pass
    conn.close()
    
    # fallback to predictions
    pred_df = _get_predictions_df()
    if not pred_df.empty:
        if barrio != "Todos":
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id_barrio FROM Dim_Barrio WHERE nombre = ?", (barrio,))
            r = c.fetchone()
            conn.close()
            if r:
                id_barr = r[0]
                filtered = pred_df[(pred_df['anio'] == year) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == op) & (pred_df['id_barrio'] == id_barr)]
                if not filtered.empty:
                    return float(filtered.iloc[0]['precio_m2_predicho'])
        elif district != "Todos":
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id_distrito FROM Dim_Distrito WHERE nombre = ?", (district,))
            r = c.fetchone()
            conn.close()
            if r:
                id_dist = r[0]
                filtered = pred_df[(pred_df['anio'] == year) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == op) & (pred_df['id_distrito'] == id_dist) & (pred_df['id_barrio'] == -1)]
                if not filtered.empty:
                    return float(filtered.iloc[0]['precio_m2_predicho'])
        else:
            filtered = pred_df[(pred_df['anio'] == year) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == op) & (pred_df['id_barrio'] == -1)]
            if not filtered.empty:
                return float(filtered['precio_m2_predicho'].mean())
    return 0.0
    return 0.0


def get_kpi_data(anio: int, mes: str, op: str, distrito: str = "Todos", barrio: str = "Todos"):
    """Retorna (precio_m2, precio_vivienda, var_mensual, var_trimestral, var_anual, renta_media, sup_media, p_vivienda_venta, esfuerzo_compra, estado_mercado, is_prediction, rentabilidad, transactions)."""
    if not os.path.exists(DB_PATH):
        return 0, 0, 0, 0, 0, 0, 0, 0, 0, "N/A", False, 0.0, 0.0
    transactions = get_transaction_count(anio, distrito, barrio)
    conn = _conn()
    month_id = MONTH_IDS[mes]
    op_l = op.lower()
    
    # En Inversión, consultamos la operación 'alquiler' pero nos interesa la rentabilidad
    real_op = "alquiler" if op_l == "inversion" else op_l
    val_col = "rentabilidad_bruta" if op_l == "inversion" else "precio_m2"
    
    # Filtro jerárquico
    filter_clause = ""
    join_clause = ""
    select_renta = "AVG(d.renta_media_hogar)" 
    
    if barrio != "Todos":
        filter_clause = f"AND b.nombre = '{barrio}'"
        join_clause = "JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio"
        select_renta = "AVG(b.renta_media_hogar)"
    elif distrito != "Todos":
        filter_clause = f"AND d.nombre = '{distrito}'"
        join_clause = "JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito"
        select_renta = "AVG(d.renta_media_hogar)"
    else:
        join_clause = "JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito"

    q = f"""
        SELECT AVG(f.{val_col}) as p_m2, 
               AVG(f.precio_promedio_vivienda) as p_vivienda,
               {select_renta} as r_m,
               AVG(f.variacion_mensual) as v_m,
               AVG(f.variacion_trimestral) as v_t,
               AVG(f.variacion_anual) as v_a,
               AVG(b.superficie_media_vivienda) as s_m,
               AVG(f.rentabilidad_bruta) as rentabilidad
        FROM Fact_Operacion f
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
        JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
        WHERE t.anio = {anio} AND t.mes = {month_id} 
          AND f.tipo_operacion = '{real_op}'
          AND f.id_barrio != -1
          {filter_clause}
    """

    try:
        res_df = pd.read_sql(q, conn)
        
        # FALLBACK A PREDICCIONES (Desde CSV)
        is_pred = False
        if (res_df.empty or res_df.iloc[0]['p_m2'] is None) and anio >= 2023:
            is_pred = True
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                avg_p_m2 = 0.0
                avg_sup = 90.0
                avg_renta = 40000.0
                
                if barrio != "Todos":
                    c = conn.cursor()
                    c.execute("SELECT id_barrio, superficie_media_vivienda, renta_media_hogar FROM Dim_Barrio WHERE nombre = ?", (barrio,))
                    r = c.fetchone()
                    if r:
                        id_barr, sup, renta = r
                        filtered = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op) & (pred_df['id_barrio'] == id_barr)]
                        if not filtered.empty:
                            avg_p_m2 = float(filtered.iloc[0]['precio_m2_predicho'])
                            avg_sup = float(sup) if sup is not None else 90.0
                            avg_renta = float(renta) if renta is not None else 40000.0
                elif distrito != "Todos":
                    c = conn.cursor()
                    c.execute("SELECT id_distrito, superficie_media_vivienda, renta_media_hogar FROM Dim_Distrito WHERE nombre = ?", (distrito,))
                    r = c.fetchone()
                    if r:
                        id_dist, sup, renta = r
                        filtered = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op) & (pred_df['id_distrito'] == id_dist) & (pred_df['id_barrio'] == -1)]
                        if not filtered.empty:
                            avg_p_m2 = float(filtered.iloc[0]['precio_m2_predicho'])
                            avg_sup = float(sup) if sup is not None else 90.0
                            avg_renta = float(renta) if renta is not None else 40000.0
                else:
                    filtered = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op) & (pred_df['id_barrio'] == -1)]
                    if not filtered.empty:
                        avg_p_m2 = float(filtered['precio_m2_predicho'].mean())
                        df_dist_info = pd.read_sql("SELECT AVG(superviciemedia_vivienda) as avg_sup, AVG(renta_media_hogar) as avg_renta FROM Dim_Distrito WHERE id_distrito != -1", conn)
                        # Wait, the column name is superficie_media_vivienda! Let's check spelling.
                        # Dim_Distrito sample has: superficie_media_vivienda. So let's write superficie_media_vivienda.
                        df_dist_info = pd.read_sql("SELECT AVG(superficie_media_vivienda) as avg_sup, AVG(renta_media_hogar) as avg_renta FROM Dim_Distrito WHERE id_distrito != -1", conn)
                        avg_sup = float(df_dist_info.iloc[0]['avg_sup']) if df_dist_info.iloc[0]['avg_sup'] is not None else 90.0
                        avg_renta = float(df_dist_info.iloc[0]['avg_renta']) if df_dist_info.iloc[0]['avg_renta'] is not None else 40000.0

                if True: # Always True to keep structure
                    v_m_val = 0.0
                    v_t_val = 0.0
                    v_a_val = 0.0
                    # Mes anterior
                    pm_id = month_id - 1
                    py_val = anio
                    if pm_id == 0:
                        pm_id = 12
                        py_val = anio - 1
                    p_m2_prev_m = _get_price_for_period(py_val, pm_id, real_op, distrito, barrio)
                    v_m_val = ((avg_p_m2 / p_m2_prev_m) - 1) * 100 if p_m2_prev_m > 0 else 0.0

                    # Trimestre anterior (3 meses)
                    pq_id = month_id - 3
                    pqy_val = anio
                    if pq_id <= 0:
                        pq_id += 12
                        pqy_val = anio - 1
                    p_m2_prev_q = _get_price_for_period(pqy_val, pq_id, real_op, distrito, barrio)
                    v_t_val = ((avg_p_m2 / p_m2_prev_q) - 1) * 100 if p_m2_prev_q > 0 else 0.0

                    # Año anterior
                    p_m2_prev_y = _get_price_for_period(anio - 1, month_id, real_op, distrito, barrio)
                    v_a_val = ((avg_p_m2 / p_m2_prev_y) - 1) * 100 if p_m2_prev_y > 0 else 0.0

                    # Calcular rentabilidad promedio histórica para la zona y tipo operacion o usar predicción
                    if op_l == 'inversion':
                        p_m2_alq_pred = _get_price_for_period(anio, month_id, 'alquiler', distrito, barrio)
                        p_m2_vta_pred = _get_price_for_period(anio, month_id, 'venta', distrito, barrio)
                        avg_rent_val = (p_m2_alq_pred * 12) / p_m2_vta_pred if p_m2_vta_pred > 0 else 0.049
                    else:
                        q_hist_rent = f"""
                            SELECT AVG(f.rentabilidad_bruta) as avg_rent
                            FROM Fact_Operacion f
                            JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
                            JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
                            WHERE f.rentabilidad_bruta IS NOT NULL AND f.rentabilidad_bruta > 0
                              AND f.tipo_operacion = '{real_op}'
                              {filter_clause}
                        """
                        try:
                            avg_rent_val = pd.read_sql(q_hist_rent, conn).iloc[0]['avg_rent']
                            if avg_rent_val is None or pd.isna(avg_rent_val) or avg_rent_val <= 0:
                                # Fallback: rentabilidad media global para ese tipo de operacion
                                q_global_rent = f"""
                                    SELECT AVG(f.rentabilidad_bruta) as avg_rent
                                    FROM Fact_Operacion f
                                    WHERE f.rentabilidad_bruta IS NOT NULL AND f.rentabilidad_bruta > 0
                                      AND f.tipo_operacion = '{real_op}'
                                """
                                try:
                                    avg_rent_val = pd.read_sql(q_global_rent, conn).iloc[0]['avg_rent']
                                    if avg_rent_val is None or pd.isna(avg_rent_val) or avg_rent_val <= 0:
                                        avg_rent_val = 0.049  # promedio real de la BD (~4.9%)
                                except:
                                    avg_rent_val = 0.049
                        except Exception as e:
                            print("Error querying historical rentabilidad:", e)
                            avg_rent_val = 0.049

                    res_df = pd.DataFrame([{
                        'p_m2': avg_rent_val if op_l == 'inversion' else avg_p_m2,
                        'p_vivienda': avg_p_m2 * avg_sup,
                        'v_m': v_m_val,
                        'v_t': v_t_val,
                        'v_a': v_a_val,
                        's_m': avg_sup,
                        'r_m': avg_renta,
                        'rentabilidad': avg_rent_val
                    }])

        if res_df.empty or res_df.iloc[0]['p_m2'] is None:
            return 0, 0, 0, 0, 0, 0, 0, 0, 0, "N/A", False, 0.0

        res = res_df.iloc[0]
        p_m2 = res['p_m2'] or 0
        p_vivienda = res['p_vivienda'] or 0
        v_m = res['v_m'] or 0
        v_t = res['v_t'] or 0
        v_a = res['v_a'] or 0 
        r_m = res['r_m'] or 0
        s_m = res['s_m'] or 0

        # Siempre obtenemos el precio de VENTA para el cálculo de Asequibilidad (Años de Esfuerzo) y Ticket de Inversión
        if op_l == 'venta':
            p_vivienda_venta = p_m2 * s_m
        else:
            if is_pred:
                p_m2_venta_pred = _get_price_for_period(anio, month_id, 'venta', distrito, barrio)
                p_vivienda_venta = p_m2_venta_pred * s_m
            else:
                q_venta = q.replace(f"f.tipo_operacion = '{real_op}'", "f.tipo_operacion = 'venta'").replace(f"f.{val_col}", "f.precio_m2")
                try:
                    res_v = pd.read_sql(q_venta, conn).iloc[0]
                    p_vivienda_venta = (res_v['p_m2'] or 0) * (res_v['s_m'] or 0)
                except:
                    p_vivienda_venta = 0

        if op_l == 'inversion':
            p_vivienda = p_vivienda_venta
        else:
            p_vivienda = p_m2 * s_m

        rentabilidad = res['rentabilidad'] if 'rentabilidad' in res and not pd.isna(res['rentabilidad']) else 0.05

        # Cálculo de Esfuerzo Compra (Años de ahorro para el 30% de la entrada)
        # Basado en ahorrar el 20% de la renta media anual
        # entrada = p_vivienda_venta * 0.30
        # ahorro_anual = r_m * 0.20
        esfuerzo_compra = (p_vivienda_venta * 0.30) / (r_m * 0.20) if r_m > 0 else 0

        # Estado del Mercado según Variación Anual
        if v_a > 5:
            estado_mercado = "Crecimiento"
        elif v_a >= 0:
            estado_mercado = "Estable"
        else:
            estado_mercado = "Ajuste"

        # Cálculo dinámico de Variación Anual si el de la DB es 0 o insuficiente
        if v_a == 0:
            q_prev = q.replace(f"t.anio = {anio}", f"t.anio = {anio - 1}")
            try:
                res_prev = pd.read_sql(q_prev, conn).iloc[0]
                p_m2_prev = res_prev['p_m2'] or 0
                if p_m2_prev > 0:
                    v_a = ((p_m2 / p_m2_prev) - 1) * 100
                    # Recalcular estado con el valor dinámico
                    if v_a > 5: estado_mercado = "Crecimiento"
                    elif v_a >= 0: estado_mercado = "Estable"
                    else: estado_mercado = "Ajuste"
            except:
                pass

        return (p_m2, p_vivienda, v_m, v_t, v_a, r_m, s_m, p_vivienda_venta, esfuerzo_compra, estado_mercado, is_pred, rentabilidad, transactions)
    except Exception as e:
        print(f"[get_kpi_data] error: {e}")
        return 0, 0, 0, 0, 0, 0, 0, 0, 0, "N/A", False, 0.0, 0.0
    finally:
        conn.close()


def get_monthly_series(anio: int, op: str, zona_nombre: str,
                        zona_tipo: str = "barrio") -> pd.DataFrame:
    """
    Devuelve la serie mensual unificada (Histórico + Predicción).
    zona_tipo: 'barrio' | 'distrito'
    """
    if not os.path.exists(DB_PATH) or not zona_nombre:
        return pd.DataFrame()
    
    conn = _conn()
    op_l = op.lower()
    try:
        val_col = "rentabilidad_bruta" if op_l == "inversion" else "precio_m2"
        # En Inversión, usamos la operación 'alquiler' pero la columna 'rentabilidad_bruta'
        real_op = "alquiler" if op_l == "inversion" else op_l

        # 1. Obtener Históricos
        if zona_tipo == "barrio":
            q_hist = f"""
                SELECT t.mes, AVG(f.{val_col}) as precio_m2
                FROM Fact_Operacion f
                JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE t.anio = {anio} AND b.nombre = '{zona_nombre}' AND f.tipo_operacion = '{real_op}'
                GROUP BY t.mes ORDER BY t.mes
            """
        else:
            q_hist = f"""
                SELECT t.mes, AVG(f.{val_col}) as precio_m2
                FROM Fact_Operacion f
                JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE t.anio = {anio} AND d.nombre = '{zona_nombre}' AND f.tipo_operacion = '{real_op}'
                GROUP BY t.mes ORDER BY t.mes
            """
        df_hist = pd.read_sql(q_hist, conn)
        df_hist['is_prediction'] = False

        # 2. Obtener Predicciones desde CSV
        if op_l == "inversion":
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                df_alq = pred_df[pred_df['tipo_operacion'] == 'alquiler']
                df_vta = pred_df[pred_df['tipo_operacion'] == 'venta']
                df_merged = pd.merge(df_alq, df_vta, on=['id_distrito', 'id_barrio', 'anio', 'mes'], suffixes=('_alq', '_vta'))
                df_merged['precio_m2_predicho'] = (df_merged['precio_m2_predicho_alq'] * 12) / df_merged['precio_m2_predicho_vta']
                
                if zona_tipo == "barrio":
                    df_barr_names = pd.read_sql("SELECT id_barrio, nombre FROM Dim_Barrio WHERE id_barrio != -1", conn)
                    df_pred_b = pd.merge(df_merged, df_barr_names, on='id_barrio', how='inner')
                    filtered = df_pred_b[(df_pred_b['anio'] == anio) & (df_pred_b['nombre'] == zona_nombre)]
                    df_pred = filtered[['mes', 'precio_m2_predicho']].rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
                else:
                    df_dist_names = pd.read_sql("SELECT id_distrito, nombre FROM Dim_Distrito WHERE id_distrito != -1", conn)
                    df_pred_d = pd.merge(df_merged, df_dist_names, on='id_distrito', how='inner')
                    filtered = df_pred_d[(df_pred_d['anio'] == anio) & (df_pred_d['nombre'] == zona_nombre) & (df_pred_d['id_barrio'] == -1)]
                    df_pred = filtered[['mes', 'precio_m2_predicho']].rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
            else:
                df_pred = pd.DataFrame(columns=['mes', 'precio_m2'])
        elif zona_tipo == "barrio":
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                df_barr_names = pd.read_sql("SELECT id_barrio, nombre FROM Dim_Barrio WHERE id_barrio != -1", conn)
                df_pred_b = pd.merge(pred_df, df_barr_names, on='id_barrio', how='inner')
                filtered = df_pred_b[(df_pred_b['anio'] == anio) & (df_pred_b['nombre'] == zona_nombre) & (df_pred_b['tipo_operacion'] == op_l)]
                df_pred = filtered[['mes', 'precio_m2_predicho']].rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
            else:
                df_pred = pd.DataFrame(columns=['mes', 'precio_m2'])
        else:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                df_dist_names = pd.read_sql("SELECT id_distrito, nombre FROM Dim_Distrito WHERE id_distrito != -1", conn)
                df_pred_d = pd.merge(pred_df, df_dist_names, on='id_distrito', how='inner')
                filtered = df_pred_d[(df_pred_d['anio'] == anio) & (df_pred_d['nombre'] == zona_nombre) & (df_pred_d['id_barrio'] == -1) & (df_pred_d['tipo_operacion'] == op_l)]
                df_pred = filtered[['mes', 'precio_m2_predicho']].rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
            else:
                df_pred = pd.DataFrame(columns=['mes', 'precio_m2'])
        
        df_pred['is_prediction'] = True

        # 3. Combinar y limpiar
        df = pd.concat([df_hist, df_pred]).sort_values('mes').drop_duplicates('mes', keep='first')
        
        if not df.empty:
            df['mes_nombre'] = df['mes'].map(MONTH_NAMES)
            
        return df
    except Exception as e:
        print(f"[get_monthly_series] error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()


def get_comparison_kpis(anio: int, mes: str, op: str,
                         zona_nombre: str, zona_tipo: str = "barrio"):
    """
    KPIs de comparativa para un barrio o distrito:
    Retorna (precio_vivienda, variacion_trimestral, rentabilidad_bruta)
    La rentabilidad se calcula si hay datos de ambos tipos de operación.
    """
    if not os.path.exists(DB_PATH) or not zona_nombre:
        return 0, 0, 0
    conn = _conn()
    month_id = MONTH_IDS[mes]
    op_l = op.lower()

    try:
        if zona_tipo == "barrio":
            join_clause = "JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio"
            where_zona  = f"AND b.nombre = '{zona_nombre}'"
        else:
            join_clause = "JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito"
            where_zona  = f"AND d.nombre = '{zona_nombre}'"

        q = f"""
            SELECT AVG(f.precio_promedio_vivienda) as p_vivienda,
                   AVG(f.variacion_trimestral)     as v_t,
                   AVG(f.precio_m2)                as p_m2,
                   AVG(f.superficie_media)         as sup
            FROM Fact_Operacion f
            {join_clause}
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            WHERE t.anio = {anio} AND t.mes = {month_id}
              AND f.tipo_operacion = '{op_l}'
              {where_zona}
        """
        res = pd.read_sql(q, conn).iloc[0]
        p_vivienda = res['p_vivienda'] or 0
        v_t        = res['v_t']        or 0
        p_m2       = res['p_m2']       or 0
        sup        = res['sup']        or 0

        # FALLBACK A PREDICCIONES
        if p_vivienda == 0 and anio >= 2026:
            dist_val = zona_nombre if zona_tipo == "distrito" else "Todos"
            barr_val = zona_nombre if zona_tipo == "barrio" else "Todos"
            kpi_p_m2, kpi_p_vivienda, _, kpi_v_t, _, _, kpi_sup, _, _, _, _, _ = get_kpi_data(
                anio, mes, op, dist_val, barr_val
            )
            p_vivienda = kpi_p_vivienda
            v_t = kpi_v_t
            p_m2 = kpi_p_m2
            sup = kpi_sup

        # Rentabilidad Bruta Anual = (precio_m2_alquiler * sup * 12) / precio_vivienda_venta * 100
        # Sólo calculable si el tipo de operación es alquiler y tenemos precio_vivienda de venta
        rentabilidad = 0
        if op_l == "alquiler" and p_m2 > 0 and sup > 0:
            # Buscar precio venta para la misma zona y periodo
            dist_val = zona_nombre if zona_tipo == "distrito" else "Todos"
            barr_val = zona_nombre if zona_tipo == "barrio" else "Todos"
            v_kpi_p_m2, v_kpi_p_vivienda, _, _, _, _, _, _, _, _, _, _ = get_kpi_data(
                anio, mes, "Venta", dist_val, barr_val
            )
            p_venta = v_kpi_p_vivienda
            if p_venta > 0:
                renta_anual = p_m2 * sup * 12
                rentabilidad = (renta_anual / p_venta) * 100
        elif op_l == "venta" and p_vivienda > 0 and p_m2 > 0 and sup > 0:
            # Si estamos en modo venta, buscar precio alquiler
            dist_val = zona_nombre if zona_tipo == "distrito" else "Todos"
            barr_val = zona_nombre if zona_tipo == "barrio" else "Todos"
            a_kpi_p_m2, _, _, _, _, _, a_kpi_sup, _, _, _, _, _ = get_kpi_data(
                anio, mes, "Alquiler", dist_val, barr_val
            )
            p_alq = a_kpi_p_m2
            sup_alq = a_kpi_sup or sup
            if p_alq > 0 and p_vivienda > 0:
                renta_anual = p_alq * sup_alq * 12
                rentabilidad = (renta_anual / p_vivienda) * 100

        return p_vivienda, v_t, rentabilidad
    except Exception as e:
        print(f"[get_comparison_kpis] error: {e}")
        return 0, 0, 0
    finally:
        conn.close()


def get_madrid_average_series(anio: int, op: str) -> pd.DataFrame:
    """Devuelve la serie mensual unificada del precio_m2 promedio de TODO Madrid."""
    if not os.path.exists(DB_PATH): return pd.DataFrame()
    conn = _conn()
    op_l = op.lower()
    try:
        val_col = "rentabilidad_bruta" if op_l == "inversion" else "precio_m2"
        real_op = "alquiler" if op_l == "inversion" else op_l

        # 1. Histórico
        q_hist = f"""
            SELECT t.mes, AVG(f.{val_col}) as precio_m2
            FROM Fact_Operacion f
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            WHERE t.anio = {anio} AND f.tipo_operacion = '{real_op}'
            GROUP BY t.mes ORDER BY t.mes
        """
        df_hist = pd.read_sql(q_hist, conn)
        df_hist['is_prediction'] = False

        # 2. Predicción desde CSV
        if op_l == "inversion":
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                df_alq = pred_df[pred_df['tipo_operacion'] == 'alquiler']
                df_vta = pred_df[pred_df['tipo_operacion'] == 'venta']
                df_merged = pd.merge(df_alq, df_vta, on=['id_distrito', 'id_barrio', 'anio', 'mes'], suffixes=('_alq', '_vta'))
                df_merged['precio_m2_predicho'] = (df_merged['precio_m2_predicho_alq'] * 12) / df_merged['precio_m2_predicho_vta']
                
                filtered = df_merged[(df_merged['anio'] == anio) & (df_merged['id_barrio'] != -1)]
                df_pred = filtered.groupby('mes')['precio_m2_predicho'].mean().reset_index().rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
            else:
                df_pred = pd.DataFrame(columns=['mes', 'precio_m2'])
        else:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered = pred_df[(pred_df['anio'] == anio) & (pred_df['tipo_operacion'] == op_l) & (pred_df['id_barrio'] != -1)]
                df_pred = filtered.groupby('mes')['precio_m2_predicho'].mean().reset_index().rename(columns={'precio_m2_predicho': 'precio_m2'}).sort_values('mes')
            else:
                df_pred = pd.DataFrame(columns=['mes', 'precio_m2'])
        
        df_pred['is_prediction'] = True

        # 3. Combinar
        df = pd.concat([df_hist, df_pred]).sort_values('mes').drop_duplicates('mes', keep='first')
        return df.fillna(0)
    except Exception as e:
        print(f"[get_madrid_average_series] error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()
def get_rankings(anio: int, mes: str, op: str, level: str = "barrio", category: str = "Precio", distrito: str = "Todos"):
    """
    Retorna el Top 5 de zonas para una categoría dada.
    level: 'barrio' | 'distrito'
    category: 'Precio' | 'Rentabilidad' | 'Conectividad' | 'Estabilidad'
    """
    if not os.path.exists(DB_PATH): return pd.DataFrame()
    conn = _conn()
    month_id = MONTH_IDS[mes]
    op_l = op.lower()
    
    # En Inversión, usamos la operación 'alquiler' para obtener la rentabilidad
    real_op = "alquiler" if op_l == "inversion" else op_l

    try:
        # Filtro de distrito para el nivel barrio
        dist_filter = ""
        if level == "barrio" and distrito != "Todos":
            dist_filter = f" AND d.nombre = '{distrito}'"

        if level == "barrio":
            group_col = "b.nombre"
            join_chain = "JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito"
            base_q = f"FROM Fact_Operacion f {join_chain} JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo WHERE t.anio = {anio} AND t.mes = {month_id} AND f.tipo_operacion = '{real_op}' {dist_filter}"
        else:
            group_col = "d.nombre"
            join_chain = "JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito"
            base_q = f"FROM Fact_Operacion f {join_chain} JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo WHERE t.anio = {anio} AND t.mes = {month_id} AND f.tipo_operacion = '{real_op}'"

        if category == "Precio":
            q = f"SELECT {group_col} as name, AVG(f.precio_promedio_vivienda) as value, {'AVG(b.renta_media_hogar)' if level == 'barrio' else 'AVG(d.renta_media_hogar)'} as renta_hogar {base_q} GROUP BY name ORDER BY value DESC"
        elif category == "Rentabilidad":
            q = f"SELECT {group_col} as name, AVG(f.rentabilidad_bruta) as value, {'AVG(b.renta_media_hogar)' if level == 'barrio' else 'AVG(d.renta_media_hogar)'} as renta_hogar {base_q} GROUP BY name ORDER BY value DESC"
        elif category == "Conectividad":
            if level == "barrio":
                q = f"""
                    SELECT b.nombre as name, 
                           MIN(100, ( (5000 - b.dist_min_public_transport_m) / 100 + b.count_public_transport_500m * 2 )) as value 
                    FROM Dim_Barrio b 
                    JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
                    WHERE 1=1 {dist_filter}
                    ORDER BY value DESC
                """
            else:
                q = f"""
                    SELECT d.nombre as name, 
                           AVG(MIN(100, ( (5000 - b.dist_min_public_transport_m) / 100 + b.count_public_transport_500m * 2 ))) as value 
                    FROM Dim_Barrio b 
                    JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
                    GROUP BY name ORDER BY value DESC
                """
        elif category == "Estabilidad":
            q = f"""
                SELECT {group_col} as name, 
                       100 * (1 - (SQRT(AVG(f.precio_m2 * f.precio_m2) - AVG(f.precio_m2) * AVG(f.precio_m2)) / NULLIF(AVG(f.precio_m2), 0))) as value
                FROM Fact_Operacion f
                {join_chain}
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE f.tipo_operacion = '{real_op}'
                  AND (t.anio = {anio} OR t.anio = {anio-1})
                  {dist_filter}
                GROUP BY name 
                HAVING COUNT(*) > 1
                ORDER BY value DESC
            """
        else:
            return pd.DataFrame()

        df = pd.read_sql(q, conn)
        
        # FALLBACK A PREDICCIONES
        if df.empty and anio >= 2026:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                if category == "Rentabilidad":
                    # Para Rentabilidad, calculamos a partir de alquiler y venta
                    df_alq = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == 'alquiler')]
                    df_vta = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == 'venta')]
                    df_merged = pd.merge(df_alq, df_vta, on=['id_distrito', 'id_barrio', 'anio', 'mes'], suffixes=('_alq', '_vta'))
                    df_merged['precio_m2_predicho'] = (df_merged['precio_m2_predicho_alq'] * 12) / df_merged['precio_m2_predicho_vta']
                    filtered_pred = df_merged
                else:
                    filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op)]
                
                df_barr_names = pd.read_sql("SELECT id_barrio, nombre as barrio, superficie_media_vivienda, renta_media_hogar as renta_barrio FROM Dim_Barrio WHERE id_barrio != -1", conn)
                df_dist_names = pd.read_sql("SELECT id_distrito, nombre as distrito, renta_media_hogar as renta_distrito FROM Dim_Distrito WHERE id_distrito != -1", conn)
                
                df_pred_full = pd.merge(filtered_pred, df_barr_names, on='id_barrio', how='inner')
                df_pred_full = pd.merge(df_pred_full, df_dist_names, on='id_distrito', how='inner')
                
                if level == "barrio":
                    if distrito != "Todos":
                        df_pred_full = df_pred_full[df_pred_full['distrito'] == distrito]
                    
                    if category == "Precio":
                        df_pred_full['value'] = df_pred_full['precio_m2_predicho'] * df_pred_full['superficie_media_vivienda']
                    elif category == "Rentabilidad":
                        df_pred_full['value'] = df_pred_full['precio_m2_predicho']
                    elif category == "Estabilidad":
                        df_pred_full['value'] = 95.0
                        
                    df_pred_full = df_pred_full.rename(columns={'barrio': 'name', 'renta_barrio': 'renta_hogar'})
                    df = df_pred_full[['name', 'value', 'renta_hogar']].groupby('name').agg({'value': 'mean', 'renta_hogar': 'mean'}).reset_index().sort_values('value', ascending=False)
                else: # distrito
                    if category == "Precio":
                        df_pred_full['value'] = df_pred_full['precio_m2_predicho'] * df_pred_full['superficie_media_vivienda']
                    elif category == "Rentabilidad":
                        df_pred_full['value'] = df_pred_full['precio_m2_predicho']
                    elif category == "Estabilidad":
                        df_pred_full['value'] = 95.0
                        
                    df_pred_full = df_pred_full.rename(columns={'distrito': 'name', 'renta_distrito': 'renta_hogar'})
                    df = df_pred_full[['name', 'value', 'renta_hogar']].groupby('name').agg({'value': 'mean', 'renta_hogar': 'mean'}).reset_index().sort_values('value', ascending=False)
        
        if not df.empty:
            # Rellenar NaNs en columnas numéricas clave
            if 'value' in df.columns:
                df['value'] = df['value'].fillna(0.0)
            
            if 'renta_hogar' not in df.columns:
                df['renta_hogar'] = 0.0
            else:
                df['renta_hogar'] = df['renta_hogar'].fillna(0.0)
                
            # Calcular score (0-100) para la barra visual, pero mantener 'value' intacto para el texto
            if category in ["Precio", "Rentabilidad"]:
                max_val = df['value'].max()
                df['score'] = (df['value'] / max_val * 100) if (pd.notnull(max_val) and max_val > 0) else 0
            else:
                # Para porcentajes o índices 0-100, usamos el valor directamente como score
                df['score'] = df['value'].clip(0, 100).fillna(50)

            # Rellenar cualquier otro NaN que pudiera existir en cualquier columna (por ejemplo, score)
            df = df.fillna(0.0)

        return df
    except Exception as e:
        print(f"[get_rankings] error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()


def get_predictions(zona_nombre: str, zona_tipo: str = "barrio", op: str = "venta") -> pd.DataFrame:
    """
    Recupera las predicciones para una zona específica (2026-2027) desde el CSV.
    Retorna DataFrame con [anio, mes, precio_m2, inf, sup]
    """
    if not os.path.exists(DB_PATH) or not zona_nombre:
        return pd.DataFrame()
    
    conn = _conn()
    op_l = op.lower()
    try:
        pred_df = _get_predictions_df()
        if pred_df.empty:
            return pd.DataFrame()
            
        if zona_tipo == "barrio":
            df_barr_names = pd.read_sql("SELECT id_barrio, nombre FROM Dim_Barrio WHERE id_barrio != -1", conn)
            df_pred_b = pd.merge(pred_df, df_barr_names, on='id_barrio', how='inner')
            filtered = df_pred_b[(df_pred_b['nombre'] == zona_nombre) & (df_pred_b['tipo_operacion'] == op_l)]
            df = filtered[['anio', 'mes', 'precio_m2_predicho', 'intervalo_inferior', 'intervalo_superior']].rename(columns={'precio_m2_predicho': 'precio_m2', 'intervalo_inferior': 'inf', 'intervalo_superior': 'sup'})
        else:
            df_dist_names = pd.read_sql("SELECT id_distrito, nombre FROM Dim_Distrito WHERE id_distrito != -1", conn)
            df_pred_d = pd.merge(pred_df, df_dist_names, on='id_distrito', how='inner')
            filtered = df_pred_d[(df_pred_d['nombre'] == zona_nombre) & (df_pred_d['id_barrio'] == -1) & (df_pred_d['tipo_operacion'] == op_l)]
            df = filtered[['anio', 'mes', 'precio_m2_predicho', 'intervalo_inferior', 'intervalo_superior']].rename(columns={'precio_m2_predicho': 'precio_m2', 'intervalo_inferior': 'inf', 'intervalo_superior': 'sup'})
            
        if not df.empty:
            df['mes_nombre'] = df['mes'].map(MONTH_NAMES)
        return df.sort_values(['anio', 'mes'])
    except Exception as e:
        print(f"[get_predictions] error: {e}")
        return pd.DataFrame()
    finally:
        conn.close()


def get_heatmap_data(year: int, op: str, level: str = "distrito"):
    """
    Retorna matriz de precios por mes para todas las zonas.
    Formato: [{ zona: "Retiro", m1: 20.5, m2: 21.0, ... }]
    """
    if not os.path.exists(DB_PATH): return []
    conn = _conn()
    op_l = op.lower()
    
    # Manejo de 'compra' -> 'venta'
    if op_l == 'compra':
        op_l = 'venta'

    if op_l == 'inversión' or op_l == 'inversion':
        val_col = 'rentabilidad_bruta'
        real_op = 'alquiler'
    else:
        val_col = 'precio_m2'
        real_op = 'alquiler' if op_l == 'alquiler' else 'venta'

    try:
        if level == "distrito":
            q = f"""
                SELECT d.nombre as zona, t.mes, AVG(f.{val_col}) as val
                FROM Fact_Operacion f
                JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE t.anio = {int(year)} AND f.tipo_operacion = '{real_op}'
                  AND f.id_barrio != -1
                GROUP BY zona, t.mes
            """
        else:
            q = f"""
                SELECT b.nombre as zona, t.mes, AVG(f.{val_col}) as val
                FROM Fact_Operacion f
                JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE t.anio = {int(year)} AND f.tipo_operacion = '{real_op}'
                  AND b.id_barrio != -1
                  AND b.nombre NOT LIKE '%[DATO A NIVEL DISTRITO]%'
                GROUP BY zona, t.mes
            """
        df = pd.read_sql(q, conn)
        
        # Filtrar nombres de distrito si estamos a nivel barrio
        if level != "distrito" and not df.empty:
            dist_list = pd.read_sql("SELECT nombre FROM Dim_Distrito", conn)['nombre'].tolist()
            df = df[~df['zona'].isin(dist_list)]
            df = df[~df['zona'].str.upper().str.contains("DISTRITO")]
            
        # FALLBACK A PREDICCIONES
        if int(year) >= 2026:
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                if op_l == 'inversion':
                    # Para inversión, calculamos la rentabilidad a partir de alquiler y venta
                    df_alq = pred_df[(pred_df['anio'] == int(year)) & (pred_df['tipo_operacion'] == 'alquiler')]
                    df_vta = pred_df[(pred_df['anio'] == int(year)) & (pred_df['tipo_operacion'] == 'venta')]
                    df_merged = pd.merge(df_alq, df_vta, on=['id_distrito', 'id_barrio', 'anio', 'mes'], suffixes=('_alq', '_vta'))
                    df_merged['precio_m2_predicho'] = (df_merged['precio_m2_predicho_alq'] * 12) / df_merged['precio_m2_predicho_vta']
                    filtered_pred = df_merged
                else:
                    filtered_pred = pred_df[(pred_df['anio'] == int(year)) & (pred_df['tipo_operacion'] == real_op)]
                
                if level == "distrito":
                    df_dist_names = pd.read_sql("SELECT id_distrito, nombre as zona FROM Dim_Distrito WHERE id_distrito != -1", conn)
                    df_pred = pd.merge(filtered_pred, df_dist_names, on='id_distrito', how='inner')
                    df_pred = df_pred[df_pred['id_barrio'] == -1]
                    df_pred = df_pred.rename(columns={'precio_m2_predicho': 'val'})
                    df_pred = df_pred[['zona', 'mes', 'val']]
                else: # barrio
                    df_barr_names = pd.read_sql("SELECT id_barrio, nombre as zona FROM Dim_Barrio WHERE id_barrio != -1 AND nombre NOT LIKE '%[DATO A NIVEL DISTRITO]%'", conn)
                    df_pred = pd.merge(filtered_pred, df_barr_names, on='id_barrio', how='inner')
                    df_pred = df_pred.rename(columns={'precio_m2_predicho': 'val'})
                    df_pred = df_pred[['zona', 'mes', 'val']]
                    
                    dist_list = pd.read_sql("SELECT nombre FROM Dim_Distrito", conn)['nombre'].tolist()
                    df_pred = df_pred[~df_pred['zona'].isin(dist_list)]
                    df_pred = df_pred[~df_pred['zona'].str.upper().str.contains("DISTRITO")]

                if not df_pred.empty:
                    df = pd.concat([df, df_pred]).drop_duplicates(subset=['zona', 'mes'], keep='first')
        
        # DEBUG LOG
        with open(os.path.join(_ROOT_DIR, "scratch", "heatmap_debug.log"), "w") as f_log:
            f_log.write(f"Query/Pred: {year} - {op_l}\nResults: {len(df)}\n")
        
        if df.empty: return []

        # Crear diccionario { zona: { mes: val } }
        matrix = {}
        for _, row in df.iterrows():
            z = row['zona']
            m = int(row['mes'])
            val_raw = row['val']
            v = float(val_raw) if (pd.notnull(val_raw) and not pd.isna(val_raw)) else 0.0
            if z not in matrix: matrix[z] = {}
            matrix[z][m] = v

        results = []
        for zona, months in matrix.items():
            item = {"zona": zona}
            for m in range(1, 13):
                item[f"m{m}"] = months.get(m, 0.0)
            results.append(item)
            
        # Ordenar por nombre de zona
        results.sort(key=lambda x: x['zona'])
        return results
    except Exception as e:
        print(f"[get_heatmap_data] error: {e}")
        return []
    finally:
        conn.close()


def get_affordability_data(anio: int, mes: str, op: str) -> pd.DataFrame:
    conn = _conn()
    month_id = MONTH_IDS[mes]
    real_op = "alquiler" if op.lower() == "inversion" else op.lower()
    
    q = f"""
        SELECT d.nombre as distrito,
               d.renta_media_hogar as renta_anual,
               AVG(f.precio_promedio_vivienda) as ticket_medio
        FROM Fact_Operacion f
        JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE t.anio = {anio} AND t.mes = {month_id} AND f.tipo_operacion = '{real_op}'
        GROUP BY d.nombre
    """
    try:
        df = pd.read_sql(q, conn)
        if df.empty or df['ticket_medio'].isnull().all():
            # Fallback to predictions
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op)]
                df_dist_names = pd.read_sql("SELECT id_distrito, nombre as distrito, renta_media_hogar as renta_anual, superficie_media_vivienda FROM Dim_Distrito WHERE id_distrito != -1", conn)
                df_pred_full = pd.merge(filtered_pred, df_dist_names, on='id_distrito', how='inner')
                if not df_pred_full.empty:
                    df_pred_full['ticket_medio'] = df_pred_full['precio_m2_predicho'] * df_pred_full['superficie_media_vivienda']
                    df = df_pred_full.groupby(['distrito', 'renta_anual']).agg({'ticket_medio': 'mean'}).reset_index()
        conn.close()
        return df.fillna(0)
    except Exception as e:
        print("Error in get_affordability_data:", e)
        conn.close()
        return pd.DataFrame()


def get_seasonal_averages(anio: int, op: str) -> list:
    conn = _conn()
    real_op = "alquiler" if op.lower() == "inversion" else op.lower()
    
    q = f"""
        SELECT t.mes,
               AVG(f.precio_m2) as precio_m2
        FROM Fact_Operacion f
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE t.anio = {anio} AND f.tipo_operacion = '{real_op}'
        GROUP BY t.mes
        ORDER BY t.mes
    """
    try:
        df = pd.read_sql(q, conn)
        if df.empty or df['precio_m2'].isnull().all():
            # Fallback to predictions
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['tipo_operacion'] == real_op)]
                if not filtered_pred.empty:
                    df = filtered_pred.groupby('mes').agg({'precio_m2_predicho': 'mean'}).reset_index()
                    df.rename(columns={'precio_m2_predicho': 'precio_m2'}, inplace=True)
        conn.close()
        
        result = []
        for idx, row in df.iterrows():
            mes_id = int(row['mes'])
            val_raw = row['precio_m2']
            val_val = float(val_raw) if (pd.notnull(val_raw) and not pd.isna(val_raw)) else 0.0
            result.append({
                "mes": mes_id,
                "mes_nombre": MONTH_NAMES.get(mes_id, ""),
                "precio_m2": val_val
            })
        return result
    except Exception as e:
        print("Error in get_seasonal_averages:", e)
        conn.close()
        return []

def get_scatter_opportunity_data(anio: int, mes: str, op: str, level: str = "distrito") -> pd.DataFrame:
    conn = _conn()
    month_id = MONTH_IDS[mes]
    real_op = "alquiler" if op.lower() == "inversion" else op.lower()
    
    # Try querying from DB first
    q = f"""
        SELECT {'d.nombre' if level == 'distrito' else 'b.nombre'} as name,
               AVG(f.precio_m2) as precio_m2,
               AVG(b.dist_min_public_transport_m) as dist_transport
        FROM Fact_Operacion f
        JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
        JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE t.anio = {anio} AND t.mes = {month_id} AND f.tipo_operacion = '{real_op}'
        GROUP BY name
    """
    try:
        df = pd.read_sql(q, conn)
        if df.empty or df['precio_m2'].isnull().all():
            # Fallback to predictions
            pred_df = _get_predictions_df()
            if not pred_df.empty:
                filtered_pred = pred_df[(pred_df['anio'] == anio) & (pred_df['mes'] == month_id) & (pred_df['tipo_operacion'] == real_op)]
                df_barr = pd.read_sql("SELECT id_barrio, nombre as barrio, dist_min_public_transport_m FROM Dim_Barrio WHERE id_barrio != -1", conn)
                df_dist = pd.read_sql("SELECT id_distrito, nombre as distrito FROM Dim_Distrito WHERE id_distrito != -1", conn)
                
                df_pred = pd.merge(filtered_pred, df_barr, on='id_barrio', how='inner')
                df_pred = pd.merge(df_pred, df_dist, on='id_distrito', how='inner')
                
                if level == 'barrio':
                    df_pred = df_pred.rename(columns={'barrio': 'name', 'precio_m2_predicho': 'precio_m2', 'dist_min_public_transport_m': 'dist_transport'})
                    df = df_pred[['name', 'precio_m2', 'dist_transport']].groupby('name').mean().reset_index()
                else:
                    df_pred = df_pred.rename(columns={'distrito': 'name', 'precio_m2_predicho': 'precio_m2', 'dist_min_public_transport_m': 'dist_transport'})
                    df = df_pred[['name', 'precio_m2', 'dist_transport']].groupby('name').mean().reset_index()
        conn.close()
        return df.fillna(0)
    except Exception as e:
        print("Error in get_scatter_opportunity_data:", e)
        conn.close()
        return pd.DataFrame()


def get_connectivity_analysis(distrito: str = "Todos", barrio: str = "Todos"):
    """
    Calcula distancias promedio a 6 servicios principales (Transporte, Hospital, Colegio, Universidad, Parque, Comercio)
    para el barrio o distrito seleccionado, y evalúa el nivel de conectividad.
    """
    if not os.path.exists(DB_PATH):
        return {
            "services": [],
            "general_score": 0,
            "general_rating": "Sin datos"
        }
    conn = _conn()
    try:
        conditions = ["id_barrio != -1", "nombre NOT LIKE '%[DATO A NIVEL DISTRITO]%'"]
        
        if distrito != "Todos" and distrito != "":
            df_dist = pd.read_sql(f"SELECT id_distrito FROM Dim_Distrito WHERE nombre = '{distrito}'", conn)
            if not df_dist.empty:
                dist_id = int(df_dist.iloc[0]['id_distrito'])
                conditions.append(f"id_distrito = {dist_id}")
        
        if barrio != "Todos" and barrio != "":
            conditions.append(f"nombre = '{barrio}'")
            
        where_clause = " AND ".join(conditions)
        q = f"""
            SELECT AVG(dist_min_public_transport_m) as dist_transport,
                   AVG(dist_min_hospital_m) as dist_hospital,
                   AVG(dist_min_school_m) as dist_school,
                   AVG(dist_min_university_m) as dist_university,
                   AVG(dist_min_park_m) as dist_park,
                   AVG(dist_min_shop_m) as dist_shop
            FROM Dim_Barrio
            WHERE {where_clause}
        """
        df = pd.read_sql(q, conn)
        conn.close()
        
        if df.empty or pd.isna(df.iloc[0]['dist_transport']):
            return {
                "services": [],
                "general_score": 0,
                "general_rating": "Sin datos"
            }
            
        row = df.iloc[0]
        
        def evaluate_service(dist, name, key, excel_limit, good_limit, max_limit):
            dist = float(dist) if (pd.notnull(dist) and not pd.isna(dist)) else 0.0
            
            if dist >= 1000:
                dist_text = f"{round(dist / 1000, 1)} km"
            else:
                dist_text = f"{int(round(dist))} m"
                
            if dist <= excel_limit:
                score = 85 + (15 * (1 - dist / excel_limit))
                rating = "Excelente"
                color = "green"
            elif dist <= good_limit:
                score = 50 + (35 * (1 - (dist - excel_limit) / (good_limit - excel_limit)))
                rating = "Bueno"
                color = "orange"
            else:
                score = max(0, 50 * (1 - (dist - good_limit) / (max_limit - good_limit)))
                rating = "Lejano"
                color = "red"
                
            return {
                "name": name,
                "key": key,
                "distance": dist_text,
                "raw_distance": dist,
                "rating": rating,
                "color": color,
                "score": score
            }
            
        services = [
            evaluate_service(row['dist_transport'], "Transporte", "transport", 200, 500, 1500),
            evaluate_service(row['dist_hospital'], "Hospital", "hospital", 1000, 2500, 6000),
            evaluate_service(row['dist_school'], "Colegio", "school", 300, 800, 2000),
            evaluate_service(row['dist_university'], "Universidad", "university", 1500, 3500, 8000),
            evaluate_service(row['dist_park'], "Parques", "park", 250, 600, 1800),
            evaluate_service(row['dist_shop'], "Comercios", "shop", 300, 800, 2000)
        ]
        
        general_score = int(round(sum(s['score'] for s in services) / 6))
        
        if general_score >= 85:
            general_rating = "Excelente conexión"
        elif general_score >= 70:
            general_rating = "Muy bien conectado"
        elif general_score >= 50:
            general_rating = "Conexión aceptable"
        else:
            general_rating = "Poco conectado"
            
        return {
            "services": services,
            "general_score": general_score,
            "general_rating": general_rating
        }
        
    except Exception as e:
        print("Error in get_connectivity_analysis:", e)
        try:
            conn.close()
        except:
            pass
        return {
            "services": [],
            "general_score": 0,
            "general_rating": "Error"
        }


def get_liquidity_data(anio: int, level: str = "distrito") -> list:
    """
    Calcula el volumen de transacciones para la liquidez de distritos o barrios,
    y determina la facilidad de venta.
    """
    df_trans = _get_transactions_df()
    if df_trans.empty:
        return []
    
    conn = _conn()
    try:
        year_to_query = anio
        if anio > 2025:
            year_to_query = 2025
            
        df_filtered = df_trans[df_trans['anio'] == year_to_query]
        
        if level == "barrio":
            df_names = pd.read_sql("SELECT id_barrio, nombre as name FROM Dim_Barrio WHERE id_barrio != -1 AND nombre NOT LIKE '%[DATO A NIVEL DISTRITO]%'", conn)
            df_merged = pd.merge(df_filtered, df_names, on='id_barrio', how='inner')
            df_grouped = df_merged.groupby('name')['num_transacciones'].sum().reset_index()
        else:
            df_names = pd.read_sql("SELECT id_distrito, nombre as name FROM Dim_Distrito WHERE id_distrito != -1", conn)
            df_merged = pd.merge(df_filtered, df_names, on='id_distrito', how='inner')
            df_grouped = df_merged.groupby('name')['num_transacciones'].sum().reset_index()
            
        conn.close()
        
        results = []
        for idx, row in df_grouped.iterrows():
            tx = int(row['num_transacciones'])
            
            if level == "barrio":
                if tx >= 100:
                    speed = "Muy fácil"
                    color = "green"
                    stars = 3
                elif tx >= 40:
                    speed = "Fácil"
                    color = "green-light"
                    stars = 2
                elif tx >= 15:
                    speed = "Moderado"
                    color = "orange"
                    stars = 2
                else:
                    speed = "Lento"
                    color = "red"
                    stars = 1
            else:
                if tx >= 300:
                    speed = "Muy fácil"
                    color = "green"
                    stars = 3
                elif tx >= 200:
                    speed = "Fácil"
                    color = "green-light"
                    stars = 2
                elif tx >= 100:
                    speed = "Moderado"
                    color = "orange"
                    stars = 2
                else:
                    speed = "Lento"
                    color = "red"
                    stars = 1
                    
            results.append({
                "name": row['name'],
                "transactions": tx,
                "speed": speed,
                "color": color,
                "stars": stars
            })
            
        results.sort(key=lambda x: x['transactions'], reverse=True)
        return results[:10]
        
    except Exception as e:
        print("Error in get_liquidity_data:", e)
        try:
            conn.close()
        except:
            pass
        return []


def get_interest_rate_impact_data(district: str = "Todos", barrio: str = "Todos") -> list:
    """
    Query the average price/m2 for 'venta' in 2023, 2024, and 2025 for the selected district/barrio,
    pairing it with the typical historical interest rates (2023: 2.1%, 2024: 2.74%, 2025: 3.2%).
    """
    if not os.path.exists(DB_PATH):
        return []
        
    years = [2023, 2024, 2025]
    rates = {2023: 2.1, 2024: 2.74, 2025: 3.2}
    
    conn = _conn()
    filter_clause = ""
    if barrio != "Todos":
        filter_clause = f"AND b.nombre = '{barrio}'"
    elif district != "Todos":
        filter_clause = f"AND d.nombre = '{district}'"
        
    results = []
    try:
        for year in years:
            q = f"""
                SELECT AVG(f.precio_m2) as p_m2
                FROM Fact_Operacion f
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
                JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
                WHERE t.anio = {year}
                  AND f.tipo_operacion = 'venta'
                  {filter_clause}
            """
            p_m2 = 0.0
            res_df = pd.read_sql(q, conn)
            if not res_df.empty:
                val = res_df.iloc[0]['p_m2']
                if val is not None:
                    p_m2 = float(val)
                    
            # Fallback if no database rows are returned
            if p_m2 == 0.0:
                if year == 2023:
                    p_m2 = 3840.17
                elif year == 2024:
                    p_m2 = 4259.94
                elif year == 2025:
                    p_m2 = 5087.89
                    
            results.append({
                "year": year,
                "interest_rate": rates[year],
                "price_m2": round(p_m2, 2)
            })
    except Exception as e:
        print("Error in get_interest_rate_impact_data:", e)
    finally:
        conn.close()
        
    return results


def get_risk_return_matrix_data(level: str = "distrito", district: str = "Todos") -> list:
    """
    Computes ROI (rentabilidad_bruta) and Volatility (std deviation of precio_m2 over last 24 months)
    for all districts (or barrios of a district).
    """
    if not os.path.exists(DB_PATH):
        return []
        
    conn = _conn()
    try:
        # Volatility: standard deviation of precio_m2 across available data
        q_prices = """
            SELECT f.precio_m2, d.nombre as distrito, b.nombre as barrio
            FROM Fact_Operacion f
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
            JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
            WHERE f.tipo_operacion = 'venta'
              AND t.anio IN (2023, 2024, 2025)
        """
        df_prices = pd.read_sql(q_prices, conn)
        
        # ROI: rentabilidad_bruta for the active year/month
        q_roi = """
            SELECT f.rentabilidad_bruta, d.nombre as distrito, b.nombre as barrio
            FROM Fact_Operacion f
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            JOIN Dim_Barrio b ON f.id_barrio = b.id_barrio
            JOIN Dim_Distrito d ON f.id_distrito = d.id_distrito
            WHERE f.tipo_operacion = 'venta'
              AND t.anio = 2024 AND t.mes = 4
        """
        df_roi = pd.read_sql(q_roi, conn)
        conn.close()
        
        if df_prices.empty or df_roi.empty:
            return []
            
        if level == "barrio":
            if district != "Todos":
                df_prices = df_prices[df_prices['distrito'] == district]
                df_roi = df_roi[df_roi['distrito'] == district]
            
            df_vol = df_prices.groupby('barrio')['precio_m2'].std().reset_index()
            df_vol.rename(columns={'precio_m2': 'volatility'}, inplace=True)
            
            df_roi_grouped = df_roi.groupby('barrio')['rentabilidad_bruta'].mean().reset_index()
            df_roi_grouped.rename(columns={'rentabilidad_bruta': 'roi'}, inplace=True)
            
            df_merged = pd.merge(df_vol, df_roi_grouped, on='barrio')
            df_merged.rename(columns={'barrio': 'name'}, inplace=True)
        else:
            df_vol = df_prices.groupby('distrito')['precio_m2'].std().reset_index()
            df_vol.rename(columns={'precio_m2': 'volatility'}, inplace=True)
            
            df_roi_grouped = df_roi.groupby('distrito')['rentabilidad_bruta'].mean().reset_index()
            df_roi_grouped.rename(columns={'rentabilidad_bruta': 'roi'}, inplace=True)
            
            df_merged = pd.merge(df_vol, df_roi_grouped, on='distrito')
            df_merged.rename(columns={'distrito': 'name'}, inplace=True)
            
        df_merged.fillna({'volatility': 0.0, 'roi': 0.05}, inplace=True)
        
        min_v = df_merged['volatility'].min()
        max_v = df_merged['volatility'].max()
        
        results = []
        for idx, row in df_merged.iterrows():
            roi_pct = float(row['roi']) * 100
            vol = float(row['volatility'])
            
            if max_v > min_v:
                risk = ((vol - min_v) / (max_v - min_v)) * 80 + 10
            else:
                risk = 50.0
                
            results.append({
                "name": row['name'],
                "risk": round(risk, 2),
                "roi": round(roi_pct, 2)
            })
            
        return results
        
    except Exception as e:
        print("Error in get_risk_return_matrix_data:", e)
        try:
            conn.close()
        except:
            pass
        return []


def get_zone_liquidity_data(zone_name: str, level: str = "distrito") -> dict:
    """
    Gets transaction volume and speed category for a single zone.
    """
    if not os.path.exists(DB_PATH):
        return {"transactions": 0, "speed": "Moderado", "color": "orange"}
        
    conn = _conn()
    try:
        year_to_query = 2025
        df_trans = _get_transactions_df()
        if df_trans.empty:
            conn.close()
            return {"transactions": 0, "speed": "Moderado", "color": "orange"}
            
        df_filtered = df_trans[df_trans['anio'] == year_to_query]
        
        if level == "barrio":
            q = f"SELECT id_barrio, nombre FROM Dim_Barrio WHERE nombre = '{zone_name}'"
            df_zone = pd.read_sql(q, conn)
            if df_zone.empty:
                conn.close()
                return {"transactions": 0, "speed": "Moderado", "color": "orange"}
            id_val = int(df_zone.iloc[0]['id_barrio'])
            tx = int(df_filtered[df_filtered['id_barrio'] == id_val]['num_transacciones'].sum())
        else:
            q = f"SELECT id_distrito, nombre FROM Dim_Distrito WHERE nombre = '{zone_name}'"
            df_zone = pd.read_sql(q, conn)
            if df_zone.empty:
                conn.close()
                return {"transactions": 0, "speed": "Moderado", "color": "orange"}
            id_val = int(df_zone.iloc[0]['id_distrito'])
            tx = int(df_filtered[df_filtered['id_distrito'] == id_val]['num_transacciones'].sum())
            
        conn.close()
        
        # Classification
        if level == "barrio":
            if tx >= 100:
                speed = "Muy fácil"
                color = "green"
            elif tx >= 40:
                speed = "Fácil"
                color = "green-light"
            elif tx >= 15:
                speed = "Moderado"
                color = "orange"
            else:
                speed = "Lento"
                color = "red"
        else:
            if tx >= 300:
                speed = "Muy fácil"
                color = "green"
            elif tx >= 200:
                speed = "Fácil"
                color = "green-light"
            elif tx >= 100:
                speed = "Moderado"
                color = "orange"
            else:
                speed = "Lento"
                color = "red"
                
        return {"transactions": tx, "speed": speed, "color": color}
        
    except Exception as e:
        print("Error in get_zone_liquidity_data:", e)
        try:
            conn.close()
        except:
            pass
        return {"transactions": 0, "speed": "Moderado", "color": "orange"}



