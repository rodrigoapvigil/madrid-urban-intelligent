import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Sobre Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Conoce la misión, arquitectura y metodología de Decide Madrid: Invierte Y Compra, un proyecto independiente de análisis del mercado residencial madrileño.',
  alternates: { canonical: '/sobre-el-proyecto' },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Sobre el proyecto</p>
          <h1>Una lectura objetiva y transparente del mercado de Madrid.</h1>
          <p className="editorial-page__lead">
            <strong>Decide Madrid: Invierte Y Compra (DMIYC)</strong> es una plataforma analítica y de inteligencia territorial independiente concebida para erradicar las asimetrías de información que sufren los ciudadanos en el mercado inmobiliario madrileño. Integra series históricas oficiales, microdatos de transacciones consolidadas y modelización predictiva de machine learning para ofrecer una visión real de los 21 distritos y 131 barrios de la capital.
          </p>

          <section className="editorial-page__section">
            <h2>Nuestra Misión: Datos Reales Frente a Anuncios Inflados</h2>
            <p>
              DMIYC facilita la consulta de datos abiertos y fuentes estadísticas contrastadas. Los datos observados se distinguen de las estimaciones y proyecciones elaboradas por el proyecto, para que el usuario pueda interpretar cada resultado con el contexto adecuado.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>Qué puedes consultar en DMIYC</h2>
            <p>
              La plataforma articula cuatro perfiles de decisión hiperespecializados:
            </p>
            <ul>
              <li><strong>Alquiler:</strong> Precios reales de m², coste medio mensual por tipología de vivienda y evolución temporal.</li>
              <li><strong>Compra:</strong> Ratios de esfuerzo financiero, asequibilidad salarial y detección de zonas con potencial de revalorización.</li>
              <li><strong>Venta:</strong> Volumen de transacciones, liquidez del mercado y precios de cierre real para fijar salidas competitivas.</li>
              <li><strong>Inversión:</strong> Rentabilidad bruta y neta estimada, Gross Rent Multiplier (GRM) y matrices de rentabilidad-riesgo.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>Acceso Público y Contacto</h2>
            <p>
              La consulta del Cuadro de Mando es pública, libre y gratuita, sin necesidad de registro ni aportación de datos personales. Para sugerencias técnicas o reporte de incidencias:
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noopener noreferrer">
                Canal oficial de incidencias y soporte en GitHub ↗
              </a>
            </p>
          </section>

          <p className="editorial-page__note">
            Las cifras publicadas son referencias estadísticas objetivas y proyecciones basadas en modelos de machine learning. No constituyen asesoramiento financiero ni sustituyen una tasación pericial oficial.
          </p>

          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Explorar el cuadro de mando</Link>
            <Link href="/metodologia">Consultar metodología</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
