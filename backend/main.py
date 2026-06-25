from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import pandas as pd
import os
import sys
import re
from typing import Any, Dict

# Añadir el directorio actual al path para importar data.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import data

app = FastAPI(title="Madrid Urban Intelligence API")

# Configurar CORS para permitir peticiones desde el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción deberías especificar el dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Madrid Urban Intelligence API is running"}

@app.get("/api/filters")
def get_filters():
    years = data.get_years()
    districts = data.get_districts()
    return {
        "years": years,
        "months": list(data.MONTH_NAMES.values()),
        "districts": districts
    }

@app.get("/api/neighborhoods")
def get_neighborhoods(district: str = "Todos"):
    return data.get_neighborhoods(district)

@app.get("/api/kpis")
def get_kpis(
    year: int = 2026,
    month: str = "Marzo",
    op: str = "Venta",
    district: str = "Todos",
    barrio: str = "Todos"
):
    p_m2, p_vivienda, v_mes, v_tri, v_anual, renta_media, sup_media, p_vivienda_venta, esfuerzo, estado, is_pred, rentabilidad, transactions = data.get_kpi_data(
        year, month, op, district, barrio
    )
    return {
        "precio_m2": p_m2,
        "precio_vivienda": p_vivienda,
        "variacion_mensual": v_mes,
        "variacion_trimestral": v_tri,
        "variacion_anual": v_anual,
        "renta_media": renta_media,
        "superficie_media": sup_media,
        "p_vivienda_venta": p_vivienda_venta,
        "esfuerzo_compra": esfuerzo,
        "estado_mercado": estado,
        "is_prediction": is_pred,
        "rentabilidad": rentabilidad,
        "transacciones": transactions
    }

@app.get("/api/series")
def get_series(
    year: int = 2026,
    op: str = "Venta",
    zona: Optional[str] = None,
    tipo_zona: str = "distrito"
):
    if zona and zona != "Todos":
        df = data.get_monthly_series(year, op, zona, tipo_zona)
    else:
        df = data.get_madrid_average_series(year, op)
        if not df.empty:
            df['mes_nombre'] = df['mes'].map(data.MONTH_NAMES)
            
    if df.empty:
        return []
    
    return df.to_dict(orient="records")

@app.get("/api/rankings")
def get_rankings(
    year: int = 2026,
    month: str = "Marzo",
    op: str = "Venta",
    level: str = "barrio",
    category: str = "Precio",
    district: str = "Todos"
):
    df = data.get_rankings(year, month, op, level, category, district)
    if df.empty:
        return []
    return df.to_dict(orient="records")

@app.get("/api/map")
def get_map(
    year: int = 2026,
    month: str = "Marzo",
    interest: str = "Compra-venta"
):
    df_dist, df_barrio = data.get_map_data(year, month, interest)
    return {
        "districts": df_dist.to_dict(orient="records") if not df_dist.empty else [],
        "neighborhoods": df_barrio.to_dict(orient="records") if not df_barrio.empty else []
    }

@app.get("/api/affordability")
def get_affordability(year: int = 2026, month: str = "Marzo", op: str = "alquiler"):
    df = data.get_affordability_data(year, month, op)
    if df.empty: return []
    return df.to_dict(orient="records")

@app.get("/api/seasonal-trend")
def api_seasonal_trend(anio: int = 2026, op: str = "alquiler"):
    return data.get_seasonal_averages(anio, op)

@app.get("/api/debug-path")
def debug_path():
    return {"db_path": data.DB_PATH, "backend_dir": data._BACKEND_DIR}

@app.get("/api/heatmap")
def api_heatmap(year: int = 2026, op: str = "alquiler", level: str = "distrito"):
    return data.get_heatmap_data(year, op, level)

@app.get("/api/scatter-opportunity")
def get_scatter_opportunity(year: int = 2026, month: str = "Marzo", op: str = "alquiler", level: str = "distrito"):
    df = data.get_scatter_opportunity_data(year, month, op, level)
    if df.empty: return []
    return df.to_dict(orient="records")

