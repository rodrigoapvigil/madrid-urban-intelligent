"""
backend/services/portal_parser.py
Extractor de datos para enlaces de portales inmobiliarios (Idealista, Fotocasa, etc.)
con soporte para modo híbrido y fallback manual ante bloqueos antibot.
"""
import re
import json
import ipaddress
import socket
from urllib.parse import urlparse
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


ALLOWED_PORTAL_DOMAINS = {
    "idealista.com",
    "fotocasa.es",
    "habitaclia.com",
    "pisos.com",
    "yaencontre.com"
}


def es_url_segura(url: str) -> Tuple[bool, Optional[str]]:
    """
    Valida de forma estricta contra ataques SSRF:
    1. Esquema exclusivamente https:// (o http:// en dominios autorizados)
    2. Dominio perteneciente a la lista blanca de portales inmobiliarios
    3. Ninguna resolución hacia localhost o rangos IP privados/reservados
    """
    if not url:
        return False, "Dirección URL vacía."
    
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Formato de URL no válido."

    if parsed.scheme not in ("http", "https"):
        return False, "Protocolo no permitido. Solo se admite HTTP/HTTPS."

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "Host no identificado en el enlace."

    # Validar lista blanca de dominios (coincidencia exacta o subdominio)
    dominio_permitido = any(
        hostname == allowed or hostname.endswith("." + allowed)
        for allowed in ALLOWED_PORTAL_DOMAINS
    )
    if not dominio_permitido:
        return False, f"Solo se admiten enlaces oficiales de Idealista, Fotocasa, Habitaclia o Pisos.com."

    # Comprobar resolución DNS para evitar bypass con DNS Rebinding o IPs privadas
    try:
        ip_info = socket.getaddrinfo(hostname, None)
        for entry in ip_info:
            ip_str = entry[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_reserved
                or ip_obj.is_link_local
                or ip_obj.is_multicast
            ):
                return False, "La dirección resuelve a una red no pública o protegida."
    except Exception:
        return False, "No fue posible resolver la dirección del portal."

    return True, None


async def parse_portal_url(url: str, timeout_sec: float = 4.0, max_redirects: int = 3) -> PortalParsedData:
    """
    Descarga de forma asíncrona la URL validada verificando de forma estricta
    cada salto de redirección contra ataques SSRF.
    """
    from urllib.parse import urljoin

    current_url = url
    for _ in range(max_redirects + 1):
        url_valida, motivo_error = es_url_segura(current_url)
        if not url_valida:
            return PortalParsedData(
                requiere_manual=True,
                error_mensaje=motivo_error or "Enlace no válido."
            )

        try:
            async with httpx.AsyncClient(headers=HEADERS, follow_redirects=False, timeout=timeout_sec) as client:
                resp = await client.get(current_url)

                if resp.status_code in [301, 302, 303, 307, 308]:
                    location = resp.headers.get("Location")
                    if not location:
                        break
                    current_url = urljoin(current_url, location)
                    continue

                if resp.status_code in [403, 429]:
                    return PortalParsedData(
                        requiere_manual=True,
                        error_mensaje="El portal inmobiliario aplicó verificación antibot. Introduce precio, metros y barrio manualmente para obtener tu veredicto inmediato."
                    )

                if resp.status_code != 200:
                    return PortalParsedData(
                        requiere_manual=True,
                        error_mensaje=f"No fue posible acceder a la página del anuncio (código {resp.status_code})."
                    )

                return parse_html_content(resp.text, url=current_url)

        except httpx.TimeoutException:
            return PortalParsedData(
                requiere_manual=True,
                error_mensaje="El portal tardó demasiado en responder. Introduce los datos manualmente."
            )
        except Exception:
            return PortalParsedData(
                requiere_manual=True,
                error_mensaje="No fue posible extraer los datos de la URL. Por favor, rellénalos de forma manual."
            )

    return PortalParsedData(
        requiere_manual=True,
        error_mensaje="Demasiadas redirecciones al consultar el enlace."
    )
