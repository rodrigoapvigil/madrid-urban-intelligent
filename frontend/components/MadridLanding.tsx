import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Building2, MapPinned, ShieldCheck } from 'lucide-react';
import './MadridLanding.css';

const markets = [
  {
    number: '01',
    title: 'Alquiler',
    text: 'Sigue la evolución de las rentas y compara cada zona con el conjunto de Madrid.',
    href: '/madrid?profile=alquiler',
    Icon: Building2,
  },
  {
    number: '02',
    title: 'Compra',
    text: 'Contrasta precios por metro cuadrado y compara distritos y barrios.',
    href: '/madrid?profile=compra',
    Icon: BarChart3,
  },
  {
    number: '03',
    title: 'Venta',
    text: 'Consulta la actividad de cierre y la evolución del mercado residencial.',
    href: '/madrid?profile=venta',
    Icon: BarChart3,
  },
  {
    number: '04',
    title: 'Inversión',
    text: 'Explora rentabilidad estimada, tendencias y previsiones por zona.',
    href: '/madrid?profile=inversion',
    Icon: MapPinned,
  },
];

const particlePoints = Array.from({ length: 1400 }, (_, index) => {
  const y = 1 - 2 * (index + 0.5) / 1400;
  const radius = Math.sqrt(1 - y * y);
  const angle = Math.PI * (3 - Math.sqrt(5)) * index;
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  if (z < -0.34) return null;
  return {
    key: index,
    cx: 300 + x * 255,
    cy: 300 + y * 255,
    r: 0.82 + (index % 5) * 0.28,
    opacity: Math.min(0.98, 0.3 + (z + 0.34) * 0.78),
    className: index % 67 === 0 ? 'mi-particle mi-particle--coral' : index % 5 === 0 ? 'mi-particle mi-particle--white' : 'mi-particle',
  };
}).filter((point): point is NonNullable<typeof point> => point !== null);