@app.get("/api/connectivity-analysis")
def get_connectivity_analysis(district: str = "Todos", barrio: str = "Todos"):
    return data.get_connectivity_analysis(district, barrio)

@app.get("/api/liquidity")
def get_liquidity(year: int = 2026, level: str = "distrito"):
    return data.get_liquidity_data(year, level)

@app.get("/api/interest-rate-impact")
def get_interest_rate_impact(district: str = "Todos", barrio: str = "Todos"):
    return data.get_interest_rate_impact_data(district, barrio)

@app.get("/api/risk-return-matrix")
def get_risk_return_matrix(level: str = "distrito", district: str = "Todos"):
    return data.get_risk_return_matrix_data(level, district)

@app.get("/api/zone-liquidity")
def get_zone_liquidity(name: str, level: str = "distrito"):
    return data.get_zone_liquidity_data(name, level)



from pydantic import BaseModel
from ambi_rag import get_llm, get_rag_context
from langchain_classic.memory import ConversationBufferWindowMemory
from langchain_core.prompts import PromptTemplate
from ambi_prompts import SYSTEM_PROMPT

class ChatRequest(BaseModel):
    message: str
    session_id: str

class ChatResponse(BaseModel):
    response: str
    session_id: str
    context: Optional[Dict[str, Any]] = None

# Diccionarios para almacenar la memoria y contexto por sesión
active_memories = {}
active_contexts = {}

