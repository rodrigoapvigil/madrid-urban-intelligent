import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(r"C:\Users\FX517\OneDrive\Desktop\TFM\FASE 5")
SOURCE_DIR = BASE_DIR / "01_fuente_original_real"
OUTPUT_DIR = BASE_DIR / "02_fuente_operativa_modelo"

DB_PATH = SOURCE_DIR / "madrid_intelligence.db"
INTEREST_SOURCE = SOURCE_DIR / "Datos de la serie 0504020100150 (1).csv"
TRANSACTIONS_SOURCE = SOURCE_DIR / "Datos de la serie 0504020100010.csv"


def load_db_base() -> pd.DataFrame:
    conn = sqlite3.connect(DB_PATH)
    try:
        query = """
        SELECT
            f.id_barrio,
            f.id_distrito,
            f.tipo_operacion,
            CAST(f.precio_m2 AS REAL) AS precio_m2,
            t.anio,
            t.mes,
            t.trimestre,
            CAST(f.variacion_anual AS REAL) AS var_anual,
            CAST(COALESCE(b.dist_to_sol_m, 0) AS REAL) AS dist_to_sol_m,
            CAST(COALESCE(b.dist_min_metro_m, 0) AS REAL) AS dist_min_metro_m,
            CAST(COALESCE(b.dist_min_hospital_m, 0) AS REAL) AS dist_min_hospital_m,
            CAST(COALESCE(b.dist_min_park_m, 0) AS REAL) AS dist_min_park_m,
            CAST(COALESCE(b.dist_min_school_m, 0) AS REAL) AS dist_min_school_m,
            CAST(COALESCE(b.dist_min_university_m, 0) AS REAL) AS dist_min_university_m,
            CAST(
                CASE
                    WHEN f.id_barrio = -1 THEN COALESCE(d.superficie_media_vivienda, 0)
                    ELSE COALESCE(b.superficie_media_vivienda, 0)
                END
            AS REAL) AS superficie_media_vivienda
        FROM Fact_Operacion f
        JOIN Dim_Tiempo t
          ON f.id_tiempo = t.id_tiempo
        LEFT JOIN Dim_Barrio b
          ON f.id_barrio = b.id_barrio
         AND f.id_distrito = b.id_distrito
        LEFT JOIN Dim_Distrito d
          ON f.id_distrito = d.id_distrito
        ORDER BY f.tipo_operacion, f.id_distrito, f.id_barrio, t.anio, t.mes
        """
        df = pd.read_sql_query(query, conn)
    finally:
        conn.close()
    return df


def add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["tipo_operacion", "id_distrito", "id_barrio", "anio", "mes"]).copy()
    grp = df.groupby(["tipo_operacion", "id_distrito", "id_barrio"])["precio_m2"]
    df["lag_1"] = grp.shift(1)
    df["lag_3"] = grp.shift(3)
    df["lag_12"] = grp.shift(12)
    df["rolling_mean_6"] = grp.transform(lambda s: s.shift(1).rolling(6).mean())
    df["shock_2025"] = (df["anio"] == 2025).astype(int)
    return df


def parse_interest_series(csv_path: Path) -> pd.DataFrame:
    df_raw = pd.read_csv(csv_path, sep=";", encoding="latin-1", skiprows=5)
    df_raw.columns = [
        "distrito_str",
        "barrio_str",
        "2023_hipoteca",
        "2023_tipo",
        "2024_hipoteca",
        "2024_tipo",
        "2025_hipoteca",
        "2025_tipo",
    ]
    df_raw = df_raw[df_raw["2023_hipoteca"] != "Hipoteca media. Importe medio de la hipoteca (?)"]

    def parse_ids(row):
        try:
            d_raw = row["distrito_str"].split(".")
            b_raw = row["barrio_str"].split(".")
            if d_raw[1].strip() == b_raw[1].strip():
                return None, None
            d_id = int(d_raw[0])
            b_id = int(b_raw[0][2:])
            return d_id, b_id
        except Exception:
            return None, None

    df_raw["id_distrito"], df_raw["id_barrio"] = zip(*df_raw.apply(parse_ids, axis=1))
    df_raw = df_raw.dropna(subset=["id_distrito"]).copy()

    chunks = []
    for year in [2023, 2024, 2025]:
        year_df = df_raw[["id_distrito", "id_barrio", f"{year}_hipoteca", f"{year}_tipo"]].copy()
        year_df["anio"] = year
        year_df.columns = ["id_distrito", "id_barrio", "hipoteca_media", "tipo_interes_medio", "anio"]
        chunks.append(year_df)

    result = pd.concat(chunks, ignore_index=True)

    def clean_num(value):
        if pd.isna(value) or value == "" or value == '"':
            return 0.0
        value = str(value).replace('"', "").replace(".", "").replace(",", ".")
        try:
            return float(value)
        except Exception:
            return 0.0

    result["hipoteca_media"] = result["hipoteca_media"].apply(clean_num)
    result["tipo_interes_medio"] = result["tipo_interes_medio"].apply(clean_num)
    result["id_distrito"] = result["id_distrito"].astype(int)
    result["id_barrio"] = result["id_barrio"].astype(int)
    result["anio"] = result["anio"].astype(int)
    return result.sort_values(["id_distrito", "id_barrio", "anio"]).reset_index(drop=True)


