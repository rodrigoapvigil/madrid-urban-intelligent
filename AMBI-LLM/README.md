# Ambi: Briefing Técnico del Asistente Conversacional

AMBI

Chatbot de Asesoramiento de Vivienda

Briefing Tecnico Completo para Desarrollo

Proyecto: Trabajo de Fin de Master

Version: 1.0  |  Mayo 2025



Indice de Contenidos







1. Vision General del Proyecto

1.1 Que es Ambi

Ambi es un chatbot conversacional especializado en el mercado de vivienda. Su funcion es orientar a los usuarios (compradores, vendedores, inversores, estudiantes) a tomar decisiones informadas sobre compra, venta o alquiler de inmuebles, basandose exclusivamente en los datos validados de la plataforma.

Ambi NO es un asesor financiero. Es un asistente informativo que guia al usuario con preguntas progresivas, construye un perfil de sus necesidades y ofrece informacion precisa del mercado.

1.2 Funciones principales

Responder preguntas sobre precios por m2, tendencias, barrios y estacionalidad

Guiar al usuario mediante preguntas para entender su perfil (comprador, inquilino, inversor, vendedor)

Recomendar zonas o inmuebles segun presupuesto, necesidades y preferencias

Explicar como navegar y usar la plataforma web

Advertir sobre mejores momentos del ano para comprar, vender o alquilar

1.3 Lo que Ambi NO debe hacer

Inventar precios o datos que no esten en la base de datos

Dar consejos financieros o legales concretos

Buscar informacion en internet — solo usa datos internos

Afirmar certezas absolutas; siempre contextualiza con los datos disponibles



2. Arquitectura Tecnica

2.1 Stack tecnologico (100% gratuito y local)

Capa

Tecnologia

Funcion

Modelo LLM

Ollama + Llama 3.1 8B

Motor de lenguaje e inteligencia conversacional

RAG / Memoria

ChromaDB + LangChain

Recuperar datos relevantes de la BD antes de responder

Backend

FastAPI (Python)

API REST que conecta frontend con LLM y BD

Base de datos

PostgreSQL / CSV existente

Datos de vivienda: precios, barrios, tendencias

Frontend

React o Streamlit

Interfaz de chat del usuario

Embeddings

sentence-transformers

Convertir datos de vivienda en vectores buscables



2.2 Flujo de una conversacion

El usuario escribe un mensaje en el chat

El backend recibe el mensaje y lo envia al sistema RAG

RAG busca en ChromaDB los datos de vivienda relevantes

LangChain construye un prompt con: datos recuperados + historial de conversacion + mensaje del usuario

El prompt se envia a Ollama (Llama 3.1) que genera la respuesta

La respuesta llega al frontend y se muestra al usuario

El historial se actualiza para mantener el contexto



CLAVE: El modelo nunca inventa datos. Solo puede afirmar lo que ChromaDB recupera de la base de datos real. Si no hay datos para una consulta, Ambi lo dice claramente.



3. Guia de Instalacion Paso a Paso

Paso 1 — Instalar Ollama (el motor de IA)

Descargar e instalar desde:

https://ollama.com/download  (disponible para Mac, Windows y Linux)

Una vez instalado, abrir terminal y ejecutar:

ollama pull llama3.1:8b

Esto descarga el modelo (~4.7 GB). Solo se hace una vez.

Verificar que funciona:

ollama run llama3.1:8b

>>> Hola, funciona?   (escribir esto y pulsar Enter)

Si el PC tiene menos de 16 GB de RAM, usar el modelo mas ligero: ollama pull mistral:7b

Paso 2 — Preparar el entorno Python

python -m venv ambi-env

source ambi-env/bin/activate        # Mac/Linux

ambi-env\Scripts\activate           # Windows

pip install langchain langchain-community chromadb fastapi uvicorn

pip install sentence-transformers pandas python-dotenv openai

'openai' se instala para usar la libreria compatible con Ollama, no requiere cuenta ni pago.

Paso 3 — Estructurar el proyecto

Crear la siguiente estructura de carpetas:

ambi/

  backend/

    main.py              # servidor FastAPI

    rag.py               # logica RAG + ChromaDB

    prompts.py           # system prompt de Ambi

    ingest.py            # script para cargar datos en ChromaDB

  data/

    vivienda.csv         # datos de precios, barrios, etc.

  frontend/

    app.py               # interfaz Streamlit (o carpeta React)

  .env                   # variables de entorno

Paso 4 — Cargar los datos de vivienda en ChromaDB

Crear el archivo backend/ingest.py con la logica de carga. Este script se ejecuta UNA SOLA VEZ (o cada vez que los datos cambien):

python backend/ingest.py

Lo que hace este script:

Lee los CSVs o tablas de la base de datos

Convierte cada registro en texto descriptivo: 'En el barrio Malasana, el precio por m2 es 5200 euros...'

Genera embeddings (vectores numericos) de cada texto

