'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import DeferredMadridDistrictMap from './DeferredMadridDistrictMap';
import MadridHeroArtwork from './MadridHeroArtwork';
import LandingTrend from './LandingTrend';
import MadridMarquee from './MadridMarquee';
import MadridInsights from './MadridInsights';
import { StatCounter } from './MadridStatsCounter';
import './MadridLanding.css';

const profiles = [
  { title: 'Alquiler', text: 'Comprueba el precio real del m² por barrio y detecta dónde la renta ha tocado techo.', href: '/madrid?profile=alquiler' },
  { title: 'Compra', text: 'Descubre qué zonas están infravaloradas y calcula tu ratio real de esfuerzo financiero.', href: '/madrid?profile=compra' },
  { title: 'Venta', text: 'Fija el precio de salida con transacciones reales firmadas, no con anuncios estancados.', href: '/madrid?profile=venta' },
  { title: 'Inversión', text: 'Localiza barrios con rentabilidad bruta superior al 6% y previsiones a 2026-2027.', href: '/madrid?profile=inversion' },
];

const audiences = [
  ['Busco piso para vivir', 'Encuentra barrios acordes a tu presupuesto real y evita pagar sobreprecios absurdos por desconocer la zona.'],
  ['Quiero vender o alquilar', 'Fija un precio competitivo basado en escrituras y registros oficiales recientes para cerrar antes tu operación.'],
  ['Analizo el mercado', 'Accede a series históricas completas, ratios de liquidez, evolución trimestral y conectividad urbana.'],
  ['Evalúo una inversión', 'Filtra las zonas con mayor rentabilidad bruta por alquiler y detecta oportunidades con rigor analítico.'],
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

      <main>
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

        <p className="mi-bridge" aria-label="El precio que pide el anuncio casi nunca es el precio por el que se firma.">
          El precio que pide el anuncio <span>casi nunca es el precio por el que se firma.</span>
        </p>

        <section className="mi-statement" id="lectura" aria-labelledby="mi-statement-title">
          <div className="mi-wrap mi-statement__inner">
            <p className="mi-kicker mi-kicker--muted">Transparencia analítica radical</p>
            <h2 id="mi-statement-title" className="mi-kinetic"><span>Información</span><span>al alcance</span></h2>
            <div className="mi-statement__coordinates" aria-hidden="true"><span>21 DISTRITOS</span><span>131 BARRIOS</span><span>MADRID · DATOS ABIERTOS</span></div>
          </div>
        </section>

        <p className="mi-bridge" aria-label="Cruzar una sola calle en Madrid puede cambiar el metro cuadrado en 800 euros.">
          Cruzar una sola calle en Madrid <span>puede cambiar el metro cuadrado en 800 €.</span>
        </p>

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

        <p className="mi-bridge" aria-label="Para comprar, alquilar o invertir con criterio: la información es tu mejor regateo.">
          Para comprar, alquilar o invertir con criterio: <span>la información es tu mejor regateo.</span>
        </p>

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

        {/* Infinite Marquee of verified public sources (Auros Brand Band pattern) */}
        <MadridMarquee />

        <p className="mi-bridge" aria-label="Más de 16.000 operaciones y proyecciones para que nunca decidas a ciegas.">
          Más de 16.000 operaciones y proyecciones <span>para que nunca decidas a ciegas.</span>
        </p>

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

        {/* Reconocimientos y Premios Oficiales */}
        <section className="mi-awards" id="premios" aria-labelledby="mi-awards-title">
          <div className="mi-wrap">
            <div className="mi-awards__intro">
              <p className="mi-kicker mi-kicker--muted">RECONOCIMIENTO Y AUTORIDAD PÚBLICA</p>
              <h2 id="mi-awards-title">Premios de innovación.<br/><span>Avalados por instituciones.</span></h2>
              <p className="mi-awards__lead">La metodología, el rigor analítico y la transparencia de Decide Madrid han sido distinguidos oficialmente por entidades públicas y líderes tecnológicos.</p>
            </div>

            <div className="mi-awards__grid">
              {/* Premio 1: Ayuntamiento de Madrid (2026) */}
              <article className="mi-award-card">
                <div className="mi-award-card__header">
                  <div className="mi-award-card__logo-badge">
                    <Image
                      src="/logo-ayuntamiento-madrid-transparent.png"
                      alt="Ayuntamiento de Madrid"
                      width={160}
                      height={50}
                      className="mi-award-card__logo"
                    />
                  </div>
                  <span className="mi-award-card__year">2026</span>
                </div>
                <div className="mi-award-card__body">
                  <span className="mi-award-card__badge">GALARDÓN OFICIAL DE INNOVACIÓN</span>
                  <h3>Concurso de Reutilización de Datos Abiertos</h3>
                  <p className="mi-award-card__entity">Ayuntamiento de Madrid · Categoría Estudios e Investigaciones</p>
                  <p className="mi-award-card__desc">
                    Segundo premio concedido por el Ayuntamiento de Madrid al proyecto de análisis inteligente del mercado inmobiliario y cuadro de mando analítico basado en datos abiertos municipales para los 131 barrios de la capital.
                  </p>
                </div>
              </article>

              {/* Premio 2: Grupo SATEC & Universidad Politécnica de Madrid (2025) */}
              <article className="mi-award-card">
                <div className="mi-award-card__header">
                  <div className="mi-award-card__logo-badge">
                    <Image
                      src="/logo-satec-transparent.png"
                      alt="Grupo SATEC"
                      width={150}
                      height={40}
                      className="mi-award-card__logo"
                    />
                  </div>
                  <span className="mi-award-card__year">2025</span>
                </div>
                <div className="mi-award-card__body">
                  <span className="mi-award-card__badge">PREMIO TECNOLOGÍA & SOSTENIBILIDAD</span>
                  <h3>Premio SATEC al Impacto en Desarrollo Sostenible</h3>
                  <p className="mi-award-card__entity">Grupo SATEC & Universidad Politécnica de Madrid (UPM)</p>
                  <p className="mi-award-card__desc">
                    Reconocimiento otorgado por la multinacional de integración tecnológica SATEC y la UPM por el valor transformador del proyecto en sostenibilidad urbana, transparencia de precios y accesibilidad a la información pública.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>


        <p className="mi-bridge" aria-label="La mayor decisión financiera de tu vida merece datos comprobados.">
          La mayor decisión financiera de tu vida <span>merece datos comprobados.</span>
        </p>

        <section className="mi-audience" aria-labelledby="mi-audience-title">
          <div className="mi-wrap mi-audience__layout">
            <div className="mi-audience__intro">
              <p className="mi-kicker mi-kicker--muted">Hecho para decisiones cruciales</p>
              <h2 id="mi-audience-title">Un mismo Madrid.<br/><span>Tu propia respuesta.</span></h2>
              <p>Una herramienta independiente para que conozcas la realidad de la vivienda y negocies con la fuerza de los datos públicos.</p>
            </div>
            <div className="mi-audience__list">
              {audiences.map(([title,text]) => (
                <article key={title}>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <p className="mi-bridge" aria-label="Cero especulación: fuentes públicas municipales y rigor metodológico.">
          Cero especulación: <span>fuentes públicas municipales y rigor metodológico.</span>
        </p>

        <section className="mi-method" aria-labelledby="mi-method-title">
          <div className="mi-wrap mi-method__layout">
            <div className="mi-method__intro">
              <p className="mi-kicker mi-kicker--muted">Honestidad metodológica radical</p>
              <h2 id="mi-method-title">Dato oficial real.<br/><span>Estimación visible.</span></h2>
              <p>Aquí nunca te presentaremos una suposición como un hecho. Cada cifra expone su fuente y su grado de certidumbre para que interpretes el mercado con total seguridad.</p>
              <Link href="/metodologia" className="mi-inline-link">Consultar metodología y validación <ArrowRight aria-hidden="true"/></Link>
            </div>
            <div className="mi-method__steps">
              <article>
                <div>
                  <strong>Precios oficiales de cierre</strong>
                  <p>Series históricas basadas en transacciones reales registradas por el Ayuntamiento de Madrid, no en ofertas aspiracionales de anuncios.</p>
                </div>
                <span className="mi-method__tag">Dato real</span>
              </article>
              <article>
                <div>
                  <strong>Comparación relativa por zona</strong>
                  <p>Comprueba al instante si un barrio está un 15% por encima o por debajo de la media de su distrito o de Madrid capital.</p>
                </div>
                <span className="mi-method__tag">Contexto</span>
              </article>
              <article>
                <div>
                  <strong>Predicciones claramente rotuladas</strong>
                  <p>Nuestras proyecciones estadísticas se diferencian visualmente para que sepas exactamente qué es dato histórico y qué es estimación.</p>
                </div>
                <span className="mi-method__tag mi-method__tag--forecast">Estimación</span>
              </article>
            </div>
          </div>
        </section>

        {/* Insights Section (Auros Research Grid pattern) */}
        <MadridInsights />

        <p className="mi-bridge" aria-label="Los datos oficiales en la mano. La sartén por el mango al decidir.">
          Los datos oficiales en la mano. <span>La sartén por el mango al decidir.</span>
        </p>

        <section className="mi-closing" aria-labelledby="mi-closing-title">
          <div className="mi-closing__glow" aria-hidden="true"/>
          <div className="mi-wrap mi-closing__inner">
            <p className="mi-kicker">Toma el control con Decide Madrid</p>
            <h2 id="mi-closing-title">No compres ni alquiles a ciegas.<br/><span>Decide con datos.</span></h2>
            <p>Consulta las cifras reales de cierre de tu barrio, esquiva el sobreprecio y negocia con la certeza que dan los datos oficiales.</p>
            <Link href="/madrid" className="mi-button mi-button--aurora">Explorar precios por barrio <ArrowUpRight aria-hidden="true"/></Link>
          </div>
        </section>
      </main>

      <footer className="mi-footer">
        <div className="mi-wrap mi-footer__top">
          <div className="mi-footer__identity">
            <Link href="/" className="mi-brand">
              <span className="mi-brand__mark">
                <Image src="/decide-madrid-mark.webp" alt="" width={34} height={34} />
              </span>
              <span>Decide Madrid: Invierte Y Compra</span>
            </Link>
            <p>Proyecto académico independiente y sin ánimo de lucro. Inteligencia del mercado residencial de Madrid.</p>
          </div>
          <div className="mi-footer__links">
            <div>
              <strong>Explorar</strong>
              <nav aria-label="Explorar">
                <Link href="/madrid">Mercado</Link>
                <Link href="/madrid/chat">AMBI</Link>
                <Link href="/madrid/veredicto">El Veredicto</Link>
              </nav>
            </div>
            <div>
              <strong>Proyecto</strong>
              <nav aria-label="Información del proyecto">
                <Link href="/sobre-el-proyecto">Sobre nosotros</Link>
                <Link href="/metodologia">Metodología</Link>
                <Link href="/contacto">Contacto</Link>
              </nav>
            </div>
          </div>
        </div>
        <div className="mi-wrap mi-footer__bottom">
          <span>© Decide Madrid: Invierte Y Compra</span>
          <span>Las estimaciones son estadísticas y no sustituyen una tasación pericial oficial.</span>
        </div>
      </footer>
    </div>
  );
}
