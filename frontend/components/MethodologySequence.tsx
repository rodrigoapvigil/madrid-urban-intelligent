'use client';

import { useEffect, useRef } from 'react';

type MethodologyAsset = readonly [string, string, string];
type MethodologyPhase = readonly [string, string, string];

type MethodologySequenceProps = {
  assets: readonly MethodologyAsset[];
  phases: readonly MethodologyPhase[];
};

export function MethodologySequence({ assets, phases }: MethodologySequenceProps) {
  const sequenceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sequence = sequenceRef.current;
    if (!sequence) return;

    const steps = Array.from(sequence.querySelectorAll<HTMLElement>('.methodology-step'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-active', entry.isIntersecting);
        });
      },
      { rootMargin: '-38% 0px -38% 0px', threshold: 0 },
    );

    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="methodology-sequence" ref={sequenceRef}>
      {phases.map(([phase, phaseTitle, phaseDescription], phaseIndex) => (
        <section className="methodology-phase-group" key={phase} aria-labelledby={`methodology-phase-${phaseIndex + 1}`}>
          <div className="methodology-phase">
            <span>{phase}</span>
            <h3 id={`methodology-phase-${phaseIndex + 1}`}>{phaseTitle}</h3>
            <p>{phaseDescription}</p>
          </div>
          <div className="methodology-phase-steps">
            {assets.slice(phaseIndex * 3, phaseIndex * 3 + 3).map(([slug, title, description], stepIndex) => {
              const index = phaseIndex * 3 + stepIndex;

              return (
                <figure className={`methodology-step ${index % 2 === 1 ? 'is-reversed' : ''}`} key={slug}>
                  <div className="methodology-step__art">
                    <img src={`/assets/methodology/${slug}.svg`} alt={description} loading="eager" width="640" height="420" />
                  </div>
                  <figcaption className="methodology-step__copy">
                    <span className="methodology-step__index">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{title.replace(/^\d+ · /, '')}</strong>
                    <span>{description}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
