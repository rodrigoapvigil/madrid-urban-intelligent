import React, { Suspense } from 'react';
import { Metadata } from 'next';
import MadridVeredicto from '../../../components/MadridVeredicto';
export const metadata: Metadata = {
  title: 'Veredicto inmobiliario: compara el precio de una vivienda',
  description: 'Contrasta el precio de compra o alquiler con referencias estadísticas de tu barrio y distrito en Madrid y consulta los datos oficiales de cierre.',
  alternates: { canonical: '/madrid/veredicto' },
};

export default function VeredictoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--texto-sobre-azul)', background: 'var(--azul-noche)' }}>Cargando El Veredicto...</div>}>
      <MadridVeredicto />
    </Suspense>
  );
}
