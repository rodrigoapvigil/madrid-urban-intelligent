"""
pipeline/ingest_ground_truth_db.py
-----------------------------------
Ingesta transaccional y atómica de los datos reales del segundo trimestre de 2026 (Abril, Mayo, Junio)
en la tabla Fact_Operacion de data/madrid_intelligence.db.

Garantías:
- CERO predicciones se guardan en la base de datos (únicamente observaciones reales del Ayuntamiento).
- Imputa id_barrio = -1 cuando el dato es distrital.
- Cruza superficie media por distrito/barrio para calcular precio_promedio_vivienda y total_anual.
- Calcula variaciones porcentuales (mensual, trimestral, anual) contra el histórico existente.
- Calcula rentabilidad bruta cruzando alquiler y venta.
"""

import os
import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path

def ingest_q2_data(db_path: str, csv_path: str):
    print(f"[INGEST] Conectando a SQLite: {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Cargar Mapeos de Dim_Distrito y Dim_Barrio
    cursor.execute("SELECT id_distrito, codigo, superficie_media_vivienda FROM Dim_Distrito")
    dist_map = {}
    dist_sup = {}
    for id_d, cod, sup in cursor.fetchall():
        clean_cod = str(cod).strip().lstrip('0')
        dist_map[clean_cod] = id_d
        dist_sup[id_d] = float(sup) if sup else 75.0

    cursor.execute("SELECT id_barrio, id_distrito, codigo, superficie_media_vivienda FROM Dim_Barrio WHERE id_barrio != -1")
    barrio_map = {}
    barrio_dist = {}
    barrio_sup = {}
    for id_b, id_d, cod, sup in cursor.fetchall():
        clean_cod = str(cod).strip().lstrip('0')
        barrio_map[clean_cod] = id_b
        barrio_dist[id_b] = id_d
        barrio_sup[id_b] = float(sup) if sup and float(sup) > 0 else dist_sup.get(id_d, 75.0)

    # 2. Cargar histórico de precios de Fact_Operacion para calcular variaciones
    print("[INGEST] Extrayendo histórico para cómputo de variaciones...")
    cursor.execute("""
        SELECT id_tiempo, id_distrito, id_barrio, tipo_operacion, precio_m2 
        FROM Fact_Operacion
    """)
    hist_prices = {}
    for id_t, id_d, id_b, op, p_m2 in cursor.fetchall():
        hist_prices[(int(id_t), int(id_d), int(id_b), str(op).lower())] = float(p_m2)

    # 3. Leer dataset Ground Truth de Q2 2026
    print(f"[INGEST] Leyendo {csv_path}...")
    df_gt = pd.read_csv(csv_path)
    
    # Estructura temporal para almacenar los nuevos registros ordenados por tiempo
    df_gt.sort_values(by=['id_tiempo', 'operacion', 'nivel_geografico'], inplace=True)

    # Limpiar previamente registros existentes de Q2 2026 si hubiera alguno
    cursor.execute("""
        DELETE FROM Fact_Operacion 
        WHERE id_tiempo IN (202604, 202605, 202606)
    """)
    deleted = cursor.rowcount
    if deleted > 0:
        print(f"[INGEST] Se eliminaron {deleted} registros previos de Q2 2026 para garantizar inserción limpia.")

    # 4. Procesar registros y calcular métricas
    print("[INGEST] Procesando registros nuevos...")
    records_to_insert = []
    new_prices = {} # (id_t, id_d, id_b, op) -> precio_m2
    
    for _, row in df_gt.iterrows():
        id_t = int(row['id_tiempo'])
        op = str(row['operacion']).lower()
        p_m2 = float(row['precio_m2'])
        nivel = str(row['nivel_geografico'])
        
        cod_d = str(row['cod_distrito']).strip().lstrip('0')
        id_d = dist_map.get(cod_d)
        if not id_d:
            continue
            
        if nivel == 'distrito':
            id_b = -1
            sup = dist_sup.get(id_d, 75.0)
        else:
            cod_b = str(row['cod_barrio']).strip().lstrip('0')
            id_b = barrio_map.get(cod_b)
            if not id_b:
                continue # Omitir barrios no residenciales sin entrada en Dim_Barrio
            sup = barrio_sup.get(id_b, dist_sup.get(id_d, 75.0))
            
        new_prices[(id_t, id_d, id_b, op)] = p_m2
        
    # Función auxiliar para buscar precio histórico o de mes anterior en Q2
    def get_price(t, d, b, o):
        if (t, d, b, o) in new_prices:
            return new_prices[(t, d, b, o)]
        return hist_prices.get((t, d, b, o), None)

    for (id_t, id_d, id_b, op), p_m2 in new_prices.items():
        sup = dist_sup.get(id_d, 75.0) if id_b == -1 else barrio_sup.get(id_b, dist_sup.get(id_d, 75.0))
        precio_promedio = round(p_m2 * sup, 2)
        total_anual = round(precio_promedio * 12, 2)
        
        # Variación mensual (vs mes anterior)
        mes = id_t % 100
        prev_mes_id = id_t - 1 if mes > 1 else (id_t - 100 + 11)
        p_prev_m = get_price(prev_mes_id, id_d, id_b, op)
        var_m = round(((p_m2 - p_prev_m) / p_prev_m) * 100, 2) if p_prev_m and p_prev_m > 0 else 0.0
        
        # Variación trimestral (vs 3 meses antes)
        if mes > 3:
            prev_q_id = id_t - 3
        else:
            prev_q_id = (id_t - 100) + 12 - (3 - mes)
        p_prev_q = get_price(prev_q_id, id_d, id_b, op)
        var_q = round(((p_m2 - p_prev_q) / p_prev_q) * 100, 2) if p_prev_q and p_prev_q > 0 else 0.0
        
        # Variación anual (vs 12 meses antes)
        prev_y_id = id_t - 100
        p_prev_y = get_price(prev_y_id, id_d, id_b, op)
        var_y = round(((p_m2 - p_prev_y) / p_prev_y) * 100, 2) if p_prev_y and p_prev_y > 0 else 0.0
        
        # Rentabilidad bruta (alquiler * 12 / venta)
        if op == 'alquiler':
            p_v = get_price(id_t, id_d, id_b, 'venta') or get_price(id_t, id_d, -1, 'venta')
            p_a = p_m2
        else:
            p_v = p_m2
            p_a = get_price(id_t, id_d, id_b, 'alquiler') or get_price(id_t, id_d, -1, 'alquiler')
            
        rentabilidad = round((p_a * 12) / p_v, 4) if p_v and p_a and p_v > 0 else 0.0
        
        records_to_insert.append((
            id_t, id_d, id_b, op, p_m2, var_m, var_q, var_y,
            round(sup, 2), precio_promedio, total_anual, rentabilidad
        ))

    # 5. Insertar registros atómicamente
    print(f"[INGEST] Insertando {len(records_to_insert)} registros en Fact_Operacion...")
    cursor.executemany("""
        INSERT INTO Fact_Operacion (
            id_tiempo, id_distrito, id_barrio, tipo_operacion,
            precio_m2, variacion_mensual, variacion_trimestral, variacion_anual,
            superficie_media, precio_promedio_vivienda, total_anual, rentabilidad_bruta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records_to_insert)

    conn.commit()
    
    # 6. Verificación
    cursor.execute("""
        SELECT t.mes, f.tipo_operacion, COUNT(*) 
        FROM Fact_Operacion f
        JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
        WHERE t.anio = 2026 AND t.mes IN (4, 5, 6)
        GROUP BY t.mes, f.tipo_operacion
        ORDER BY t.mes, f.tipo_operacion
    """)
    summary = cursor.fetchall()
    print("\n[VERIFICACION INGESTA REAL EN BD]")
    for mes, op, count in summary:
        print(f"  Mes {mes}/2026 | Operación: {op:<8} | Filas: {count}")
        
    cursor.execute("SELECT COUNT(*) FROM Fact_Operacion WHERE id_tiempo IN (202604, 202605, 202606)")
    total_ingested = cursor.fetchone()[0]
    print(f"[OK] Total registros reales Q2 2026 en Fact_Operacion: {total_ingested}")
    assert total_ingested > 500, f"Error: Ingesta incompleta ({total_ingested})"
    
    conn.close()

def main():
    base_dir = Path(__file__).resolve().parent.parent
    db_path = base_dir / "data" / "madrid_intelligence.db"
    csv_path = base_dir / "data" / "ground_truth_2026_q2.csv"
    ingest_q2_data(str(db_path), str(csv_path))

if __name__ == "__main__":
    main()
