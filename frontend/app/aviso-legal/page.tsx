import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Aviso Legal | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Información legal, condiciones de uso y limitación de responsabilidad de DMIYC.',
  alternates: { canonical: '/aviso-legal' },
};

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page"><div className="editorial-page__inner">
        <p className="editorial-page__eyebrow">Marco normativo y condiciones de uso</p>
        <h1>Aviso Legal</h1>
        <p className="editorial-page__lead">Última actualización: <strong>9 de noviembre de 2026</strong>.</p>

        <section className="editorial-page__section"><h2>1. Titular y naturaleza del proyecto</h2>
          <ul><li><strong>Titular:</strong> Rodrigo Alonzo Peña Vigil, a título personal.</li><li><strong>Proyecto:</strong> Decide Madrid: Invierte Y Compra (DMIYC).</li><li><strong>Dominio:</strong> dmiyc.com.</li><li><strong>Contacto:</strong> <a href="mailto:privacidad@dmiyc.com">privacidad@dmiyc.com</a>.</li></ul>
          <p>DMIYC es un proyecto personal, gratuito y sin ánimo de lucro. Es independiente del Ayuntamiento de Madrid y no es una plataforma municipal.</p>
        </section>
        <section className="editorial-page__section"><h2>2. Objeto y uso permitido</h2>
          <p>DMIYC permite consultar datos abiertos, precios, estimaciones y análisis del mercado residencial de los 21 distritos y 131 barrios de Madrid. El acceso implica el compromiso de utilizar el sitio de forma lícita y de no dañarlo, sobrecargarlo ni intentar acceder sin autorización a sus sistemas.</p>
        </section>
        <section className="editorial-page__section"><h2>3. Datos abiertos e independencia</h2>
          <p>Los datos de partida proceden principalmente del <a href="https://datos.madrid.es" target="_blank" rel="noopener noreferrer">Portal de Datos Abiertos del Ayuntamiento de Madrid</a>. Se agregan y modelizan para facilitar su consulta. Las estimaciones y proyecciones son elaboración propia de DMIYC y deben distinguirse de los datos observados.</p>
          <p>El Ayuntamiento de Madrid no patrocina, avala ni se responsabiliza de los cálculos, inferencias o proyecciones de DMIYC.</p>
        </section>
        <section className="editorial-page__section"><h2>4. Propiedad intelectual</h2>
          <p>El código del proyecto se publica en su <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent" target="_blank" rel="noopener noreferrer">repositorio de GitHub</a> conforme a la licencia que figure en el archivo LICENSE. Los textos, diseños y logotipos de DMIYC pertenecen a su titular salvo que se indique otra cosa. Los datos de origen mantienen las condiciones de reutilización de sus respectivas fuentes.</p>
        </section>
        <section className="editorial-page__section"><h2>5. Información y limitación de responsabilidad</h2>
          <ul><li>Las cifras, mapas, estimaciones y respuestas de AMBI son informativos, estadísticos y orientativos.</li><li>No constituyen asesoramiento financiero, de inversión o jurídico, ni recomendación de comprar, vender o alquilar.</li><li>No sustituyen una tasación oficial ni la revisión de un profesional cualificado.</li><li>Las proyecciones dependen de datos históricos y modelos estadísticos; no se garantiza su exactitud ni el resultado de decisiones tomadas a partir de ellas.</li><li>La disponibilidad puede interrumpirse por mantenimiento, errores de terceros o causas técnicas.</li></ul>
          <p>Nada de lo anterior limita los derechos que la legislación reconoce a los consumidores.</p>
        </section>
        <section className="editorial-page__section"><h2>6. Enlaces a terceros</h2><p>La web puede enlazar a repositorios, perfiles profesionales y fuentes oficiales. DMIYC no controla sus contenidos, condiciones ni políticas de privacidad.</p></section>
        <section className="editorial-page__section"><h2>7. Legislación aplicable</h2><p>Este aviso se rige por la legislación española. Salvo que la normativa de consumidores establezca otro fuero imperativo, cualquier controversia se someterá a los juzgados y tribunales de Madrid.</p></section>
        <p className="editorial-page__note">Proyecto personal e independiente. No es una plataforma del Ayuntamiento de Madrid ni cuenta con su aval.</p>
      </div></main>
      <SiteFooter />
    </>
  );
}
