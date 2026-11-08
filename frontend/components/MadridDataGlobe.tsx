'use client';

import React, { useEffect, useRef } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  char: string;
  isSpecial: boolean;
  baseAlpha: number;
}

export default function MadridDataGlobe({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Generate points on a sphere using Fibonacci spiral
    const NUM_POINTS = 380;
    const points: Point3D[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle ~2.3999 rad
    const chars = ['0', '1', '0', '1', '1', '0', '€', 'm²', '2', '6', '1', '0'];

    for (let i = 0; i < NUM_POINTS; i++) {
      const y = 1 - (i / (NUM_POINTS - 1)) * 2; // from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const char = chars[Math.floor(Math.random() * chars.length)];
      const isSpecial = char === '€' || char === 'm²' || Math.random() < 0.08;

      points.push({
        x,
        y,
        z,
        char,
        isSpecial,
        baseAlpha: 0.35 + Math.random() * 0.65,
      });
    }

    // Add equatorial and orbital ring points to enhance globe feel
    const RING_POINTS = 64;
    for (let i = 0; i < RING_POINTS; i++) {
      const angle = (i / RING_POINTS) * Math.PI * 2;
      const r = 1.05; // slightly outer ring
      points.push({
        x: Math.cos(angle) * r,
        y: (Math.sin(angle * 2) * 0.12),
        z: Math.sin(angle) * r,
        char: i % 2 === 0 ? '1' : '0',
        isSpecial: false,
        baseAlpha: 0.5,
      });
    }

    let rotY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let lastToggle = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetMouseX = nx * 0.35;
      targetMouseY = ny * 0.35;
    };

    window.addEventListener('mousemove', onMouseMove);

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const globeRadius = Math.min(width, height) * 0.40;
      const fov = 400;

      // Mouse smoothing
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Continuous rotation + oscillating wobble ("para un lado y para otro")
      rotY += 0.0075;
      const rotX = Math.sin(time * 0.6) * 0.24 + currentMouseY * 0.4;
      const rotZ = Math.cos(time * 0.45) * 0.16 + currentMouseX * 0.3;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);

      // Random bit flip every 120ms to simulate data stream
      if (time - lastToggle > 0.12) {
        lastToggle = time;
        const flipIdx = Math.floor(Math.random() * points.length);
        if (points[flipIdx].char === '0') points[flipIdx].char = '1';
        else if (points[flipIdx].char === '1') points[flipIdx].char = '0';
      }

      // Project and sort points by depth (painters algorithm)
      interface Projected {
        p2x: number;
        p2y: number;
        p2z: number;
        scale: number;
        char: string;
        isSpecial: boolean;
        alpha: number;
      }

      const projected: Projected[] = [];

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];

        // 1. Rotate around Y
        let x1 = pt.x * cosY - pt.z * sinY;
        let y1 = pt.y;
        let z1 = pt.x * sinY + pt.z * cosY;

        // 2. Rotate around X (tilt)
        let x2 = x1;
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;

        // 3. Rotate around Z (subtle wobble)
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        // Scale to globe radius
        const px = x3 * globeRadius;
        const py = y3 * globeRadius;
        const pz = z3 * globeRadius;

        // Perspective projection
        const scale = fov / (fov + pz + globeRadius * 0.2);
        const p2x = cx + px * scale;
        const p2y = cy + py * scale;

        // Calculate opacity based on Z depth (-globeRadius = back, +globeRadius = front)
        const depthNorm = (pz + globeRadius) / (2 * globeRadius); // 0 (back) to 1 (front)
        const alpha = Math.max(0.08, Math.min(1, Math.pow(depthNorm, 1.4) * pt.baseAlpha));

        projected.push({
          p2x,
          p2y,
          p2z: pz,
          scale,
          char: pt.char,
          isSpecial: pt.isSpecial,
          alpha,
        });
      }

      // Sort back-to-front
      projected.sort((a, b) => a.p2z - b.p2z);

      // Draw subtle planetary core atmosphere
      const grad = ctx.createRadialGradient(cx, cy, globeRadius * 0.1, cx, cy, globeRadius * 1.05);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
      grad.addColorStop(0.5, 'rgba(0, 45, 84, 0.18)');
      grad.addColorStop(0.85, 'rgba(1, 16, 36, 0.05)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, globeRadius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Render projected numbers / binary chars
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < projected.length; i++) {
        const item = projected[i];
        const fontSize = Math.max(7, Math.round(11 * item.scale));
        ctx.font = item.isSpecial
          ? `600 ${fontSize}px ui-monospace, monospace`
          : `400 ${fontSize}px ui-monospace, monospace`;

        if (item.isSpecial) {
          ctx.fillStyle = `rgba(0, 240, 255, ${Math.min(1, item.alpha * 1.4)})`;
        } else if (item.p2z > 0) {
          // Front hemisphere: bright white to cyan
          ctx.fillStyle = `rgba(255, 255, 255, ${item.alpha})`;
        } else {
          // Back hemisphere: dimmed matrix blue/cyan
          ctx.fillStyle = `rgba(0, 240, 255, ${item.alpha * 0.45})`;
        }

        ctx.fillText(item.char, item.p2x, item.p2y);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className={`mi-data-globe-container ${className}`}>
      <canvas ref={canvasRef} className="mi-data-globe-canvas" />
    </div>
  );
}
