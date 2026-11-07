import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacta con el equipo del proyecto académico Decide Madrid: Invierte Y Compra.',
  alternates: { canonical: '/contacto' },
};

export default function ContactPage() {
  return <><SiteHeader/><main className="editorial-page"><div className="editorial-page__inner">
    <p className="editorial-page__eyebrow">Contacto</p><h1>Hablemos del proyecto.</h1>
    <p className="editorial-page__lead">Decide Madrid: Invierte Y Compra es un proyecto académico independiente y gratuito para consultar referencias estadísticas del mercado residencial de Madrid.</p>
    <section className="editorial-page__section"><h2>Consultas e incidencias</h2><p>El canal disponible actualmente es el sistema de incidencias del repositorio. Las incidencias son públicas: no incluyas nombres, teléfonos, direcciones, enlaces privados de anuncios ni otros datos personales o confidenciales.</p><p><a href="https://github.com/rodrigoapvigil/madrid-urban-intelligent/issues" target="_blank" rel="noreferrer">Abrir contacto en GitHub ↗</a></p></section>
    <section className="editorial-page__section"><h2>Más información</h2><p><Link href="/sobre-el-proyecto">Sobre el proyecto</Link> · <Link href="/metodologia">Metodología</Link></p></section>
    <p className="editorial-page__note">Para cumplir plenamente con la información de contacto de un servicio en línea, la persona responsable debe añadir un correo electrónico y los datos identificativos y de domicilio que correspondan.</p>
  </div></main><SiteFooter/></>;
}
