import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Decide Madrid: Invierte Y Compra (DMIYC)',
  description: 'Tratamiento de datos personales, garantías de privacidad por diseño y ejercicio de derechos conforme al RGPD y LOPDGDD en DMIYC.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Compromiso con la Privacidad y el RGPD</p>
          <h1>Política de Privacidad</h1>
          <p className="editorial-page__lead">
            En <strong>Decide Madrid: Invierte Y Compra (DMIYC)</strong> protegemos tu privacidad como principio fundacional. Nuestra arquitectura técnica ha sido concebida bajo el paradigma de <em>Privacidad desde el Diseño y por Defecto</em>, garantizando el pleno cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo (RGPD) y de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
          </p>

          <section className="editorial-page__section">
            <h2>1. Responsable del Tratamiento de los Datos</h2>
            <p>
              A efectos de lo dispuesto en la normativa europea y española de protección de datos, el responsable del tratamiento de los datos es:
            </p>
            <ul>
              <li><strong>Titular de la plataforma:</strong> Decide Madrid: Invierte Y Compra (DMIYC).</li>
              <li><strong>Finalidad institucional:</strong> Investigación estadística, analítica territorial y transparencia de precios en el mercado inmobiliario de Madrid.</li>
              <li><strong>Canal de contacto para el ejercicio de derechos:</strong> A través del canal de soporte oficial habilitado en <a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a> y por mensajería en LinkedIn.</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>2. Principio de Minimización: Navegación Sin Registro</h2>
            <p>
              Para acceder, explorar y consultar la totalidad del Cuadro de Mando (precios de cierre, mapas coropléticos, series temporales, rankings de demanda y esfuerzo financiero de los 131 barrios de Madrid) <strong>no se requiere registro de usuario, ni creación de cuenta, ni aportación de nombre, correo electrónico, documento de identidad o número de teléfono</strong>.
            </p>
            <p>
              Creemos firmemente en el acceso público a los datos abiertos sin barreras de autenticación ni recopilación innecesaria de información personal.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>3. Tratamiento de Datos en Módulos Especializados</h2>
            <p>
              Al utilizar las funciones avanzadas e interactivas de la plataforma, el tratamiento de datos se limita exclusivamente a lo indispensable para el cálculo en tiempo real:
            </p>
            <ul>
              <li>
                <strong>Módulo «El Veredicto»:</strong> Cuando introduces parámetros específicos de un inmueble (precio ofertado en portales, superficie en metros cuadrados, distrito o barrio y modalidad de compra o alquiler), dichos datos se procesan de forma <em>efímera en memoria volátil</em> en el servidor analítico para contrastar el valor contra la distribución estadística oficial de la zona. <strong>No se almacenan de manera persistente en bases de datos con fines de perfilado de usuarios ni se vinculan a tu dirección IP.</strong>
              </li>
              <li>
                <strong>Asistente Conversacional «AMBI»:</strong> Las consultas formuladas en lenguaje natural sobre tendencias y recomendaciones se envían al motor de inferencia exclusivamente para generar la respuesta técnica contextual. Ninguna conversación se utiliza para entrenar modelos publicitarios comerciales ni se cede a redes de corredores inmobiliarios.
              </li>
              <li>
                <strong>Comparador Territorial de Zonas:</strong> Los distritos o barrios seleccionados para la comparativa superpuesta se gestionan en el estado local de navegación de tu propio navegador (React Client State) y se eliminan al cerrar la pestaña o ventana.
              </li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>4. Base Jurídica del Tratamiento</h2>
            <p>
              La base legal que legitima el tratamiento de datos técnicos indispensables en DMIYC se fundamenta en:
            </p>
            <ul>
              <li>
                <strong>El interés legítimo (artículo 6.1.f del RGPD):</strong> Garantizar la seguridad, estabilidad técnica, balanceo de carga y correcto funcionamiento algorítmico del portal de datos abiertos.
              </li>
              <li>
                <strong>El consentimiento explícito del interesado (artículo 6.1.a del RGPD):</strong> Otorgado voluntariamente por el usuario al remitir solicitudes de información o interactuar voluntariamente con las herramientas interactivas del portal.
              </li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>5. Destinatarios y Transferencias Internacionales</h2>
            <p>
              DMIYC <strong>no vende, no alquila, no comercializa ni cede bajo ninguna circunstancia datos de los usuarios a agencias inmobiliarias, promotoras, entidades bancarias ni plataformas publicitarias de retargeting</strong>.
            </p>
            <p>
              La infraestructura tecnológica del frontend y del backend analítico opera sobre servidores seguros de proveedores cloud que cumplen con los estándares de seguridad ISO/IEC 27001 y las Cláusulas Contractuales Tipo avaladas por la Comisión Europea, garantizando un nivel adecuado de protección de datos en caso de transferencias técnicas de infraestructura.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>6. Plazo de Conservación de la Información</h2>
            <p>
              Los datos analíticos introducidos en formularios interactivos se destruyen inmediatamente tras la finalización del cálculo matemático y la entrega del resultado visual en pantalla. Los registros técnicos de conexión (logs de acceso para mantenimiento y prevención de ciberataques) se conservan por el tiempo estrictamente necesario para preservar la integridad del servicio conforme a las obligaciones legales de seguridad.
            </p>
          </section>

          <section className="editorial-page__section">
            <h2>7. Ejercicio de Derechos (ARSOPOL)</h2>
            <p>
              Conforme a los artículos 15 a 22 del RGPD y a la LOPDGDD, tienes derecho en cualquier momento a ejercer tus derechos de:
            </p>
            <ul>
              <li><strong>Acceso:</strong> Conocer si tus datos personales están siendo objeto de tratamiento.</li>
              <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o incompletos.</li>
              <li><strong>Supresión («Derecho al olvido»):</strong> Solicitar la eliminación de tus datos cuando ya no sean necesarios para los fines recabados.</li>
              <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos por motivos derivados de tu situación particular.</li>
              <li><strong>Limitación del tratamiento:</strong> Solicitar la restricción del tratamiento en los supuestos previstos por la ley.</li>
              <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado y de lectura mecánica.</li>
            </ul>
            <p>
              Asimismo, si consideras que tus derechos han sido vulnerados, tienes derecho a presentar una reclamación formal ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> a través de su sede electrónica oficial en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.
            </p>
          </section>

          <p className="editorial-page__note">
            Esta Política de Privacidad se revisa periódicamente para adaptarse a las novedades legislativas y jurisprudenciales. Última actualización: Noviembre de 2026.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
