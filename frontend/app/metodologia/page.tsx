import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/SiteChrome';
import '../editorial.css';

export const metadata: Metadata = {
  title: 'Metodología de precios y estimaciones inmobiliarias',
  description: 'Conoce las fuentes, el tratamiento de series mensuales y la validación de los modelos de precios de vivienda por barrio en Madrid.',
  alternates: { canonical: '/metodologia' },
};

const METHODOLOGY_ASSETS = [
  ['01-extraccion', '01 · Extracción', 'Portales de datos abiertos, Ayuntamiento, Comunidad e Instituto de Estadística.'],
  ['02-transformacion', '02 · Transformación', 'Limpieza, normalización territorial y homogeneización de formatos.'],
  ['03-carga', '03 · Carga', 'Las observaciones reales se almacenan en el DataMart histórico.'],
  ['04-entrenamiento-mayo', '04 · Entrenamiento de mayo', 'Primer entrenamiento con históricos hasta 2025 y validación temporal.'],
  ['05-entrenamiento-septiembre', '05 · Entrenamiento de septiembre', 'Reentrenamiento incorporando los nuevos datos disponibles de 2026.'],
  ['06-validacion', '06 · Validación', 'Tres meses reservados para medir el rendimiento sin fuga de información.'],
  ['07-datamart', '07 · Histórico real', 'La base analítica no guarda predicciones ni sobrescribe observaciones.'],
  ['08-rag', '08 · Memoria RAG', 'Documentos y conocimiento contrastado convertidos en memoria vectorial.'],
  ['09-ambi', '09 · AMBI', 'El agente conversacional responde usando el contexto recuperado del proyecto.'],
] as const;

const METHODOLOGY_PHASES = [
  ['FASE 01', 'Construir el conocimiento', 'Extraemos, transformamos y cargamos observaciones reales para formar una base trazable.'],
  ['FASE 02', 'Dar inteligencia al dato', 'Entrenamos, reentrenamos y validamos modelos sin dejar que vean el futuro.'],
  ['FASE 03', 'Conversar con contexto', 'La memoria RAG conecta el conocimiento contrastado con las respuestas de AMBI.'],
] as const;

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page editorial-page--methodology">
        <div className="editorial-page__inner">
          <p className="editorial-page__eyebrow">Transparencia y metodología</p>
          <h1>Qué mide cada cifra y qué no.</h1>
          <p className="editorial-page__lead">
            La plataforma reúne operaciones históricas oficiales y estimaciones mensuales para ayudar a leer el mercado residencial de Madrid. Las dos clases de dato se identifican por separado con total transparencia.
          </p>
          <figure className="methodology-anatomy">
            <img
              src="/assets/madrid-methodology-anatomy.svg"
              alt="Tubería isométrica de la metodología: extracción de datos abiertos, transformación y validación, modelos predictivos y memoria RAG para AMBI."
              loading="eager"
            />
            <figcaption>
              Del dato abierto a la inteligencia de AMBI: extracción, transformación, validación, predicción y recuperación de conocimiento.
            </figcaption>
          </figure>
          <section className="methodology-gallery" aria-labelledby="methodology-gallery-title">
            <div className="methodology-gallery__intro">
              <p className="editorial-page__eyebrow">La anatomía del proyecto</p>
              <h2 id="methodology-gallery-title">Nueve pasos, una misma trazabilidad.</h2>
              <p>Cada imagen representa una pieza concreta del recorrido: desde la fuente pública hasta una respuesta contextualizada de AMBI.</p>
            </div>
            <div className="methodology-sequence">
              {METHODOLOGY_PHASES.map(([phase, phaseTitle, phaseDescription], phaseIndex) => (
                <section className="methodology-phase-group" key={phase} aria-labelledby={`methodology-phase-${phaseIndex + 1}`}>
                  <div className="methodology-phase">
                    <span>{phase}</span>
                    <h3 id={`methodology-phase-${phaseIndex + 1}`}>{phaseTitle}</h3>
                    <p>{phaseDescription}</p>
                  </div>
                  <div className="methodology-phase-steps">
                    {METHODOLOGY_ASSETS.slice(phaseIndex * 3, phaseIndex * 3 + 3).map(([slug, title, description], stepIndex) => {
                      const index = phaseIndex * 3 + stepIndex;

                      return (
                        <figure className={`methodology-step ${index % 2 === 1 ? 'is-reversed' : ''}`} key={slug}>
                          <div className="methodology-step__art">
                            <img src={`/assets/methodology/${slug}.svg`} alt={description} loading="eager" width="640" height="420" />
                          </div>
                          <figcaption className="methodology-step__copy">
                            <span className="methodology-step__index">{String(index + 1).padStart(2, '0')}</span>
                            <strong>{title.replace(/^\d+ · /, '')}</strong>
                            <span>{description}</span>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
          <section className="methodology-facts" aria-labelledby="methodology-facts-title">
            <div className="methodology-facts__heading">
              <span className="editorial-page__eyebrow">Cómo leer el resultado</span>
              <h2 id="methodology-facts-title">Tres reglas antes de interpretar una cifra.</h2>
            </div>
            <div className="methodology-facts__grid">
              <article>
                <span>01</span>
                <h3>Operaciones observadas</h3>
                <p>Las series históricas proceden de datos públicos de cierre del Ayuntamiento de Madrid y se agregan por mes y zona.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Dato real o proyección</h3>
                <p>Los meses sin registro histórico se muestran como proyección y quedan identificados por separado en el dashboard.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Validación y límites</h3>
                <p>El MAE agregado informado es 104,25 €/m² para venta y aproximadamente 0,48 €/m² para alquiler; una estimación es una referencia estadística.</p>
              </article>
            </div>
          </section>
          <p className="editorial-page__note">
            En el gráfico de evolución puedes abrir la tabla mensual para consultar el valor, la unidad y la etiqueta de cada punto auditado.
          </p>
          <div className="editorial-page__actions">
            <Link className="editorial-page__button" href="/madrid">Explorar el mercado</Link>
            <Link href="/sobre-el-proyecto">Sobre el proyecto</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
