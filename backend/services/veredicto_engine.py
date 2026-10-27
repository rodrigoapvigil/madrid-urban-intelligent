"""
backend/services/veredicto_engine.py
Motor analítico de evaluación de precios para 'El Veredicto'.
Compara el ratio precio/m2 de un inmueble frente al histórico real oficial
del Ayuntamiento de Madrid (Fact_Operacion) y proyecciones (Fact_Prediccion).
"""
import os
import sqlite3
import unicodedata
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field, field_validator

# Resolucion de ruta a la base de datos analitica SQLite
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SERVICES_DIR)
_ROOT_DIR = os.path.normpath(os.path.join(_BACKEND_DIR, ".."))
DEFAULT_DB_PATH = os.path.normpath(os.path.join(_ROOT_DIR, "data", "madrid_intelligence.db"))


class VeredictoRequest(BaseModel):
    url: Optional[str] = Field(default=None, description="Enlace opcional de Idealista o Fotocasa")
    precio: Optional[float] = Field(default=None, description="Precio en euros del inmueble")
    metros: Optional[float] = Field(default=None, description="Superficie construida en m2")
    barrio: Optional[str] = Field(default=None, description="Nombre de barrio o distrito")
    distrito: Optional[str] = Field(default=None, description="Nombre opcional del distrito")
    operacion: str = Field(default="Venta", description="Tipo de operacion: Venta o Alquiler")

    @field_validator("precio")
    @classmethod
    def validate_precio(cls, v):
        if v is not None and v <= 0:
            raise ValueError("El precio debe ser mayor que cero")
        return v

    @field_validator("metros")
    @classmethod
    def validate_metros(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Los metros cuadrados deben ser mayores que cero")
        return v

    @field_validator("operacion")
    @classmethod
    def validate_operacion(cls, v):
        if v not in ["Venta", "Alquiler"]:
            raise ValueError("La operacion debe ser 'Venta' o 'Alquiler'")
        return v


class VeredictoResponse(BaseModel):
    estado: str = Field(description="CARO, EN_LINEA o BARATO")
    precio_m2_inmueble: float
    precio_m2_barrio_medio: float
    precio_m2_distrito_medio: float
    precio_m2_madrid_medio: float
    desviacion_pct_barrio: float
    desviacion_pct_madrid: float
    margen_negociacion_estimado_eur: float
    tendencia_trimestral_pct: float
    precio_justo_estimado_eur: float
    barrio_nombre: str
    distrito_nombre: str
    resumen_argumentos: List[str]
    fecha_cierre_referencia: str


def normalizar_texto(texto: str) -> str:
    """Elimina tildes, signos de puntuacion y pasa a minusculas."""
    if not texto:
        return ""
    texto_norm = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto_norm if not unicodedata.combining(c)).lower().strip()


