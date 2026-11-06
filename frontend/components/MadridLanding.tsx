import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, MapPinned, Sparkles } from 'lucide-react';
import './MadridLanding.css';
import { SiteFooter, SiteHeader } from './SiteChrome';
import rentImage from './imagen/landing/alquilar.webp';
import buyImage from './imagen/landing/comprar.webp';
import sellImage from './imagen/landing/vender.webp';
import investImage from './imagen/landing/invertir.webp';

const profiles = [
  {
    title: 'Alquiler',
    description: 'Compara precios por zona y sigue su evolución mes a mes.',
    href: '/madrid?profile=alquiler',
    image: rentImage,
    alt: 'Pareja revisando una vivienda durante una mudanza',
    number: '01',
  },
  {
    title: 'Compra',
    description: 'Contrasta el precio por metro cuadrado entre distritos y barrios.',
    href: '/madrid?profile=compra',
    image: buyImage,
    alt: 'Pareja recibiendo las llaves de una vivienda',
    number: '02',
  },
  {
    title: 'Venta',
    description: 'Consulta la actividad de cierre y la evolución del mercado.',
    href: '/madrid?profile=venta',
    image: sellImage,
    alt: 'Asesoría inmobiliaria durante la firma de un contrato',
    number: '03',
  },
  {
    title: 'Inversión',
    description: 'Analiza rentabilidad estimada y proyecciones por zona.',
    href: '/madrid?profile=inversion',
    image: investImage,
    alt: 'Modelo de vivienda junto a una revisión financiera',
    number: '04',
  },
];

const steps = [
  { number: '01', title: 'Elige un perfil', text: 'Define si quieres alquilar, comprar, vender o invertir.' },
  { number: '02', title: 'Selecciona una zona', text: 'Consulta Madrid por distrito o por barrio.' },
  { number: '03', title: 'Compara el mercado', text: 'Lee series oficiales y previsiones con su origen identificado.' },
];

