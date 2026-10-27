import React from 'react';
import { useRouter } from 'next/navigation';
import './MadridLanding.css';

const MadridLanding: React.FC = () => {
  const router = useRouter();

  const handleChatClick = () => {
    router.push('/madrid/chat');
  };
  return (
    <div className="apple-landing-root" data-od-id="madrid-intelligence-landing">
      {/* 2. NAVBAR APPLE (BLURRED) */}
      <nav className="top-navbar">
        <div className="nav-container">
          <a href="/" className="nav-logo">Madrid Urban Intelligence</a>
          <div className="nav-links">
            <a href="/madrid/veredicto" className="nav-item font-semibold text-blue-400">El Veredicto</a>
            <a href="/madrid" className="nav-item">Dashboard Analítico</a>
            <a href="/madrid/chat" className="nav-item">Asistente AMBI</a>
          </div>
        </div>
      </nav>

      {/* 3. HERO SECTION (DARK CHAPTER) */}
      <section className="hero-chapter">
        <div className="hero-content">
          <h1 className="hero-title">
            Chatea con Ambi,<br />
            <span className="hero-gradient-text">nuestro modelo analítico inteligente</span>
          </h1>
          <p className="hero-subtitle">
            ¿Qué te gustaría saber de las viviendas en Madrid?<br />
            Pregúntale a nuestra guía o selecciona tu perfil abajo.
          </p>
          <div className="cta-group">
            <button className="btn-primary" onClick={handleChatClick}>Hablar con AMBI</button>
            <a href="/madrid/veredicto" className="apple-link">Probar El Veredicto &gt;</a>
          </div>

          {/* Gancho Hero para El Veredicto */}
          <div className="veredicto-hero-card" style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '1rem', maxWidth: '36rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'left', backdropFilter: 'blur(8px)' }}>
            <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Herramienta de Negociación Oficial
            </span>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F1F5F9', margin: '0 0 0.75rem 0' }}>
              ¿Has visto un piso en Idealista o Fotocasa? Descubre si tiene sobreprecio contrastándolo con las operaciones reales de cierre del Ayuntamiento de Madrid.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => router.push('/madrid/veredicto')}
                style={{ flex: 1, padding: '0.75rem 1rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Comprobar Piso con El Veredicto →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PERFILES (LIGHT CHAPTER) */}
      <section className="profiles-chapter">
        <div className="chapter-container">
          <h2 className="chapter-title">Diseñado para cada necesidad</h2>
          <div className="profile-grid">
            <div className="apple-card">
              <div className="card-image-area bg-alquiler"></div>
              <div className="card-content">
                <h3 className="card-title">Alquiler</h3>
                <p className="card-desc">En modalidad de alquiler, busca asequibilidad y conveniencia para encontrar el hogar ideal.</p>
                <a href="/madrid?profile=alquiler" className="card-link">Explorar →</a>
              </div>
            </div>

            <div className="apple-card">
              <div className="card-image-area bg-compra"></div>
              <div className="card-content">
                <h3 className="card-title">Compra</h3>
                <p className="card-desc">Busca un hogar, estabilidad y máxima calidad de vida, con un enfoque estratégico.</p>
                <a href="/madrid?profile=compra" className="card-link">Explorar →</a>
              </div>
            </div>

            <div className="apple-card">
              <div className="card-image-area bg-venta"></div>
              <div className="card-content">
                <h3 className="card-title">Venta</h3>
                <p className="card-desc">Busca maximizar el beneficio y el mejor timing de venta de tu propiedad.</p>
                <a href="/madrid?profile=venta" className="card-link">Explorar →</a>
              </div>
            </div>

            <div className="apple-card">
              <div className="card-image-area bg-inversion"></div>
              <div className="card-content">
                <h3 className="card-title">Inversión</h3>
                <p className="card-desc">Busca rentabilidad financiera sólida e ingresos pasivos a través de activos estratégicos.</p>
                <a href="/madrid?profile=inversion" className="card-link">Explorar →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CÓMO FUNCIONA */}
      <section className="how-it-works">
        <h2 className="how-title">Cómo funciona</h2>
        <div className="steps-container">
          <div className="step-item">
            <span className="step-number">01</span>
            <h4 className="step-text">Elige tu perfil</h4>
            <p className="step-subtext">Personaliza tu experiencia de análisis desde el inicio.</p>
          </div>
          <div className="step-item">
            <span className="step-number">02</span>
            <h4 className="step-text">Chatea con AMBI</h4>
            <p className="step-subtext">Consulta dudas complejas y recibe insights en tiempo real.</p>
          </div>
          <div className="step-item">
            <span className="step-number">03</span>
            <h4 className="step-text">Explora datos</h4>
            <p className="step-subtext">Navega por dashboards interactivos de última generación.</p>
          </div>
          <div className="step-item">
            <span className="step-number">04</span>
            <h4 className="step-text">Predice el futuro</h4>
            <p className="step-subtext">Visualiza tendencias de mercado con Machine Learning.</p>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="faq-chapter">
        <div className="faq-box">
          <h2 className="faq-title">Preguntas Frecuentes</h2>
          <details className="faq-item">
            <summary>¿Cómo funciona el chat con AMBI?</summary>
            <div className="faq-answer">Utiliza modelos de lenguaje avanzados entrenados con datos urbanos específicos de Madrid para darte respuestas precisas.</div>
          </details>
          <details className="faq-item">
            <summary>¿Qué destaca de este programa?</summary>
            <div className="faq-answer">La capacidad de cruzar datos históricos con proyecciones de IA para perfiles específicos.</div>
          </details>
          <details className="faq-item">
            <summary>¿Cuánto cuesta?</summary>
            <div className="faq-answer">El acceso a la información, el chat con AMBI y los cuadros de mando es totalmente gratuito y libre.</div>
          </details>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="apple-footer">
        <div className="footer-content">
          <div className="footer-brand">Madrid Urban Intelligent</div>
          <div className="footer-slogan">&ldquo;Transformando datos urbanos en decisiones inteligentes para todos los ciudadanos.&rdquo;</div>
          <div className="footer-bottom">
            <span>© 2026 Madrid Urban Intelligent. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MadridLanding;
