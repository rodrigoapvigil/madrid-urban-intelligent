from pathlib import Path

import pandas as pd


BASE_DIR = Path(r"C:\Users\FX517\OneDrive\Desktop\TFM\FASE 5")
SOURCE_PATH = BASE_DIR / "01_fuente_original_real" / "Datos de la serie 0504020100150 (1).csv"
OUTPUT_PATH = BASE_DIR / "02_fuente_operativa_modelo" / "interest_rates_clean.csv"


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
            return int(d_raw[0]), int(b_raw[0][2:])
        except Exception:
            return None, None

    df_raw["id_distrito"], df_raw["id_barrio"] = zip(*df_raw.apply(parse_ids, axis=1))
    df_raw = df_raw.dropna(subset=["id_distrito"]).copy()

    long_data = []
    for year in [2023, 2024, 2025]:
        year_df = df_raw[["id_distrito", "id_barrio", f"{year}_hipoteca", f"{year}_tipo"]].copy()
        year_df["anio"] = year
        year_df.columns = ["id_distrito", "id_barrio", "hipoteca_media", "tipo_interes_medio", "anio"]
        long_data.append(year_df)

    df_long = pd.concat(long_data, ignore_index=True)

    def clean_num(val):
        if pd.isna(val) or val == "" or val == '"':
            return 0.0
        val = str(val).replace('"', "").replace(".", "").replace(",", ".")
        try:
            return float(val)
        except Exception:
            return 0.0

    df_long["hipoteca_media"] = df_long["hipoteca_media"].apply(clean_num)
    df_long["tipo_interes_medio"] = df_long["tipo_interes_medio"].apply(clean_num)
    df_long["id_distrito"] = df_long["id_distrito"].astype(int)
    df_long["id_barrio"] = df_long["id_barrio"].astype(int)
    df_long["anio"] = df_long["anio"].astype(int)

    return df_long.sort_values(["id_distrito", "id_barrio", "anio"]).reset_index(drop=True)


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_long = parse_interest_series(SOURCE_PATH)
    df_long.to_csv(OUTPUT_PATH, index=False)
    print(f"Datos de interes procesados y guardados en {OUTPUT_PATH}")
    print(df_long.head().to_string(index=False))


if __name__ == "__main__":
    main()
