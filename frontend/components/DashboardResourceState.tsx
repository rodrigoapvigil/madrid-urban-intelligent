'use client';

import React from 'react';
import './DashboardResourceState.css';

export type DashboardResourceStatus = 'loading' | 'ready' | 'empty' | 'error';

export default function DashboardResourceState({ status, retry, emptyText = 'No hay datos disponibles para este periodo.' }: {
  status: DashboardResourceStatus;
  retry?: () => void;
  emptyText?: string;
}) {
  if (status === 'ready') return null;
  if (status === 'loading') return <div className="v2-resource-state" role="status"><span className="v2-resource-skeleton" aria-hidden="true" /><span>Cargando datos…</span></div>;
  if (status === 'empty') return <div className="v2-resource-state" role="status">{emptyText}</div>;
  return <div className="v2-resource-state" role="alert"><span>No se han podido cargar los datos.</span>{retry && <button type="button" onClick={retry}>Reintentar</button>}</div>;
}
