import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Información sobre cookies y almacenamiento local utilizados por Decide Madrid.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return <><SiteHeader/><main className="editorial-page"><div className="editorial-page__inner">
    <p className="editorial-page__eyebrow">Preferencias y tecnologías</p><h1>Política de cookies</h1>
    <p className="editorial-page__lead">En la revisión del frontend no se encontraron herramientas de analítica, publicidad ni código propio que almacene valores del Veredicto en el navegador.</p>
    <section className="editorial-page__section"><h2>Funcionamiento del sitio</h2><p>El dashboard y los formularios usan el estado temporal de la página para funcionar. El frontend revisado no escribe esos valores en cookies, localStorage o sessionStorage. El alojamiento y el navegador pueden usar mecanismos técnicos necesarios para entregar y proteger el servicio; su inventario y duración deben confirmarse en la configuración de producción.</p></section>
    <section className="editorial-page__section"><h2>Stripe Checkout</h2><p>Si decides iniciar la compra opcional de un dossier o una suscripción, se abre Stripe Checkout. Stripe puede emplear cookies y tecnologías propias para prestar el proceso de pago y prevenir fraude, conforme a su política de privacidad y cookies. No se activan por el mero uso del dashboard.</p><p><a href="https://stripe.com/es/privacy" target="_blank" rel="noreferrer">Política de privacidad de Stripe ↗</a></p></section>
    <section className="editorial-page__section"><h2>Cómo gestionar cookies</h2><p>Puedes consultar y borrar las cookies desde la configuración de tu navegador. Bloquear cookies técnicas puede impedir que algunos servicios externos, como el checkout, funcionen correctamente.</p></section>
    <p className="editorial-page__note">Esta información debe actualizarse si se incorporan analítica, publicidad, preferencias persistentes o nuevas herramientas de terceros.</p>
  </div></main><SiteFooter/></>;
}
