from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import get_chain

app = FastAPI(title="Ambi Backend API")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware, 
    allow_origins=['*'],
    allow_methods=['*'], 
    allow_headers=['*']
)

# Diccionario para mantener las sesiones de chat
sessions = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post('/chat')
async def chat(req: ChatRequest):
    # Si no existe la sesión, crear una nueva cadena de RAG
    if req.session_id not in sessions:
        sessions[req.session_id] = get_chain()
    
    chain = sessions[req.session_id]
    
    # Ejecutar la cadena con la pregunta del usuario
    # Langchain maneja el historial a través de la memoria configurada en rag.py
    result = chain({'question': req.message})
    
    return {
        'answer': result['answer'],
        'sources': [doc.metadata for doc in result['source_documents']]
    }

@app.get('/health')
def health(): 
    return {'status': 'ok', 'model': 'gemma4:e4b'}

@app.delete('/session/{session_id}')
def delete_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "deleted"}
    return {"status": "not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
