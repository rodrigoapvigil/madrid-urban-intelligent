import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Aviso Legal | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Información legal, términos y condiciones de uso, régimen de propiedad intelectual y exención de responsabilidad de la plataforma DMIYC.',
  alternates: { canonical: '/aviso-legal' },
};

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Marco Normativo y Condiciones de Uso</p>
          <h1>Aviso Legal</h1>
          <p className="editorial-page__lead">
            El presente Aviso Legal regula el acceso, navegación y uso del sitio web oficial de <strong>Decide Madrid: Invierte Y Compra (DMIYC)</strong> (accesible a través del dominio dmiyc.com y sus subdominios), en estricto cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), así como de la normativa española y europea aplicable en materia de sociedad de la información.
          </p>

          <section className="editorial-page__section">
            <h2>1. Datos Identificativos del Prestador</h2>
            <p>
              En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE), se informa a los usuarios de los datos identificativos de la entidad titular de la plataforma:
            </p>
            <ul>
              <li><strong>Denominación del proyecto:</strong> Decide Madrid: Invierte Y Compra (DMIYC).</li>
              <li><strong>Naturaleza:</strong> Plataforma de inteligencia territorial, análisis inmobiliario y democratización de datos abiertos.</li>
              <li><strong>Dominio web oficial:</strong> dmiyc.com.</li>
              <li><strong>Canal de contacto institucional y técnico:</strong> <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent" target="_blank" rel="noopener noreferrer">Repositorio Oficial de DMIYC en GitHub</a> y canal corporativo en LinkedIn.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>2. Objeto y Ámbito de Aplicación</h2>
            <p>
              DMIYC es un entorno digital de análisis de datos y modelización econométrica concebido para proporcionar transparencia objetiva al mercado inmobiliario de la ciudad de Madrid (21 distritos y 131 barrios). La plataforma permite la exploración interactiva de precios reales de cierre consolidado, estimaciones probabilísticas de evolución a corto y medio plazo, ratios de esfuerzo financiero familiar, rentabilidad bruta y métricas de liquidez.
            </p>
            <p>
              El acceso al portal atribuye la condición de Usuario e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal desde el momento en que se accede a la herramienta.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>3. Régimen de Reutilización de Datos Abiertos</h2>
            <p>
              DMIYC procesa, unifica y analiza conjuntos de datos de fuentes institucionales oficiales, principalmente el <strong>Portal de Datos Abiertos del Ayuntamiento de Madrid</strong>, de conformidad con lo establecido en la <em>Ley 37/2007, de 16 de noviembre, sobre reutilización de la información del sector público</em> y el Real Decreto 1495/2011.
            </p>
            <p>
              Se deja expresa constancia de que:
            </p>
            <ul>
              <li>La reutilización de la información pública se realiza con fidelidad analítica, sin desnaturalizar el sentido de los microdatos oficiales de origen.</li>
              <li>Se cita con rigor la fuente original en cada módulo y visualización del cuadro de mando.</li>
              <li>El Ayuntamiento de Madrid y demás entidades públicas emisoras no patrocinan, avalan ni se responsabilizan del tratamiento algorítmico, inferencias o proyecciones predictivas elaboradas independientemente por DMIYC.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>4. Propiedad Intelectual e Industrial</h2>
            <p>
              Todos los derechos de propiedad intelectual e industrial sobre la plataforma DMIYC —incluyendo, con carácter meramente enunciativo pero no limitativo, la arquitectura de software, código fuente (Next.js, FastAPI, Python), canalizaciones de machine learning (modelos gradient boosting CatBoost/XGBoost/LightGBM), diseños de interfaces (UI), sistemas de diseño, logotipos, mapas coropléticos interactivos, compilaciones de bases de datos y redacción metodológica— corresponden en exclusiva a DMIYC o a sus licenciantes legítimos.
            </p>
            <p>
              Queda expresamente prohibida la reproducción total o parcial, explotación comercial, ingeniería inversa o descompilación del software con fines lucrativos ajenos a las licencias de código abierto expresamente reconocidas en el repositorio oficial.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>5. Exclusión Taxativa de Garantías y Limitación de Responsabilidad</h2>
            <p>
              <strong>Cláusula de no asesoramiento financiero, jurídico ni pericial:</strong>
            </p>
            <p>
              Las métricas, mapas de calor, proyecciones futuras, comparativas de zonas y evaluaciones emitidas por la herramienta analítica (incluyendo el módulo <em>El Veredicto</em> y el asistente <em>AMBI</em>) tienen un propósito estrictamente <strong>informativo, estadístico y orientativo</strong>.
            </p>
            <ul>
              <li><strong>No constituyen asesoramiento financiero ni de inversión:</strong> Ninguna información publicada en DMIYC debe interpretarse como recomendación de compra, venta, inversión ni suscripción de contratos de arrendamiento.</li>
              <li><strong>No sustituyen una tasación oficial:</strong> Los valores indicados no equivalen a una tasación pericial oficial homologada por el Banco de España ni cumplen las finalidades contempladas en la <em>Orden ECO/805/2003</em> sobre valoración de bienes inmuebles.</li>
              <li><strong>Carácter probabilístico de las proyecciones:</strong> Los modelos predictivos operan sobre tendencias históricas y escenarios matemáticos. DMIYC no garantiza la exactitud absoluta de las predicciones ni asume responsabilidad por fluctuaciones imprevistas del mercado, cambios regulatorios o decisiones económicas individuales tomadas por los usuarios a partir de la información visualizada.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>6. Enlaces a Terceros (Links)</h2>
            <p>
              La plataforma puede facilitar enlaces a sitios web o herramientas de terceros (como repositorios de código abierto, perfiles profesionales o fuentes estadísticas oficiales). DMIYC no ejerce control alguno sobre dichos portales ni asume responsabilidad por sus contenidos, condiciones de uso o políticas de privacidad.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>7. Legislación Aplicable y Jurisdicción</h2>
            <p>
              Para la resolución de cuantas controversias o cuestiones relacionadas con el presente sitio web o con las actividades en él desarrolladas, será de aplicación la legislación española vigente. Las partes se someten, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a los Juzgados y Tribunales de la ciudad de Madrid (España).
            </p>
          </section>

          <p className="editorial-page__note">
            Última actualización y revisión legal: Noviembre de 2026. Plataforma Decide Madrid: Invierte Y Compra (DMIYC).
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
