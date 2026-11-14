import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import ContactForm from './ContactForm';
import './contacto.css';

export const metadata: Metadata = {
  title: 'Contacto | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Contacta con DMIYC para colaboraciones, prensa, datos, metodología o sugerencias.',
  alternates: { canonical: '/contacto' },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader activePath="/contacto" ctaText="Volver al dashboard" ctaHref="/madrid" />
      <main className="contact-page">
        <div className="contact-page__inner">
          <Link className="contact-page__back" href="/" aria-label="Volver al inicio">← <span>Volver</span></Link>
          <section className="contact-card" aria-labelledby="contact-title">
            <p className="contact-card__eyebrow">HABLEMOS</p>
            <h1 id="contact-title">Contacto</h1>
            <p className="contact-card__intro">Cuéntanos cómo podemos colaborar o ayudarte.</p>
            <ContactForm />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
