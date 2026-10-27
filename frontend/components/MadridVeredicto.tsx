'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Download,
  Building2,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { VeredictoResponse, VeredictoEstado } from '../types/veredicto';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function MadridVeredicto() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  // Modo de entrada: 'url' o 'manual'
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [operacion, setOperacion] = useState<'Venta' | 'Alquiler'>('Venta');

  // Campos del formulario
  const [urlInput, setUrlInput] = useState('');
  const [precioInput, setPrecioInput] = useState('');
  const [metrosInput, setMetrosInput] = useState('');
  const [barrioInput, setBarrioInput] = useState('Goya');

  // Estados de carga y resultado
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VeredictoResponse | null>(null);

  // Estado para token de descarga directa si viene del checkout
  const [downloadToken, setDownloadToken] = useState<string | null>(tokenParam);

  // Lista de barrios sugeridos frecuentes
  const barriosSugeridos = [
    'Goya', 'Recoletos', 'Castellana', 'Almagro', 'Trafalgar', 'Justicia',
    'Cortes', 'Palacio', 'Embajadores', 'Universidad', 'Sol', 'Argüelles',
    'Vallehermoso', 'Prosperidad', 'El Viso', 'Hispanoamérica', 'Lista',
    'Ibiza', 'Jerónimos', 'Pacífico', 'Chamberí', 'Salamanca', 'Retiro', 'Centro'
  ];

  useEffect(() => {
    if (tokenParam) {
      setDownloadToken(tokenParam);
    }
  }, [tokenParam]);

  // Manejador para extraer datos desde la URL
  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMessage('Por favor, introduce una dirección web de Idealista o Fotocasa.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setInfoNotice(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/veredicto/extraer-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      if (!res.ok) {
        throw new Error('No fue posible conectar con el servicio de extracción.');
      }

      const data = await res.json();

      if (data.precio) setPrecioInput(String(data.precio));
      if (data.metros) setMetrosInput(String(data.metros));
      if (data.barrio) setBarrioInput(data.barrio);
      if (data.operacion) setOperacion(data.operacion as 'Venta' | 'Alquiler');

      if (data.requiere_manual) {
        setInfoNotice(
          data.error_mensaje ||
          'El portal requiere verificación antibot o faltan datos. Revisa o completa los campos abajo para emitir el veredicto.'
        );
        setActiveTab('manual');
      } else {
        // Si todos los datos están completos, evaluar directamente
        await ejecutarEvaluacion(Number(data.precio), Number(data.metros), data.barrio, data.operacion);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el enlace. Puedes introducir los datos manualmente.');
      setActiveTab('manual');
    } finally {
      setIsExtracting(false);
    }
  };

  // Manejador para evaluación manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(precioInput);
    const metros = parseFloat(metrosInput);

    if (isNaN(precio) || precio <= 0) {
      setErrorMessage('Introduce un precio válido mayor que cero.');
      return;
    }
    if (isNaN(metros) || metros <= 0) {
      setErrorMessage('Introduce una superficie en m² válida mayor que cero.');
      return;
    }
    if (!barrioInput.trim()) {
      setErrorMessage('Indica el barrio o distrito de Madrid.');
      return;
    }

    await ejecutarEvaluacion(precio, metros, barrioInput.trim(), operacion);
  };

  const ejecutarEvaluacion = async (precio: number, metros: number, barrio: string, op: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/veredicto/evaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precio,
          metros,
          barrio,
          operacion: op
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al calcular el veredicto del inmueble.');
      }

      if (data.requiere_manual) {
        setInfoNotice(data.mensaje);
        setActiveTab('manual');
      } else {
        setResultado(data as VeredictoResponse);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al evaluar el inmueble.');
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar pasarela de pago Stripe
  const handleComprarDossier = async (tipo: 'dossier' | 'suscripcion') => {
    if (!resultado) return;

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
      const res = await fetch(`${API_BASE_URL}/api/veredicto/crear-sesion-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          datos_inmueble: {
            precio: resultado.precio_m2_inmueble * (parseFloat(metrosInput) || 80),
            metros: parseFloat(metrosInput) || 80,
            barrio: resultado.barrio_nombre,
            distrito: resultado.distrito_nombre,
            operacion
          },
          success_url: currentUrl,
          cancel_url: currentUrl
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Error iniciando la pasarela de pago. Por favor, inténtalo de nuevo.');
    }
  };

  const badgeConfig: Record<VeredictoEstado, { label: string; bg: string; text: string; border: string }> = {
    CARO: {
      label: 'SOBREPRECIO DETECTADO',
      bg: 'bg-red-950/40',
      text: 'text-red-400',
      border: 'border-red-800/60'
    },
    BARATO: {
      label: 'OPORTUNIDAD DE PRECIO',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60'
    },
    EN_LINEA: {
      label: 'EN PRECIO DE MERCADO',
      bg: 'bg-blue-950/40',
      text: 'text-blue-400',
      border: 'border-blue-800/60'
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans">
      {/* 1. Header de Navegación */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-100 font-semibold text-lg tracking-tight hover:opacity-90 transition">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span>Madrid Urban Intelligence</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/madrid" className="text-slate-400 hover:text-slate-200 transition">
              Dashboard Analítico
            </Link>
            <Link href="/madrid/veredicto" className="text-blue-400 font-medium border-b-2 border-blue-500 pb-0.5">
              El Veredicto
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Contenedor Principal */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        {/* Banner de descarga post-pago si viene de Stripe */}
        {downloadToken && (
          <div className="mb-8 p-5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-200 text-sm">Pago verificado con éxito</p>
                <p className="text-xs text-emerald-300/80">Tu Dossier Oficial de Negociación está generado y listo para descargar en PDF.</p>
              </div>
            </div>
            <a
              href={`${API_BASE_URL}/api/veredicto/descargar-dossier?token=${downloadToken}`}
              download
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </a>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditoría basada en series oficiales de cierre del Ayuntamiento de Madrid</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            El Veredicto Inmobiliario
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Descubre si un piso tiene sobreprecio o es una oportunidad contrastándolo con las operaciones reales de cierre de su barrio.
          </p>
        </div>

        {/* Selector de Operación (Venta / Alquiler) */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setOperacion('Venta')}
              className={`px-6 py-2 rounded-lg text-xs font-semibold transition ${
                operacion === 'Venta'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comprar / Venta
            </button>
            <button
              type="button"
              onClick={() => setOperacion('Alquiler')}
              className={`px-6 py-2 rounded-lg text-xs font-semibold transition ${
                operacion === 'Alquiler'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alquiler
            </button>
          </div>
        </div>

        {/* Tarjeta de Entrada (Pestañas: URL vs Manual) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-10 backdrop-blur-sm">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-3.5 text-xs md:text-sm font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === 'url'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Pegar enlace (Idealista o Fotocasa)</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3.5 text-xs md:text-sm font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === 'manual'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Entrada manual (3 datos)</span>
            </button>
          </div>

          <div className="p-6 md:p-8">
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoNotice && (
              <div className="mb-6 p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-300 text-xs flex items-center gap-3">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>{infoNotice}</span>
              </div>
            )}

            {/* PESTAÑA 1: Pegar URL */}
            {activeTab === 'url' ? (
              <form onSubmit={handleExtractUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                    Enlace de Idealista, Fotocasa o Habitaclia
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://www.idealista.com/inmueble/10543210/..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      disabled={isExtracting}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-slate-500">
                    Si el portal aplica protección antibot, podrás rellenar los datos manualmente sin esperas.
                  </span>
                  <button
                    type="submit"
                    disabled={isExtracting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/50"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analizando enlace...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Analizar Inmueble</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* PESTAÑA 2: Entrada Manual */
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Precio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                      Precio ({operacion === 'Venta' ? '€' : '€/mes'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={precioInput}
                      onChange={(e) => setPrecioInput(e.target.value)}
                      placeholder={operacion === 'Venta' ? 'Ej. 380000' : 'Ej. 1400'}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      required
                    />
                  </div>

                  {/* Metros */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                      Superficie (m²)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={metrosInput}
                      onChange={(e) => setMetrosInput(e.target.value)}
                      placeholder="Ej. 75"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      required
                    />
                  </div>

                  {/* Barrio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                      Barrio o Distrito
                    </label>
                    <input
                      type="text"
                      list="barrios-list"
                      value={barrioInput}
                      onChange={(e) => setBarrioInput(e.target.value)}
                      placeholder="Ej. Goya, Almagro..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                      required
                    />
                    <datalist id="barrios-list">
                      {barriosSugeridos.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Calculando veredicto...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Obtener Veredicto Inmediato</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 3. Resultados del Veredicto */}
        {resultado && (
          <div className="space-y-8 animate-fadeIn">
            {/* Tarjeta de Veredicto Principal */}
            <div className={`p-6 md:p-8 rounded-2xl border ${badgeConfig[resultado.estado].border} ${badgeConfig[resultado.estado].bg} backdrop-blur-md shadow-2xl`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2 ${badgeConfig[resultado.estado].text} bg-slate-950/60 border ${badgeConfig[resultado.estado].border}`}>
                    {badgeConfig[resultado.estado].label}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    {resultado.estado === 'CARO' && `Sobreprecio del +${resultado.desviacion_pct_barrio.toFixed(1)}%`}
                    {resultado.estado === 'BARATO' && `Descuento del ${resultado.desviacion_pct_barrio.toFixed(1)}%`}
                    {resultado.estado === 'EN_LINEA' && 'Alineado con el mercado oficial'}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Zona analizada</p>
                  <p className="text-base font-bold text-slate-100">{resultado.barrio_nombre} ({resultado.distrito_nombre})</p>
                  <p className="text-xs text-slate-500">Datos oficiales: {resultado.fecha_cierre_referencia}</p>
                </div>
              </div>

              {/* Grid de 4 Indicadores Clave */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <p className="text-xs text-slate-400 mb-1">Inmueble analizado</p>
                  <p className="text-xl font-bold text-white">{resultado.precio_m2_inmueble.toLocaleString()} €/m²</p>
                  <p className="text-[11px] text-slate-500">Ratio resultante</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <p className="text-xs text-slate-400 mb-1">Media en {resultado.barrio_nombre}</p>
                  <p className="text-xl font-bold text-slate-200">{resultado.precio_m2_barrio_medio.toLocaleString()} €/m²</p>
                  <p className={`text-[11px] font-semibold ${resultado.desviacion_pct_barrio > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {resultado.desviacion_pct_barrio > 0 ? '+' : ''}{resultado.desviacion_pct_barrio.toFixed(1)}% vs barrio
                  </p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <p className="text-xs text-slate-400 mb-1">Media en Madrid</p>
                  <p className="text-xl font-bold text-slate-200">{resultado.precio_m2_madrid_medio.toLocaleString()} €/m²</p>
                  <p className={`text-[11px] font-semibold ${resultado.desviacion_pct_madrid > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {resultado.desviacion_pct_madrid > 0 ? '+' : ''}{resultado.desviacion_pct_madrid.toFixed(1)}% vs Madrid
                  </p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <p className="text-xs text-slate-400 mb-1">Margen de negociación</p>
                  <p className="text-xl font-bold text-blue-400">
                    {resultado.margen_negociacion_estimado_eur > 0
                      ? `${resultado.margen_negociacion_estimado_eur.toLocaleString()} €`
                      : '0 € (En precio)'}
                  </p>
                  <p className="text-[11px] text-slate-500">Descuento objetivo sugerido</p>
                </div>
              </div>
            </div>

            {/* Argumentos Tácticos para la Negociación */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Argumentario para negociar con el vendedor o justificar ante el banco</span>
              </h3>
              <div className="space-y-3">
                {resultado.resumen_argumentos.map((arg, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs md:text-sm text-slate-300 leading-relaxed flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-800/60 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{arg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN DE MONETIZACIÓN: Dossier Oficial (4,90 €) + Suscripción Pro */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-blue-950/30 border border-blue-800/40 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-blue-300 bg-blue-900/40 border border-blue-700/50 uppercase">
                  Documento Certificado para Negociación
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Descarga el Dossier Oficial de Negociación en PDF
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Informe imprimible de alta fidelidad con el histórico municipal de cierre del Ayuntamiento de Madrid, métricas de comparables en {resultado.barrio_nombre} y los 5 argumentos estructurados para presentar al propietario, agencia o departamento de riesgos de tu banco.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleComprarDossier('dossier')}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Dossier Completo (4,90 €)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleComprarDossier('suscripcion')}
                  className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-[11px] font-medium transition text-center"
                >
                  Tarifa Pro Inversores: 19 €/mes (Análisis ilimitados)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 bg-[#0A0F1D]">
        <div className="max-w-6xl mx-auto px-4">
          <p className="mb-2">Madrid Urban Intelligence — Plataforma analítica de precios inmobiliarios y series oficiales.</p>
          <p className="text-[11px] text-slate-600">
            Las estimaciones y veredictos se generan a partir de datos estadísticos públicos del Ayuntamiento de Madrid. No constituyen tasación pericial oficial conforme a la Orden ECO/805/2003.
          </p>
        </div>
      </footer>
    </div>
  );
}
