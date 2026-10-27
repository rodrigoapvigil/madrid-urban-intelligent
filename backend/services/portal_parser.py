"""
backend/services/portal_parser.py
Extractor de datos para enlaces de portales inmobiliarios (Idealista, Fotocasa, etc.)
con soporte para modo híbrido y fallback manual ante bloqueos antibot.
"""
import re
import json
from typing import Optional, Dict, Any, Tuple
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from backend.services.veredicto_engine import normalizar_texto


class PortalParsedData(BaseModel):
    precio: Optional[float] = None
    metros: Optional[float] = None
    barrio: Optional[str] = None
    distrito: Optional[str] = None
    titulo: Optional[str] = None
    operacion: str = "Venta"
    requiere_manual: bool = False
    error_mensaje: Optional[str] = None


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


def extraer_precio(texto: str) -> Optional[float]:
    """Extrae precio en euros de un texto."""
    if not texto:
        return None
    # Buscar patrones como: 320.000 €, 320000€, 1.250.000 €
    match = re.search(r"(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:€|euros?)", texto, re.IGNORECASE)
    if match:
        raw_num = match.group(1).replace(".", "").strip()
        try:
            val = float(raw_num)
            if val > 100:  # Filtrar valores absurdamente bajos
                return val
        except ValueError:
            pass
    return None


def extraer_metros(texto: str) -> Optional[float]:
    """Extrae metros cuadrados de un texto."""
    if not texto:
        return None
    # Buscar patrones como: 85 m², 85m2, 120 metros cuadrados
    match = re.search(r"(\d+(?:[\.,]\d+)?)\s*(?:m²|m2|metros(?:\s*cuadrados)?)", texto, re.IGNORECASE)
    if match:
        raw_num = match.group(1).replace(",", ".").strip()
        try:
            val = float(raw_num)
            if 10 <= val <= 2000:
                return val
        except ValueError:
            pass
    return None


def detectar_operacion(texto: str, url: str = "") -> str:
    combined = f"{url} {texto}".lower()
    if "alquiler" in combined or "rent" in combined:
        return "Alquiler"
    return "Venta"


def extraer_zona_madrid(texto: str) -> Tuple[Optional[str], Optional[str]]:
    """Detecta barrios o distritos conocidos de Madrid en el texto."""
    barrios_comunes = [
        "Goya", "Recoletos", "Castellana", "Almagro", "Trafalgar", "Justicia", "Cortes",
        "Palacio", "Embajadores", "Universidad", "Sol", "Malasaña", "Chueca", "Argüelles",
        "Vallehermoso", "Gaztambide", "Arapiles", "Prosperidad", "Ciudad Jardín", "El Viso",
        "Hispanoamérica", "Nueva España", "Castilla", "Guindalera", "Fuente del Berro",
        "Lista", "Pacífico", "Adelfas", "Estrella", "Ibiza", "Jerónimos", "Niño Jesús",
        "Marroquina", "Media Legua", "Fontarrón", "Vinateros", "Pavones", "Horcajo",
        "Pilar", "La Paz", "Valdezarza", "Peñagrande", "Moncloa", "Chamberí", "Salamanca",
        "Retiro", "Centro", "Chamartín", "Tetuán", "Fuencarral", "Hortaleza", "Barajas",
        "Ciudad Lineal", "San Blas", "Vicálvaro", "Moratalaz", "Puente de Vallecas",
        "Villa de Vallecas", "Usera", "Villaverde", "Carabanchel", "Latina"
    ]
    texto_norm = normalizar_texto(texto)
    for b in barrios_comunes:
        if normalizar_texto(b) in texto_norm:
            return (b, None)
    return (None, None)


def parse_html_content(html: str, url: str = "") -> PortalParsedData:
    """Extrae informacion estructurada desde el codigo HTML de la pagina."""
    soup = BeautifulSoup(html, "html.parser")

    titulo = ""
    descripcion = ""

    # 1. Metadatos OpenGraph
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        titulo = og_title["content"]

    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        descripcion = og_desc["content"]

    if not titulo:
        t_tag = soup.find("title")
        if t_tag:
            titulo = t_tag.get_text()

    # 2. JSON-LD Schema.org
    precio_json = None
    metros_json = None
    barrio_json = None
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                # Extraer precio de offers
                offers = data.get("offers")
                if isinstance(offers, dict) and "price" in offers:
                    precio_json = float(offers["price"])
                elif isinstance(offers, list) and offers and "price" in offers[0]:
                    precio_json = float(offers[0]["price"])

                # Extraer superficie
                floor_size = data.get("floorSize")
                if isinstance(floor_size, dict) and "value" in floor_size:
                    metros_json = float(floor_size["value"])

                # Extraer direccion
                address = data.get("address")
                if isinstance(address, dict):
                    barrio_json = address.get("addressLocality") or address.get("streetAddress")
        except Exception:
            continue

    texto_completo = f"{titulo} {descripcion}"
    precio = precio_json or extraer_precio(texto_completo)
    metros = metros_json or extraer_metros(texto_completo)
    barrio, distrito = extraer_zona_madrid(barrio_json or texto_completo)
    operacion = detectar_operacion(texto_completo, url)

    # Determinar si faltan datos clave y requiere completar manualmente
    requiere_manual = (precio is None or metros is None or barrio is None)

    return PortalParsedData(
        precio=precio,
        metros=metros,
        barrio=barrio,
        distrito=distrito,
        titulo=titulo[:120] if titulo else None,
        operacion=operacion,
        requiere_manual=requiere_manual,
        error_mensaje="Datos extraidos parcialmente. Por favor, revisa o completa los campos." if requiere_manual else None
    )


async def parse_portal_url(url: str, timeout_sec: float = 4.0) -> PortalParsedData:
    """Descarga de forma asincrona la URL y extrae los datos."""
    if not url or not url.startswith("http"):
        return PortalParsedData(
            requiere_manual=True,
            error_mensaje="La direccion web introducida no es valida."
        )

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=timeout_sec) as client:
            resp = await client.get(url)

            if resp.status_code in [403, 429]:
                return PortalParsedData(
                    requiere_manual=True,
                    error_mensaje="El portal inmobiliario aplico verificacion antibot. Introduce precio, metros y barrio manualmente para obtener tu veredicto inmediato."
                )

            if resp.status_code != 200:
                return PortalParsedData(
                    requiere_manual=True,
                    error_mensaje=f"No fue posible acceder a la pagina del anuncio (codigo {resp.status_code})."
                )

            return parse_html_content(resp.text, url=url)

    except httpx.TimeoutException:
        return PortalParsedData(
            requiere_manual=True,
            error_mensaje="El portal tardo demasiado en responder. Introduce los datos manualmente."
        )
    except Exception as e:
        return PortalParsedData(
            requiere_manual=True,
            error_mensaje="No fue posible extraer los datos de la URL. Por favor, rellenalos de forma manual."
        )
