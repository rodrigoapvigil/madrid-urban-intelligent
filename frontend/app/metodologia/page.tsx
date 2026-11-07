import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Metodología de precios y estimaciones inmobiliarias',
  description: 'Conoce las fuentes, el tratamiento de series mensuales y la validación de los modelos de precios de vivienda por barrio en Madrid.',
  alternates: { canonical: '/metodologia' },
};

export default function MethodologyPage() {
  return <><SiteHeader/><main className="editorial-page"><div className="editorial-page__inner">
    <p className="editorial-page__eyebrow">Transparencia y metodología</p><h1>Qué mide cada cifra y qué no.</h1>
    <p className="editorial-page__lead">La plataforma reúne operaciones históricas y estimaciones mensuales para ayudar a leer el mercado residencial de Madrid. Las dos clases de dato se identifican por separado.</p>
    <section className="editorial-page__section"><h2>Operaciones observadas</h2><p>Las series históricas se consultan desde el DataMart del proyecto y proceden de datos públicos de cierre del Ayuntamiento de Madrid. Se agregan por mes y por zona; por eso una media de distrito o de Madrid no describe cada inmueble individual.</p></section>
    <section className="editorial-page__section"><h2>Estimaciones y periodo</h2><p>Los meses sin registro histórico pueden aparecer como proyección. El dashboard y el gráfico de portada etiquetan cada punto como dato real o proyección y muestran el mes y año de la observación más reciente disponible. Ese periodo no equivale a la fecha de actualización técnica del sistema.</p></section>
    <section className="editorial-page__section"><h2>Validación y límites</h2><p>La memoria del proyecto informa un error absoluto medio (MAE) agregado de 104,25 €/m² para venta y aproximadamente 0,48 €/m² para alquiler en la evaluación final descrita. El MAE es un promedio de errores de un conjunto de validación; no es un intervalo de confianza, no garantiza la precisión de una zona concreta y no sustituye una tasación.</p><p>El rendimiento cambia por operación, zona y periodo. Una estimación debe leerse como referencia estadística, separada de las operaciones observadas.</p></section>
    <p className="editorial-page__note">En el gráfico de evolución puedes abrir la tabla mensual para consultar el valor, la unidad y la etiqueta de cada punto.</p>
    <div className="editorial-page__actions"><Link className="editorial-page__button" href="/madrid">Explorar el mercado</Link><Link href="/sobre-el-proyecto">Sobre el proyecto</Link></div>
  </div></main><SiteFooter/></>;
}
