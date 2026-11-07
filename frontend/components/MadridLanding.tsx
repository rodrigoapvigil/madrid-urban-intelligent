import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import MadridDistrictMap from './MadridDistrictMap';
import './MadridLanding.css';

const profiles = [
  { title: 'Alquiler', text: 'Sigue la evolución de las rentas y compara cada zona con el conjunto de Madrid.', href: '/madrid?profile=alquiler' },
  { title: 'Compra', text: 'Contrasta precios por metro cuadrado entre distritos y barrios.', href: '/madrid?profile=compra' },
  { title: 'Venta', text: 'Consulta la actividad de cierre y la evolución del mercado residencial.', href: '/madrid?profile=venta' },
  { title: 'Inversión', text: 'Explora rentabilidad estimada, tendencias y previsiones por zona.', href: '/madrid?profile=inversion' },
];

const audiences = [
  ['Quiero encontrar vivienda', 'Compara precios y tendencias antes de decidir dónde vivir.'],
  ['Quiero vender o alquilar', 'Sitúa tu vivienda frente a operaciones y referencias de su entorno.'],
  ['Analizo el mercado', 'Lee indicadores por periodo, distrito y barrio con su contexto.'],
  ['Evalúo una inversión', 'Explora rentabilidad estimada y señala qué cifras son proyecciones.'],
];

function TrendVisual() {
  return (
    <div className="mi-trend" aria-label="Ilustración conceptual de una tendencia mensual comparada con la media de Madrid">
      <div className="mi-trend__top"><span><i className="mi-dot mi-dot--blue"/> Zona seleccionada</span><span><i className="mi-dot mi-dot--sand"/> Media Madrid</span></div>
      <svg viewBox="0 0 620 300" role="img" aria-label="Dos líneas muestran la evolución mensual de una zona y la media de Madrid">
        <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#00827c" stopOpacity=".22"/><stop offset="1" stopColor="#00827c" stopOpacity="0"/></linearGradient></defs>
        {[54,112,170,228].map(y=><line key={y} x1="44" x2="602" y1={y} y2={y} stroke="rgba(187,199,198,.14)"/>)}
        <path d="M46 209 C92 201 99 165 145 171 S205 184 246 152 S302 129 341 140 S401 156 440 107 S506 116 545 81 S579 77 601 48 L601 228 L46 228Z" fill="url(#trendFill)"/>
        <path d="M46 209 C92 201 99 165 145 171 S205 184 246 152 S302 129 341 140 S401 156 440 107 S506 116 545 81 S579 77 601 48" fill="none" stroke="#00bfb1" strokeWidth="3" strokeLinecap="round"/>
        <path d="M46 223 C100 216 104 202 145 207 S203 205 246 196 S302 186 341 191 S401 190 440 181 S506 184 545 170 S582 169 601 162" fill="none" stroke="#bbc7c6" strokeWidth="2" strokeLinecap="round"/>
        <text x="46" y="260">Ene</text><text x="145" y="260">Mar</text><text x="245" y="260">May</text><text x="342" y="260">Jul</text><text x="441" y="260">Sep</text><text x="540" y="260">Nov</text>
      </svg>
      <div className="mi-trend__caption"><span>Evolución mensual</span><span>Dato real y proyección identificados</span></div>
    </div>
  );
}