def obtener_conexion_db(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Base de datos analitica no encontrada en: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def buscar_zona_en_db(conn: sqlite3.Connection, termino: str) -> Optional[Tuple[int, int, str, str]]:
    """
    Busca por nombre de barrio o distrito.
    Retorna tupla: (id_barrio, id_distrito, nombre_barrio, nombre_distrito)
    Si el termino coincide con un distrito, toma el barrio central o representativo.
    """
    termino_norm = normalizar_texto(termino)
    cur = conn.cursor()

    # 1. Buscar en Dim_Barrio con join a Dim_Distrito
    cur.execute("""
        SELECT b.id_barrio, b.id_distrito, b.nombre AS barrio_nombre, d.nombre AS distrito_nombre
        FROM Dim_Barrio b
        JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
    """)
    barrios = cur.fetchall()

    # Coincidencia exacta normalizada
    for b in barrios:
        if normalizar_texto(b["barrio_nombre"]) == termino_norm:
            return (b["id_barrio"], b["id_distrito"], b["barrio_nombre"], b["distrito_nombre"])

    # Coincidencia parcial o contenida
    for b in barrios:
        b_norm = normalizar_texto(b["barrio_nombre"])
        if termino_norm in b_norm or b_norm in termino_norm:
            return (b["id_barrio"], b["id_distrito"], b["barrio_nombre"], b["distrito_nombre"])

    # 2. Buscar en Dim_Distrito
    cur.execute("SELECT id_distrito, nombre FROM Dim_Distrito")
    distritos = cur.fetchall()
    for d in distritos:
        d_norm = normalizar_texto(d["nombre"])
        if d_norm == termino_norm or termino_norm in d_norm or d_norm in termino_norm:
            # Tomar el primer barrio del distrito
            cur.execute("""
                SELECT id_barrio, nombre FROM Dim_Barrio WHERE id_distrito = ? LIMIT 1
            """, (d["id_distrito"],))
            primer_barrio = cur.fetchone()
            barrio_nom = primer_barrio["nombre"] if primer_barrio else d["nombre"]
            barrio_id = primer_barrio["id_barrio"] if primer_barrio else 0
            return (barrio_id, d["id_distrito"], barrio_nom, d["nombre"])

    # Fallback por defecto si no hay coincidencia
    if barrios:
        b = barrios[0]
        return (b["id_barrio"], b["id_distrito"], b["barrio_nombre"], b["distrito_nombre"])
    return None


def evaluar_inmueble(
    precio: float,
    metros: float,
    zona_str: str,
    operacion: str = "Venta",
    db_path: str = DEFAULT_DB_PATH
) -> VeredictoResponse:
    """
    Ejecuta el calculo analitico de veredicto sobre un inmueble dado.
    """
    if precio <= 0 or metros <= 0:
        raise ValueError("Precio y metros deben ser mayores que cero")

    precio_m2_inmueble = round(precio / metros, 2)
    conn = obtener_conexion_db(db_path)

    try:
        zona_info = buscar_zona_en_db(conn, zona_str)
        if not zona_info:
            raise ValueError(f"No fue posible localizar la zona: {zona_str}")

        id_barrio, id_distrito, barrio_nombre, distrito_nombre = zona_info
        cur = conn.cursor()

        # Obtener ultimo periodo disponible en Fact_Operacion
        cur.execute("""
            SELECT MAX(id_tiempo) as max_tiempo FROM Fact_Operacion
            WHERE tipo_operacion = ?
        """, (operacion,))
        row_tiempo = cur.fetchone()
        max_tiempo = row_tiempo["max_tiempo"] if row_tiempo and row_tiempo["max_tiempo"] else 202606
        fecha_str = f"{str(max_tiempo)[:4]}-{str(max_tiempo)[4:]}"

        # 1. Media del barrio
        cur.execute("""
            SELECT precio_m2, variacion_mensual, variacion_trimestral, variacion_anual
            FROM Fact_Operacion
            WHERE id_barrio = ? AND tipo_operacion = ? AND id_tiempo = ?
        """, (id_barrio, operacion, max_tiempo))
        row_barrio = cur.fetchone()

        if row_barrio and row_barrio["precio_m2"]:
            precio_m2_barrio = float(row_barrio["precio_m2"])
            tendencia_trimestral = float(row_barrio["variacion_trimestral"] or 0.0)
        else:
            # Fallback a media del historico reciente
            cur.execute("""
                SELECT AVG(precio_m2) as avg_p, AVG(variacion_trimestral) as avg_trim
                FROM Fact_Operacion
                WHERE id_barrio = ? AND tipo_operacion = ?
            """, (id_barrio, operacion))
            row_fallback = cur.fetchone()
            precio_m2_barrio = float(row_fallback["avg_p"] or 3500.0)
            tendencia_trimestral = float(row_fallback["avg_trim"] or 1.2)

        # 2. Media del distrito
        cur.execute("""
            SELECT AVG(precio_m2) as avg_distrito
            FROM Fact_Operacion
            WHERE id_distrito = ? AND tipo_operacion = ? AND id_tiempo = ?
        """, (id_distrito, operacion, max_tiempo))
        row_dist = cur.fetchone()
        precio_m2_distrito = float(row_dist["avg_distrito"]) if row_dist and row_dist["avg_distrito"] else precio_m2_barrio

        # 3. Media de todo Madrid
        cur.execute("""
            SELECT AVG(precio_m2) as avg_madrid
            FROM Fact_Operacion
            WHERE tipo_operacion = ? AND id_tiempo = ?
        """, (operacion, max_tiempo))
        row_mad = cur.fetchone()
        precio_m2_madrid = float(row_mad["avg_madrid"]) if row_mad and row_mad["avg_madrid"] else 3800.0

        # Calculo de desviaciones
        desviacion_pct_barrio = round(((precio_m2_inmueble - precio_m2_barrio) / precio_m2_barrio) * 100, 2)
        desviacion_pct_madrid = round(((precio_m2_inmueble - precio_m2_madrid) / precio_m2_madrid) * 100, 2)

        # Criterio de clasificacion de veredicto
        # Umbral: 8% sobreprecio -> CARO, -8% infravalorado -> BARATO, intermedio -> EN_LINEA
        if desviacion_pct_barrio > 8.0:
            estado = "CARO"
        elif desviacion_pct_barrio < -8.0:
            estado = "BARATO"
        else:
            estado = "EN_LINEA"

        # Margen de negociacion y precio estimado de mercado
        precio_justo_estimado = round(precio_m2_barrio * metros, 2)
        if estado == "CARO":
            margen_eur = round(max(0.0, precio - precio_justo_estimado), 2)
        elif estado == "EN_LINEA":
            # Margen tactico de cierre estandar (3-5%)
            margen_eur = round(precio * 0.04, 2)
        else:
            margen_eur = 0.0

        # Generacion de argumentos de negociacion
        argumentos = []
        if estado == "CARO":
            argumentos.append(
                f"El precio del inmueble ({precio_m2_inmueble:,.0f} €/m2) se encuentra un {desviacion_pct_barrio:+.1f}% por encima del valor medio oficial de cierre en {barrio_nombre} ({precio_m2_barrio:,.0f} €/m2)."
            )
            argumentos.append(
                f"Existe un margen estimado de negociacion a la baja de aproximadamente {margen_eur:,.0f} € para ajustarse al mercado real del barrio."
            )
            argumentos.append(
                f"En comparacion con la media de la capital ({precio_m2_madrid:,.0f} €/m2), este inmueble presenta una diferencia del {desviacion_pct_madrid:+.1f}%."
            )
            argumentos.append(
                f"La evolucion de precios en la zona muestra una variacion trimestral del {tendencia_trimestral:+.2f}%, lo que desaconseja convalidar primas excesivas de salida."
            )
        elif estado == "BARATO":
            argumentos.append(
                f"Oportunidad de adquisicion: el inmueble se comercializa a {precio_m2_inmueble:,.0f} €/m2, un {abs(desviacion_pct_barrio):.1f}% por debajo de la media registrada en {barrio_nombre} ({precio_m2_barrio:,.0f} €/m2)."
            )
            argumentos.append(
                f"El valor estimado segun series oficiales se situaria en {precio_justo_estimado:,.0f} €, lo que representa un colchon de seguridad favorable para la compra."
            )
            argumentos.append(
                "Se aconseja revisar el estado de conservacion, cargas registrales o necesidad de reforma para verificar el motivo del descuento."
            )
        else:
            argumentos.append(
                f"El precio se encuentra plenamente alineado con el mercado del barrio ({precio_m2_inmueble:,.0f} €/m2 frente a {precio_m2_barrio:,.0f} €/m2 de media, desviacion del {desviacion_pct_barrio:+.1f}%)."
            )
            argumentos.append(
                f"Margen tactico de contraoferta sugerido: entre el 3% y el 5% ({margen_eur:,.0f} €) sobre el precio de lista."
            )
            argumentos.append(
                f"Frente a la media de Madrid ({precio_m2_madrid:,.0f} €/m2), la zona de {distrito_nombre} cotiza con una prima/descuento del {desviacion_pct_madrid:+.1f}%."
            )

        return VeredictoResponse(
            estado=estado,
            precio_m2_inmueble=precio_m2_inmueble,
            precio_m2_barrio_medio=round(precio_m2_barrio, 2),
            precio_m2_distrito_medio=round(precio_m2_distrito, 2),
            precio_m2_madrid_medio=round(precio_m2_madrid, 2),
            desviacion_pct_barrio=desviacion_pct_barrio,
            desviacion_pct_madrid=desviacion_pct_madrid,
            margen_negociacion_estimado_eur=margen_eur,
            tendencia_trimestral_pct=round(tendencia_trimestral, 2),
            precio_justo_estimado_eur=precio_justo_estimado,
            barrio_nombre=barrio_nombre,
            distrito_nombre=distrito_nombre,
            resumen_argumentos=argumentos,
            fecha_cierre_referencia=fecha_str
        )
    finally:
        conn.close()
