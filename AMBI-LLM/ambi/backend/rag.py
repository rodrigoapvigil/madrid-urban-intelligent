from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import Ollama
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import PromptTemplate
from prompts import SYSTEM_PROMPT

# Configuración de embeddings (mismo que en ingest.py)
embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')

# Cargar la base de datos vectorial
vectordb = Chroma(persist_directory='./chroma_db', embedding_function=embeddings)
retriever = vectordb.as_retriever(search_kwargs={'k': 5})

# Configuración del LLM (Ollama)
llm = Ollama(model='gemma4:e4b', temperature=0.3)

# Definir el prompt personalizado para la cadena de RAG
# Nota: Langchain necesita un formato específico para pasar el contexto
CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(
    "Dada la siguiente conversación y una pregunta de seguimiento, reformula la pregunta para que sea independiente.\n\n"
    "Historial:\n{chat_history}\n"
    "Seguimiento: {question}\n"
    "Pregunta independiente:"
)

QA_PROMPT = PromptTemplate(
    template=SYSTEM_PROMPT, 
    input_variables=["context", "question"]
)

def get_chain():
    memory = ConversationBufferWindowMemory(
        k=10, 
        return_messages=True,
        memory_key='chat_history',
        output_key='answer'
    )
    
    return ConversationalRetrievalChain.from_llm(
        llm=llm, 
        retriever=retriever,
        memory=memory, 
        return_source_documents=True,
        combine_docs_chain_kwargs={'prompt': QA_PROMPT},
        condense_question_prompt=CONDENSE_QUESTION_PROMPT
    )
