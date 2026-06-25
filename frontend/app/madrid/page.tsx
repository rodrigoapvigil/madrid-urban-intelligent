import React, { Suspense } from 'react';
import MadridDashboardV2 from '../../components/MadridDashboardV2';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Cargando dashboard...</div>}>
      <MadridDashboardV2 />
    </Suspense>
  );
}
