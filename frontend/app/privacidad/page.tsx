import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Información sobre los datos enviados al consultar precios y utilizar las herramientas de Decide Madrid.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Tus datos y la plataforma</p>
          <h1>Política de privacidad</h1>
          <p className="editorial-page__lead">
            La web no requiere crear una cuenta para consultar el cuadro de mando. Los campos del Veredicto se transmiten al servicio analítico para contrastar referencias estadísticas oficiales; no se almacenan de manera persistente en cookies ni localStorage.
          </p>
          <div className="editorial-page__notice" role="note">
            <strong>Alcance y rigor analítico</strong>
            <p>
              La evaluación procesa la solicitud mediante la API del proyecto para contrastar precios de cierre oficiales. El frontend no comparte datos con redes publicitarias de terceros.
            </p>
          </div>
          <section className="editorial-page__section">
            <h2>Datos utilizados al calcular</h2>
            <p>
              Para emitir un veredicto, el servicio recibe precio, superficie, operación y barrio o distrito, y los compara con las referencias estadísticas oficiales del proyecto. Permanecen en el estado de la página mientras se usa la herramienta y desaparecen al cerrar o recargar la vista.
            </p>
          </section>
          <section className="editorial-page__section">
            <h2>Responsable y derechos</h2>
            <p>
              Para ejercer cualquier derecho de información o realizar consultas técnicas sobre el tratamiento de datos del proyecto académico:
            </p>
            <p>
              <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">
                Canal de incidencias y soporte en GitHub ↗
              </a>
            </p>
          </section>
          <p className="editorial-page__note">
            Fecha de revisión: Noviembre de 2026. Plataforma Decide Madrid: Invierte Y Compra (DMIYC).
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