function ParticleSphere() {
  return (
    <svg className="mi-sphere" viewBox="0 0 600 600" role="img" aria-label="Esfera luminosa formada por puntos que representa los datos del mercado de Madrid">
      <defs>
        <radialGradient id="mi-sphere-glow" cx="36%" cy="30%" r="72%">
          <stop offset="0" stopColor="#0099ff" stopOpacity=".34" />
          <stop offset=".58" stopColor="#1676df" stopOpacity=".11" />
          <stop offset="1" stopColor="#07182e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mi-sphere-core" cx="32%" cy="26%" r="80%">
          <stop offset="0" stopColor="#b9e4ff" stopOpacity=".14" />
          <stop offset=".54" stopColor="#0099ff" stopOpacity=".035" />
          <stop offset="1" stopColor="#07182e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="286" fill="url(#mi-sphere-glow)" />
      <circle cx="300" cy="300" r="255" fill="url(#mi-sphere-core)" stroke="rgba(185,228,255,.16)" strokeWidth="1" />
      <g className="mi-sphere__points">
        {particlePoints.map((point) => (
          <circle key={point.key} className={point.className} cx={point.cx} cy={point.cy} r={point.r} opacity={point.opacity} />
        ))}
      </g>
      <g className="mi-sphere__orbits" fill="none">
        <circle cx="300" cy="300" r="279" stroke="rgba(185,228,255,.24)" />
        <ellipse cx="300" cy="300" rx="252" ry="54" stroke="rgba(185,228,255,.18)" />
        <ellipse cx="300" cy="300" rx="252" ry="54" transform="rotate(63 300 300)" stroke="rgba(0,153,255,.3)" strokeDasharray="1 7" />
      </g>
      <circle className="mi-sphere__spark" cx="503" cy="181" r="4" />
      <circle className="mi-sphere__spark mi-sphere__spark--coral" cx="123" cy="418" r="3" />
    </svg>
  );
}

function MadridNetwork() {
  return (
    <svg className="mi-network" viewBox="0 0 520 420" role="img" aria-label="Diagrama de conexiones entre Madrid, sus distritos y barrios">
      <g fill="none" stroke="rgba(185,228,255,.36)" strokeWidth="1">
        <path d="M78 215 153 111 268 72 374 128 440 226 363 332 247 354 131 307 78 215Z" />
        <path d="m153 111 94 243m21-282-22 282m128-226-106 226m173-106-173 0m-285-12 210 12m-115-104 221 17m-243 92 232-87" />
        <path d="m78 215 190-143 172 154-193 128-116-243 185 17 47 204-232-25Z" />
      </g>
      {[
        [78,215,5],[153,111,4],[268,72,5],[374,128,4],[440,226,5],[363,332,4],[247,354,5],[131,307,4],
        [247,215,8],[153,214,3],[327,213,4],[211,151,3],[305,286,4],[199,278,3],[374,278,3],[105,260,2],[411,171,3],
      ].map(([cx, cy, r], index) => <circle key={index} cx={cx} cy={cy} r={r} className={index % 5 === 0 ? 'mi-network__node mi-network__node--coral' : 'mi-network__node'} />)}
      <circle cx="247" cy="215" r="26" fill="none" stroke="rgba(0,153,255,.38)" />
      <circle cx="247" cy="215" r="42" fill="none" stroke="rgba(185,228,255,.18)" strokeDasharray="2 7" />
    </svg>
  );
}

export default function MadridLanding() {
  return (
    <div className="mi-home" id="inicio">
      <header className="mi-header">
        <Link href="/" className="mi-brand" aria-label="Madrid Urban Intelligence, inicio">
          <span className="mi-brand__mark"><BarChart3 aria-hidden="true" /></span>
          <span>Madrid Urban Intelligence</span>
        </Link>
        <nav className="mi-nav" aria-label="Navegación principal">
          <Link href="#explorar">Explorar</Link>
          <Link href="/madrid/chat">AMBI</Link>
          <Link href="/madrid/veredicto">El Veredicto</Link>
        </nav>
        <Link href="/madrid" className="mi-header__cta">Abrir dashboard <ArrowUpRight aria-hidden="true" /></Link>
      </header>

      <main>
        <section className="mi-hero" aria-labelledby="mi-title">
          <div className="mi-hero__atmosphere" aria-hidden="true" />
          <div className="mi-hero__sphere"><ParticleSphere /></div>
          <div className="mi-hero__content">
            <p className="mi-kicker"><span /> Inteligencia residencial · Madrid</p>
            <h1 id="mi-title">Madrid,<br /><span>en perspectiva.</span></h1>
            <p className="mi-hero__lead">Una lectura más clara del mercado inmobiliario, construida con datos oficiales y contexto por zona.</p>
            <div className="mi-hero__actions">
              <Link href="/madrid" className="mi-button">Explorar el mercado <ArrowUpRight aria-hidden="true" /></Link>
              <Link href="#explorar" className="mi-text-link">Conoce la plataforma <ArrowDown aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="mi-hero__index" aria-hidden="true"><span>40°25′ N</span><i /> <span>03°42′ O</span></div>
          <a className="mi-scroll" href="#explorar"><span>Desplázate para explorar</span><ArrowDown aria-hidden="true" /></a>
        </section>

        <section className="mi-explore" id="explorar" aria-labelledby="mi-explore-title">
          <div className="mi-wrap">
            <div className="mi-explore__heading">
              <p className="mi-kicker mi-kicker--muted">Explora Madrid</p>
              <h2 id="mi-explore-title">Una ciudad.<br /><span>Cuatro perspectivas.</span></h2>
              <p className="mi-body">Elige la pregunta que quieres responder. La plataforma ordena la información para que puedas leer el mercado a tu manera.</p>
            </div>
            <div className="mi-explore__layout">
              <div className="mi-explore__services">
                <div className="mi-market-list">
                  {markets.map(({ number, title, text, href, Icon }) => (
                    <Link className="mi-market" href={href} key={number}>
                      <span className="mi-market__number">{number}</span>
                      <span className="mi-market__icon"><Icon aria-hidden="true" /></span>
                      <span className="mi-market__copy"><strong>{title}</strong><small>{text}</small></span>
                      <span className="mi-market__arrow"><ArrowUpRight aria-hidden="true" /></span>
                    </Link>
                  ))}
                </div>
                <Link className="mi-verdict-link" href="/madrid/veredicto">
                  <span className="mi-verdict-link__icon"><ShieldCheck aria-hidden="true" /></span>
                  <span><strong>El Veredicto</strong><small>Contrasta el precio de una vivienda con su zona.</small></span>
                  <span className="mi-market__arrow"><ArrowUpRight aria-hidden="true" /></span>
                </Link>
                <Link href="/madrid" className="mi-inline-link">Ver todos los datos <ArrowRight aria-hidden="true" /></Link>
              </div>
              <aside className="mi-explore__visual" aria-label="Mapa conceptual de relaciones entre Madrid, los distritos y los barrios">
                <span className="mi-explore__visual-label">Red urbana · Madrid</span>
                <MadridNetwork />
                <div className="mi-explore__visual-caption"><span>01 — 21 distritos</span><span>131 barrios</span></div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mi-stats" aria-labelledby="mi-stats-title">
          <div className="mi-wrap">
            <div className="mi-stats__heading">
              <p className="mi-kicker mi-kicker--muted">La ciudad, en datos</p>
              <h2 id="mi-stats-title">Una mirada que llega<br />hasta <span>cada barrio.</span></h2>
            </div>
            <div className="mi-stats__grid">
              <article><strong>4</strong><span>Perfiles de mercado</span><small>Alquiler · Compra · Venta · Inversión</small></article>
              <article><strong>21</strong><span>Distritos</span><small>Una lectura completa de Madrid</small></article>
              <article><strong>131</strong><span>Barrios</span><small>El detalle detrás de cada tendencia</small></article>
            </div>
            <p className="mi-stats__note">Una plataforma para entender la evolución residencial de Madrid con datos oficiales y estimaciones claramente identificadas.</p>
          </div>
        </section>

        <section className="mi-approach" aria-labelledby="mi-approach-title">
          <div className="mi-wrap mi-approach__layout">
            <div className="mi-approach__intro">
              <p className="mi-kicker mi-kicker--muted">Claridad en cada lectura</p>
              <h2 id="mi-approach-title">Dato real.<br /><span>Estimación visible.</span></h2>
              <p>La fuente y la naturaleza de cada cifra forman parte de la lectura: operaciones observadas y proyecciones aparecen claramente diferenciadas.</p>
              <Link href="/madrid" className="mi-inline-link">Explorar los indicadores <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className="mi-approach__steps">
              <article className="mi-approach-step">
                <span className="mi-approach-step__index">01</span>
                <span className="mi-approach-step__mark mi-approach-step__mark--official"><i /></span>
                <div><strong>Operaciones oficiales</strong><p>Series históricas basadas en datos públicos de cierre del Ayuntamiento de Madrid.</p></div>
                <span className="mi-approach-step__tag">Dato real</span>
              </article>
              <article className="mi-approach-step">
                <span className="mi-approach-step__index">02</span>
                <span className="mi-approach-step__mark mi-approach-step__mark--compare"><i /></span>
                <div><strong>Contexto por zona</strong><p>Consulta distritos y barrios junto a la referencia de la media de Madrid.</p></div>
                <span className="mi-approach-step__tag">Comparativa</span>
              </article>
              <article className="mi-approach-step">
                <span className="mi-approach-step__index">03</span>
                <span className="mi-approach-step__mark mi-approach-step__mark--forecast"><i /></span>
                <div><strong>Tendencia estimada</strong><p>Las proyecciones se identifican para separarlas de los valores observados.</p></div>
                <span className="mi-approach-step__tag">Estimación</span>
              </article>
            </div>
          </div>
        </section>

        <section className="mi-closing" aria-labelledby="mi-closing-title">
          <div className="mi-closing__orb" aria-hidden="true"><span /><span /><span /></div>
          <div className="mi-wrap mi-closing__inner">
            <p className="mi-kicker">El siguiente paso</p>
            <h2 id="mi-closing-title">Lee Madrid<br /><span>con contexto.</span></h2>
            <p>Explora los datos, compara las zonas y toma decisiones con una visión más completa del mercado.</p>
            <Link href="/madrid" className="mi-button">Entrar al dashboard <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="mi-footer">
        <div className="mi-wrap mi-footer__top">
          <Link href="/" className="mi-brand"><span className="mi-brand__mark"><BarChart3 aria-hidden="true" /></span><span>Madrid Urban Intelligence</span></Link>
          <p>Inteligencia inmobiliaria para entender Madrid.</p>
          <nav aria-label="Enlaces del pie de página"><Link href="/madrid">Dashboard</Link><Link href="/madrid/chat">AMBI</Link><Link href="/madrid/veredicto">El Veredicto</Link></nav>
        </div>
        <div className="mi-wrap mi-footer__bottom"><span>© Madrid Urban Intelligence</span><span>Las estimaciones son estadísticas y no sustituyen una tasación pericial oficial.</span></div>
      </footer>
    </div>
  );
}
