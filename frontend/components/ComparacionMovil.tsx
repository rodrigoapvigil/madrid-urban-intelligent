import React, { ReactNode } from 'react';

/** Keeps the existing mobile comparison tree intact and mounts it only on mobile. */
export default function ComparacionMovil({ children }: { children: ReactNode }) {
  return <div className="v2-mobile-comparison-view">{children}</div>;
}
