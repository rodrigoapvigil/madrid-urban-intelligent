import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '../../../../components/SiteChrome';
import territories from '../../../../lib/madrid-seo-territories.json';
import '../../../editorial.css';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return territories.barrios.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const barrio = territories.barrios.find((b) => b.slug === params.slug);
  if (!barrio) return { title: 'Barrio no encontrado' };

  return {
    title: `Precio vivienda en ${barrio.nombre} (${barrio.distrito}, Madrid)`,
    description: `Consulta el precio real de alquiler (${barrio.alquiler_m2 ?? 'N/D'} €/m²), compra (${barrio.venta_m2 ?? 'N/D'} €/m²) y rentabilidad en ${barrio.nombre}, distrito de ${barrio.distrito}, Madrid.`,
    alternates: { canonical: `/madrid/barrio/${barrio.slug}` },
  };
}

const fmt = (v: number | null, suffix = '') =>
  v === null ? 'Sin muestra suficiente' : `${v.toLocaleString('es-ES')}${suffix}`;

export default function BarrioSeoPage({ params }: Props) {
  const barrio = territories.barrios.find((b) => b.slug === params.slug);
  if (!barrio) notFound();

  const distrito = territories.distritos.find((d) => d.cod_distrito === barrio.cod_distrito);
  const siblings = territories.barrios.filter(
    (b) => b.cod_distrito === barrio.cod_distrito && b.cod_barrio !== barrio.cod_barrio
  );

  const compra80 = barrio.venta_m2 ? Math.round(barrio.venta_m2 * 80) : null;
  const alquiler80 = barrio.alquiler_m2 ? Math.round(barrio.alquiler_m2 * 80) : null;

  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">
            <Link href="/madrid/barrios">Madrid</Link> ·{' '}
            <Link href={`/madrid/distrito/${barrio.distrito_slug}`}>{barrio.distrito}</Link> · Datos {barrio.periodo}
          </p>
          <h1>Precio de la vivienda en {barrio.nombre} ({barrio.distrito}, Madrid)</h1>
          <p className="editorial-page__lead">
            En el barrio de <strong>{barrio.nombre}</strong> (distrito de {barrio.distrito}), la referencia de mercado sitúa el alquiler en <strong>{fmt(barrio.alquiler_m2, ' €/m²/mes')}</strong> y la compraventa en <strong>{fmt(barrio.venta_m2, ' €/m²')}</strong>
            {barrio.rentabilidad_bruta_pct ? `, equivalente a una rentabilidad bruta estimada del ${barrio.rentabilidad_bruta_pct} %` : ''}.
          </p>

          <section className="editorial-page__section">
            <h2>Datos de alquiler, compra y rentabilidad en {barrio.nombre}</h2>
            <ul>
              <li><strong>Alquiler medio por m²:</strong> {fmt(barrio.alquiler_m2, ' €/m²/mes')} {alquiler80 ? `(≈ ${alquiler80.toLocaleString('es-ES')} €/mes para un piso de 80 m²)` : ''}</li>
              <li><strong>Compra / venta por m²:</strong> {fmt(barrio.venta_m2, ' €/m²')} {compra80 ? `(≈ ${compra80.toLocaleString('es-ES')} € para un piso de 80 m²)` : ''}</li>
              <li><strong>Rentabilidad bruta estimada:</strong> {fmt(barrio.rentabilidad_bruta_pct, ' % anual')}</li>
              {distrito && (
                <li>
                  <strong>Referencia del distrito ({distrito.nombre}):</strong> Alquiler {fmt(distrito.alquiler_m2, ' €/m²')} · Compra {fmt(distrito.venta_m2, ' €/m²')}
                </li>
              )}
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>Preguntas frecuentes sobre {barrio.nombre}</h2>
            <p>
              <strong>¿Cuánto cuesta el metro cuadrado en {barrio.nombre}, Madrid?</strong><br />
              Según los últimos datos consolidados de DMIYC ({barrio.periodo}), el precio de referencia en {barrio.nombre} es de {fmt(barrio.venta_m2, ' €/m²')} en compraventa y {fmt(barrio.alquiler_m2, ' €/m²/mes')} en alquiler.
            </p>
            <p>
              <strong>¿Cómo saber si un piso en {barrio.nombre} está caro frente al mercado real?</strong><br />
              Puedes introducir el precio del anuncio en la herramienta <Link href="/madrid/veredicto">Comprobar un precio</Link> de DMIYC o explorar la evolución histórica del barrio en el <Link href="/madrid">Cuadro de Mando</Link>.
            </p>
          </section>

          {siblings.length > 0 && (
            <section className="editorial-page__section">
              <h2>Otros barrios de {barrio.distrito}</h2>
              <p style={{ lineHeight: 1.8 }}>
                {siblings.map((s, idx) => (
                  <span key={s.cod_barrio}>
                    <Link href={`/madrid/barrio/${s.slug}`}>{s.nombre}</Link>
                    {idx < siblings.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </p>
            </section>
          )}

          <p className="editorial-page__note">
            Referencia estadística informativa generada a partir de series territoriales del proyecto DMIYC. No constituye tasación oficial ni asesoramiento financiero.
          </p>

          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Explorar {barrio.nombre} en el dashboard</Link>
            <Link href="/madrid/veredicto">Analizar una oferta</Link>
            <Link href={`/madrid/distrito/${barrio.distrito_slug}`}>Distrito {barrio.distrito}</Link>
          </div>
        </div>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dmiyc.com/' },
                  { '@type': 'ListItem', position: 2, name: 'Barrios', item: 'https://dmiyc.com/madrid/barrios' },
                  { '@type': 'ListItem', position: 3, name: barrio.distrito, item: `https://dmiyc.com/madrid/distrito/${barrio.distrito_slug}` },
                  { '@type': 'ListItem', position: 4, name: barrio.nombre, item: `https://dmiyc.com/madrid/barrio/${barrio.slug}` },
                ],
              },
              {
                '@type': 'Place',
                name: `${barrio.nombre}, ${barrio.distrito}, Madrid`,
                containedInPlace: { '@type': 'AdministrativeArea', name: barrio.distrito },
              },
              {
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: `¿Cuánto cuesta el metro cuadrado en ${barrio.nombre}, Madrid?`,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: `Según los datos consolidados de DMIYC (${barrio.periodo}), la referencia en ${barrio.nombre} (${barrio.distrito}) es de ${fmt(barrio.venta_m2, ' €/m²')} en compraventa y ${fmt(barrio.alquiler_m2, ' €/m²/mes')} en alquiler.`,
                    },
                  },
                ],
              },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
      <SiteFooter />
    </>
  );
}
