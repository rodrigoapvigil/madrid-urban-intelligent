import sqlite3
import pandas as pd
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
import os

DB_PATH = r'C:\Users\FX517\OneDrive\Desktop\TFM\FASE2\data\madrid_intelligence.db'
CHROMA_PATH = './chroma_db'

def ingest():
    conn = sqlite3.connect(DB_PATH)
    
    # Query for the latest data per barrio, combining Venta and Alquiler
    query = """
    WITH LatestTime AS (
        SELECT MAX(id_tiempo) as max_id FROM Fact_Operacion
    ),
    VentaData AS (
        SELECT id_barrio, precio_m2 as precio_venta, variacion_anual as var_venta, rentabilidad_bruta
        FROM Fact_Operacion 
        WHERE tipo_operacion = 'Venta' AND id_tiempo = (SELECT max_id FROM LatestTime)
    ),
    AlquilerData AS (
        SELECT id_barrio, precio_m2 as precio_alquiler, variacion_anual as var_alquiler
        FROM Fact_Operacion 
        WHERE tipo_operacion = 'Alquiler' AND id_tiempo = (SELECT max_id FROM LatestTime)
    )
    SELECT 
        b.nombre as barrio,
        d.nombre as distrito,
        v.precio_venta,
        v.var_venta,
        v.rentabilidad_bruta,
        a.precio_alquiler,
        a.var_alquiler,
        b.superficie_media_vivienda as superficie,
        b.dist_to_sol_m,
        b.count_school_1km,
        b.count_hospital_1km,
        b.count_metro_1km,
        b.count_supermarket_1km,
        t.mes,
        t.anio
    FROM Dim_Barrio b
    JOIN Dim_Distrito d ON b.id_distrito = d.id_distrito
    LEFT JOIN VentaData v ON b.id_barrio = v.id_barrio
    LEFT JOIN AlquilerData a ON b.id_barrio = a.id_barrio
    JOIN Dim_Tiempo t ON t.id_tiempo = (SELECT max_id FROM LatestTime)
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()

    docs = []
    for _, row in df.iterrows():
        # Build a rich descriptive text
        texto = f"Información del barrio {row['barrio']} (Distrito: {row['distrito']}). "
        
        if row['precio_venta']:
            texto += f"El precio medio de venta es de {row['precio_venta']:.2f} €/m2, con una variación anual del {row['var_venta']:.2f}%. "
        
        if row['precio_alquiler']:
            texto += f"El precio medio de alquiler es de {row['precio_alquiler']:.2f} €/m2, con una variación anual del {row['var_alquiler']:.2f}%. "
            
        if row['rentabilidad_bruta']:
            texto += f"La rentabilidad bruta estimada para inversión es del {row['rentabilidad_bruta']*100:.2f}%. "
            
        texto += f"La superficie media de las viviendas es de {row['superficie']:.2f} m2. "
        texto += f"Se encuentra a {row['dist_to_sol_m']/1000:.2f} km de la Puerta del Sol. "
        
        servicios = []
        if row['count_school_1km'] > 0: servicios.append(f"{row['count_school_1km']} colegios")
        if row['count_hospital_1km'] > 0: servicios.append(f"{row['count_hospital_1km']} centros de salud/hospitales")
        if row['count_metro_1km'] > 0: servicios.append(f"{row['count_metro_1km']} estaciones de metro")
        if row['count_supermarket_1km'] > 0: servicios.append(f"{row['count_supermarket_1km']} supermercados")
        
        if servicios:
            texto += f"En un radio de 1km cuenta con: {', '.join(servicios)}. "
            
        texto += f"Datos actualizados a {row['mes']}/{row['anio']}."
        
        docs.append(Document(page_content=texto, metadata={'barrio': row['barrio'], 'distrito': row['distrito']}))

    print(f"Generando embeddings para {len(docs)} barrios de Madrid...")
    embeddings = HuggingFaceEmbeddings(
        model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
    )

    if os.path.exists(CHROMA_PATH):
        import shutil
        shutil.rmtree(CHROMA_PATH)

    Chroma.from_documents(docs, embeddings, persist_directory=CHROMA_PATH)
    print(f'Cargados {len(docs)} registros en ChromaDB con éxito.')

if __name__ == "__main__":
    ingest()
