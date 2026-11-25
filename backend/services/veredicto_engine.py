"""
backend/services/veredicto_engine.py
Motor analítico de evaluación de precios para 'El Veredicto'.
Compara el ratio precio/m2 de un inmueble frente al histórico real oficial
del Ayuntamiento de Madrid (Fact_Operacion) y proyecciones (Fact_Prediccion).
"""
import csv
import os
import sqlite3
import statistics
import unicodedata
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field, field_validator

# Resolucion de ruta a la base de datos analitica SQLite
_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SERVICES_DIR)
_ROOT_DIR = os.path.normpath(os.path.join(_BACKEND_DIR, ".."))
DEFAULT_DB_PATH = os.path.normpath(os.path.join(_ROOT_DIR, "data", "madrid_intelligence.db"))
TRANSACTIONS_CSV_PATH = os.path.normpath(os.path.join(_ROOT_DIR, "data", "operational", "transactions_clean.csv"))


class VeredictoRequest(BaseModel):
    url: Optional[str] = Field(default=None, description="Enlace opcional de Idealista o Fotocasa")
    precio: Optional[float] = Field(default=None, description="Precio en euros del inmueble")
    metros: Optional[float] = Field(default=None, description="Superficie construida en m2")
    superficie: Optional[float] = Field(default=None, description="Alias de metros en m2")
    id_barrio: Optional[int] = Field(default=None, description="ID opcional del barrio")
    barrio: Optional[str] = Field(default=None, description="Nombre de barrio o distrito")
    distrito: Optional[str] = Field(default=None, description="Nombre opcional del distrito")
    operacion: str = Field(default="Venta", description="Tipo de operacion: venta/alquiler/comprar/vender")
    tipo_operacion: Optional[str] = Field(default=None, description="Alias de operacion")
    estado_inmueble: Optional[str] = Field(default=None, description="Opcional: a_reformar, buen_estado o reformado")
    estado: Optional[str] = Field(default=None, description="Alias de estado_inmueble")
    ascensor: Optional[Any] = Field(default=None, description="Opcional: si/no/bool")

    @field_validator("precio")
    @classmethod
    def validate_precio(cls, v):
        if v is not None and v <= 0:
            raise ValueError("El precio debe ser mayor que cero")
        return v

    @field_validator("metros", "superficie")
    @classmethod
    def validate_metros(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Los metros cuadrados deben ser mayores que cero")
        return v

    @field_validator("operacion")
    @classmethod
    def validate_operacion(cls, v):
        if v.strip().lower() not in ["venta", "alquiler", "comprar", "vender"]:
            raise ValueError("La operacion debe ser 'Venta' o 'Alquiler'")
        return v


class VeredictoResponse(BaseModel):
    # Campos del nuevo modelo de calculo (Paso 1)
    veredicto: str
    ref_base: float
    ajustes: Dict[str, Any]
    ref_ajustada: float
    rango_bajo: float
    rango_alto: float
    rango_total_bajo: float
    rango_total_alto: float
    confianza: str
    confianza_indirecta: bool
    num_transacciones: Optional[int] = None
    anio_transacciones: Optional[int] = None
    periodo_dato: str
    superficie_media: float
    media_madrid: float
    cv: float = 0.0
    margen_aplicado: float = 0.0

    # Campos de compatibilidad con versiones/tests anteriores
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


def _ensure_fact_transacciones(conn: sqlite3.Connection) -> None:
    """Asegura que Fact_Transacciones exista y este poblada desde transactions_clean.csv."""
    cur = conn.cursor()
    cur.execute("""
        SELECT name FROM sqlite_master WHERE type='table' AND name='Fact_Transacciones'
    """)
    exists = cur.fetchone() is not None
    if exists:
        cur.execute("SELECT COUNT(*) FROM Fact_Transacciones")
        if cur.fetchone()[0] > 0:
            return
    if not os.path.exists(TRANSACTIONS_CSV_PATH):
        return
    cur.execute("""
        CREATE TABLE IF NOT EXISTS Fact_Transacciones (
            id_distrito INTEGER,
            id_barrio INTEGER,
            anio INTEGER,
            num_transacciones REAL
        )
    """)
    with open(TRANSACTIONS_CSV_PATH, encoding="utf-8") as f:
        rows = [
            (int(r["id_distrito"]), int(r["id_barrio"]), int(r["anio"]), float(r["num_transacciones"]))
            for r in csv.DictReader(f)
        ]
    if rows:
        cur.executemany("INSERT INTO Fact_Transacciones VALUES (?, ?, ?, ?)", rows)
        conn.commit()


def _normalize_tipo_operacion(op: str) -> str:
    op_norm = (op or "venta").strip().lower()
    if op_norm == "alquiler":
        return "alquiler"
    return "venta"


def _normalize_estado_key(estado: Optional[str]) -> Optional[str]:
    if not estado:
        return None
    s = normalizar_texto(estado).replace(" ", "_")
    if "reformar" in s:
        return "a_reformar"
    if "reformado" in s:
        return "reformado"
    if "buen" in s:
        return "buen_estado"
    return None


def _normalize_ascensor_bool(ascensor: Any) -> Optional[bool]:
    if ascensor is None:
        return None
    if isinstance(ascensor, bool):
        return ascensor
    s = normalizar_texto(str(ascensor))
    if s in ("si", "yes", "true", "1"):
        return True
    if s in ("no", "false", "0"):
        return False
    return None


def _calcular_confianza_barrio(
    conn: sqlite3.Connection,
    id_barrio: int,
    id_distrito: int,
    is_alquiler: bool
) -> Tuple[str, bool, Optional[int], Optional[int]]:
    """
    Calcula nivel de confianza (alta|media|baja) usando terciles P33/P66 de Fact_Transacciones
    en el ultimo anio disponible.
    """
    _ensure_fact_transacciones(conn)
    cur = conn.cursor()
    cur.execute("""
        SELECT name FROM sqlite_master WHERE type='table' AND name='Fact_Transacciones'
    """)
    if cur.fetchone() is None:
        return ("baja", is_alquiler, None, None)

    cur.execute("SELECT MAX(anio) AS max_anio FROM Fact_Transacciones")
    row_anio = cur.fetchone()
    if not row_anio or row_anio["max_anio"] is None:
        return ("baja", is_alquiler, None, None)
    anio_tx = int(row_anio["max_anio"])

    # Terciles P33 y P66 de num_transacciones por barrio en ese anio
    cur.execute("""
        SELECT num_transacciones FROM Fact_Transacciones
        WHERE anio = ? AND num_transacciones IS NOT NULL
        ORDER BY num_transacciones ASC
    """, (anio_tx,))
    vals = sorted(float(r["num_transacciones"]) for r in cur.fetchall())
    if not vals:
        return ("baja", is_alquiler, None, anio_tx)

    p33 = vals[int(len(vals) * 0.33)]
    p66 = vals[min(len(vals) - 1, int(len(vals) * 0.66))]

    num_tx: Optional[float] = None
    if id_barrio > 0:
        cur.execute("""
            SELECT t.num_transacciones
            FROM Dim_Barrio b
            JOIN Fact_Transacciones t
              ON t.id_distrito = b.id_distrito
             AND t.id_barrio = (CAST(b.codigo AS INTEGER) % 100)
            WHERE b.id_barrio = ? AND t.anio = ?
            LIMIT 1
        """, (id_barrio, anio_tx))
        r = cur.fetchone()
        if r and r["num_transacciones"] is not None:
            num_tx = float(r["num_transacciones"])
    else:
        # Consulta de distrito: promedio por barrio o suma del distrito frente a terciles de distrito
        cur.execute("""
            SELECT AVG(num_transacciones) AS avg_tx, SUM(num_transacciones) AS sum_tx
            FROM Fact_Transacciones
            WHERE id_distrito = ? AND anio = ?
        """, (id_distrito, anio_tx))
        r = cur.fetchone()
        if r and r["avg_tx"] is not None:
            # Clasificar segun densidad media por barrio y reportar suma total del distrito
            avg_tx = float(r["avg_tx"])
            conf = "alta" if avg_tx >= p66 else ("media" if avg_tx >= p33 else "baja")
            return (conf, is_alquiler, int(round(float(r["sum_tx"]))), anio_tx)

    if num_tx is None:
        return ("baja", is_alquiler, None, anio_tx)

    conf = "alta" if num_tx >= p66 else ("media" if num_tx >= p33 else "baja")
    return (conf, is_alquiler, int(round(num_tx)), anio_tx)


def evaluar_inmueble(
    precio: float,
    metros: float,
    zona_str: str = "",
    operacion: str = "Venta",
    db_path: str = DEFAULT_DB_PATH,
    estado_inmueble: Optional[str] = None,
    ascensor: Optional[Any] = None,
    id_barrio: Optional[int] = None,
) -> VeredictoResponse:
    """
    Ejecuta el calculo analitico de veredicto sobre un inmueble dado (Paso 1).
    """
    if precio <= 0 or metros <= 0:
        raise ValueError("Precio y metros deben ser mayores que cero")

    tipo_op = _normalize_tipo_operacion(operacion)
    is_alquiler = tipo_op == "alquiler"
    precio_m2_usuario = round(precio / metros, 2)
    conn = obtener_conexion_db(db_path)

    try:
        if id_barrio is not None and id_barrio > 0:
            cur_z = conn.cursor()
            cur_z.execute("""
                SELECT b.id_barrio, b.id_distrito, b.nombre AS barrio_nombre, d.nombre AS distrito_nombre
                FROM Dim_Barrio b
                JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
                WHERE b.id_barrio = ?
            """, (id_barrio,))
            rz = cur_z.fetchone()
            if not rz:
                raise ValueError(f"No fue posible localizar el barrio id={id_barrio}")
            zona_info = (rz["id_barrio"], rz["id_distrito"], rz["barrio_nombre"], rz["distrito_nombre"])
        else:
            zona_info = buscar_zona_en_db(conn, zona_str)
            if not zona_info:
                raise ValueError(f"No fue posible localizar la zona: {zona_str}")

        id_barrio_res, id_distrito, barrio_nombre, distrito_nombre = zona_info
        cur = conn.cursor()

        # Media de Madrid en el ultimo periodo real disponible en Fact_Operacion
        cur.execute("""
            SELECT MAX(f.id_tiempo) AS max_t
            FROM Fact_Operacion f
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            WHERE f.tipo_operacion = ? AND f.precio_m2 > 0
        """, (tipo_op,))
        row_max = cur.fetchone()
        max_tiempo_global = row_max["max_t"] if row_max and row_max["max_t"] else 202606

        default_madrid_fallback = 21.0 if is_alquiler else 3800.0
        cur.execute("""
            SELECT AVG(precio_m2) AS avg_madrid
            FROM Fact_Operacion
            WHERE tipo_operacion = ? AND id_tiempo = ? AND precio_m2 > 0
        """, (tipo_op, max_tiempo_global))
        row_mad = cur.fetchone()
        media_madrid = float(row_mad["avg_madrid"]) if row_mad and row_mad["avg_madrid"] else default_madrid_fallback

        # Media del distrito en el ultimo periodo con dato para ese distrito
        cur.execute("""
            SELECT f.id_tiempo, t.anio, t.mes, AVG(f.precio_m2) AS avg_distrito,
                   AVG(f.superficie_media) AS avg_sup, AVG(f.variacion_trimestral) AS avg_trim
            FROM Fact_Operacion f
            JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
            WHERE f.id_distrito = ? AND f.tipo_operacion = ? AND f.precio_m2 > 0
            GROUP BY f.id_tiempo, t.anio, t.mes
            ORDER BY t.anio DESC, t.mes DESC
            LIMIT 1
        """, (id_distrito, tipo_op))
        row_dist = cur.fetchone()
        if row_dist and row_dist["avg_distrito"]:
            precio_m2_distrito = float(row_dist["avg_distrito"])
            sup_distrito = float(row_dist["avg_sup"] or 80.0)
            tendencia_distrito = float(row_dist["avg_trim"] or 0.0)
            periodo_distrito = f"{int(row_dist['anio']):04d}-{int(row_dist['mes']):02d}"
        else:
            precio_m2_distrito = media_madrid
            sup_distrito = 80.0
            tendencia_distrito = 0.0
            periodo_distrito = f"{str(max_tiempo_global)[:4]}-{str(max_tiempo_global)[4:]}"

        # 1. Referencia base: ultimo periodo con dato en Fact_Operacion (ordenado por Dim_Tiempo anio, mes)
        serie_12m: List[float] = []
        serie_historica: List[Dict[str, Any]] = []
        superficie_media = sup_distrito
        periodo_dato = periodo_distrito
        tendencia_trimestral = tendencia_distrito

        if id_barrio_res > 0:
            cur.execute("""
                SELECT f.precio_m2, f.superficie_media, f.variacion_trimestral, t.anio, t.mes, f.id_tiempo
                FROM Fact_Operacion f
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE f.id_barrio = ? AND f.tipo_operacion = ? AND f.precio_m2 > 0
                ORDER BY t.anio DESC, t.mes DESC
                LIMIT 12
            """, (id_barrio_res, tipo_op))
            rows_12 = cur.fetchall()

            if rows_12:
                latest = rows_12[0]
                ref_base = float(latest["precio_m2"])
                periodo_dato = f"{int(latest['anio']):04d}-{int(latest['mes']):02d}"
                tendencia_trimestral = float(latest["variacion_trimestral"] or tendencia_distrito)
                if latest["superficie_media"] and float(latest["superficie_media"]) > 0:
                    superficie_media = float(latest["superficie_media"])
                else:
                    cur.execute("SELECT superficie_media_vivienda FROM Dim_Barrio WHERE id_barrio = ?", (id_barrio_res,))
                    rb = cur.fetchone()
                    if rb and rb["superficie_media_vivienda"] and float(rb["superficie_media_vivienda"]) > 0:
                        superficie_media = float(rb["superficie_media_vivienda"])
                serie_12m = [float(r["precio_m2"]) for r in rows_12]
                serie_historica = [
                    {"periodo": f"{int(r['anio']):04d}-{int(r['mes']):02d}", "precio_m2": round(float(r["precio_m2"]), 2)}
                    for r in reversed(rows_12[:6])
                ]
            else:
                # Fallback si el barrio no tiene filas para esa operacion (ej. Hellin en alquiler)
                ref_base = precio_m2_distrito
                cur.execute("""
                    SELECT f.id_tiempo, t.anio, t.mes, AVG(f.precio_m2) AS precio_m2
                    FROM Fact_Operacion f
                    JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                    WHERE f.id_distrito = ? AND f.tipo_operacion = ? AND f.precio_m2 > 0
                    GROUP BY f.id_tiempo, t.anio, t.mes
                    ORDER BY t.anio DESC, t.mes DESC
                    LIMIT 12
                """, (id_distrito, tipo_op))
                dist_12 = cur.fetchall()
                serie_12m = [float(r["precio_m2"]) for r in dist_12]
                serie_historica = [
                    {"periodo": f"{int(r['anio']):04d}-{int(r['mes']):02d}", "precio_m2": round(float(r["precio_m2"]), 2)}
                    for r in reversed(dist_12[:6])
                ]
        else:
            ref_base = precio_m2_distrito
            cur.execute("""
                SELECT f.id_tiempo, t.anio, t.mes, AVG(f.precio_m2) AS precio_m2
                FROM Fact_Operacion f
                JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
                WHERE f.id_distrito = ? AND f.tipo_operacion = ? AND f.precio_m2 > 0
                GROUP BY f.id_tiempo, t.anio, t.mes
                ORDER BY t.anio DESC, t.mes DESC
                LIMIT 12
            """, (id_distrito, tipo_op))
            dist_12 = cur.fetchall()
            serie_12m = [float(r["precio_m2"]) for r in dist_12]
            serie_historica = [
                {"periodo": f"{int(r['anio']):04d}-{int(r['mes']):02d}", "precio_m2": round(float(r["precio_m2"]), 2)}
                for r in reversed(dist_12[:6])
            ]

        superficie_media = round(superficie_media if superficie_media > 0 else 80.0, 1)

        # 2. Ajustes sobre la referencia, nunca sobre el precio del usuario
        estado_key = _normalize_estado_key(estado_inmueble)
        if estado_key == "a_reformar":
            aj_estado = -0.10
        elif estado_key == "reformado":
            aj_estado = 0.10
        else:
            aj_estado = 0.0

        asc_bool = _normalize_ascensor_bool(ascensor)
        aj_ascensor = -0.05 if asc_bool is False else 0.0

        raw_tam = -(metros / superficie_media - 1.0) * 0.10
        aj_tamano = max(-0.05, min(0.05, raw_tam))

        ref_ajustada = ref_base * (1.0 + aj_estado) * (1.0 + aj_ascensor) * (1.0 + aj_tamano)

        # 4. Confianza (P33 y P66 de Fact_Transacciones)
        confianza, confianza_indirecta, num_transacciones, anio_transacciones = _calcular_confianza_barrio(
            conn, id_barrio_res, id_distrito, is_alquiler
        )
        margen_confianza = 0.12 if confianza == "alta" else (0.18 if confianza == "media" else 0.25)

        # 3. Rango: margen = max(margen_confianza, 2 * cv)
        if len(serie_12m) >= 2:
            mean_12 = statistics.mean(serie_12m)
            stdev_12 = statistics.stdev(serie_12m)
            cv = (stdev_12 / mean_12) if mean_12 > 0 else 0.0
        else:
            cv = 0.0

        margen = max(margen_confianza, 2.0 * cv)
        rango_bajo = ref_ajustada * (1.0 - margen)
        rango_alto = ref_ajustada * (1.0 + margen)

        rango_total_bajo = round(rango_bajo * metros, 2)
        rango_total_alto = round(rango_alto * metros, 2)

        # 5. Veredicto sobre precio_m2_usuario
        if precio_m2_usuario < rango_bajo:
            veredicto_str = "por debajo de la referencia"
            estado_compat = "BARATO"
        elif precio_m2_usuario <= rango_alto:
            veredicto_str = "en línea con la zona"
            estado_compat = "EN_LINEA"
        elif precio_m2_usuario <= rango_alto * 1.25:
            veredicto_str = "por encima de la referencia"
            estado_compat = "CARO"
        else:
            veredicto_str = "muy por encima"
            estado_compat = "CARO"

        # Calculo de desviaciones y compatibilidad
        ref_ajustada_r = round(ref_ajustada, 2)
        ref_base_r = round(ref_base, 2)
        desviacion_pct_barrio = round(((precio_m2_usuario - ref_ajustada) / ref_ajustada) * 100, 2) if ref_ajustada > 0 else 0.0
        desviacion_pct_madrid = round(((precio_m2_usuario - media_madrid) / media_madrid) * 100, 2) if media_madrid > 0 else 0.0
        precio_justo_estimado = round(ref_ajustada * metros, 2)

        if estado_compat == "CARO":
            margen_eur = round(max(0.0, precio - precio_justo_estimado), 2)
        elif estado_compat == "EN_LINEA":
            margen_eur = round(precio * 0.04, 2)
        else:
            margen_eur = 0.0

        ajustes_dict = {
            "estado": {"valor": estado_key or "no_indicado", "pct": round(aj_estado * 100, 1)},
            "ascensor": {"valor": "si" if asc_bool is True else ("no" if asc_bool is False else "no_indicado"), "pct": round(aj_ascensor * 100, 1)},
            "tamano": {"superficie_media": superficie_media, "pct": round(aj_tamano * 100, 1)},
        }

        unidad_total = "€/mes" if is_alquiler else "€"
        argumentos = [
            f"Referencia base de {barrio_nombre}: {ref_base_r:,.2f} €/m² (periodo {periodo_dato}).",
            f"Referencia ajustada orientativa: {ref_ajustada_r:,.2f} €/m² (rango {round(rango_bajo, 2):,.2f} – {round(rango_alto, 2):,.2f} €/m²).",
            f"Para {metros:,.0f} m², lo razonable estaría entre {rango_total_bajo:,.0f} y {rango_total_alto:,.0f} {unidad_total}.",
        ]

        return VeredictoResponse(
            veredicto=veredicto_str,
            ref_base=ref_base_r,
            ajustes=ajustes_dict,
            ref_ajustada=ref_ajustada_r,
            rango_bajo=round(rango_bajo, 2),
            rango_alto=round(rango_alto, 2),
            rango_total_bajo=rango_total_bajo,
            rango_total_alto=rango_total_alto,
            confianza=confianza,
            confianza_indirecta=confianza_indirecta,
            num_transacciones=num_transacciones,
            anio_transacciones=anio_transacciones,
            periodo_dato=periodo_dato,
            superficie_media=superficie_media,
            media_madrid=round(media_madrid, 2),
            cv=round(cv, 4),
            margen_aplicado=round(margen, 4),
            estado=estado_compat,
            precio_m2_inmueble=precio_m2_usuario,
            precio_m2_barrio_medio=ref_ajustada_r,
            precio_m2_distrito_medio=round(precio_m2_distrito, 2),
            precio_m2_madrid_medio=round(media_madrid, 2),
            desviacion_pct_barrio=desviacion_pct_barrio,
            desviacion_pct_madrid=desviacion_pct_madrid,
            margen_negociacion_estimado_eur=margen_eur,
            tendencia_trimestral_pct=round(tendencia_trimestral, 2),
            precio_justo_estimado_eur=precio_justo_estimado,
            barrio_nombre=barrio_nombre,
            distrito_nombre=distrito_nombre,
            resumen_argumentos=argumentos,
            fecha_cierre_referencia=periodo_dato,
            operacion="Alquiler" if is_alquiler else "Venta",
            estado_inmueble=estado_inmueble,
            ascensor=asc_bool,
            serie_historica=serie_historica,
        )
    finally:
        conn.close()
