'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ReactMarkdown from 'react-markdown';
import './MadridChat.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MadridMap = dynamic(() => import('./MadridMap'), { ssr: false });

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const MadridChat: React.FC = () => {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Dashboard State
  const [chatContext, setChatContext] = useState({ op: 'venta', year: 2026, district: 'Todos', barrio: 'Todos' });
  const [kpiData, setKpiData] = useState<any>(null);
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any>({ districts: [], neighborhoods: [] });

  // Generar un ID de sesión único al montar el componente
  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(2, 15));
  }, []);

  // Auto-scroll al último mensaje usando scrollTop
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  // Fetch data when context changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const barrioParam = chatContext.barrio && chatContext.barrio !== 'Todos' ? `&barrio=${encodeURIComponent(chatContext.barrio)}` : '';
        const zoneType = chatContext.barrio && chatContext.barrio !== 'Todos' ? 'barrio' : 'distrito';
        const zoneName = chatContext.barrio && chatContext.barrio !== 'Todos' ? chatContext.barrio : chatContext.district;

        const [kpiRes, seriesRes, mapRes] = await Promise.all([
          fetch(`http://localhost:8001/api/kpis?year=${chatContext.year}&op=${chatContext.op}&district=${encodeURIComponent(chatContext.district)}${barrioParam}`),
          fetch(`http://localhost:8001/api/series?year=${chatContext.year}&op=${chatContext.op}&zona=${encodeURIComponent(zoneName)}&tipo_zona=${zoneType}`),
          fetch(`http://localhost:8001/api/map?year=${chatContext.year}&interest=${chatContext.op === 'alquiler' ? 'Alquiler' : chatContext.op === 'inversion' ? 'Inversión' : 'Venta'}`)
        ]);

        if (kpiRes.ok) setKpiData(await kpiRes.json());
        if (seriesRes.ok) setSeriesData(await seriesRes.json());
        if (mapRes.ok) setMapData(await mapRes.json());
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchDashboardData();
  }, [chatContext]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage('');
    setHasStarted(true);
    setIsLoading(true);

    const newHistory: Message[] = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(newHistory);

    try {
      const res = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_id: sessionId })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory([...newHistory, { role: 'assistant', content: data.response }]);
        if (data.context) {
          setChatContext(prev => ({
            op: data.context.op || prev.op,
            year: data.context.year || prev.year,
            district: data.context.district || prev.district,
            barrio: data.context.barrio || prev.barrio || 'Todos'
          }));
        }
      } else {
        setChatHistory([...newHistory, { role: 'assistant', content: 'Lo siento, hubo un error al conectar con mis sistemas. ¿Podemos intentarlo de nuevo?' }]);
      }
    } catch (error) {
      console.error(error);
      setChatHistory([...newHistory, { role: 'assistant', content: 'No he podido conectarme al servidor de datos. Asegúrate de que el backend de Madrid Urban Intelligence está corriendo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Chart Configuration
  const chartColor = chatContext.op === 'alquiler' ? '#005187' : chatContext.op === 'inversion' ? '#af52de' : '#009d71';
  const chartZoneLabel = chatContext.barrio && chatContext.barrio !== 'Todos' ? chatContext.barrio : chatContext.district;
  const chartData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: `Precio Medio (${chartZoneLabel})`,
        data: seriesData.map(d => d.precio_m2 || 0),
        borderColor: chartColor,
        backgroundColor: chartColor,
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false
      },
      legend: { display: true, position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${new Intl.NumberFormat('es-ES').format(ctx.raw)}€/m²`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f5f5f7' }, border: { display: false } }
    }
  };

  return (
    <div className="ambi-app-root">
      
      {/* 1. SECCIÓN IZQUIERDA (NAV BAR MINIMALISTA) */}
      <nav className="ambi-nav-sidebar">
        <div className="nav-brand-small" onClick={() => router.push('/')} style={{ cursor: 'pointer', marginBottom: '20px', textAlign: 'center' }}>
          <img src="/AMBI.png" alt="AMBI" style={{ width: '40px', height: '40px', objectFit: 'contain', opacity: 0.9 }} />
        </div>
        <button className="nav-icon-btn" onClick={() => router.push('/madrid')}>
          <span className="icon">🏠</span>
        </button>
        <div className="nav-divider" />
        <button className="nav-icon-btn active">
          <span className="icon">💬</span>
        </button>
        <button className="nav-icon-btn" onClick={() => router.push('/dashboard')}>
          <span className="icon">📊</span>
        </button>
      </nav>

      {/* ÁREA DE TRABAJO (CENTRO + DERECHA) */}
      <div className="ambi-workspace">
        
        {/* 2. SECCIÓN CENTRAL (CHATBOT) */}
        <section className="ambi-chat-section">
          <div className="chat-container">
            {!hasStarted && (
              <div className="chat-welcome-hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src="/AMBI.png" alt="AMBI" style={{ width: '240px', height: '240px', objectFit: 'contain', marginBottom: '16px' }} />
                <h1>Bienvenido, soy Ambi</h1>
                <p>Tu asistente personal inmobiliario. Pregúntame sobre barrios, precios o tendencias en Madrid.</p>
              </div>
            )}
            
            <div className="chat-messages-area" ref={messagesContainerRef} style={{ flex: 1, minHeight: 0, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`message-bubble ${msg.role}`} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#0071e3' : '#f5f5f7',
                  color: msg.role === 'user' ? 'white' : '#1d1d1f',
                  padding: '12px 18px',
                  borderRadius: '18px',
                  maxWidth: '85%',
                  lineHeight: '1.5',
                  fontSize: '15px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="message-bubble assistant" style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#f5f5f7',
                  color: '#1d1d1f',
                  padding: '12px 18px',
                  borderRadius: '18px',
                  maxWidth: '85%',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#86868b', borderRadius: '50%', animation: 'blink 1.4s infinite both' }}></span>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#86868b', borderRadius: '50%', animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }}></span>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#86868b', borderRadius: '50%', animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }}></span>
                  <style>{`@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }`}</style>
                </div>
              )}
            </div>

            {/* Caja de escritura exclusiva de esta sección */}
            <div className="chat-input-dock">
              <div className="input-pill">
                <input 
                  type="text" 
                  placeholder="Pregúntale a Ambi..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="mic-btn">🎙️</button>
                <button className="send-btn-round" onClick={handleSend} disabled={isLoading || !message.trim()} style={{ opacity: isLoading || !message.trim() ? 0.5 : 1 }}>↑</button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECCIÓN DERECHA (INFORMACIÓN VISUAL DINÁMICA) */}
        <section className="ambi-visual-section" style={{ flex: 1, minHeight: 0, backgroundColor: '#f5f5f7', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
              Evolución {chatContext.op.charAt(0).toUpperCase() + chatContext.op.slice(1)} ({chatContext.year})
            </h3>
            <div style={{ height: '220px', width: '100%' }}>
              {seriesData.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#86868b' }}>
                  No hay datos de tendencia para este contexto.
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexGrow: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
              Mapa de Calor: {chatContext.barrio && chatContext.barrio !== 'Todos' ? chatContext.barrio : (chatContext.district === 'Todos' ? 'Madrid' : chatContext.district)}
            </h3>
            <div style={{ flexGrow: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
              {(() => {
                const mapType = chatContext.barrio && chatContext.barrio !== 'Todos' ? 'neighborhoods' : 'districts';
                const mapDataList = mapType === 'neighborhoods' ? mapData.neighborhoods : mapData.districts;
                return mapDataList && mapDataList.length > 0 ? (
                  <MadridMap 
                    type={mapType}
                    data={mapDataList}
                    selectedYear={Number(chatContext.year)}
                    selectedMonth="Abril" 
                    selectedProfile={chatContext.op === 'alquiler' ? 'Alquiler' : chatContext.op === 'inversion' ? 'Inversión' : 'Venta'} 
                    selectedDistrict={chatContext.district === 'Todos' ? null : chatContext.district}
                    selectedBarrio={chatContext.barrio === 'Todos' ? null : chatContext.barrio}
                    onDistrictClick={() => {}}
                  />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#86868b', backgroundColor: '#f0f0f0' }}>
                    Cargando mapa...
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#86868b', marginBottom: '5px' }}>Precio Medio m²</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: chartColor }}>
                {kpiData?.precio_m2 ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(kpiData.precio_m2) + ' €' : '---'}
              </div>
              <div style={{ fontSize: '12px', color: kpiData?.variacion_anual > 0 ? '#34c759' : '#ff3b30', marginTop: '5px', fontWeight: 500 }}>
                {kpiData?.variacion_anual ? (kpiData.variacion_anual > 0 ? '+' : '') + kpiData.variacion_anual.toFixed(1) + '% (anual)' : ''}
              </div>
            </div>
            
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: '#86868b', marginBottom: '5px' }}>{chatContext.op === 'alquiler' ? 'Renta Mensual Media' : 'Precio Total Medio'}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f' }}>
                {kpiData?.precio_vivienda ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(kpiData.precio_vivienda) + ' €' : '---'}
              </div>
              <div style={{ fontSize: '12px', color: '#86868b', marginTop: '5px' }}>
                {chatContext.barrio && chatContext.barrio !== 'Todos' 
                  ? `Promedio en ${chatContext.barrio}` 
                  : (chatContext.district === 'Todos' ? 'Promedio en Madrid' : `Promedio en ${chatContext.district}`)}
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default MadridChat;
