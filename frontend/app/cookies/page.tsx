import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de Cookies | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Información sobre cookies, almacenamiento local y conexiones de terceros en DMIYC.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page"><div className="editorial-page__inner">
        <p className="editorial-page__eyebrow">Transparencia y gestión del navegador</p>
        <h1>Política de Cookies</h1>
        <p className="editorial-page__lead">Última actualización: <strong>9 de noviembre de 2026</strong>.</p>

        <section className="editorial-page__section"><h2>1. Qué utilizamos</h2>
          <p>DMIYC no utiliza cookies de analítica, publicidad, seguimiento ni perfilado comercial. No se instalan cookies no necesarias, por lo que no se solicita un consentimiento publicitario.</p>
          <p>La aplicación puede utilizar <code>sessionStorage</code> para recordar temporalmente que has cerrado este aviso de privacidad durante la sesión. No se utiliza para crear perfiles ni para publicidad.</p>
        </section>
        <section className="editorial-page__section"><h2>2. Inventario conocido</h2>
          <div style={{ overflowX: 'auto', margin: '20px 0' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: '1.6' }}><thead><tr style={{ borderBottom: '2px solid #0E6E8E', textAlign: 'left', color: '#0E6E8E' }}><th style={{ padding: '10px 12px' }}>Elemento</th><th style={{ padding: '10px 12px' }}>Proveedor</th><th style={{ padding: '10px 12px' }}>Finalidad</th><th style={{ padding: '10px 12px' }}>Duración</th></tr></thead><tbody>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '10px 12px', fontWeight: '600' }}><code>sessionStorage</code></td><td style={{ padding: '10px 12px' }}>DMIYC</td><td style={{ padding: '10px 12px' }}>Recordar filtros y preferencias durante la sesión.</td><td style={{ padding: '10px 12px' }}>Hasta cerrar la pestaña</td></tr>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}><td style={{ padding: '10px 12px', fontWeight: '600' }}>Cookies técnicas del proveedor</td><td style={{ padding: '10px 12px' }}>Vercel / Render o su red de distribución</td><td style={{ padding: '10px 12px' }}>Seguridad, entrega y funcionamiento de la infraestructura.</td><td style={{ padding: '10px 12px' }}>La fijada por el proveedor</td></tr>
          </tbody></table></div>
          <p>Este inventario debe verificarse en cada despliegue. Si se incorpora una cookie o tecnología no necesaria, deberá bloquearse hasta obtener consentimiento previo y añadirse aquí con proveedor, finalidad, duración y mecanismo de revocación.</p>
        </section>
        <section className="editorial-page__section"><h2>3. Conexiones externas que no son cookies</h2>
          <ul><li><strong>Google Fonts:</strong> el navegador puede conectarse a <code>fonts.googleapis.com</code> y <code>fonts.gstatic.com</code> para descargar tipografías.</li><li><strong>API del proyecto:</strong> las consultas se envían a <code>madrid-urban-api.onrender.com</code>.</li><li><strong>Mapas:</strong> los datos geográficos se cargan desde el propio sitio mediante archivos GeoJSON; no se utilizan Mapbox, OpenStreetMap ni Carto.</li></ul>
        </section>
        <section className="editorial-page__section"><h2>4. Cómo gestionar el almacenamiento</h2>
          <p>Puedes bloquear o eliminar cookies y almacenamiento desde la configuración de tu navegador. Si bloqueas tecnologías necesarias, algunas funciones del cuadro de mando podrían no funcionar correctamente.</p>
          <ul><li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li><li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li><li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li><li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-y-los-datos-de-sitios-en-microsoft-edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li></ul>
        </section>
        <p className="editorial-page__note">Si incorporamos cookies que requieran consentimiento, lo solicitaremos antes de instalarlas y actualizaremos esta política. Contacto: <a href="mailto:privacidad@dmiyc.com">privacidad@dmiyc.com</a>.</p>
      </div></main>
      <SiteFooter />
    </>
  );
}
