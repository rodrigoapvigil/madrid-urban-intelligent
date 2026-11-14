'use client';

import React, { ReactNode } from 'react';
import ComparacionDesktop from './ComparacionDesktop';
import ComparacionMovil from './ComparacionMovil';

/** Only the selected platform tree is mounted. */
export default function ComparacionZonas({ isMobile, children }: {
  isMobile: boolean;
  children: ReactNode;
}) {
  return isMobile ? <ComparacionMovil>{children}</ComparacionMovil> : <ComparacionDesktop>{children}</ComparacionDesktop>;
}
