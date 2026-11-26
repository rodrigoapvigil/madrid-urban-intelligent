import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '../../../../components/SiteChrome';
import territories from '../../../../lib/madrid-seo-territories.json';
import '../../../editorial.css';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return territories.distritos.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const distrito = territories.distritos.find((d) => d.slug === params.slug);
  if (!distrito) return { title: 'Distrito no encontrado' };

  return {
    title: `Precio vivienda en ${distrito.nombre}, Madrid · Alquiler y compra`,
    description: `Precios de cierre observados en ${distrito.nombre} (Madrid): alquiler (${distrito.alquiler_m2 ?? 'N/D'} €/m²), compraventa (${distrito.venta_m2 ?? 'N/D'} €/m²) y comparativa de sus ${distrito.barrios_count} barrios.`,
    alternates: { canonical: `/madrid/distrito/${distrito.slug}` },
  };
}

const fmt = (v: number | null, suffix = '') =>
  v === null ? 'Sin muestra suficiente' : `${v.toLocaleString('es-ES')}${suffix}`;

export default function DistritoSeoPage({ params }: Props) {
  const distrito = territories.distritos.find((d) => d.slug === params.slug);
  if (!distrito) notFound();

  const barrios = territories.barrios.filter((b) => b.cod_distrito === distrito.cod_distrito);
  const compra80 = distrito.venta_m2 ? Math.round(distrito.venta_m2 * 80) : null;
  const alquiler80 = distrito.alquiler_m2 ? Math.round(distrito.alquiler_m2 * 80) : null;

  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">
            <Link href="/madrid/barrios">Madrid</Link> · Distrito {distrito.cod_distrito} · Datos {distrito.periodo}
          </p>
          <h1>Precio de la vivienda en {distrito.nombre}, Madrid</h1>
          <p className="editorial-page__lead">
            En el distrito de <strong>{distrito.nombre}</strong> ({distrito.barrios_count} barrios oficiales), las referencias estadísticas de mercado sitúan el alquiler en <strong>{fmt(distrito.alquiler_m2, ' €/m²/mes')}</strong> y la compraventa en <strong>{fmt(distrito.venta_m2, ' €/m²')}</strong>
            {distrito.rentabilidad_bruta_pct ? `, con una rentabilidad bruta estimada del ${distrito.rentabilidad_bruta_pct} %` : ''}.
          </p>

          <section className="editorial-page__section">
            <h2>Indicadores clave de {distrito.nombre}</h2>
            <ul>
              <li><strong>Precio de alquiler por m²:</strong> {fmt(distrito.alquiler_m2, ' €/m²/mes')} {alquiler80 ? `(≈ ${alquiler80.toLocaleString('es-ES')} €/mes para 80 m²)` : ''}</li>
              <li><strong>Precio de compraventa por m²:</strong> {fmt(distrito.venta_m2, ' €/m²')} {compra80 ? `(≈ ${compra80.toLocaleString('es-ES')} € para 80 m²)` : ''}</li>
              <li><strong>Rentabilidad bruta estimada:</strong> {fmt(distrito.rentabilidad_bruta_pct, ' % anual')}</li>
            </ul>
          </section>

          <section className="editorial-page__section">
            <h2>Barrios del distrito {distrito.nombre} ({barrios.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Barrio</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Alquiler</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Compra / Venta</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Rentabilidad bruta</th>
                  </tr>
                </thead>
                <tbody>
                  {barrios.map((b) => (
                    <tr key={b.cod_barrio} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        <Link href={`/madrid/barrio/${b.slug}`}><strong>{b.nombre}</strong></Link>
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(b.alquiler_m2, ' €/m²')}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(b.venta_m2, ' €/m²')}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(b.rentabilidad_bruta_pct, ' %')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="editorial-page__note">
            Referencia estadística informativa generada a partir de series territoriales del proyecto DMIYC. No constituye tasación oficial ni asesoramiento financiero.
          </p>

          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Analizar {distrito.nombre} en el cuadro de mando</Link>
            <Link href="/madrid/barrios">Ver los 21 distritos</Link>
            <Link href="/madrid/veredicto">Comprobar un precio</Link>
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
                  { '@type': 'ListItem', position: 2, name: 'Barrios y Distritos', item: 'https://dmiyc.com/madrid/barrios' },
                  { '@type': 'ListItem', position: 3, name: distrito.nombre, item: `https://dmiyc.com/madrid/distrito/${distrito.slug}` },
                ],
              },
              {
                '@type': 'Place',
                name: `${distrito.nombre}, Madrid`,
                containedInPlace: { '@type': 'City', name: 'Madrid' },
              },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
      <SiteFooter />
    </>
  );
}