def parse_transactions_series(csv_path: Path) -> pd.DataFrame:
    rows = []
    with open(csv_path, "r", encoding="latin-1") as handle:
        for line in handle:
            parts = line.strip().split(";")
            if len(parts) < 5:
                continue
            if not parts[0] or not parts[0][0:2].isdigit() or "." not in parts[0]:
                continue

            distrito_raw = parts[0]
            barrio_raw = parts[1]
            if distrito_raw.strip() == barrio_raw.strip():
                continue

            try:
                dist_id = int(distrito_raw.split(".")[0])
                barrio_id = int(barrio_raw.split(".")[0][2:])
            except Exception:
                continue

            for idx, year in enumerate([2023, 2024, 2025]):
                raw_value = parts[idx + 2]
                if not raw_value or not raw_value.strip():
                    continue
                number = float(raw_value.replace(".", "").replace(",", "."))
                rows.append(
                    {
                        "id_distrito": dist_id,
                        "id_barrio": barrio_id,
                        "anio": year,
                        "num_transacciones": number,
                    }
                )

    result = pd.DataFrame(rows)
    return result.sort_values(["id_distrito", "id_barrio", "anio"]).reset_index(drop=True)


def split_operational_sets(df_full: pd.DataFrame):
    barrio_df = df_full[df_full["id_barrio"] != -1].copy()
    distrito_df = df_full[df_full["id_barrio"] == -1].copy()

    train_barrio = barrio_df[barrio_df["anio"].isin([2023, 2024, 2025])].copy()
    val_barrio = barrio_df[barrio_df["anio"] == 2026].copy()

    train_distrito = distrito_df[distrito_df["anio"].isin([2023, 2024, 2025])].copy()
    val_distrito = distrito_df[distrito_df["anio"] == 2026].copy()

    return train_barrio, val_barrio, train_distrito, val_distrito


def validate_against_master(df: pd.DataFrame, master_features: pd.DataFrame) -> dict:
    keys = ["tipo_operacion", "id_distrito", "id_barrio", "anio", "mes"]
    merged = df.merge(
        master_features[
            keys
            + [
                "lag_1",
                "lag_3",
                "lag_12",
                "rolling_mean_6",
            ]
        ].rename(
            columns={
                "lag_1": "exp_lag_1",
                "lag_3": "exp_lag_3",
                "lag_12": "exp_lag_12",
                "rolling_mean_6": "exp_rolling_mean_6",
            }
        ),
        on=keys,
        how="left",
    )

    summary = {}
    for actual, expected in [
        ("lag_1", "exp_lag_1"),
        ("lag_3", "exp_lag_3"),
        ("lag_12", "exp_lag_12"),
        ("rolling_mean_6", "exp_rolling_mean_6"),
    ]:
        summary[actual] = int(
            (
                merged[actual].fillna(-999999).round(6)
                != merged[expected].fillna(-999999).round(6)
            ).sum()
        )
    return summary


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    df_base = load_db_base()
    df_master_full = add_temporal_features(df_base)

    train_barrio, val_barrio, train_distrito, val_distrito = split_operational_sets(df_master_full)

    df_interest = parse_interest_series(INTEREST_SOURCE)
    df_transactions = parse_transactions_series(TRANSACTIONS_SOURCE)

    export_columns = [
        "id_barrio",
        "id_distrito",
        "tipo_operacion",
        "precio_m2",
        "anio",
        "mes",
        "trimestre",
        "dist_to_sol_m",
        "dist_min_metro_m",
        "dist_min_hospital_m",
        "dist_min_park_m",
        "dist_min_school_m",
        "dist_min_university_m",
        "superficie_media_vivienda",
        "lag_1",
        "lag_3",
        "lag_12",
        "rolling_mean_6",
        "var_anual",
        "shock_2025",
    ]

    df_master_full[export_columns].to_csv(OUTPUT_DIR / "df_master_full.csv", index=False)
    train_barrio[export_columns].to_csv(OUTPUT_DIR / "train_barrio.csv", index=False)
    val_barrio[export_columns].to_csv(OUTPUT_DIR / "val_barrio.csv", index=False)
    train_distrito[export_columns].to_csv(OUTPUT_DIR / "train_distrito.csv", index=False)
    val_distrito[export_columns].to_csv(OUTPUT_DIR / "val_distrito.csv", index=False)

    df_interest.to_csv(OUTPUT_DIR / "interest_rates_clean.csv", index=False)
    df_transactions.to_csv(OUTPUT_DIR / "transactions_clean.csv", index=False)

    validation_rows = []
    master_export = df_master_full[export_columns].copy()
    for name, frame in [
        ("df_master_full.csv", master_export),
        ("train_barrio.csv", train_barrio[export_columns]),
        ("val_barrio.csv", val_barrio[export_columns]),
        ("train_distrito.csv", train_distrito[export_columns]),
        ("val_distrito.csv", val_distrito[export_columns]),
    ]:
        row = {"dataset": name, **validate_against_master(frame, master_export)}
        validation_rows.append(row)

    pd.DataFrame(validation_rows).to_csv(OUTPUT_DIR / "validation_temporal_features.csv", index=False)

    print("Datasets operativos regenerados en:", OUTPUT_DIR)
    print(pd.DataFrame(validation_rows).to_string(index=False))


if __name__ == "__main__":
    main()
