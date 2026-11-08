import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Información sobre el uso de cookies y almacenamiento local en Decide Madrid: Invierte Y Compra.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Privacidad y navegación</p>
          <h1>Política de cookies</h1>
          <p className="editorial-page__lead">
            Decide Madrid: Invierte Y Compra prioriza la privacidad. La plataforma no utiliza cookies publicitarias, trackers de terceros ni mecanismos de perfilado comercial.
          </p>
          <section className="editorial-page__section">
            <h2>Cookies técnicas esenciales</h2>
            <p>
              Únicamente se utilizan elementos estrictamente técnicos necesarios para el funcionamiento de la sesión y la renderización en Next.js.
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Gestión en el navegador</h2>
            <p>
              Puedes configurar tu navegador para bloquear o alertarte sobre la presencia de cookies en cualquier momento a través de sus ajustes de privacidad.
            </p>
          </section>
          <p className="editorial-page__note">
            Revisión de la política: Noviembre de 2026. Decide Madrid: Invierte Y Compra (DMIYC).
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
