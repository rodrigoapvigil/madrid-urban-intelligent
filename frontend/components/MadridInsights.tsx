'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const ARTICLES = [
  {
    kicker: 'ANÁLISIS DE ESFUERZO',
    title: 'La brecha de accesibilidad en la almendra central (2024–2026)',
    excerpt: 'El esfuerzo financiero para adquirir vivienda supera el 42% de la renta neta en Chamberí y Salamanca, frente al 29% en distritos exteriores.',
    date: 'Noviembre 2026',
    readTime: '4 min de lectura',
    href: '/madrid',
    tag: 'Financiación e Hipotecas',
  },
  {
    kicker: 'METODOLOGÍA DE MERCADO',
    title: 'Por qué el precio del anuncio casi nunca coincide con la firma notarial',
    excerpt: 'Auditoría sobre 10.794 operaciones cerradas: la brecha entre el precio de oferta en portales y el valor real escriturado promedia un 14,2%.',
    date: 'Octubre 2026',
    readTime: '6 min de lectura',
    href: '/metodologia',
    tag: 'Rigor y Fuentes',
  },
  {
    kicker: 'TENDENCIAS DE INVERSIÓN',
    title: 'Rotación de activos y rentabilidad bruta en el arco sur: Usera y Villaverde',
    excerpt: 'Localización de barrios donde la rentabilidad supera el 6,5% con proyecciones de demanda residencial estables para los próximos 24 meses.',
    date: 'Septiembre 2026',
    readTime: '5 min de lectura',
    href: '/madrid',
    tag: 'Proyecciones 2027',
  },
];

export default function MadridInsights() {
  return (
    <section className="mi-insights-section" id="insights" aria-labelledby="mi-insights-title">
      <div className="mi-wrap">
        <div className="mi-insights-heading">
          <div>
            <p className="mi-kicker mi-kicker--muted">INVESTIGACIÓN Y MERCADO</p>
            <h2 id="mi-insights-title">
              Insights del mercado.<br />
              <span>Análisis independiente sin ruido.</span>
            </h2>
          </div>
          <p className="mi-insights-lead">
            Informes técnicos basados en microdatos registrales y modelos estadísticos calibrados para entender la realidad inmobiliaria de Madrid.
          </p>
        </div>

        <div className="mi-insights-grid">
          {ARTICLES.map((art) => (
            <Link href={art.href} key={art.title} className="mi-insight-card">
              <div className="mi-insight-card__top">
                <span className="mi-insight-card__tag">{art.tag}</span>
                <span className="mi-insight-card__arrow" aria-hidden="true">
                  <ArrowUpRight />
                </span>
              </div>
              <div className="mi-insight-card__body">
                <p className="mi-insight-card__kicker">{art.kicker}</p>
                <h3 className="mi-insight-card__title">{art.title}</h3>
                <p className="mi-insight-card__excerpt">{art.excerpt}</p>
              </div>
              <div className="mi-insight-card__footer">
                <span>{art.date}</span>
                <span>{art.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
