import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Información legal, condiciones de uso y naturaleza académica de la plataforma Decide Madrid: Invierte Y Compra.',
  alternates: { canonical: '/aviso-legal' },
};

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Marco institucional</p>
          <h1>Aviso legal</h1>
          <p className="editorial-page__lead">
            Decide Madrid: Invierte Y Compra (DMIYC) es una plataforma analítica y académica independiente desarrollada en el marco de un Trabajo Fin de Máster en la Universidad Politécnica de Madrid (UPM).
          </p>
          <section className="editorial-page__section">
            <h2>Naturaleza de los datos y exención de responsabilidad</h2>
            <p>
              Las cifras, métricas, estimaciones y ratios publicados en la plataforma constituyen referencias estadísticas elaboradas a partir de microdatos y fuentes abiertas del Ayuntamiento de Madrid y portales del sector. En ningún caso constituyen asesoramiento financiero, jurídico, inversión formal ni sustituyen una tasación pericial oficial.
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Propiedad intelectual y código abierto</h2>
            <p>
              El código fuente, metodología y modelos analíticos han sido desarrollados con fines de investigación, democratización de la información y transparencia del mercado madrileño.
            </p>
          </section>
          <p className="editorial-page__note">
            © 2026 Decide Madrid: Invierte Y Compra (DMIYC). Todos los derechos reservados.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
