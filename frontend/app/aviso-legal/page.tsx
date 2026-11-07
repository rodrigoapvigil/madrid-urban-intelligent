import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Información sobre Decide Madrid: Invierte Y Compra y las condiciones de uso de la plataforma.',
  alternates: { canonical: '/aviso-legal' },
};

export default function LegalNoticePage() {
  return <><SiteHeader/><main className="editorial-page"><div className="editorial-page__inner">
    <p className="editorial-page__eyebrow">Información legal</p><h1>Aviso legal</h1>
    <p className="editorial-page__lead">Decide Madrid: Invierte Y Compra es un proyecto académico independiente y sin ánimo de lucro para consultar información estadística sobre el mercado residencial de Madrid.</p>
    <div className="editorial-page__notice" role="note"><strong>Información del titular pendiente</strong><p>La información disponible del proyecto no identifica la persona responsable con nombre legal completo, domicilio y correo electrónico de contacto. Estos datos deben añadirse aquí por la persona titular antes de considerar este aviso completo conforme a las obligaciones de identificación aplicables a servicios en línea.</p></div>
    <section className="editorial-page__section"><h2>Finalidad y uso</h2><p>La plataforma facilita consultas y comparaciones estadísticas de alquiler, compra, venta e inversión por zonas. Su uso no constituye asesoramiento inmobiliario, financiero ni una tasación oficial. Las estimaciones pueden diferir de los precios de una vivienda concreta.</p></section>
    <section className="editorial-page__section"><h2>Acceso y servicios</h2><p>La consulta pública del dashboard no requiere crear una cuenta. El Veredicto permite evaluar datos introducidos por la persona usuaria. La aplicación conserva además una integración opcional de Stripe para adquirir un dossier o una suscripción; sus condiciones y precio deben mostrarse antes de cualquier contratación.</p></section>
    <section className="editorial-page__section"><h2>Propiedad intelectual y fuentes</h2><p>Los contenidos, código e interfaces del proyecto están sujetos a los derechos de sus titulares. Las series municipales se atribuyen a las fuentes públicas indicadas en la metodología. No se concede permiso para reutilizar marcas o contenidos de terceros más allá de los usos permitidos por la ley.</p></section>
    <section className="editorial-page__section"><h2>Contacto y resolución de incidencias</h2><p>Para consultas sobre el proyecto o avisar de un problema, puedes usar el repositorio público. No incluyas información personal ni datos de una vivienda que no quieras hacer públicos en una incidencia.</p><p><a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">Contactar mediante GitHub ↗</a></p></section>
    <p className="editorial-page__note">Este aviso no está completo hasta que se incorporen la identidad legal y el domicilio de la persona titular. La plataforma es un proyecto académico, no una sociedad identificada en la información facilitada.</p>
  </div></main><SiteFooter/></>;
}
