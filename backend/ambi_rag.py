from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM
import os

# Configuración de rutas
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_PATH = os.path.join(_BACKEND_DIR, 'chroma_db')

# Inicialización diferida
_embeddings = None
_vectordb = None
_llm = None

def get_vectordb():
    global _embeddings, _vectordb
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    if _vectordb is None:
        _vectordb = Chroma(persist_directory=CHROMA_PATH, embedding_function=_embeddings)
    return _vectordb

def get_llm():
    global _llm
    if _llm is None:
        _llm = OllamaLLM(model='gemma4:e4b', temperature=0.3)
    return _llm

def get_rag_context(query: str, district: str = "Todos", barrio: str = "Todos") -> str:
    db = get_vectordb()
    filter_dict = {}
    if barrio and barrio != "Todos":
        filter_dict["barrio"] = barrio
    elif district and district != "Todos":
        filter_dict["distrito"] = district
        
    try:
        import re
        if filter_dict:
            docs = db.similarity_search(query, k=3, filter=filter_dict)
        else:
            docs = db.similarity_search(query, k=3)
            
        raw_text = "\n\n".join([doc.page_content for doc in docs])
        # Limpieza crucial: preservar datos reales y quitar solo números inflados
        if "En un radio de 1km cuenta con:" in raw_text:
            parts = raw_text.split("En un radio de 1km cuenta con:")
            # limpiamos solo la parte 2 (las comodidades)
            second_clean = re.sub(r'\d+\.\d+\s*', '', parts[1])
            raw_text = parts[0] + "Comodidades:" + second_clean
        elif "en un radio de 1km" in raw_text:
            raw_text = raw_text.replace("en un radio de 1km", "")
        
        return raw_text
    except Exception as e:
        print(f"Error en RAG con filtro {filter_dict}: {e}")
        try:
            # Fallback sin filtro si hay un error con los metadatos
            import re
            docs = db.similarity_search(query, k=3)
            raw_text = "\n\n".join([doc.page_content for doc in docs])
            if "En un radio de 1km cuenta con:" in raw_text:
                parts = raw_text.split("En un radio de 1km cuenta con:")
                second_clean = re.sub(r'\d+\.\d+\s*', '', parts[1])
                raw_text = parts[0] + "Comodidades:" + second_clean
            elif "en un radio de 1km" in raw_text:
                raw_text = raw_text.replace("en un radio de 1km", "")
            return raw_text
        except:
            return ""
