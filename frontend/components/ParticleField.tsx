'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

type Particle = { latitude: number; longitude: number; size: number; color: string };

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles: Particle[] = [];
    const count = window.innerWidth < 640 ? 430 : 760;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const y = 1 - 2 * ((i + 0.5) / count);
      particles.push({
        latitude: Math.asin(y),
        longitude: goldenAngle * i,
        size: 0.6 + ((i * 17) % 10) / 10,
        color: i % 91 === 0 ? 'coral' : i % 6 === 0 ? 'mist' : 'blue',
      });
    }

    let frame = 0;
    let angle = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const radius = Math.min(width * 0.48, height * 0.84);
      const centerX = width * 0.51;
      const centerY = height * 0.84;
      for (const particle of particles) {
        const cosLat = Math.cos(particle.latitude);
        const x0 = cosLat * Math.cos(particle.longitude + angle);
        const z0 = cosLat * Math.sin(particle.longitude + angle);
        const y0 = Math.sin(particle.latitude);
        const tilt = -0.23;
        const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
        const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
        if (z < -0.25) continue;
        const perspective = 0.78 + (z + 1) * 0.18;
        const x = centerX + x0 * radius * perspective;
        const py = centerY + y * radius * perspective;
        const alpha = Math.min(0.94, 0.2 + (z + 0.25) * 0.54);
        context.beginPath();
        context.arc(x, py, particle.size * perspective, 0, Math.PI * 2);
        context.fillStyle = particle.color === 'coral'
          ? `rgba(240,73,35,${alpha})`
          : particle.color === 'mist'
            ? `rgba(213,230,241,${alpha})`
            : `rgba(67,177,255,${alpha})`;
        context.fill();
      }
      if (!paused && !reducedMotion) angle += 0.0009;
      if (!paused && !reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paused]);

  return (
    <div className="mi-particle-field">
      <canvas ref={canvasRef} aria-hidden="true" />
      <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Reanudar animación de datos' : 'Pausar animación de datos'}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        <span>{paused ? 'Reanudar visual' : 'Pausar visual'}</span>
      </button>
    </div>
  );
}
