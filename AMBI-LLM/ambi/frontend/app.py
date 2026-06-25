import streamlit as st
import requests
import uuid

# Configuración de la página
st.set_page_config(
    page_title='Ambi - Asistente de Vivienda', 
    page_icon='🏠',
    layout="centered"
)

# Estilos personalizados
st.markdown("""
    <style>
    .stChatMessage {
        border-radius: 15px;
        padding: 10px;
        margin-bottom: 10px;
    }
    .main {
        background-color: #f8f9fa;
    }
    </style>
    """, unsafe_allow_html=True)

st.title('Hola, soy Ambi 🏠')
st.caption('Tu asistente experto en el mercado inmobiliario de Madrid')

# Inicialización del estado de la sesión
if 'session_id' not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if 'messages' not in st.session_state:
    st.session_state.messages = []

# Mostrar el historial de mensajes
for msg in st.session_state.messages:
    with st.chat_message(msg['role']):
        st.markdown(msg['content'])

# Entrada del usuario
if prompt := st.chat_input('¿En qué barrio estás interesado?'):
    # Añadir mensaje del usuario al historial
    st.session_state.messages.append({'role': 'user', 'content': prompt})
    with st.chat_message('user'):
        st.markdown(prompt)
    
    # Respuesta de Ambi
    with st.chat_message('assistant'):
        with st.spinner('Ambi está consultando los datos del mercado...'):
            try:
                r = requests.post(
                    'http://localhost:8000/chat',
                    json={
                        'session_id': st.session_state.session_id, 
                        'message': prompt
                    },
                    timeout=30
                )
                if r.status_code == 200:
                    data = r.json()
                    answer = data['answer']
                    # sources = data.get('sources', [])
                else:
                    answer = "Lo siento, he tenido un problema al conectar con mi cerebro (servidor). ¿Podrías intentarlo de nuevo?"
            except Exception as e:
                answer = f"Error de conexión: {str(e)}. Asegúrate de que el backend esté corriendo."
        
        st.markdown(answer)
    
    # Añadir respuesta de Ambi al historial
    st.session_state.messages.append({'role': 'assistant', 'content': answer})

# Botón para limpiar chat
if st.sidebar.button("Limpiar conversación"):
    requests.delete(f'http://localhost:8000/session/{st.session_state.session_id}')
    st.session_state.messages = []
    st.session_state.session_id = str(uuid.uuid4())
    st.rerun()

st.sidebar.markdown("---")
st.sidebar.info(
    "Ambi utiliza datos reales del Ayuntamiento de Madrid y tecnología Llama 3.1 para orientarte."
)
