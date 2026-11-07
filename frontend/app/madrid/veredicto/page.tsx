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
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-600">Cargando El Veredicto...</div>}>
      <MadridVeredicto />
    </Suspense>
  );
}
