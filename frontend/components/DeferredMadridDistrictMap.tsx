'use client';

import { useEffect, useRef, useState } from 'react';
import MadridDistrictMap from './MadridDistrictMap';

export default function DeferredMadridDistrictMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '320px 0px' });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mi-district-map-deferred" ref={containerRef}>
      {shouldLoad ? <MadridDistrictMap /> : <div className="mi-district-map-deferred__placeholder" aria-hidden="true" />}
    </div>
  );
}
