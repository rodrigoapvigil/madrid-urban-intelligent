from pathlib import Path

import pandas as pd


BASE_DIR = Path(r"C:\Users\FX517\OneDrive\Desktop\TFM\FASE 5")
SOURCE_PATH = BASE_DIR / "01_fuente_original_real" / "Datos de la serie 0504020100010.csv"
OUTPUT_PATH = BASE_DIR / "02_fuente_operativa_modelo" / "transactions_clean.csv"


def process_transactions_data(filepath: Path) -> pd.DataFrame:
    rows = []
    with open(filepath, "r", encoding="latin-1") as handle:
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

            for idx, anio in enumerate([2023, 2024, 2025]):
                value = parts[idx + 2]
                if not value or not value.strip():
                    continue
                num_val = float(value.replace(".", "").replace(",", "."))
                rows.append(
                    {
                        "id_distrito": dist_id,
                        "id_barrio": barrio_id,
                        "anio": anio,
                        "num_transacciones": num_val,
                    }
                )

    df_final = pd.DataFrame(rows)
    return df_final.sort_values(["id_distrito", "id_barrio", "anio"]).reset_index(drop=True)


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_final = process_transactions_data(SOURCE_PATH)
    df_final.to_csv(OUTPUT_PATH, index=False)
    print(f"Procesado completado: {len(df_final)} registros.")
    print(f"Datos de transacciones guardados en {OUTPUT_PATH}")
    print(df_final.head().to_string(index=False))


if __name__ == "__main__":
    main()
