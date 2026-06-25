@echo off
echo Iniciando Backend Madrid Urban Intelligence...
pip install fastapi uvicorn pandas langchain langchain-community langchain-ollama chromadb sentence-transformers langchain-core
python backend/main.py
pause
