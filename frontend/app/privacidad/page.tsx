import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Información sobre el tratamiento de datos personales y el ejercicio de derechos en DMIYC.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Privacidad y protección de datos</p>
          <h1>Política de Privacidad</h1>
          <p className="editorial-page__lead">Última actualización: <strong>9 de noviembre de 2026</strong>. Esta política explica qué datos puede tratar <strong>Decide Madrid: Invierte Y Compra (DMIYC)</strong>, un proyecto personal, gratuito e independiente del Ayuntamiento de Madrid.</p>

          <section className="editorial-page__section">
            <h2>1. Responsable del tratamiento</h2>
            <ul>
              <li><strong>Responsable:</strong> Rodrigo Alonzo Peña Vigil, a título personal.</li>
              <li><strong>Contacto de privacidad:</strong> <a href="mailto:privacidad@dmiyc.com">privacidad@dmiyc.com</a>.</li>
              <li><strong>Delegado de Protección de Datos:</strong> no se ha designado, al no resultar obligatorio para este proyecto.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>2. Datos tratados y finalidades</h2>
            <p>No necesitas registrarte ni facilitar nombre, teléfono o correo para consultar la web. Según cómo utilices el servicio, pueden tratarse:</p>
            <ul>
              <li><strong>Datos técnicos:</strong> dirección IP, fecha y hora, navegador, páginas solicitadas y datos necesarios para servir la web, protegerla y evitar abusos.</li>
              <li><strong>El Veredicto:</strong> los datos del inmueble que introduces —precio, superficie, zona y modalidad— para calcular la comparación solicitada.</li>
              <li><strong>AMBI:</strong> el texto que escribes para generar la respuesta a tu consulta.</li>
              <li><strong>Preferencias:</strong> filtros y opciones guardados temporalmente en el navegador.</li>
            </ul>
            <p>La base jurídica aplicable es, según el tratamiento, el interés legítimo para la seguridad y funcionamiento del servicio y la prestación del servicio solicitado por el usuario.</p>
          </section>

          <section className="editorial-page__section">
            <h2>3. Asistente AMBI</h2>
            <p>AMBI es un sistema de inteligencia artificial. Sus respuestas son orientativas, pueden contener errores y no constituyen asesoramiento financiero, jurídico ni una tasación.</p>
            <ul>
              <li>Utiliza el modelo <strong>Gemma</strong> ejecutado mediante <strong>Ollama</strong> y embeddings <strong>paraphrase-multilingual-MiniLM-L12-v2</strong>.</li>
              <li>Las consultas no se envían a OpenAI, Anthropic ni Google Gemini según la arquitectura actual del proyecto.</li>
              <li>No introduzcas datos personales propios o de terceros en el chat.</li>
              <li>AMBI no toma decisiones automatizadas con efectos jurídicos sobre ti.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>4. Conservación</h2>
            <p>Los datos introducidos en El Veredicto y AMBI se procesan para prestar la función solicitada y no se almacenan en una base de datos propia con fines de perfilado. Los proveedores de infraestructura pueden conservar registros técnicos conforme a su configuración y condiciones aplicables.</p>
            <p>Las preferencias de sesión permanecen en el navegador y pueden eliminarse desde sus ajustes.</p>
          </section>

          <section className="editorial-page__section">
            <h2>5. Proveedores y transferencias</h2>
            <p>Para prestar el servicio utilizamos proveedores de infraestructura:</p>
            <ul>
              <li><strong>Vercel Inc.:</strong> alojamiento del frontend.</li>
              <li><strong>Render Services, Inc.:</strong> alojamiento de la API, con infraestructura en Oregón, Estados Unidos.</li>
              <li><strong>Google LLC:</strong> descarga de fuentes tipográficas desde Google Fonts.</li>
            </ul>
            <p>Estos proveedores pueden tratar datos técnicos fuera del Espacio Económico Europeo. Las garantías aplicables dependen del proveedor, del plan contratado y de sus condiciones vigentes; consulta sus políticas y acuerdos de tratamiento antes de publicar esta versión.</p>
          </section>

          <section className="editorial-page__section">
            <h2>6. Tus derechos</h2>
            <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <a href="mailto:privacidad@dmiyc.com">privacidad@dmiyc.com</a>. Responderemos, como regla general, en el plazo de un mes. También puedes reclamar ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p>
          </section>

          <section className="editorial-page__section">
            <h2>7. Seguridad y cambios</h2>
            <p>La web se sirve por HTTPS y aplicamos medidas técnicas razonables. Ningún sistema es infalible. Esta política se actualizará cuando cambien el servicio o los tratamientos.</p>
          </section>

          <p className="editorial-page__note">Proyecto personal e independiente. No es una plataforma del Ayuntamiento de Madrid ni cuenta con su aval.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
