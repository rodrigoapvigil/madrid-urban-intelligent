import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de Cookies | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Transparencia absoluta en el uso de cookies técnicas y almacenamiento local en DMIYC. Sin rastreo comercial ni cookies publicitarias.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Transparencia y Gestión del Navegador</p>
          <h1>Política de Cookies</h1>
          <p className="editorial-page__lead">
            En <strong>Decide Madrid: Invierte Y Compra (DMIYC)</strong> aplicamos una política de transparencia absoluta respecto al uso de cookies y tecnologías de almacenamiento local en el navegador, en rigurosa observancia del <strong>artículo 22.2 de la Ley 34/2002 (LSSI-CE)</strong>, del Reglamento General de Protección de Datos (RGPD) y de las directrices de la <strong>Guía sobre el uso de cookies de la Agencia Española de Protección de Datos (AEPD)</strong>.
          </p>

          <section className="editorial-page__section">
            <h2>1. ¿Qué son las Cookies y qué tecnologías utilizamos?</h2>
            <p>
              Una cookie es un pequeño archivo de texto que los sitios web descargan en tu navegador o dispositivo al acceder a determinadas páginas. Las cookies permiten a una plataforma, entre otras funciones, recordar tus preferencias de navegación, garantizar la seguridad del entorno y optimizar el rendimiento de la aplicación web.
            </p>
            <p>
              Además de cookies en sentido estricto, en DMIYC podemos utilizar tecnologías complementarias de almacenamiento en el navegador, tales como <em>localStorage</em> o <em>sessionStorage</em>, con el exclusivo fin de mantener en memoria el estado interactivo del cuadro de mando (por ejemplo, el año o distrito seleccionado) durante tu sesión activa.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>2. Compromiso Taxativo: Cero Rastreo Publicitario y Cero Perfilado</h2>
            <p>
              DMIYC <strong>no implementa cookies publicitarias de terceros, píxeles de seguimiento comportamental (como Meta Pixel o Google Ads Remarketing), ni tecnologías de fingerprinting digital o perfilado comercial</strong>.
            </p>
            <p>
              No comercializamos con la atención del usuario ni rastreamos tu actividad fuera de nuestro portal web. Toda la analítica de la plataforma está orientada a la democratización ciudadana de datos inmobiliarios oficiales.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>3. Clasificación de Cookies Empleadas en DMIYC</h2>
            <p>
              En función de su finalidad técnica, las cookies y almacenamientos utilizados en nuestra web se dividen en las siguientes categorías:
            </p>
            <ul>
              <li>
                <strong>Cookies Técnicas y Estrictamente Necesarias (Exentas de consentimiento):</strong> Son aquellas indispensables para permitir la navegación a través del sitio web y la utilización de las diferentes opciones o servicios que en él existen (por ejemplo, control de tráfico y balanceo de carga en Next.js, seguridad de red y prevención de ataques DDoS). Al ser esenciales para el funcionamiento del portal, no requieren el consentimiento previo del usuario conforme al artículo 22.2 de la LSSI-CE.
              </li>
              <li>
                <strong>Almacenamiento de Preferencias de Sesión (Funcionales):</strong> Se utilizan para recordar opciones de visualización seleccionadas por el propio usuario (como la pestaña de perfil activa entre Alquiler, Compra, Venta e Inversión, o el nivel territorial entre Distritos y Barrios) con el fin de evitar que debas reconfigurar la herramienta cada vez que cambias de vista.
              </li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>4. Inventario de Cookies y Tecnologías de Almacenamiento</h2>
            <p>
              A continuación, se detalla la relación de elementos técnicos que pueden generarse durante tu navegación en DMIYC:
            </p>
            <div style={{ overflowX: 'auto', margin: '20px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', lineHeight: '1.6' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #0E6E8E', textAlign: 'left', color: '#0E6E8E' }}>
                    <th style={{ padding: '10px 12px' }}>Identificador</th>
                    <th style={{ padding: '10px 12px' }}>Proveedor</th>
                    <th style={{ padding: '10px 12px' }}>Finalidad Técnica</th>
                    <th style={{ padding: '10px 12px' }}>Tipo / Caducidad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}><code>__next_session</code></td>
                    <td style={{ padding: '10px 12px' }}>DMIYC (Propia)</td>
                    <td style={{ padding: '10px 12px' }}>Mantenimiento del estado de navegación e hidratación de componentes React/Next.js.</td>
                    <td style={{ padding: '10px 12px' }}>Técnica / Sesión (se destruye al cerrar el navegador)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}><code>dmiyc_filter_cache</code></td>
                    <td style={{ padding: '10px 12px' }}>DMIYC (SessionStorage)</td>
                    <td style={{ padding: '10px 12px' }}>Preservar la combinación de filtros temporales (Año, Mes) para agilizar consultas repetidas.</td>
                    <td style={{ padding: '10px 12px' }}>Funcional / Sesión activa</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}><code>cf_clearance</code> / CDN</td>
                    <td style={{ padding: '10px 12px' }}>Cloudflare / Render</td>
                    <td style={{ padding: '10px 12px' }}>Mitigación de ciberataques, firewall web (WAF) y aceleración de entrega estática de mapas.</td>
                    <td style={{ padding: '10px 12px' }}>Seguridad / Persistencia variable (hasta 1 año)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="editorial-page__section">
            <h2>5. Cómo Gestionar, Bloquear o Eliminar las Cookies</h2>
            <p>
              Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones de privacidad del navegador que utilices:
            </p>
            <ul>
              <li>
                <strong>Google Chrome:</strong> <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Configuración → Privacidad y seguridad → Cookies y otros datos de sitios</a>.
              </li>
              <li>
                <strong>Mozilla Firefox:</strong> <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Ajustes → Privacidad & Seguridad → Cookies y datos del sitio</a>.
              </li>
              <li>
                <strong>Apple Safari:</strong> <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Preferencias → Privacidad → Bloquear todas las cookies</a>.
              </li>
              <li>
                <strong>Microsoft Edge:</strong> <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Configuración → Cookies y permisos del sitio → Administrar y eliminar cookies</a>.
              </li>
            </ul>
            <p>
              Ten en cuenta que si deshabilitas todas las cookies técnicas en tu navegador, es posible que algunas funciones interactivas del cuadro de mando o de los mapas vectoriales no operen con la fluidez prevista.
            </p>
          </section>

          <p className="editorial-page__note">
            Esta Política de Cookies puede ser actualizada en función de exigencias legislativas, reglamentarias o técnicas. Última revisión: Noviembre de 2026.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
