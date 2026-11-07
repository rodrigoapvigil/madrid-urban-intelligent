'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

const skyline = '/madrid-skyline-transparent.png';

export default function MadridHeroArtwork() {
  const artworkRef = useRef<HTMLDivElement>(null);
  const edgeLightRef = useRef<HTMLImageElement>(null);
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
    const edgeLight = edgeLightRef.current;
    const hero = artwork?.closest('.mi-hero');
    const canvas = artwork?.querySelector('.mi-hero-artwork__canvas');
    if (!artwork || !edgeLight || !canvas || !hero) return;

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
        const bounds = canvas.getBoundingClientRect();
        edgeLight.style.setProperty('--mi-edge-x', `${clientX - bounds.left}px`);
        edgeLight.style.setProperty('--mi-edge-y', `${clientY - bounds.top}px`);
        edgeLight.classList.add('is-visible');
        frame = 0;
      });
    };
    const onPointerLeave = () => edgeLight.classList.remove('is-visible');

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
          alt=""
          style={animate ? { opacity: baseOpacity, scale: baseScale, y: baseY } : undefined}
          draggable={false}
        />
        {animate && <>
          <motion.img className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--west" src={skyline} alt="" style={{ opacity: fragmentOpacity, x: leftX, y: leftY }} draggable={false} />
          <motion.img className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--east" src={skyline} alt="" style={{ opacity: fragmentOpacity, x: rightX, y: rightY }} draggable={false} />
        </>}
        <Image className="mi-hero__skyline mi-hero-artwork__edge-light" src="/madrid-skyline-buildings.svg" alt="" width={2200} height={760} draggable={false} ref={edgeLightRef} />
      </div>
    </div>
  );
}