export default function MadridLanding() {
  return (
    <div className="landing-page" id="inicio">
      <SiteHeader />

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__glow landing-hero__glow--blue" aria-hidden="true" />
          <div className="landing-hero__glow landing-hero__glow--rose" aria-hidden="true" />
          <div className="landing-wrap landing-hero__layout">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow"><span aria-hidden="true" /> Inteligencia inmobiliaria · Madrid</p>
              <h1 id="landing-title">El mercado de Madrid, <em>con contexto.</em></h1>
              <p className="landing-hero__lead">
                Analiza alquiler, compra, venta e inversión con datos oficiales y tendencias por distrito y barrio.
              </p>
              <div className="landing-actions">
                <Link href="/madrid" className="landing-button landing-button--accent">
                  Explorar el dashboard <ArrowUpRight aria-hidden="true" />
                </Link>
                <Link href="/madrid/chat" className="landing-button landing-button--quiet">
                  Hablar con AMBI <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <div className="landing-proof" aria-label="Cuatro perfiles de análisis en distritos y barrios de Madrid">
                <span className="landing-proof__count">4</span>
                <span className="landing-proof__text">perfiles de mercado<br /><strong>Alquiler · Compra · Venta · Inversión</strong></span>
              </div>
            </div>

            <div className="landing-hero__visual" aria-label="Vista conceptual de los análisis de Madrid Urban Intelligence" role="img">
              <div className="landing-orb" aria-hidden="true">
                <span className="landing-orb__halo" />
                <span className="landing-orb__body" />
                <span className="landing-orb__core" />
                <span className="landing-orb__ribbon landing-orb__ribbon--one" />
                <span className="landing-orb__ribbon landing-orb__ribbon--two" />
              </div>
              <div className="landing-preview">
                <div className="landing-preview__top">
                  <span className="landing-preview__mark"><BarChart3 aria-hidden="true" /></span>
                  <span>Madrid Urban Intelligence</span>
                  <span className="landing-preview__status">Madrid</span>
                </div>
                <div className="landing-preview__body">
                  <div className="landing-preview__heading">
                    <span>Mercado residencial</span>
                    <strong>Una ciudad.<br />Cuatro perspectivas.</strong>
                  </div>
                  <div className="landing-preview__divider" />
                  <div className="landing-preview__rows">
                    <span><i className="landing-dot landing-dot--blue" /> Alquiler</span>
                    <span><i className="landing-dot landing-dot--sky" /> Compra</span>
                    <span><i className="landing-dot landing-dot--rose" /> Venta</span>
                    <span><i className="landing-dot landing-dot--deep" /> Inversión</span>
                  </div>
                  <div className="landing-preview__foot"><MapPinned aria-hidden="true" /> Distritos y barrios <span>↗</span></div>
                </div>
              </div>
              <div className="landing-visual-note"><Sparkles aria-hidden="true" /> Datos para decidir con perspectiva</div>
            </div>
          </div>
          <a className="landing-scroll-cue" href="#perfiles"><span>Conoce los perfiles</span><ArrowDown aria-hidden="true" /></a>
        </section>

        <section className="landing-profiles" id="perfiles" aria-labelledby="profiles-title">
          <div className="landing-wrap">
            <div className="landing-section-head">
              <p className="landing-eyebrow landing-eyebrow--blue">Una plataforma · Cuatro objetivos</p>
              <h2 id="profiles-title">Una lectura para cada decisión.</h2>
              <p>Elige el perfil que se ajusta a lo que buscas y compara la ciudad desde esa perspectiva.</p>
            </div>
            <div className="landing-profile-grid">
              {profiles.map((profile) => (
                <Link href={profile.href} className="landing-profile-card" key={profile.title}>
                  <div className="landing-profile-card__image">
                    <Image src={profile.image} alt={profile.alt} fill sizes="(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 46vw" />
                    <span className="landing-profile-card__number">{profile.number}</span>
                  </div>
                  <div className="landing-profile-card__content">
                    <div>
                      <h3>{profile.title}</h3>
                      <p>{profile.description}</p>
                    </div>
                    <span className="landing-profile-card__link">Ver análisis <ArrowUpRight aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-data" aria-labelledby="data-title">
          <div className="landing-wrap landing-data__layout">
            <div className="landing-data__intro">
              <p className="landing-eyebrow landing-eyebrow--light">El mercado, explicado</p>
              <h2 id="data-title">De la ciudad al detalle de cada barrio.</h2>
              <p>Reúne en un mismo lugar las referencias necesarias para entender cómo cambia el mercado residencial de Madrid.</p>
              <Link href="/madrid" className="landing-text-link">Ver el dashboard <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className="landing-data__list">
              <article className="landing-data-item">
                <span className="landing-data-item__index">01</span>
                <div><h3>Series oficiales</h3><p>Operaciones reales de cierre del Ayuntamiento de Madrid.</p></div>
                <ArrowUpRight aria-hidden="true" />
              </article>
              <article className="landing-data-item">
                <span className="landing-data-item__index">02</span>
                <div><h3>Detalle por zona</h3><p>Consulta la información por distrito y barrio.</p></div>
                <ArrowUpRight aria-hidden="true" />
              </article>
              <article className="landing-data-item">
                <span className="landing-data-item__index">03</span>
                <div><h3>Evolución y previsiones</h3><p>Distingue los valores observados de las estimaciones.</p></div>
                <ArrowUpRight aria-hidden="true" />
              </article>
            </div>
          </div>
        </section>

        <section className="landing-how" aria-labelledby="how-title">
          <div className="landing-wrap">
            <div className="landing-section-head landing-section-head--compact">
              <p className="landing-eyebrow landing-eyebrow--blue">Un proceso claro</p>
              <h2 id="how-title">Del objetivo a una mejor decisión.</h2>
            </div>
            <div className="landing-steps">
              {steps.map((step) => (
                <article className="landing-step" key={step.number}>
                  <span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-veredicto" aria-labelledby="veredicto-title">
          <div className="landing-wrap landing-veredicto__inner">
            <div>
              <p className="landing-eyebrow landing-eyebrow--light">Análisis de una vivienda</p>
              <h2 id="veredicto-title">¿El precio de un piso está en línea con su zona?</h2>
              <p>Contrasta un inmueble con operaciones reales de cierre de su barrio.</p>
            </div>
            <Link href="/madrid/veredicto" className="landing-button landing-button--accent">
              Obtener un veredicto <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="landing-faq" aria-labelledby="faq-title">
          <div className="landing-wrap landing-faq__layout">
            <div className="landing-section-head landing-section-head--compact">
              <p className="landing-eyebrow landing-eyebrow--blue">Información útil</p>
              <h2 id="faq-title">Preguntas frecuentes</h2>
            </div>
            <div className="landing-faq__items">
              <details className="landing-faq-item">
                <summary>¿Qué datos utiliza la plataforma?</summary>
                <p>Series históricas oficiales de operaciones de cierre de Madrid y estimaciones identificadas como previsiones.</p>
              </details>
              <details className="landing-faq-item">
                <summary>¿Qué zonas puedo consultar?</summary>
                <p>El análisis permite consultar Madrid por distrito y barrio, además de comparar cada zona con la media de la ciudad.</p>
              </details>
              <details className="landing-faq-item">
                <summary>¿Cómo puedo analizar una vivienda concreta?</summary>
                <p>En El Veredicto puedes introducir el precio, la superficie y la zona para compararlos con las operaciones de cierre.</p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