export default function MadridLanding() {
  return (
    <div className="mi-home" id="inicio">
      <div className="mi-atmosphere" aria-hidden="true"/>
      <header className="mi-header">
        <Link href="/" className="mi-brand" aria-label="Madrid Urban Intelligence, inicio"><span className="mi-brand__mark"><BarChart3 aria-hidden="true"/></span><span>Madrid Urban Intelligence</span></Link>
        <nav className="mi-nav" aria-label="Navegación principal"><a href="#plataforma">Plataforma</a><a href="#impacto">A quién ayuda</a><Link href="/madrid/chat">AMBI</Link><Link href="/madrid/veredicto">El Veredicto</Link></nav>
        <Link href="/madrid" className="mi-header__cta">Explorar el mercado <ArrowUpRight aria-hidden="true"/></Link>
      </header>

      <main>
        <section className="mi-hero" aria-labelledby="mi-title">
          <div className="mi-hero__content">
            <h1 id="mi-title">El mercado de Madrid,<br/><span>en perspectiva.</span></h1>
            <p className="mi-hero__lead">Alquiler, compra, venta e inversión. Una lectura del mercado con datos oficiales y contexto por zona.</p>
            <Link href="/madrid" className="mi-button">Explorar el mercado <ArrowUpRight aria-hidden="true"/></Link>
          </div>
          <img className="mi-hero__skyline" src="/madrid-skyline.svg" alt="Ilustración panorámica de Madrid con el edificio Metrópolis, el Palacio de Cibeles y su fuente, la Puerta de Alcalá y el Oso y el Madroño." />
          <div className="mi-hero__meta"><span>21 distritos</span><i/><span>131 barrios</span></div>
          <a className="mi-scroll" href="#lectura"><span>Desplázate para explorar</span><ArrowDown aria-hidden="true"/></a>
        </section>

        <p className="mi-bridge" aria-label="Madrid se entiende mejor con datos en contexto.">Madrid se entiende mejor <span>con datos en contexto.</span></p>

        <section className="mi-statement" id="lectura" aria-labelledby="mi-statement-title">
          <div className="mi-wrap mi-statement__inner">
            <p className="mi-kicker mi-kicker--muted">Democratizando la información</p>
            <h2 id="mi-statement-title" className="mi-kinetic"><span>Datos</span><span>para todos</span></h2>
            <div className="mi-statement__coordinates" aria-hidden="true"><span>21 DISTRITOS</span><span>131 BARRIOS</span><span>MADRID · ESPAÑA</span></div>
          </div>
        </section>

        <p className="mi-bridge" aria-label="Cada barrio aporta una perspectiva distinta.">Cada barrio aporta <span>una perspectiva distinta.</span></p>

        <section className="mi-platform" id="plataforma" aria-labelledby="mi-platform-title">
          <div className="mi-wrap">
            <div className="mi-platform__intro"><div><p className="mi-kicker mi-kicker--muted">Una ciudad, cuatro perspectivas</p><h2 id="mi-platform-title">Explora el mercado.<br/><span>Encuentra tu lectura.</span></h2></div><p>Elige el perfil que responde a tu pregunta. Compara zonas, consulta tendencias y sigue la evolución mensual.</p></div>
            <div className="mi-platform__frame"><div className="mi-platform__grid">
              <div className="mi-profile-list">{profiles.map(({title,text,href})=><Link className="mi-profile" href={href} key={title}><span className="mi-profile__copy"><strong>{title}</strong><small>{text}</small></span><span className="mi-profile__arrow"><ArrowUpRight aria-hidden="true"/></span></Link>)}<Link href="/madrid/veredicto" className="mi-verdict"><span><strong>El Veredicto</strong><small>Contrasta el precio de una vivienda con su zona.</small></span><ArrowUpRight aria-hidden="true"/></Link></div>
              <aside className="mi-city-visual"><div className="mi-city-visual__label">El mapa de Madrid</div><MadridDistrictMap/></aside>
            </div></div>
          </div>
        </section>

        <p className="mi-bridge" aria-label="El precio cambia de una zona a otra.">El precio cambia <span>de una zona a otra.</span></p>

        <section className="mi-insight" aria-labelledby="mi-insight-title">
          <div className="mi-wrap mi-insight__layout"><div className="mi-insight__copy"><p className="mi-kicker mi-kicker--muted">El pulso de cada zona</p><h2 id="mi-insight-title">De la tendencia<br/>a <span>la perspectiva.</span></h2><p>Observa la evolución mes a mes y pon cada barrio en contexto frente al conjunto de Madrid. Los valores estimados se distinguen de los datos observados.</p><Link href="/madrid" className="mi-inline-link">Ver evolución del mercado <ArrowRight aria-hidden="true"/></Link></div><TrendVisual/></div>
        </section>

        <p className="mi-bridge" aria-label="Una ciudad, cientos de lecturas locales.">Una ciudad, <span>cientos de lecturas locales.</span></p>

        <section className="mi-scale" id="impacto" aria-labelledby="mi-scale-title">
          <div className="mi-wrap"><div className="mi-scale__heading"><p className="mi-kicker mi-kicker--muted">Madrid, hasta el detalle</p><h2 id="mi-scale-title">Una ciudad.<br/><span>Muchas perspectivas.</span></h2></div><div className="mi-scale__stats">
            <article className="mi-scale__stat--volume"><strong>16.779</strong><span>Registros analíticos</span><small>10.794 operaciones reales y 5.985 predicciones en la base de datos.</small></article>
            <article><strong>21</strong><span>Distritos</span><small>Una lectura completa de la ciudad</small></article>
            <article><strong>131</strong><span>Barrios</span><small>El detalle detrás de cada tendencia</small></article>
            <article className="mi-scale__stat--population"><strong>3,49<span className="mi-scale__unit">M</span></strong><span>Habitantes</span><small><a href="https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Notas-de-prensa/Los-nacimientos-superaron-a-las-defunciones-en-564-personas-en-2025-un-crecimiento-vegetativo-que-no-se-producia-en-Madrid-desde-hacia-seis-anos/?vgnextchannel=6091317d3d2a7010VgnVCM100000dc0ca8c0RCRD&amp;vgnextfmt=default&amp;vgnextoid=81bdd56de9ddd910VgnVCM100000891ecb1aRCRD" target="_blank" rel="noreferrer">3.497.277 en el padrón a 1 ene 2026 ↗</a></small></article>
            <article><strong>4</strong><span>Perfiles de mercado</span><small>Alquiler · Compra · Venta · Inversión</small></article>
          </div></div>
        </section>

        <p className="mi-bridge" aria-label="La mejor decisión empieza con una buena pregunta.">La mejor decisión empieza <span>con una buena pregunta.</span></p>

        <section className="mi-audience" aria-labelledby="mi-audience-title">
          <div className="mi-wrap mi-audience__layout"><div className="mi-audience__intro"><p className="mi-kicker mi-kicker--muted">Información que acompaña decisiones</p><h2 id="mi-audience-title">Un mismo Madrid.<br/><span>Tu propia pregunta.</span></h2><p>Una herramienta para explorar la vivienda desde distintos puntos de vista y entender mejor el contexto de cada zona.</p></div><div className="mi-audience__list">{audiences.map(([title,text])=><article key={title}><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div>
        </section>

        <p className="mi-bridge" aria-label="Cada indicador necesita una fuente clara.">Cada indicador necesita <span>una fuente clara.</span></p>

        <section className="mi-method" aria-labelledby="mi-method-title"><div className="mi-wrap mi-method__layout"><div className="mi-method__intro"><p className="mi-kicker mi-kicker--muted">Transparencia en cada indicador</p><h2 id="mi-method-title">Dato real.<br/><span>Estimación visible.</span></h2><p>La fuente y la naturaleza de cada cifra forman parte de la lectura. Así puedes interpretar los datos con su contexto.</p></div><div className="mi-method__steps"><article><div><strong>Operaciones oficiales</strong><p>Series históricas basadas en datos públicos de cierre del Ayuntamiento de Madrid.</p></div><span className="mi-method__tag">Dato real</span></article><article><div><strong>Comparación por zona</strong><p>Consulta barrios y distritos junto a referencias del conjunto de Madrid.</p></div><span className="mi-method__tag">Contexto</span></article><article><div><strong>Proyecciones identificadas</strong><p>Las estimaciones se señalan para distinguirlas de los valores observados.</p></div><span className="mi-method__tag mi-method__tag--forecast">Estimación</span></article></div></div></section>

        <p className="mi-bridge" aria-label="Entender primero. Decidir después.">Entender primero. <span>Decidir después.</span></p>

        <section className="mi-closing" aria-labelledby="mi-closing-title"><div className="mi-closing__glow" aria-hidden="true"/><div className="mi-wrap mi-closing__inner"><p className="mi-kicker">Madrid, con contexto</p><h2 id="mi-closing-title">Empieza por<br/><span>tu pregunta.</span></h2><p>Explora los datos y encuentra una lectura más clara del mercado residencial.</p><Link href="/madrid" className="mi-button">Abrir el dashboard <ArrowUpRight aria-hidden="true"/></Link></div></section>
      </main>

      <footer className="mi-footer"><div className="mi-wrap mi-footer__top"><Link href="/" className="mi-brand"><span className="mi-brand__mark"><BarChart3 aria-hidden="true"/></span><span>Madrid Urban Intelligence</span></Link><p>Inteligencia residencial para entender Madrid.</p><nav aria-label="Enlaces del pie"><Link href="/madrid">Dashboard</Link><Link href="/madrid/chat">AMBI</Link><Link href="/madrid/veredicto">El Veredicto</Link></nav></div><div className="mi-wrap mi-footer__bottom"><span>© Madrid Urban Intelligence</span><span>Las estimaciones son estadísticas y no sustituyen una tasación pericial oficial.</span></div></footer>
    </div>
  );
}
