import React, { Suspense } from 'react';
import MadridDashboardV2 from '../../components/MadridDashboardV2';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard de precios de vivienda en Madrid',
  description: 'Explora precios de alquiler, compra y venta por distrito y barrio. Compara indicadores y evolución mensual del mercado residencial de Madrid.',
  alternates: { canonical: '/madrid' },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Cargando dashboard...</div>}>
      <MadridDashboardV2 />
    </Suspense>
  );
}