def extract_context(message: str, current_context: dict) -> dict:
    new_context = current_context.copy()
    msg_lower = message.lower()
    
    # Year
    for year in [2023, 2024, 2025, 2026]:
        if str(year) in msg_lower:
            new_context["year"] = year
            break

    # Month
    for m_num, m_name in data.MONTH_NAMES.items():
        if m_name.lower() in msg_lower:
            new_context["month"] = m_name
            break
            
    # Operation
    if "alquiler" in msg_lower or "arrendar" in msg_lower:
        new_context["op"] = "alquiler"
    elif "venta" in msg_lower or "comprar" in msg_lower or "compra" in msg_lower:
        new_context["op"] = "venta"
    elif "inversion" in msg_lower or "rentabilidad" in msg_lower or "invertir" in msg_lower:
        new_context["op"] = "inversion"
        
    # District
    m_norm = msg_lower.replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ü','u')
    for district in data.get_districts():
        if district == "Todos": continue
        d_norm = district.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')
        if d_norm in m_norm:
            new_context["district"] = district
            new_context["barrio"] = "Todos"
            break
            
    # Barrio
    try:
        conn = data._conn()
        df = pd.read_sql("SELECT b.nombre as barrio, d.nombre as distrito FROM Dim_Barrio b JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito", conn)
        conn.close()
        for idx, row in df.iterrows():
            b_norm = row['barrio'].lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ü','u')
            if b_norm in m_norm:
                new_context["district"] = row['distrito']
                new_context["barrio"] = row['barrio']
                break
    except Exception as e:
        print("Error extrayendo barrio:", e)
            
    return new_context


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    session_id = request.session_id
    user_message = request.message
    
    # Obtener o crear la memoria para esta sesión
    if session_id not in active_memories:
        active_memories[session_id] = ConversationBufferWindowMemory(k=5, return_messages=False)
        active_contexts[session_id] = {"year": 2026, "month": "Marzo", "op": "alquiler", "district": "Todos", "barrio": "Todos"}
        
    memory = active_memories[session_id]
    
    # Actualizar el contexto basado en el mensaje
    current_context = active_contexts[session_id]
    new_context = extract_context(user_message, current_context)
    active_contexts[session_id] = new_context
    
    try:
        # Fetch KPI data to inject real-time context
        barrio_val = new_context.get("barrio", "Todos")
        chosen_month = new_context.get("month", "Marzo")
        p_m2, p_vivienda, v_mes, v_tri, v_anual, renta_media, sup_media, p_vivienda_venta, esfuerzo, estado, is_pred, rentabilidad, transactions = data.get_kpi_data(
            new_context["year"], chosen_month, new_context["op"].capitalize(), new_context["district"], barrio_val
        )
        
        # 1. KPI Context
        lugar = new_context['district'] if barrio_val == "Todos" else f"el barrio de {barrio_val} (Distrito {new_context['district']})"
        op_val = new_context["op"].lower()
        mes_info = f" (mes de {chosen_month})"
        if op_val == "alquiler":
            kpi_context = f"[DATOS REALES DEL DASHBOARD: Para el año {new_context['year']}{mes_info} en {lugar} (Alquiler): El precio medio del alquiler es {p_m2:.2f} €/m² al mes. El alquiler mensual promedio de una vivienda es {p_vivienda:.0f} €/mes. La variación anual del alquiler es {v_anual:.2f}%. La renta media anual de los hogares en la zona es {renta_media:.0f} €/año (que equivale a {renta_media/12:.0f} €/mes). El esfuerzo de alquiler es {esfuerzo:.1f}% de los ingresos del hogar. Estado del mercado de alquiler: {estado}.]"
        elif op_val == "inversion":
            kpi_context = f"[DATOS REALES DEL DASHBOARD: Para el año {new_context['year']}{mes_info} en {lugar} (Inversión): La rentabilidad bruta anual promedio es {p_m2*100:.2f}%. El ticket medio de inversión para comprar una vivienda es {p_vivienda:.0f} €. La variación anual del precio es {v_anual:.2f}%. La renta media anual del hogar es {renta_media:.0f} €/año. Los años de amortización (GRM) son {1/p_m2 if p_m2 > 0 else 0:.1f} años. Estado del mercado: {estado}.]"
        else: # compra o venta
            kpi_context = f"[DATOS REALES DEL DASHBOARD: Para el año {new_context['year']}{mes_info} en {lugar} ({op_val.capitalize()}): El precio medio de venta es {p_m2:.2f} €/m². El precio total medio de una vivienda de compraventa es {p_vivienda:.0f} €. La variación anual del precio de venta es {v_anual:.2f}%. La renta media anual del hogar en la zona es {renta_media:.0f} €/año. Los años de esfuerzo necesarios para comprar son {esfuerzo:.1f} años. Estado del mercado: {estado}.]"
        
        # 2. RAG Context (Filtro Inteligente)
        rag_context = get_rag_context(user_message, new_context["district"], barrio_val)
        
        # Combinar Contextos
        combined_context = f"{kpi_context}\n\n[TEXTOS SOBRE INFRAESTRUCTURA (Usa descripciones cualitativas)]\n{rag_context}"
        
        # Obtener Historial
        chat_history = memory.load_memory_variables({})["history"]
        
        # Preparar Prompt final
        prompt_template = PromptTemplate(template=SYSTEM_PROMPT, input_variables=["context", "chat_history", "question"])
        final_prompt = prompt_template.format(
            context=combined_context,
            chat_history=chat_history,
            question=user_message
        )
        
        # Llamar al LLM
        llm = get_llm()
        answer_text = llm.invoke(final_prompt)
        
        # Guardar en memoria
        memory.save_context({"input": user_message}, {"output": answer_text})
        
        # Post-procesamiento
        import re
        answer_text = re.sub(r'\.0(?!\d)', '', answer_text) # Quitar decimales innecesarios
        answer_text = answer_text.replace('*', '') # Quitar asteriscos de markdown

        return ChatResponse(response=answer_text, session_id=session_id, context=new_context)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Error en RAG:\n{error_msg}")
        return ChatResponse(response=f"Error interno: {str(e)}", session_id=session_id, context=new_context)

@app.delete("/api/chat/session/{session_id}")
def clear_session(session_id: str):
    if session_id in active_memories:
        del active_memories[session_id]
    if session_id in active_contexts:
        del active_contexts[session_id]
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
