import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Contacto | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Canales oficiales de contacto, soporte técnico e institucional de Decide Madrid: Invierte Y Compra.',
  alternates: { canonical: '/contacto' },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Contacto Institucional y Técnico</p>
          <h1>Conecta con Decide Madrid (DMIYC).</h1>
          <p className="editorial-page__lead">
            Estamos comprometidos con la transparencia, el rigor metodológico y la democratización de los datos inmobiliarios de Madrid. Si tienes dudas, propuestas o deseas reportar alguna sugerencia técnica, ponemos a tu disposición nuestros canales oficiales.
          </p>

          <section className="editorial-page__section">
            <h2>Soporte Técnico e Incidencias</h2>
            <p>
              El canal preferente para formular consultas técnicas, sugerencias de nuevas funcionalidades o notificar incidencias relativas a los conjuntos de datos es nuestro repositorio oficial de código abierto:
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noopener noreferrer">
                Abrir consulta en GitHub Issues ↗
              </a>
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>Contacto y soporte</h2>
            <p>
              Para sugerencias, errores en los datos o dudas sobre el proyecto, abre una incidencia pública en GitHub. No incluyas datos personales, información bancaria ni documentación confidencial.
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noopener noreferrer">
                Abrir una incidencia en GitHub ↗
              </a>
            </p>
            <p>
              Para cuestiones de privacidad o para ejercer tus derechos, escribe a <a href="mailto:privacidad@dmiyc.com">privacidad@dmiyc.com</a>.
            </p>
          </section>

          <p className="editorial-page__note">
            Por motivos de seguridad y privacidad (RGPD), te rogamos no remitir datos sensibles, información bancaria ni documentación personal confidencial a través de los canales públicos de consulta.
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