Los almacena en ChromaDB para busqueda semantica

Paso 5 — Configurar el System Prompt de Ambi

El System Prompt es el texto que define la personalidad y comportamiento de Ambi. Va en backend/prompts.py. Ver seccion 4 de este documento para el prompt completo.

Paso 6 — Crear el backend FastAPI

El archivo backend/main.py expone tres endpoints:

POST /chat — recibe mensaje del usuario, devuelve respuesta de Ambi

GET /health — verifica que el servidor esta activo

DELETE /session/{id} — borra historial de una sesion

Paso 7 — Lanzar el sistema

Abrir TRES terminales simultaneamente:

Terminal 1 — Ollama (mantener siempre activo):

ollama serve

Terminal 2 — Backend:

cd ambi && uvicorn backend.main:app --reload --port 8000

Terminal 3 — Frontend Streamlit:

streamlit run frontend/app.py

Abrir el navegador en: http://localhost:8501



4. System Prompt Completo de Ambi

Este es el texto que se envia al modelo en cada conversacion para definir como debe comportarse Ambi. Copiar literalmente en backend/prompts.py:



SYSTEM_PROMPT = """

Eres Ambi, el asistente virtual de la plataforma de analisis de vivienda.

Tu mision es ayudar a los usuarios a entender el mercado inmobiliario

y orientarles en sus decisiones de compra, venta o alquiler.



PERSONALIDAD:

- Amigable, cercano y claro. Usa lenguaje sencillo, no tecnico.

- Paciente. Si el usuario no sabe lo que quiere, le guias con preguntas.

- Honesto. Si no tienes datos, lo dices claramente.



REGLAS ABSOLUTAS:

1. Solo uses datos del CONTEXTO proporcionado. Nunca inventes cifras.

2. No busques informacion en internet.

3. No eres asesor financiero ni legal.

4. Si el usuario no da suficiente info, PREGUNTA antes de responder.



PERFIL DEL USUARIO — construyelo progresivamente preguntando:

- Objetivo: comprar / alquilar / vender / invertir

- Presupuesto disponible

- Zona preferida o abierto a sugerencias

- Necesidades: cerca de transporte, colegio, universidad, supermercado

- Perfil personal: estudiante, familia, inversor, profesional

- Plazo: cuando planea realizar la operacion



Contexto de datos (inyectado automaticamente por el sistema RAG):

{context}

"""



5. Codigo de Referencia

5.1 backend/rag.py — Logica RAG

from langchain_community.vectorstores import Chroma

from langchain_community.embeddings import HuggingFaceEmbeddings

from langchain_community.llms import Ollama

from langchain.chains import ConversationalRetrievalChain

from langchain.memory import ConversationBufferWindowMemory

from prompts import SYSTEM_PROMPT



embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')

vectordb = Chroma(persist_directory='./chroma_db', embedding_function=embeddings)

retriever = vectordb.as_retriever(search_kwargs={'k': 5})



llm = Ollama(model='llama3.1:8b', temperature=0.3)



def get_chain(session_id: str):

    memory = ConversationBufferWindowMemory(k=10, return_messages=True,

                                            memory_key='chat_history',

                                            output_key='answer')

    return ConversationalRetrievalChain.from_llm(

        llm=llm, retriever=retriever,

        memory=memory, return_source_documents=True,

        combine_docs_chain_kwargs={'prompt': SYSTEM_PROMPT}

    )



5.2 backend/main.py — Servidor FastAPI

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from rag import get_chain



app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=['*'],

                   allow_methods=['*'], allow_headers=['*'])



sessions = {}



class ChatRequest(BaseModel):

    session_id: str

    message: str



@app.post('/chat')

async def chat(req: ChatRequest):

    if req.session_id not in sessions:

        sessions[req.session_id] = get_chain(req.session_id)

    chain = sessions[req.session_id]

    result = chain({'question': req.message})

    return {'answer': result['answer']}



@app.get('/health')

def health(): return {'status': 'ok'}



5.3 backend/ingest.py — Carga de datos

import pandas as pd

from langchain_community.vectorstores import Chroma

from langchain_community.embeddings import HuggingFaceEmbeddings

from langchain.schema import Document



df = pd.read_csv('../data/vivienda.csv')



docs = []

for _, row in df.iterrows():

    texto = (f"Barrio: {row['barrio']}. Zona: {row['zona']}. "

             f"Precio compra: {row['precio_m2_compra']} euros/m2. "

             f"Precio alquiler: {row['precio_alquiler']} euros/mes. "

             f"Servicios cercanos: {row['servicios']}. "

             f"Tendencia: {row['tendencia']}.")

    docs.append(Document(page_content=texto, metadata={'barrio': row['barrio']}))



