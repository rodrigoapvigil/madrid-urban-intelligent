"""
pipeline/clean_update_2026.py
------------------------------
Procesador ETL y parser de los CSVs municipales de 2026 descargados del Banco de Datos de Madrid.
Filtra exclusivamente los meses del segundo trimestre (Abril=4, Mayo=5, Junio=6 de 2026),
limpia los precios y exporta el Ground Truth canónico a data/ground_truth_2026_q2.csv.
"""

import os
import sys
import pandas as pd
import numpy as np
from unidecode import unidecode
from pathlib import Path

MESES_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}

def clean_series(file_path: str, operacion_name: str) -> pd.DataFrame:
    print(f"[ETL] Procesando {operacion_name} desde {file_path}...")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

    # Cargar CSV detectando columnas por posición
    df = pd.read_csv(file_path, sep=';', encoding='latin1', dtype=str)
    
    # Asignar nombres canónicos a las primeras 5 columnas
    df = df.iloc[:, :5].copy()
    df.columns = ['Ano', 'Distrito', 'Barrio', 'Mes_Str', 'Precio_Raw']
    
    # Limpieza de espacios y exclusión de Total Ciudad de Madrid
    df['Distrito'] = df['Distrito'].astype(str).str.strip()
    df['Barrio'] = df['Barrio'].astype(str).str.strip()
    df = df[~df['Distrito'].str.contains('ciudad de madrid', case=False, na=False)]
    df = df[~df['Barrio'].str.contains('ciudad de madrid', case=False, na=False)]
    
    # Mapeo de meses
    df['Mes'] = df['Mes_Str'].str.strip().str.lower().map(MESES_MAP)
    df.dropna(subset=['Mes'], inplace=True)
    df['Mes'] = df['Mes'].astype(int)
    
    # Filtrar exclusivamente los meses nuevos de Q2 (4, 5, 6 de 2026)
    df['Ano'] = pd.to_numeric(df['Ano'], errors='coerce')
    df.dropna(subset=['Ano'], inplace=True)
    df['Ano'] = df['Ano'].astype(int)
    
    df = df[(df['Ano'] == 2026) & (df['Mes'].isin([4, 5, 6]))].copy()
    
    # Limpieza de Precio_m2
    # Formato español: punto como miles, coma como decimales
    # En Venta: 7.566 -> 7566.0 | En Alquiler: 27,00 -> 27.0
    p_clean = df['Precio_Raw'].astype(str).str.replace('"', '', regex=False).str.strip()
    p_clean = p_clean.str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    df['precio_m2'] = pd.to_numeric(p_clean, errors='coerce')
    
    # Descartar nulos y '..'
    df.dropna(subset=['precio_m2'], inplace=True)
    df = df[df['precio_m2'] > 0]
    
    # Extraer códigos
    df['cod_distrito'] = df['Distrito'].apply(lambda x: x.split('.')[0].strip().lstrip('0'))
    df['nombre_distrito'] = df['Distrito'].apply(lambda x: x.split('.', 1)[-1].strip() if '.' in x else x.strip())
    
    df['nivel_geografico'] = df.apply(lambda r: 'distrito' if r['Distrito'] == r['Barrio'] else 'barrio', axis=1)
    
    df['cod_barrio'] = df.apply(
        lambda r: '-1' if r['nivel_geografico'] == 'distrito' else r['Barrio'].split('.')[0].strip().lstrip('0'),
        axis=1
    )
    df['nombre_barrio'] = df.apply(
        lambda r: '[DATO A NIVEL DISTRITO]' if r['nivel_geografico'] == 'distrito' else (r['Barrio'].split('.', 1)[-1].strip() if '.' in r['Barrio'] else r['Barrio'].strip()),
        axis=1
    )
    
    df['id_tiempo'] = df['Ano'] * 100 + df['Mes']
    df['operacion'] = operacion_name.lower()
    
    # Normalizar nombres
    df['distrito_norm'] = df['nombre_distrito'].apply(lambda x: unidecode(x).strip())
    df['barrio_norm'] = df['nombre_barrio'].apply(lambda x: unidecode(x).strip())
    
    cols_out = [
        'Ano', 'Mes', 'id_tiempo', 'cod_distrito', 'nombre_distrito', 'distrito_norm',
        'cod_barrio', 'nombre_barrio', 'barrio_norm', 'nivel_geografico', 'operacion', 'precio_m2'
    ]
    df = df[cols_out].copy()
    print(f"[ETL] {operacion_name}: {len(df)} registros válidos obtenidos para Q2 2026.")
    return df

def main():
    base_dir = Path(__file__).resolve().parent.parent
    alquiler_raw = base_dir / "data" / "raw_update" / "alquiler_2026_raw.csv"
    venta_raw = base_dir / "data" / "raw_update" / "venta_2026_raw.csv"
    output_csv = base_dir / "data" / "ground_truth_2026_q2.csv"
    
    df_alq = clean_series(str(alquiler_raw), "alquiler")
    df_ven = clean_series(str(venta_raw), "venta")
    
    df_unified = pd.concat([df_alq, df_ven], ignore_index=True)
    df_unified.sort_values(by=['operacion', 'id_tiempo', 'nivel_geografico', 'cod_distrito', 'cod_barrio'], inplace=True)
    
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df_unified.to_csv(str(output_csv), index=False, encoding='utf-8')
    print(f"\n[OK] Ground Truth Q2 2026 exportado a {output_csv} con {len(df_unified)} filas.")
    
    # Verificación de contenido
    meses_presentes = sorted(df_unified['Mes'].unique().tolist())
    assert meses_presentes == [4, 5, 6], f"Error: Meses esperados [4, 5, 6], encontrados {meses_presentes}"
    assert len(df_unified) > 500, f"Error: Registros insuficientes ({len(df_unified)})"
    print(f"[VERIFY] Meses verificados: {meses_presentes}. Cero valores nulos.")

if __name__ == "__main__":
    main()
