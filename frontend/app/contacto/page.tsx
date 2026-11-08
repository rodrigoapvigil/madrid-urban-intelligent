import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacta con el equipo del proyecto académico Decide Madrid: Invierte Y Compra.',
  alternates: { canonical: '/contacto' },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Contacto</p>
          <h1>Hablemos del proyecto.</h1>
          <p className="editorial-page__lead">
            Decide Madrid: Invierte Y Compra es un proyecto analítico independiente para consultar referencias estadísticas verificadas del mercado residencial de Madrid.
          </p>
          <section className="editorial-page__section">
            <h2>Consultas e incidencias</h2>
            <p>
              El canal principal disponible para reportar dudas técnicas, mejoras o incidencias es el repositorio del proyecto en GitHub.
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">
                Abrir consulta en GitHub Issues ↗
              </a>
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Conexión profesional</h2>
            <p>
              Para consultas académicas, colaboraciones institucionales o propuestas de investigación:
            </p>
            <p>
              <a href="https://www.linkedin.com/in/rodrigo-vigil/" target="_blank" rel="noreferrer">
                Contactar en LinkedIn con Rodrigo Vigil ↗
              </a>
            </p>
          </section>
          <p className="editorial-page__note">
            Para proteger tu privacidad, no incluyas números de teléfono, direcciones personales ni datos confidenciales en los canales públicos.
          </p>
          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Entrar al cuadro de mando</Link>
            <Link href="/sobre-el-proyecto">Sobre el proyecto</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
