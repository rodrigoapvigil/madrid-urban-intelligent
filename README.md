# Madrid Urban Intelligence

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20846198.svg)](https://doi.org/10.5281/zenodo.20846198)

**Madrid Urban Intelligence** es una plataforma analítica y predictiva inteligente de última generación para el sector inmobiliario residencial en el municipio de Madrid. Este proyecto constituye el desarrollo práctico del Trabajo Fin de Máster (TFM).

La plataforma integra un pipeline de datos automatizado, un almacén de datos dimensional (DataMart) en SQLite, modelos de aprendizaje automático avanzados para la predicción de precios (Venta y Alquiler) a nivel micro-local de barrio, y un frontend interactivo modular que incluye un asistente conversacional inteligente (chatbot RAG) de ejecución local.

---

## 🏗️ Arquitectura del Sistema

El proyecto se estructura bajo una arquitectura desacoplada en tres capas principales:

1. **Frontend (React / Next.js):**
   - Interfaz web interactiva e intuitiva con soporte para navegación geoespacial (mapas con Leaflet) y visualización de tendencias históricas/predictivas (gráficos interactivos con Chart.js).
   - Diseñado modularmente con perfiles de usuario personalizables (Comprador, Propietario, Inversor, Analista) para segmentar las métricas de interés.
   - Integra la interfaz de conversación en tiempo real con el asistente inteligente.

2. **Backend (FastAPI):**
   - Servicio API REST asíncrono en Python que sirve de pasarela entre el frontend, el almacén de datos SQLite (`madrid_intelligence.db`) y el motor conversacional.
   - Expone endpoints optimizados para KPIs de mercado, comparativas espaciales/temporales, clasificaciones y rankings.

3. **Asistente Conversacional (Ambi - LLM RAG):**
   - Motor de procesamiento de lenguaje natural en local basado en **Ollama** con el modelo **Gemma 2 (2B)** (`gemma4:e4b`).
   - Implementa una arquitectura RAG híbrida: recupera métricas estructuradas exactas desde SQLite para evitar alucinaciones numéricas, y recupera información cualitativa de servicios cercanos mediante una base de datos vectorial ChromaDB.

4. **Pipeline de Machine Learning:**
   - Ingeniería de datos automatizada y entrenamiento multietapa de modelos de regresión (XGBoost, LightGBM, CatBoost y RandomForest).
   - Inyección de variables contextuales socioeconómicas y macroeconómicas combinadas con retardos de memoria temporal, logrando reducir el MAE a nivel de barrio a **104,25 €/m²** en venta y **0,48 €/m²** en alquiler.

---

## 📁 Estructura del Repositorio

La carpeta del repositorio está organizada de forma limpia y modular:

```text
madrid-urban-intelligent/
├── frontend/                     # Aplicación Next.js (Frontend)
│   ├── app/                      # Páginas y vistas principales
│   ├── components/               # Componentes React reutilizables
│   ├── public/                   # Recursos visuales y mapas
│   └── package.json              # Dependencias de npm
├── backend/                      # API REST con FastAPI (Backend)
│   ├── main.py                   # Inicialización y endpoints de la API
│   ├── data.py                   # Consultas y acceso optimizado a SQLite
│   ├── ambi_prompts.py           # Prompts de sistema para el LLM
│   └── ambi_rag.py               # Lógica RAG para Ollama y ChromaDB
├── data/                         # Almacén de datos (DataMart)
│   ├── madrid_intelligence.db   # Base de datos SQLite unificada
│   └── predictions.csv           # Predicciones mensuales generadas para 2026
├── models/                       # Modelos ML entrenados y serializados
│   ├── model_xgb_venta_v1.json   # Modelo final de venta (XGBoost)
│   ├── model_xgb_alquiler_v1.json# Modelo final de alquiler (XGBoost)
│   └── *.joblib                  # Normalizadores y escaladores de características
├── pipeline/                     # Scripts del pipeline ETL e ingeniería de datos
│   └── *.py                      # Procesamiento de transacciones e Euríbor
├── tesis/                        # Documento de tesis en LaTeX (.tex y recursos)
│   ├── tesis.tex                 # Código fuente principal de la tesis
│   └── tesis.pdf                 # Copia en PDF lista para leer
├── run_backend.bat               # Script automatizado para arrancar la API
├── LICENSE                       # Licencia oficial de código abierto Apache 2.0
├── codemeta.json                 # Metadatos del software para indexación académica
└── .gitignore                    # Archivos y carpetas excluidos en Git
```

---

## 🚀 Instrucciones de Ejecución Local

### Prerrequisitos
- Node.js (v18 o superior)
- Python (v3.10 o superior)
- Ollama (para el asistente conversacional Ambi)

### 1. Configuración del Backend (FastAPI)
1. Navega al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual e instala las dependencias de Python:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate      # En Windows
   pip install -r requirements.txt
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload --port 8001
   ```
   *(También puedes usar el atajo `run_backend.bat` en la raíz).*

### 2. Configuración del Asistente LLM (Ollama)
1. Instala Ollama desde su sitio web oficial.
2. Descarga el modelo base Gemma 2 (2B):
   ```bash
   ollama pull gemma2:2b
   ```
3. Para asegurar la compatibilidad con el identificador del modelo del sistema, crea un alias local con la etiqueta `gemma4:e4b`:
   ```bash
   ollama cp gemma2:2b gemma4:e4b
   ```
   *(Si cuentas con un `Modelfile` propio con el prompt ajustado, puedes compilarlo con `ollama create gemma4:e4b -f ./Modelfile`).*

### 3. Configuración del Frontend (Next.js)
1. Navega al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de Node:
   ```bash
   npm install
   ```
3. Levanta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para interactuar con la plataforma.

---

## 🎓 Tesis Académica
El documento formal de la tesis, con toda la metodología científica, la justificación de los experimentos y la arquitectura detallada del sistema, se encuentra en la carpeta [tesis/](file:///C:/Users/FX517/OneDrive/Desktop/TFM/madrid-urban-intelligent/tesis/) en formato PDF y LaTeX.

---

## 📄 Cómo citar este trabajo / Citation

Si deseas citar este proyecto en tu investigación o tesis, puedes utilizar el siguiente formato:

> Peña Vigil, Rodrigo Alonzo. (2026). Madrid Urban Intelligence: Plataforma analítica y predictiva inteligente para el mercado de la vivienda en Madrid (v1.0.0). GitHub / Zenodo. DOI: [10.5281/zenodo.20846198](https://doi.org/10.5281/zenodo.20846198)

