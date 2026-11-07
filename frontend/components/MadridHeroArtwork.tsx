'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

const skyline = '/madrid-skyline-transparent.png';
const description = 'Ilustración panorámica de Madrid con el edificio Metrópolis, el Palacio de Cibeles y su fuente, la Puerta de Alcalá y el Oso y el Madroño.';

export default function MadridHeroArtwork() {
  const artworkRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: artworkRef,
    offset: ['start start', 'end start'],
  });

  const scatter = useTransform(scrollYProgress, [0, 0.2, 0.42, 0.63, 0.86, 1], [0, 0.12, 1, 0.38, 0, 0]);
  const baseOpacity = useTransform(scatter, [0, 1], [0.94, 0.62]);
  const baseScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.025, 0.98]);
  const baseY = useTransform(scrollYProgress, [0, 1], [0, -16]);
  const fragmentOpacity = useTransform(scatter, [0, 0.35, 1], [0, 0.16, 0.62]);
  const leftX = useTransform(scatter, [0, 1], [0, -32]);
  const leftY = useTransform(scatter, [0, 1], [0, -13]);
  const rightX = useTransform(scatter, [0, 1], [0, 34]);
  const rightY = useTransform(scatter, [0, 1], [0, 16]);

  useEffect(() => {
    const artwork = artworkRef.current;
    const glow = glowRef.current;
    const hero = artwork?.closest('.mi-hero');
    if (!artwork || !glow || !hero) return;

    let frame = 0;
    let clientX = 0;
    let clientY = 0;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const bounds = artwork.getBoundingClientRect();
        glow.style.setProperty('--mi-glow-x', `${clientX - bounds.left}px`);
        glow.style.setProperty('--mi-glow-y', `${clientY - bounds.top}px`);
        glow.classList.add('is-visible');
        frame = 0;
      });
    };
    const onPointerLeave = () => glow.classList.remove('is-visible');

    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
    return () => {
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const animate = !reducedMotion;

  return (
    <div className="mi-hero-artwork" ref={artworkRef} aria-hidden="true">
      <div className="mi-hero-artwork__canvas">
        <motion.img
          className="mi-hero__skyline mi-hero__skyline--base"
          src={skyline}
          alt={description}
          style={animate ? { opacity: baseOpacity, scale: baseScale, y: baseY } : undefined}
          draggable={false}
        />
        {animate && <>
          <motion.img className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--west" src={skyline} alt="" style={{ opacity: fragmentOpacity, x: leftX, y: leftY }} draggable={false} />
          <motion.img className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--east" src={skyline} alt="" style={{ opacity: fragmentOpacity, x: rightX, y: rightY }} draggable={false} />
        </>}
      </div>
      <div className="mi-hero-artwork__glow" ref={glowRef} />
    </div>
  );
}
