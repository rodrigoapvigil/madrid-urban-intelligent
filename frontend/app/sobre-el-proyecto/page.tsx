import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Sobre Decide Madrid: Invierte Y Compra',
  description: 'Conoce el proyecto Decide Madrid: Invierte Y Compra, una plataforma analítica para explorar precios de vivienda, barrios y distritos de Madrid.',
  alternates: { canonical: '/sobre-el-proyecto' },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Sobre el proyecto</p>
          <h1>Una lectura más clara del mercado de Madrid.</h1>
          <p className="editorial-page__lead">
            Decide Madrid: Invierte Y Compra es una plataforma analítica desarrollada como proyecto de Trabajo Fin de Máster. Reúne series históricas, análisis territorial y modelos de estimación para explorar el mercado residencial a escala de distrito y barrio.
          </p>
          <section className="editorial-page__section">
            <h2>Qué puedes consultar</h2>
            <p>
              El dashboard permite explorar alquiler, compra, venta e inversión, comparar zonas y seguir tendencias mensuales. El Veredicto contrasta datos introducidos por la persona usuaria con referencias estadísticas de su zona.
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Acceso y contacto</h2>
            <p>
              La consulta del dashboard es pública y no requiere crear una cuenta. Para consultas, incidencias o información sobre el desarrollo, puedes abrir una conversación en el repositorio del proyecto.
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">
                Contactar a través del repositorio de GitHub ↗
              </a>
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Reconocimientos</h2>
            <p>
              El proyecto ha sido reconocido por el Grupo SATEC y la Universidad Politécnica de Madrid (UPM) con el Premio al Mejor Trabajo con Impacto en Desarrollo Sostenible (2025) y galardonado por el Ayuntamiento de Madrid en el Concurso de Datos Abiertos (2026).
            </p>
          </section>
          <p className="editorial-page__note">
            Las cifras publicadas son referencias estadísticas oficiales. No constituyen asesoramiento financiero ni una tasación pericial oficial.
          </p>
          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Explorar el mercado</Link>
            <Link href="/metodologia">Consultar metodología</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
