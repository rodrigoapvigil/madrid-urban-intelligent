'use client';

import React, { useEffect } from 'react';
import './DashboardHelpDialog.css';

export type DashboardHelpTopic = 'map' | 'heatmap' | 'compare';

const GUIDES: Record<DashboardHelpTopic, { title: string; subtitle: string; points: string[] }> = {
  map: {
    title: 'Cómo leer el mapa',
    subtitle: 'Tres claves para interpretar los precios por zona.',
    points: [
      'Los tonos más claros indican valores mayores. El rayado identifica zonas sin datos publicados.',
      'Selecciona un distrito para ver sus barrios o un barrio para consultar su ficha.',
      'La fecha distingue los datos observados de las estimaciones del modelo.',
    ],
  },
  heatmap: {
    title: 'Cómo leer el mapa de calor',
    subtitle: 'Cada fila es una zona y cada columna un mes.',
    points: [
      'Compara el color y el valor de cada zona a lo largo del año.',
      'La cabecera separa los meses con dato real de los meses estimados.',
      'Selecciona una zona del ranking para localizarla en esta tabla y en el mapa.',
    ],
  },
  compare: {
    title: 'Cómo comparar zonas',
    subtitle: 'Elige dos zonas y explora sus diferencias.',
    points: [
      'Busca cualquier distrito o barrio en los selectores de Zona A y Zona B.',
      'Pasa el cursor por una gráfica para consultar el mes; pulsa el pin para fijarlo.',
      'El periodo global actualiza las gráficas y las tarjetas de ambas zonas.',
    ],
  },
};

export default function DashboardHelpDialog({ topic, onClose }: { topic: DashboardHelpTopic; onClose: () => void }) {
  const guide = GUIDES[topic];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="dashboard-help-dialog-backdrop" onClick={onClose}>
    <section className="dashboard-help-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-help-title" onClick={event => event.stopPropagation()}>
      <header className="dashboard-help-dialog__header">
        <div><h2 id="dashboard-help-title">{guide.title}</h2><p>{guide.subtitle}</p></div>
        <button type="button" className="dashboard-help-dialog__close" aria-label="Cerrar ayuda" onClick={onClose}>×</button>
      </header>
      <ol>{guide.points.map((point, index) => <li key={point}><span aria-hidden="true">{index + 1}</span><p>{point}</p></li>)}</ol>
      <button type="button" className="dashboard-help-dialog__confirm" onClick={onClose}>¡Entendido, gracias!</button>
    </section>
  </div>;
}
