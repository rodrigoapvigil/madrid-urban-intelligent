'use client';

import { useEffect, useRef, useState } from 'react';

type StatCounterProps = {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  unit?: string;
  duration?: number;
};

export function StatCounter({ end, decimals = 0, prefix = '', suffix = '', unit = '', duration = 1400 }: StatCounterProps) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setVal(ease * end);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setVal(end);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  const formatted = decimals > 0 
    ? val.toFixed(decimals).replace('.', ',')
    : Math.round(val).toLocaleString('es-ES');

  return (
    <span ref={ref} className="mi-stat-counter">
      {prefix}{formatted}{unit && <span className="mi-scale__unit">{unit}</span>}{suffix}
    </span>
  );
}