embeddings = HuggingFaceEmbeddings(

    model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')



Chroma.from_documents(docs, embeddings, persist_directory='./chroma_db')

print(f'Cargados {len(docs)} registros en ChromaDB')



5.4 frontend/app.py — Interfaz Streamlit

import streamlit as st

import requests, uuid



st.set_page_config(page_title='Ambi - Asistente de Vivienda', page_icon='🏠')

st.title('Hola, soy Ambi 🏠')

st.caption('Tu asistente de vivienda personal')



if 'session_id' not in st.session_state:

    st.session_state.session_id = str(uuid.uuid4())

if 'messages' not in st.session_state:

    st.session_state.messages = []



for msg in st.session_state.messages:

    with st.chat_message(msg['role']):

        st.write(msg['content'])



if prompt := st.chat_input('Escribe tu pregunta...'):

    st.session_state.messages.append({'role': 'user', 'content': prompt})

    with st.chat_message('user'): st.write(prompt)

    with st.chat_message('assistant'):

        with st.spinner('Ambi esta pensando...'):

            r = requests.post('http://localhost:8000/chat',

                json={'session_id': st.session_state.session_id, 'message': prompt})

            answer = r.json()['answer']

        st.write(answer)

    st.session_state.messages.append({'role': 'assistant', 'content': answer})



6. Estructura de Datos Esperada

6.1 Formato del CSV de vivienda

El archivo data/vivienda.csv debe tener al menos estas columnas:

Columna

Tipo

Descripcion

barrio

texto

Nombre del barrio

zona

texto

Distrito o zona de la ciudad

precio_m2_compra

numero

Precio medio de compra en euros por m2

precio_alquiler

numero

Precio medio de alquiler mensual en euros

tendencia

texto

subida / bajada / estable

servicios

texto

Metro, bus, colegios, supermercados, etc.

estacionalidad

texto

Temporadas con precios altos o bajos

rentabilidad_bruta

numero

Porcentaje de rentabilidad si se alquila



Cuantas mas columnas informativas tenga el CSV, mejores respuestas dara Ambi. Se pueden agregar columnas como: distancia_centro, puntuacion_seguridad, nivel_ruido, etc.



7. Casos de Prueba

7.1 Preguntas que Ambi debe responder correctamente

Pregunta del usuario

Comportamiento esperado de Ambi

Cual es el precio por m2 en Malasana?

Da el precio exacto de la BD y lo contextualiza (caro/barato vs media ciudad)

Quiero comprar una casa

Pregunta presupuesto, zona, objetivo, necesidades

Soy estudiante y me mudo a Madrid

Infiere presupuesto bajo, pregunta zona preferida y si necesita transporte

En que mes es mejor alquilar?

Explica estacionalidad segun datos de la BD

Quiero invertir, que barrio me recomiendas?

Muestra barrios con mayor rentabilidad bruta de la BD

Puedo comprar en Salamanca con 200.000 euros?

Compara el presupuesto con precio m2 de Salamanca y calcula metros posibles



7.2 Comportamientos que NO debe tener

Inventar precios o estadisticas que no estan en la BD

Dar recomendaciones financieras especificas ('invierte aqui, vas a ganar X%')

Romper el personaje o mencionar que es una IA basada en Llama

Responder preguntas fuera del dominio de vivienda sin aclarar que no es su area



8. Opciones de Despliegue

8.1 Local (recomendado para TFM)

Todo corre en la maquina local. Coste: 0 euros.

Requisitos minimos: 16 GB RAM, 10 GB espacio libre en disco

Tiempo de respuesta: 3-8 segundos por mensaje (normal para modelo local)

Perfecto para demos, presentaciones y defensa del TFM

8.2 Nube gratuita (opcional, para demo publica)

Servicio

Plan gratuito

Para que se usa

Groq

Llama 3 gratis con limites generosos

Sustituye a Ollama en la nube

Railway

500 horas/mes gratis

Hosting del backend FastAPI

Vercel

Ilimitado para frontend estatico

Hosting del frontend React

Supabase

500 MB base de datos gratis

BD PostgreSQL en la nube



Para la arquitectura en nube, reemplazar Ollama por la API de Groq (misma interfaz, misma libreria, solo cambia la URL y la clave API gratuita).



9. Checklist de Entrega

Backend

Ollama instalado y modelo llama3.1:8b descargado

ChromaDB con datos de vivienda cargados (ingest.py ejecutado)

FastAPI funcionando en localhost:8000

Endpoint /chat respondiendo correctamente

System prompt configurado con restricciones y personalidad de Ambi

Frontend

Interfaz de chat visible en localhost:8501 (Streamlit) o localhost:3000 (React)

Historial de conversacion visible en la sesion

Indicador de carga mientras Ambi responde

Mensaje de bienvenida inicial de Ambi

Calidad del chatbot

Ambi no inventa datos (verificado con preguntas trampa)

Ambi pregunta cuando le falta informacion del usuario

Ambi identifica correctamente el perfil del usuario

Ambi da precios coherentes con los de la BD



Documento generado para entrega al equipo de desarrollo | Proyecto TFM | Ambi v1.0