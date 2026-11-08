'use client';

import { SiteFooter } from './SiteChrome';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import DeferredMadridDistrictMap from './DeferredMadridDistrictMap';
import MadridHeroArtwork from './MadridHeroArtwork';
import LandingTrend from './LandingTrend';
import MadridMarquee from './MadridMarquee';
import MadridDataGlobe from './MadridDataGlobe';
import { StatCounter } from './MadridStatsCounter';
import './MadridLanding.css';

const profiles = [
  { title: 'Alquiler', text: 'Comprueba el precio real del m² por barrio y detecta dónde la renta ha tocado techo.', href: '/madrid?profile=alquiler' },
  { title: 'Compra', text: 'Descubre qué zonas están infravaloradas y calcula tu ratio real de esfuerzo financiero.', href: '/madrid?profile=compra' },
  { title: 'Venta', text: 'Fija el precio de salida con transacciones reales firmadas, no con anuncios estancados.', href: '/madrid?profile=venta' },
  { title: 'Inversión', text: 'Localiza barrios con rentabilidad bruta superior al 6% y previsiones a 2026-2027.', href: '/madrid?profile=inversion' },
];


export default function MadridLanding() {
  const [trendHighlight, setTrendHighlight] = useState<'real' | 'prediction' | 'all'>('all');
  return (
    <div className="mi-home" id="inicio">
      <div className="mi-atmosphere" aria-hidden="true"/>
      <header className="mi-header">
        <Link href="/" className="mi-brand" aria-label="Decide Madrid: Invierte Y Compra, inicio">
          <span className="mi-brand__mark">
            <Image src="/decide-madrid-mark.webp" alt="" width={34} height={34} priority />
          </span>
          <span>Decide Madrid: Invierte Y Compra</span>
        </Link>
        <nav className="mi-nav" aria-label="Navegación principal">
          <a href="#plataforma">Plataforma</a>
          <a href="#impacto">A quién ayuda</a>
          <Link href="/madrid/chat">AMBI</Link>
          <Link href="/madrid/veredicto">El Veredicto</Link>
        </nav>
        <Link href="/madrid" className="mi-header__cta">
          Ver Precios de Cierre <ArrowUpRight aria-hidden="true"/>
        </Link>
      </header>

      <main id="contenido-principal">
        {/* 0. HERO: Claridad en 3 segundos */}
        <section className="mi-hero" aria-labelledby="mi-title">
          <div className="mi-hero__content">
            <p className="mi-hero__kicker">DMIYC</p>
            <h1 id="mi-title">No adivines.<br/><span>Decide con datos.</span></h1>
            <p className="mi-hero__lead">Compra o alquila con precios de cierre oficial en los 131 barrios de Madrid, sin caer en precios inflados.</p>
            <Link href="/madrid" className="mi-hero__cta-main">Explorar precios de cierre <ArrowUpRight aria-hidden="true"/></Link>
          </div>
          <MadridHeroArtwork />
          <div className="mi-hero__meta"><span>21 distritos</span><i/><span>131 barrios auditados</span></div>
          <a className="mi-scroll" href="#lectura"><span>Desplázate para descubrir tu barrio</span><ArrowDown aria-hidden="true"/></a>
        </section>

        {/* 1. EL DOLOR: Desfase entre el precio anunciado y el precio de cierre oficial */}
        <p className="mi-bridge" aria-label="El precio que pide el anuncio casi nunca es el precio por el que se firma.">
          El precio que pide el anuncio <span>casi nunca es el precio por el que se firma.</span>
        </p>

        {/* MÓDULO 1: Mercado en tiempo real y proyección predictiva ML */}
        <section className="mi-insight" id="predicciones" aria-labelledby="mi-insight-title">
          <div className="mi-wrap">
            <div className="mi-auros-frame">
              <div className="mi-auros-frame__header">
                <span className="mi-auros-frame__tag">MERCADO EN TIEMPO REAL</span>
                <Link href="/madrid" className="mi-auros-frame__cta">
                  Ver evolución completa <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>

              <div className="mi-auros-frame__body">
                {/* Surface Card (Navy Raised Surface #1A2B4E) */}
                <div className="mi-auros-card">
                  <div className="mi-auros-card__head">
                    <p className="mi-kicker mi-kicker--muted">PREDICCIÓN Y TENDENCIA</p>
                    <h2 id="mi-insight-title" className="mi-auros-card__title">
                      Sabe hacia dónde va el precio<br />
                      <span>antes de que cambie el mercado.</span>
                    </h2>
                  </div>

                  <div className="mi-auros-features">
                    <Link 
                      href="/madrid" 
                      className={`mi-auros-feature ${trendHighlight === 'real' ? 'mi-auros-feature--active' : ''}`}
                      onMouseEnter={() => setTrendHighlight('real')}
                      onMouseLeave={() => setTrendHighlight('all')}
                    >
                      <div className="mi-auros-feature__header">
                        <h3>Datos de cierre oficiales</h3>
                        <span className="mi-auros-arrow" aria-hidden="true"><ArrowUpRight /></span>
                      </div>
                      <p>Trayectoria consolidada de transacciones reales mes a mes desde 2023, sin distorsión de anuncios inflados.</p>
                    </Link>

                    <div 
                      className={`mi-auros-feature ${trendHighlight === 'prediction' ? 'mi-auros-feature--active' : ''}`}
                      onMouseEnter={() => setTrendHighlight('prediction')}
                      onMouseLeave={() => setTrendHighlight('all')}
                    >
                      <div className="mi-auros-feature__header">
                        <h3>Machine Learning calibrado</h3>
                        <span className="mi-auros-arrow" aria-hidden="true"><ArrowUpRight /></span>
                      </div>
                      <p>Modelos predictivos que proyectan la curva de precios de cada distrito distinguiendo el dato real de la estimación.</p>
                    </div>

                    <Link 
                      href="/metodologia" 
                      className={`mi-auros-feature ${trendHighlight === 'all' ? 'mi-auros-feature--active' : ''}`}
                      onMouseEnter={() => setTrendHighlight('all')}
                      onMouseLeave={() => setTrendHighlight('all')}
                    >
                      <div className="mi-auros-feature__header">
                        <h3>Rigor metodológico y fuentes</h3>
                        <span className="mi-auros-arrow" aria-hidden="true"><ArrowUpRight /></span>
                      </div>
                      <p>Auditoría constante contra registros públicos y compraventas oficiales para garantizar máxima certidumbre.</p>
                    </Link>
                  </div>
                </div>

                {/* Right side: Grand Visual Pane with the Trend Chart */}
                <div className="mi-auros-visual">
                  <LandingTrend highlightMode={trendHighlight} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. LA BRECHA TERRITORIAL: Concreción física del sobreprecio */}
        <p className="mi-bridge" aria-label="Cruzar una sola calle en Madrid puede cambiar el metro cuadrado en 800 euros.">
          Cruzar una sola calle en Madrid <span>puede cambiar el metro cuadrado en 800 €.</span>
        </p>

        {/* MÓDULO 2: Elige tu objetivo (4 perfiles operativos) + Mapa interactivo de distritos */}
        <section className="mi-platform" id="plataforma" aria-labelledby="mi-platform-title">
          <div className="mi-wrap">
            <div className="mi-platform__intro">
              <p className="mi-kicker mi-kicker--muted">Un motor para cada decisión</p>
              <h2 id="mi-platform-title">Elige tu objetivo.<br/><span>Domina los números.</span></h2>
            </div>
            <div className="mi-platform__frame">
              <div className="mi-platform__grid">
                <div className="mi-profile-list">
                  {profiles.map(({title,text,href}) => (
                    <Link className="mi-profile" href={href} key={title}>
                      <span className="mi-profile__copy">
                        <strong>{title}</strong>
                        <small>{text}</small>
                      </span>
                      <span className="mi-profile__arrow"><ArrowUpRight aria-hidden="true"/></span>
                    </Link>
                  ))}
                  <Link href="/madrid/veredicto" className="mi-verdict">
                    <span>
                      <strong>El Veredicto</strong>
                      <small>Pega el enlace de un piso y audita si te cobran de más con datos de cierre de su zona.</small>
                    </span>
                    <ArrowUpRight aria-hidden="true"/>
                  </Link>
                </div>
                <aside className="mi-city-visual">
                  <DeferredMadridDistrictMap/>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* 3. FIABILIDAD TOTAL: Cifras oficiales y aval institucional */}
        <p className="mi-bridge" aria-label="¿De dónde sale cada cifra? Datos oficiales de cierre, cero especulación.">
          ¿De dónde sale cada cifra? <span>Datos oficiales de cierre, cero especulación.</span>
        </p>

        {/* MÓDULO 3A: Escala y rigor analítico (16.779 transacciones oficiales) */}
        <section className="mi-scale" id="impacto" aria-labelledby="mi-scale-title">
          <div className="mi-wrap">
            <div className="mi-scale__heading">
              <p className="mi-kicker mi-kicker--muted">Rigor analítico masivo</p>
              <h2 id="mi-scale-title">Una ciudad.<br/><span>Datos reales sin sesgo.</span></h2>
            </div>
            <div className="mi-scale__stats">
              {/* Card 1: Light Cream Contrasting Volume Card (Auros In Numbers Volume Card) */}
              <article className="mi-scale__stat mi-scale__stat--volume">
                <span className="mi-scale__stat-label">REGISTROS ANALÍTICOS</span>
                <div className="mi-scale__stat-bottom">
                  <strong className="mi-scale__stat-number"><StatCounter end={16779} /></strong>
                  <small className="mi-scale__stat-desc">10.794 transacciones oficiales de cierre y 5.985 estimaciones auditadas.</small>
                </div>
              </article>

              {/* Card 2: Distritos */}
              <article className="mi-scale__stat">
                <span className="mi-scale__stat-label">DISTRITOS</span>
                <div className="mi-scale__stat-bottom">
                  <strong className="mi-scale__stat-number"><StatCounter end={21} /></strong>
                  <small className="mi-scale__stat-desc">Cobertura total de la capital de punta a punta</small>
                </div>
              </article>

              {/* Card 3: Barrios */}
              <article className="mi-scale__stat">
                <span className="mi-scale__stat-label">BARRIOS</span>
                <div className="mi-scale__stat-bottom">
                  <strong className="mi-scale__stat-number"><StatCounter end={131} /></strong>
                  <small className="mi-scale__stat-desc">El detalle quirúrgico detrás de cada tendencia</small>
                </div>
              </article>

              {/* Card 4: Habitantes */}
              <article className="mi-scale__stat mi-scale__stat--population">
                <span className="mi-scale__stat-label">HABITANTES</span>
                <div className="mi-scale__stat-bottom">
                  <strong className="mi-scale__stat-number"><StatCounter end={3.49} decimals={2} unit="M" /></strong>
                  <small className="mi-scale__stat-desc">
                    <a href="https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Notas-de-prensa/Los-nacimientos-superaron-a-las-defunciones-en-564-personas-en-2025-un-crecimiento-vegetativo-que-no-se-producia-en-Madrid-desde-hacia-seis-anos/?vgnextchannel=6091317d3d2a7010VgnVCM100000dc0ca8c0RCRD&amp;vgnextfmt=default&amp;vgnextoid=81bdd56de9ddd910VgnVCM100000891ecb1aRCRD" target="_blank" rel="noreferrer">
                      Padrón oficial a 1 de enero de 2026 ↗
                    </a>
                  </small>
                </div>
              </article>

              {/* Card 5: Perfiles Especializados */}
              <article className="mi-scale__stat">
                <span className="mi-scale__stat-label">PERFILES ESPECIALIZADOS</span>
                <div className="mi-scale__stat-bottom">
                  <strong className="mi-scale__stat-number"><StatCounter end={4} /></strong>
                  <small className="mi-scale__stat-desc">Alquiler · Compra · Venta · Inversión</small>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* MÓDULO 3B: Respaldo institucional Auros Trust (Ayuntamiento, SATEC, UPM) */}
        <section className="mi-trust" id="premios" aria-labelledby="mi-trust-title">
          <div className="mi-wrap">
            <div className="mi-trust-frame">
              <div className="mi-trust-frame__header">
                <p className="mi-trust-frame__kicker">RECONOCIMIENTO</p>
                <h2 id="mi-trust-title" className="mi-trust-frame__title">El respaldo de las instituciones</h2>
              </div>

              <div className="mi-trust-grid">
                {/* Columna 1: Ayuntamiento de Madrid */}
                <article className="mi-trust-col">
                  <blockquote className="mi-trust-col__quote">
                    “Premio a la innovación por transparentar los precios reales de cierre en los 131 barrios de Madrid con datos abiertos.”
                  </blockquote>
                  <div className="mi-trust-col__author">
                    <strong>2026</strong>
                    <span>Ayuntamiento de Madrid · Datos Abiertos</span>
                  </div>
                  <div className="mi-trust-col__logo-wrap">
                    <Image src="/logo-ayuntamiento-official.png" alt="Ayuntamiento de Madrid" width={600} height={160} unoptimized priority className="mi-trust-col__logo" />
                  </div>
                </article>

                {/* Columna 2: Grupo SATEC */}
                <article className="mi-trust-col">
                  <blockquote className="mi-trust-col__quote">
                    “Galardón al mejor proyecto de impacto sostenible por democratizar la información inmobiliaria y erradicar asimetrías.”
                  </blockquote>
                  <div className="mi-trust-col__author">
                    <strong>2025</strong>
                    <span>Grupo SATEC · Sostenibilidad e Innovación</span>
                  </div>
                  <div className="mi-trust-col__logo-wrap">
                    <Image src="/logo-satec-official.png" alt="Grupo SATEC" width={800} height={201} unoptimized priority className="mi-trust-col__logo" />
                  </div>
                </article>

                {/* Columna 3: Universidad Politécnica de Madrid (UPM) */}
                <article className="mi-trust-col">
                  <blockquote className="mi-trust-col__quote">
                    “Reconocimiento al rigor analítico y modelado predictivo avanzado aplicados a la toma de decisiones ciudadana.”
                  </blockquote>
                  <div className="mi-trust-col__author">
                    <strong>2025</strong>
                    <span>Universidad Politécnica de Madrid · UPM</span>
                  </div>
                  <div className="mi-trust-col__logo-wrap">
                    <Image src="/logo-upm-official.png" alt="Universidad Politécnica de Madrid" width={872} height={356} unoptimized priority className="mi-trust-col__logo mi-trust-col__logo--upm" />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CIERRE: Acción inequívoca sin puntos de fuga */}
        <section className="mi-closing" aria-labelledby="mi-closing-title">
          <div className="mi-closing__glow" aria-hidden="true">
            <MadridDataGlobe />
          </div>
          <div className="mi-wrap mi-closing__inner">
            <p className="mi-kicker">Toma el control con Decide Madrid</p>
            <h2 id="mi-closing-title">Tu mayor decisión financiera<br/><span>merece datos comprobados.</span></h2>
            <p>No compres, alquiles ni vendas a ciegas. Consulta los precios reales de cierre de tu barrio, esquiva el sobreprecio y negocia con certeza oficial.</p>
            <Link href="/madrid" className="mi-button mi-button--aurora">Entrar al cuadro de mando <ArrowUpRight aria-hidden="true"/></Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
