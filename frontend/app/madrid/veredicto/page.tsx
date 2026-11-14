import React, { Suspense } from 'react';
import { Metadata } from 'next';
import MadridVeredicto from '../../../components/MadridVeredicto';
import { PRICE_ANALYSIS_LABEL } from '../../../lib/product-copy';
export const metadata: Metadata = {
  title: `${PRICE_ANALYSIS_LABEL} · DMIYC`,
  description: 'Compara un precio de compra o alquiler con las operaciones de cierre observadas en su zona. Referencia estadística informativa; no es una tasación.',
  alternates: { canonical: '/madrid/veredicto' },
};

export default function VeredictoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--texto-sobre-azul)', background: 'var(--azul-noche)' }}>Cargando {PRICE_ANALYSIS_LABEL}...</div>}>
      <MadridVeredicto />
    </Suspense>
  );
}
