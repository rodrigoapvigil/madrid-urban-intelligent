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
    estado_inmueble: Optional[str] = Field(default=None, description="Opcional: A reformar, Buen estado o Reformado")
    ascensor: Optional[bool] = Field(default=None, description="Opcional: dispone de ascensor")

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
    operacion: str = "Venta"
    estado_inmueble: Optional[str] = None
    ascensor: Optional[bool] = None
    serie_historica: List[Dict[str, Any]] = []


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

    # 2. Buscar en Dim_Distrito (si coincide con un distrito, evaluar a nivel de distrito, no un barrio al azar)
    cur.execute("SELECT id_distrito, nombre FROM Dim_Distrito")
    distritos = cur.fetchall()
    for d in distritos:
        d_norm = normalizar_texto(d["nombre"])
        if d_norm == termino_norm or termino_norm in d_norm or d_norm in termino_norm:
            return (0, d["id_distrito"], d["nombre"], d["nombre"])

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
    db_path: str = DEFAULT_DB_PATH,
    estado_inmueble: Optional[str] = None,
    ascensor: Optional[bool] = None,
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

        # Obtener ultimo periodo disponible en Fact_Operacion para esta operacion
        cur.execute("""
            SELECT MAX(id_tiempo) as max_tiempo FROM Fact_Operacion
            WHERE LOWER(tipo_operacion) = LOWER(?)
        """, (operacion,))
        row_tiempo = cur.fetchone()
        max_tiempo = row_tiempo["max_tiempo"] if row_tiempo and row_tiempo["max_tiempo"] else 202606
        fecha_str = f"{str(max_tiempo)[:4]}-{str(max_tiempo)[4:]}"

        is_alquiler = operacion.strip().lower() == "alquiler"
        default_madrid_fallback = 21.0 if is_alquiler else 3800.0

        # 1. Media de todo Madrid (primero para servir de ancla por operacion)
        cur.execute("""
            SELECT AVG(precio_m2) as avg_madrid
            FROM Fact_Operacion
            WHERE LOWER(tipo_operacion) = LOWER(?) AND id_tiempo = ? AND precio_m2 > 0
        """, (operacion, max_tiempo))
        row_mad = cur.fetchone()
        if row_mad and row_mad["avg_madrid"]:
            precio_m2_madrid = float(row_mad["avg_madrid"])
        else:
            cur.execute("""
                SELECT AVG(precio_m2) as avg_madrid
                FROM Fact_Operacion
                WHERE LOWER(tipo_operacion) = LOWER(?) AND precio_m2 > 0
            """, (operacion,))
            row_mad_hist = cur.fetchone()
            precio_m2_madrid = float(row_mad_hist["avg_madrid"]) if row_mad_hist and row_mad_hist["avg_madrid"] else default_madrid_fallback

        # 2. Media del distrito para esta operacion
        cur.execute("""
            SELECT AVG(precio_m2) as avg_distrito, AVG(variacion_trimestral) as avg_trim_dist
            FROM Fact_Operacion
            WHERE id_distrito = ? AND LOWER(tipo_operacion) = LOWER(?) AND id_tiempo = ? AND precio_m2 > 0
        """, (id_distrito, operacion, max_tiempo))
        row_dist = cur.fetchone()
        if row_dist and row_dist["avg_distrito"]:
            precio_m2_distrito = float(row_dist["avg_distrito"])
            tendencia_distrito = float(row_dist["avg_trim_dist"] or 0.0)
        else:
            cur.execute("""
                SELECT AVG(precio_m2) as avg_distrito, AVG(variacion_trimestral) as avg_trim_dist
                FROM Fact_Operacion
                WHERE id_distrito = ? AND LOWER(tipo_operacion) = LOWER(?) AND precio_m2 > 0
            """, (id_distrito, operacion))
            row_dist_hist = cur.fetchone()
            if row_dist_hist and row_dist_hist["avg_distrito"]:
                precio_m2_distrito = float(row_dist_hist["avg_distrito"])
                tendencia_distrito = float(row_dist_hist["avg_trim_dist"] or 0.0)
            else:
                precio_m2_distrito = precio_m2_madrid
                tendencia_distrito = 0.0

        # 3. Media del barrio para esta operacion (si id_barrio == 0 es consulta de distrito)
        if id_barrio > 0:
            cur.execute("""
                SELECT precio_m2, variacion_mensual, variacion_trimestral, variacion_anual
                FROM Fact_Operacion
                WHERE id_barrio = ? AND LOWER(tipo_operacion) = LOWER(?) AND id_tiempo = ? AND precio_m2 > 0
            """, (id_barrio, operacion, max_tiempo))
            row_barrio = cur.fetchone()

            if row_barrio and row_barrio["precio_m2"]:
                precio_m2_barrio = float(row_barrio["precio_m2"])
                tendencia_trimestral = float(row_barrio["variacion_trimestral"] or tendencia_distrito)
            else:
                cur.execute("""
                    SELECT AVG(precio_m2) as avg_p, AVG(variacion_trimestral) as avg_trim
                    FROM Fact_Operacion
                    WHERE id_barrio = ? AND LOWER(tipo_operacion) = LOWER(?) AND precio_m2 > 0
                """, (id_barrio, operacion))
                row_fallback = cur.fetchone()
                if row_fallback and row_fallback["avg_p"]:
                    precio_m2_barrio = float(row_fallback["avg_p"])
                    tendencia_trimestral = float(row_fallback["avg_trim"] or tendencia_distrito)
                else:
                    precio_m2_barrio = precio_m2_distrito
                    tendencia_trimestral = tendencia_distrito
        else:
            precio_m2_barrio = precio_m2_distrito
            tendencia_trimestral = tendencia_distrito

        # Serie historica reciente (ultimos 6 meses) del barrio o distrito para grafica del PDF
        hist_rows = []
        if id_barrio > 0:
            cur.execute("""
                SELECT id_tiempo, precio_m2
                FROM Fact_Operacion
                WHERE id_barrio = ? AND LOWER(tipo_operacion) = LOWER(?) AND precio_m2 > 0
                ORDER BY id_tiempo DESC
                LIMIT 6
            """, (id_barrio, operacion))
            hist_rows = cur.fetchall()
        if not hist_rows:
            cur.execute("""
                SELECT id_tiempo, AVG(precio_m2) as precio_m2
                FROM Fact_Operacion
                WHERE id_distrito = ? AND LOWER(tipo_operacion) = LOWER(?) AND precio_m2 > 0
                GROUP BY id_tiempo
                ORDER BY id_tiempo DESC
                LIMIT 6
            """, (id_distrito, operacion))
            hist_rows = cur.fetchall()
        serie_historica = [
            {"periodo": f"{str(r['id_tiempo'])[:4]}-{str(r['id_tiempo'])[4:]}", "precio_m2": round(float(r["precio_m2"]), 2)}
            for r in reversed(hist_rows)
        ]

        # Ajuste cualitativo por Estado y Ascensor (~1% cada uno si se especifican)
        estado_factor = 0.0
        ascensor_factor = 0.0
        ajustes_desc = []
        if estado_inmueble:
            est_norm = estado_inmueble.strip().lower()
            if "reformar" in est_norm:
                estado_factor = -0.01
                ajustes_desc.append("Estado 'A reformar' (-1%)")
            elif "reformado" in est_norm:
                estado_factor = 0.01
                ajustes_desc.append("Estado 'Reformado' (+1%)")
            else:
                ajustes_desc.append("Estado 'Buen estado' (0%)")
        if ascensor is not None:
            if ascensor:
                ascensor_factor = 0.01
                ajustes_desc.append("Con ascensor (+1%)")
            else:
                ascensor_factor = -0.01
                ajustes_desc.append("Sin ascensor (-1%)")

        precio_m2_barrio_base = precio_m2_barrio
        precio_m2_barrio = round(precio_m2_barrio_base * (1.0 + estado_factor + ascensor_factor), 2)

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

        # Generacion de argumentos comparativos e informativos
        fmt_precio = f"{precio_m2_inmueble:,.2f}" if is_alquiler else f"{precio_m2_inmueble:,.0f}"
        fmt_barrio = f"{precio_m2_barrio:,.2f}" if is_alquiler else f"{precio_m2_barrio:,.0f}"
        fmt_barrio_base = f"{precio_m2_barrio_base:,.2f}" if is_alquiler else f"{precio_m2_barrio_base:,.0f}"
        fmt_madrid = f"{precio_m2_madrid:,.2f}" if is_alquiler else f"{precio_m2_madrid:,.0f}"
        unidad_total = "€/mes" if is_alquiler else "€"

        ref_context = (
            f"{fmt_barrio} €/m² ajustado sobre media base de {fmt_barrio_base} €/m² [{', '.join(ajustes_desc)}]"
            if ajustes_desc else f"{fmt_barrio} €/m²"
        )

        argumentos = []
        if estado == "CARO":
            argumentos.append(
                f"El precio indicado ({fmt_precio} €/m²) está un {abs(desviacion_pct_barrio):.1f}% por encima de la referencia de {barrio_nombre} ({ref_context})."
            )
            argumentos.append(
                f"Para una superficie de {metros:,.0f} m², la referencia estimada para este perfil es {precio_justo_estimado:,.0f} {unidad_total} (margen teórico de ajuste: -{margen_eur:,.0f} {unidad_total})."
            )
            argumentos.append(
                f"Frente a la referencia de Madrid capital ({fmt_madrid} €/m²), la diferencia es del {desviacion_pct_madrid:+.1f}%."
            )
            argumentos.append(
                f"La serie observada en la zona registra una variación trimestral del {tendencia_trimestral:+.2f}%."
            )
        elif estado == "BARATO":
            argumentos.append(
                f"El precio indicado ({fmt_precio} €/m²) está un {abs(desviacion_pct_barrio):.1f}% por debajo de la referencia de {barrio_nombre} ({ref_context})."
            )
            argumentos.append(
                f"Para una superficie de {metros:,.0f} m², la referencia estimada para este perfil es {precio_justo_estimado:,.0f} {unidad_total}."
            )
            argumentos.append(
                f"Frente a la referencia de Madrid capital ({fmt_madrid} €/m²), la diferencia es del {desviacion_pct_madrid:+.1f}%."
            )
            argumentos.append(
                f"La serie observada en la zona registra una variación trimestral del {tendencia_trimestral:+.2f}%."
            )
        else:
            argumentos.append(
                f"El precio indicado ({fmt_precio} €/m²) está dentro del rango de referencia estimado para {barrio_nombre} ({ref_context}; diferencia del {desviacion_pct_barrio:+.1f}%)."
            )
            argumentos.append(
                f"Para una superficie de {metros:,.0f} m², la referencia estimada para este perfil es {precio_justo_estimado:,.0f} {unidad_total}."
            )
            argumentos.append(
                f"Frente a la referencia de Madrid capital ({fmt_madrid} €/m²), la diferencia es del {desviacion_pct_madrid:+.1f}%."
            )
            argumentos.append(
                f"La serie observada en la zona registra una variación trimestral del {tendencia_trimestral:+.2f}%."
            )

        # Factores cualitativos opcionales (Estado + Ascensor) para concretar el veredicto
        if estado_inmueble:
            est_norm = estado_inmueble.strip().lower()
            if "reformar" in est_norm:
                argumentos.append(
                    "Estado 'A reformar': el coste de reforma integral debe descontarse del precio objetivo frente a la media zonal de inmuebles listos para entrar."
                )
            elif "reformado" in est_norm:
                argumentos.append(
                    "Estado 'Reformado': una vivienda recién actualizada suele justificar una prima moderada sobre la media histórica de la zona."
                )
            else:
                argumentos.append(
                    "Estado 'Buen estado': el inmueble se alinea directamente con el estándar medio de las operaciones observadas en el barrio."
                )

        if ascensor is not None:
            if ascensor:
                argumentos.append(
                    "Con ascensor: la accesibilidad respalda la liquidez y mantiene el valor frente al parque medio del distrito."
                )
            else:
                argumentos.append(
                    "Sin ascensor: la ausencia de ascensor penaliza la demanda potencial y refuerza el margen de negociación a la baja."
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
            fecha_cierre_referencia=fecha_str,
            operacion="Alquiler" if is_alquiler else "Venta",
            estado_inmueble=estado_inmueble,
            ascensor=ascensor,
            serie_historica=serie_historica,
        )
    finally:
        conn.close()
