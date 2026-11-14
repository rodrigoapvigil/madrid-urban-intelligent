import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import ContactForm from './ContactForm';
import BackgroundAurora from '../../components/BackgroundAurora';
import './contacto.css';

export const metadata: Metadata = {
  title: 'Contacto | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Contacta con DMIYC para colaboraciones, prensa, datos, metodología o sugerencias.',
  alternates: { canonical: '/contacto' },
};

export default function ContactPage() {
  return (
    <div className="contact-page-shell">
      <BackgroundAurora />
      <SiteHeader activePath="/contacto" ctaText="Volver al dashboard" ctaHref="/madrid" appearance="aurora" />
      <main className="contact-page">
        <div className="contact-page__inner">
          <Link className="contact-page__back" href="/" aria-label="Volver al inicio">↖</Link>
          <section className="contact-layout" aria-labelledby="contact-title">
            <div className="contact-intro">
            <p className="contact-card__eyebrow">HABLEMOS</p>
            <h1 id="contact-title">Contacto</h1>
            <p className="contact-card__intro">Cuéntanos cómo podemos colaborar o ayudarte.</p>
            </div>
            <div className="contact-form-panel">
            <ContactForm />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
