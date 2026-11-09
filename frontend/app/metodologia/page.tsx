import type { Metadata } from 'next';
import { MethodologySequence } from '../../components/MethodologySequence';
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
          <section className="methodology-gallery" aria-labelledby="methodology-gallery-title">
            <div className="methodology-gallery__intro">
              <p className="editorial-page__eyebrow">La anatomía del proyecto</p>
              <h2 id="methodology-gallery-title">Nueve pasos, una misma trazabilidad.</h2>
              <p>Cada imagen representa una pieza concreta del recorrido: desde la fuente pública hasta una respuesta contextualizada de AMBI.</p>
            </div>
            <MethodologySequence assets={METHODOLOGY_ASSETS} phases={METHODOLOGY_PHASES} />
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
