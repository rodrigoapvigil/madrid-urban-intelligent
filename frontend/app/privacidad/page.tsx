import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Información sobre los datos enviados al consultar precios y utilizar las herramientas de Decide Madrid.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return <><SiteHeader/><main className="editorial-page"><div className="editorial-page__inner">
    <p className="editorial-page__eyebrow">Tus datos y la plataforma</p><h1>Política de privacidad</h1>
    <p className="editorial-page__lead">La web no pide crear una cuenta para consultar el dashboard. Los campos del Veredicto se envían al servicio de análisis para calcular una respuesta; no se guardan en almacenamiento persistente del navegador por el frontend.</p>
    <div className="editorial-page__notice" role="note"><strong>Alcance de esta información</strong><p>La evaluación no funciona únicamente dentro del dispositivo: la solicitud se transmite a la API del proyecto. El alojamiento puede generar registros técnicos de acceso. La configuración y los plazos concretos de conservación de esos registros deben confirmarse con el proveedor antes de publicar esta política como definitiva.</p></div>
    <section className="editorial-page__section"><h2>Datos utilizados al calcular</h2><p>Para emitir un veredicto, el servicio recibe precio, superficie, operación y barrio o distrito, y los compara con las referencias estadísticas del proyecto. La aplicación frontend no escribe esos valores en cookies, localStorage ni sessionStorage. Permanecen en el estado de la página mientras se usa el formulario y desaparecen al cerrar o recargar la vista.</p><p>Si pegas un enlace de un portal inmobiliario, la dirección se envía a la API para intentar extraer los datos. No pegues enlaces que contengan información privada o identificadores que no quieras transmitir.</p></section>
    <section className="editorial-page__section"><h2>Compras opcionales de dossiers</h2><p>El código del servicio incluye una compra opcional de dossier por 4,90 € y una suscripción por 19 € al mes mediante Stripe Checkout. Si inicias ese flujo, Stripe procesa los datos de pago y el proyecto le envía metadatos del inmueble (operación, barrio, precio y superficie) para generar el dossier. El dashboard público no requiere pago. Antes de contratar, revisa el precio y las condiciones mostradas en el checkout.</p></section>
    <section className="editorial-page__section"><h2>Responsable, destinatarios y derechos</h2><p>La identidad legal y los datos de contacto del responsable no constan en la información disponible del proyecto y deben completarse. Stripe recibe los datos necesarios solo si se inicia una compra. El proveedor de alojamiento puede tratar datos técnicos para operar y proteger la API; sus condiciones y plazos deben verificarse.</p><p>Para ejercer derechos de protección de datos o hacer una consulta, utiliza <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">el canal de contacto del proyecto en GitHub ↗</a>. No compartas datos personales en una incidencia pública; solicita un canal privado cuando sea necesario.</p></section>
    <section className="editorial-page__section"><h2>Analítica y actualización</h2><p>No se ha identificado código de analítica o publicidad de terceros en el frontend revisado. Esta política debe revisarse si se añaden nuevas herramientas, integraciones, registros o formularios.</p></section>
    <p className="editorial-page__note">La política requiere completar la identidad del responsable y confirmar los plazos de registro del alojamiento. La fecha de revisión de esta versión es 7 de noviembre de 2026.</p>
  </div></main><SiteFooter/></>;
}
