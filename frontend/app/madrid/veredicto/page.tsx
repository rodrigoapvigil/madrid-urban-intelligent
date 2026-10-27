import React, { Suspense } from 'react';
import { Metadata } from 'next';
import MadridVeredicto from '../../../components/MadridVeredicto';

export const metadata: Metadata = {
  title: 'El Veredicto — ¿Está caro o barato este piso en Madrid? | Madrid Urban Intelligence',
  description: 'Comprueba al instante si un piso en Madrid tiene sobreprecio o es una oportunidad frente a los datos oficiales de cierre del Ayuntamiento de Madrid.',
};

export default function VeredictoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1D] flex items-center justify-center text-slate-400">Cargando El Veredicto...</div>}>
      <MadridVeredicto />
    </Suspense>
  );
}
