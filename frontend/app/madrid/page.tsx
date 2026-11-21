import React, { Suspense } from 'react';
import MadridDashboardV2 from '../../components/MadridDashboardV2';
import LoadingScreen from '../../components/LoadingScreen';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard de precios de vivienda en Madrid',
  description: 'Explora precios de alquiler, compra y venta por distrito y barrio. Compara indicadores y evolución mensual del mercado residencial de Madrid.',
  alternates: { canonical: '/madrid' },
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          ready={false}
          loadingMessage="Conectando con los datos de Madrid…"
        />
      }
    >
      <MadridDashboardV2 />
    </Suspense>
  );
}
