import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../../components/SiteChrome';
import territories from '../../../lib/madrid-seo-territories.json';
import '../../editorial.css';

export const metadata: Metadata = {
  title: 'Precios de vivienda en los 131 barrios y 21 distritos de Madrid',
  description:
    'Índice completo de precios reales de alquiler, compraventa y rentabilidad bruta estimada en los 21 distritos y 131 barrios de Madrid.',
  alternates: { canonical: '/madrid/barrios' },
};

const fmt = (v: number | null, suffix = '') =>
  v === null ? 'Sin muestra suficiente' : `${v.toLocaleString('es-ES')}${suffix}`;

export default function MadridBarriosIndexPage() {
  const { distritos, barrios, source_period } = territories;

  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Índice territorial de Madrid · {source_period}</p>
          <h1>Precios de vivienda en los 21 distritos y 131 barrios de Madrid</h1>
          <p className="editorial-page__lead">
            Consulta las referencias estadísticas de cierre en alquiler (€/m²/mes), compraventa (€/m²) y rentabilidad bruta estimada por distrito y barrio oficial de Madrid.
          </p>

          <section className="editorial-page__section">
            <h2>Los 21 Distritos de Madrid</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Distrito</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Alquiler</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Compra / Venta</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Rentabilidad bruta</th>
                    <th style={{ padding: '0.6rem 0.5rem' }}>Barrios</th>
                  </tr>
                </thead>
                <tbody>
                  {distritos.map((d) => (
                    <tr key={d.cod_distrito} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        <Link href={`/madrid/distrito/${d.slug}`}><strong>{d.nombre}</strong></Link>
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(d.alquiler_m2, ' €/m²')}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(d.venta_m2, ' €/m²')}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{fmt(d.rentabilidad_bruta_pct, ' %')}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{d.barrios_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="editorial-page__section">
            <h2>Todos los barrios de Madrid por distrito ({barrios.length})</h2>
            {distritos.map((d) => {
              const sub = barrios.filter((b) => b.cod_distrito === d.cod_distrito);
              return (
                <div key={d.cod_distrito} style={{ marginBottom: '1.5rem' }}>
                  <h3>
                    <Link href={`/madrid/distrito/${d.slug}`}>{d.nombre}</Link>
                  </h3>
                  <p style={{ lineHeight: 1.8 }}>
                    {sub.map((b, idx) => (
                      <span key={b.cod_barrio}>
                        <Link href={`/madrid/barrio/${b.slug}`}>{b.nombre}</Link>
                        {idx < sub.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              );
            })}
          </section>

          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Abrir cuadro de mando interactivo</Link>
            <Link href="/metodologia">Consultar metodología</Link>
          </div>
        </div>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://dmiyc.com/' },
              { '@type': 'ListItem', position: 2, name: 'Madrid', item: 'https://dmiyc.com/madrid' },
              { '@type': 'ListItem', position: 3, name: 'Barrios y Distritos', item: 'https://dmiyc.com/madrid/barrios' },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
      <SiteFooter />
    </>
  );
}
