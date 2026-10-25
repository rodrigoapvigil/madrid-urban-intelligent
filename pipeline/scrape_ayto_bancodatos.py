"""
pipeline/scrape_ayto_bancodatos.py
-----------------------------------
Scraper automatizado headless con Playwright para extraer las series oficiales de 
precios inmobiliarios del Banco de Datos del Ayuntamiento de Madrid (servpub.madrid.es).

Series:
- Alquiler: 0504030000214 (Precio medio del alquiler de vivienda (€/m2))
- Venta:    0504030000153 (Precio medio de compraventa de vivienda de segunda mano (€/m2))

Parámetros seleccionados:
- Año: 2026
- Distritos: Todos excepto 'Total Ciudad de Madrid' (21 distritos seleccionados)
- Barrios: Todos (checkbox 'Todos' y 'Totales' marcados, 152 elementos)
- Meses: Todos (12 meses seleccionados)
"""

import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

SERIES = [
    {
        "name": "Alquiler",
        "url": "https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000214",
        "output_file": "data/raw_update/alquiler_2026_raw.csv"
    },
    {
        "name": "Venta",
        "url": "https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000153",
        "output_file": "data/raw_update/venta_2026_raw.csv"
    }
]

def scrape_series(page, series_info):
    name = series_info["name"]
    url = series_info["url"]
    output_path = Path(series_info["output_file"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\n[SCRAPER] Iniciando descarga para {name}...")
    print(f"[SCRAPER] URL: {url}")
    
    page.goto(url, wait_until="networkidle", timeout=60000)
    
    # 0. Aceptar o descartar banner de cookies si existe
    cookie_btn = page.query_selector('button:has-text("Aceptar todas"), button:has-text("Rechazar todas")')
    if cookie_btn and cookie_btn.is_visible():
        try:
            cookie_btn.click()
            page.wait_for_timeout(500)
        except Exception:
            pass

    # 1. Seleccionar Año = 2026
    print(f"[SCRAPER] Configurando Año = 2026...")
    page.evaluate('''() => {
        const selAno = document.getElementById('select40');
        for (let opt of selAno.options) {
            opt.selected = (opt.text.trim() === '2026');
        }
        cambiarSelect(selAno, 40);
    }''')
    page.wait_for_timeout(500)

    # 2. Seleccionar Distritos: Todos excepto 'Total Ciudad de Madrid'
    print(f"[SCRAPER] Seleccionando 21 Distritos (excluyendo Total Ciudad de Madrid)...")
    page.evaluate('''() => {
        const selDist = document.getElementById('select186');
        for (let opt of selDist.options) {
            opt.selected = !opt.text.includes('Total Ciudad');
        }
        cambiarSelect(selDist, 186);
    }''')
    page.wait_for_timeout(1000)

    # 3. Seleccionar Barrios: Todos (checkbox check650)
    print(f"[SCRAPER] Seleccionando todos los Barrios (152 items)...")
    page.evaluate('''() => {
        const checkB = document.getElementById('check650');
        if (checkB) {
            checkB.click();
        }
    }''')
    page.wait_for_timeout(500)

    # 4. Seleccionar Meses: Todos (checkbox check361)
    print(f"[SCRAPER] Seleccionando todos los Meses...")
    page.evaluate('''() => {
        const checkM = document.getElementById('check361');
        if (checkM) {
            checkM.click();
        }
    }''')
    page.wait_for_timeout(500)

    # 5. Descargar CSV pulsando #botonCsv
    print(f"[SCRAPER] Descargando CSV oficial...")
    with page.expect_download(timeout=30000) as download_info:
        page.evaluate('() => document.getElementById("botonCsv").click()')
    download = download_info.value
    download.save_as(str(output_path))
    
    file_size = output_path.stat().st_size
    with open(output_path, "r", encoding="latin1") as f:
        line_count = sum(1 for _ in f)
        
    print(f"[SCRAPER] [OK] Guardado en {output_path} ({file_size} bytes, {line_count} lineas)")
    assert line_count >= 150, f"Error: {output_path} contiene solo {line_count} lineas"
    return line_count

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for s in SERIES:
            scrape_series(page, s)
        browser.close()
    print("\n[SCRAPER] Extraccion de datos 2026 completada con exito.")

if __name__ == "__main__":
    main()
