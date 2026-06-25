# Scripts de pipeline

Estos scripts transforman datos externos en artefactos operativos.

Incluidos actualmente:
- `process_interest_data.py`
- `process_transactions.py`

Uso esperado:
- Partir de `01_fuente_original_real/`.
- Generar archivos limpios en `02_fuente_operativa_modelo/`.

Pendiente recomendado:
- Crear un script maestro que regenere todos los CSV canónicos desde la `.db` y las series oficiales.
