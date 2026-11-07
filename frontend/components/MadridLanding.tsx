import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import DeferredMadridDistrictMap from './DeferredMadridDistrictMap';
import MadridHeroArtwork from './MadridHeroArtwork';
import LandingTrend from './LandingTrend';
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
            <h2 id="mi-statement-title" className="mi-kinetic"><span>Información oficial</span><span>al alcance de todos</span></h2>
            <div className="mi-statement__coordinates" aria-hidden="true"><span>21 DISTRITOS</span><span>131 BARRIOS</span><span>MADRID · DATOS ABIERTOS</span></div>
          </div>
        </section>

        <p className="mi-bridge" aria-label="Cruzar una sola calle en Madrid puede cambiar el metro cuadrado en 800 euros.">
          Cruzar una sola calle en Madrid <span>puede cambiar el metro cuadrado en 800 €.</span>
        </p>

        <section className="mi-platform" id="plataforma" aria-labelledby="mi-platform-title">
          <div className="mi-wrap">
            <div className="mi-platform__intro">
              <div>
                <p className="mi-kicker mi-kicker--muted">Un motor para cada decisión</p>
                <h2 id="mi-platform-title">Elige tu objetivo.<br/><span>Domina los números.</span></h2>
              </div>
              <p>Tanto si vas a firmar una hipoteca, fijar el alquiler de tu piso o rentabilizar tu capital, aquí tienes los datos exactos que necesitas antes de comprometerte.</p>
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
                {/* Surface Card (Liquid Kelp #003734 matching Auros Explore) */}
                <div className="mi-auros-card">
                  <div className="mi-auros-card__head">
                    <p className="mi-kicker mi-kicker--muted">PREDICCIÓN Y TENDENCIA</p>
                    <h2 id="mi-insight-title" className="mi-auros-card__title">
                      Sabe hacia dónde va el precio<br />
                      <span>antes de que cambie el mercado.</span>
                    </h2>
                  </div>

                  <div className="mi-auros-features">
                    <Link href="/madrid" className="mi-auros-feature">
                      <div className="mi-auros-feature__header">
                        <h3>Datos de cierre oficiales</h3>
                        <span className="mi-auros-arrow" aria-hidden="true"><ArrowUpRight /></span>
                      </div>
                      <p>Trayectoria consolidada de transacciones reales mes a mes desde 2023, sin distorsión de anuncios inflados.</p>
                    </Link>

                    <div className="mi-auros-feature">
                      <div className="mi-auros-feature__header">
                        <h3>Machine Learning calibrado</h3>
                        <span className="mi-auros-arrow" aria-hidden="true"><ArrowUpRight /></span>
                      </div>
                      <p>Modelos predictivos que proyectan la curva de precios de cada distrito distinguiendo el dato real de la estimación.</p>
                    </div>

                    <Link href="/metodologia" className="mi-auros-feature mi-auros-feature--active">
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
                  <LandingTrend />
                </div>
              </div>
            </div>
          </div>
        </section>

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
              <article className="mi-scale__stat--volume">
                <strong>16.779</strong>
                <span>Registros analíticos</span>
                <small>10.794 transacciones oficiales de cierre y 5.985 estimaciones auditadas.</small>
              </article>
              <article>
                <strong>21</strong>
                <span>Distritos</span>
                <small>Cobertura total de la capital de punta a punta</small>
              </article>
              <article>
                <strong>131</strong>
                <span>Barrios</span>
                <small>El detalle quirúrgico detrás de cada tendencia</small>
              </article>
              <article className="mi-scale__stat--population">
                <strong>3,49<span className="mi-scale__unit">M</span></strong>
                <span>Habitantes</span>
                <small>
                  <a href="https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Notas-de-prensa/Los-nacimientos-superaron-a-las-defunciones-en-564-personas-en-2025-un-crecimiento-vegetativo-que-no-se-producia-en-Madrid-desde-hacia-seis-anos/?vgnextchannel=6091317d3d2a7010VgnVCM100000dc0ca8c0RCRD&amp;vgnextfmt=default&amp;vgnextoid=81bdd56de9ddd910VgnVCM100000891ecb1aRCRD" target="_blank" rel="noreferrer">
                    Padrón oficial a 1 de enero de 2026 ↗
                  </a>
                </small>
              </article>
              <article>
                <strong>4</strong>
                <span>Perfiles especializados</span>
                <small>Alquiler · Compra · Venta · Inversión</small>
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

        <p className="mi-bridge" aria-label="Los datos oficiales en la mano. La sartén por el mango al decidir.">
          Los datos oficiales en la mano. <span>La sartén por el mango al decidir.</span>
        </p>

        <section className="mi-closing" aria-labelledby="mi-closing-title">
          <div className="mi-closing__glow" aria-hidden="true"/>
          <div className="mi-wrap mi-closing__inner">
            <p className="mi-kicker">Toma el control con Decide Madrid</p>
            <h2 id="mi-closing-title">No compres ni alquiles a ciegas.<br/><span>Decide con datos.</span></h2>
            <p>Consulta las cifras reales de cierre de tu barrio, esquiva el sobreprecio y negocia con la certeza que dan los datos oficiales.</p>
            <Link href="/madrid" className="mi-button">Explorar precios por barrio <ArrowUpRight aria-hidden="true"/></Link>
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
