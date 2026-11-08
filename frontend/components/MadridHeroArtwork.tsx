'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

const skyline = '/madrid-skyline-transparent.png';

interface UrbanParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  speedY: number;
  swaySpeed: number;
  swayAmp: number;
  seed: number;
  color: 'cream' | 'coral' | 'azure';
}

function UrbanTelemetryCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId = 0;
    let width = 0;
    let height = 0;
    let time = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Initialise 42 delicate data telemetry particles over the skyline span
    const count = window.innerWidth < 768 ? 24 : 46;
    const particles: UrbanParticle[] = Array.from({ length: count }, (_, i) => {
      const colorType: 'cream' | 'coral' | 'azure' =
        i % 7 === 0 ? 'coral' : i % 3 === 0 ? 'cream' : 'azure';
      return {
        x: Math.random() * (width || 1200),
        y: (height || 500) * (0.35 + Math.random() * 0.62),
        size: 0.9 + Math.random() * 1.8,
        baseAlpha: 0.25 + Math.random() * 0.55,
        alpha: 0,
        speedY: 0.22 + Math.random() * 0.45,
        swaySpeed: 0.0012 + Math.random() * 0.002,
        swayAmp: 12 + Math.random() * 22,
        seed: Math.random() * 100,
        color: colorType,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 1;

      for (const p of particles) {
        if (!prefersReduced) {
          p.y -= p.speedY;
          // When particle rises above the skyline crown or fades, reset to base
          if (p.y < height * 0.08) {
            p.y = height * (0.82 + Math.random() * 0.16);
            p.x = Math.random() * width;
          }
        }

        // Smooth sinusoidal opacity & horizontal sway
        const progress = Math.max(0, Math.min(1, (height - p.y) / (height * 0.9)));
        const envelope = Math.sin(progress * Math.PI); // fades in from bottom, peaks, fades out at top
        const twinkle = 0.8 + 0.2 * Math.sin(time * 0.05 + p.seed);
        p.alpha = p.baseAlpha * envelope * twinkle;

        const swayX = p.x + Math.sin(time * p.swaySpeed + p.seed) * p.swayAmp;

        // Render point with soft glow aura
        let fillStyle = 'rgba(164, 204, 255, ';
        if (p.color === 'coral') fillStyle = 'rgba(255, 107, 91, ';
        else if (p.color === 'cream') fillStyle = 'rgba(244, 237, 224, ';

        ctx.beginPath();
        ctx.arc(swayX, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${fillStyle}${p.alpha})`;
        ctx.fill();

        // Extra soft glow around coral & prominent azure particles
        if (p.size > 1.6 && p.alpha > 0.3) {
          ctx.beginPath();
          ctx.arc(swayX, p.y, p.size * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `${fillStyle}${p.alpha * 0.22})`;
          ctx.fill();
        }
      }

      if (!prefersReduced) {
        animId = window.requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animId) window.cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="mi-hero-artwork__particles"
      aria-hidden="true"
    />
  );
}

function DesktopAnimatedSkyline({ target }: { target: RefObject<HTMLDivElement> }) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end start'] });
  const scatter = useTransform(scrollYProgress, [0, 0.2, 0.42, 0.63, 0.86, 1], [0, 0.12, 1, 0.38, 0, 0]);
  const baseOpacity = useTransform(scatter, [0, 1], [0.96, 0.62]);
  const baseScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.025, 0.98]);
  const baseY = useTransform(scrollYProgress, [0, 1], [0, -16]);
  const fragmentOpacity = useTransform(scatter, [0, 0.35, 1], [0, 0.16, 0.62]);
  const leftX = useTransform(scatter, [0, 1], [0, -32]);
  const leftY = useTransform(scatter, [0, 1], [0, -13]);
  const rightX = useTransform(scatter, [0, 1], [0, 34]);
  const rightY = useTransform(scatter, [0, 1], [0, 16]);
  const animate = !reducedMotion;

  return (
    <>
      <motion.img
        className="mi-hero__skyline mi-hero__skyline--base"
        src={skyline}
        alt=""
        style={animate ? { opacity: baseOpacity, scale: baseScale, y: baseY } : undefined}
        draggable={false}
      />
      {animate && (
        <>
          <motion.img
            className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--west"
            src={skyline}
            alt=""
            style={{ opacity: fragmentOpacity, x: leftX, y: leftY }}
            draggable={false}
          />
          <motion.img
            className="mi-hero__skyline mi-hero__skyline--fragment mi-hero__skyline--east"
            src={skyline}
            alt=""
            style={{ opacity: fragmentOpacity, x: rightX, y: rightY }}
            draggable={false}
          />
        </>
      )}
    </>
  );
}

export default function MadridHeroArtwork() {
  const artworkRef = useRef<HTMLDivElement>(null);
  const edgeLightRef = useRef<HTMLImageElement>(null);
  const [desktopEffects, setDesktopEffects] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
    const update = () => setDesktopEffects(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const artwork = artworkRef.current;
    const edgeLight = edgeLightRef.current;
    const hero = artwork?.closest('.mi-hero');
    const canvas = artwork?.querySelector('.mi-hero-artwork__canvas');
    if (!desktopEffects || !artwork || !edgeLight || !canvas || !hero) return;

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
  }, [desktopEffects]);

  return (
    <div className="mi-hero-artwork" ref={artworkRef} aria-hidden="true">
      {/* 1. Bioluminescent Horizon Glow behind skyline */}
      <div className="mi-hero-artwork__horizon" />

      <div className="mi-hero-artwork__canvas">
        {/* 2. Base Architectural Skyline */}
        {desktopEffects ? (
          <DesktopAnimatedSkyline target={artworkRef} />
        ) : (
          <Image
            className="mi-hero__skyline mi-hero__skyline--base"
            src={skyline}
            alt=""
            width={2200}
            height={760}
            priority
            draggable={false}
          />
        )}

        {/* 3. Laser Data Scan Wave traversing Madrid landmarks */}
        <div className="mi-hero-artwork__scan-wave" />

        {/* 4. Interactive High-Precision Vector Line Spotlight */}
        {desktopEffects && (
          <Image
            className="mi-hero__skyline mi-hero-artwork__edge-light"
            src="/madrid-skyline-buildings.svg"
            alt=""
            width={2200}
            height={760}
            draggable={false}
            ref={edgeLightRef}
          />
        )}

        {/* 5. Living Kinetic Urban Telemetry Particles (Auros particle style) */}
        <UrbanTelemetryCanvas active={true} />
      </div>
    </div>
  );
}
