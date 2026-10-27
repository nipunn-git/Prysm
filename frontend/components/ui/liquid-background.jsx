"use client";

import React, { useEffect, useRef } from "react";

const PALETTE = [
  "rgba(56, 189, 248, ",   // sky blue
  "rgba(168, 85, 247, ",   // neon violet
  "rgba(236, 72, 153, ",   // electric pink
  "rgba(34, 197, 94, ",    // cyber emerald
  "rgba(99, 102, 241, ",   // indigo
  "rgba(45, 212, 191, ",   // teal
];

export function LiquidBackground({
  className = "",
  intensity = 1.0,
  interactive = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const ripples = [];
    let lastX = width / 2;
    let lastY = height / 2;
    let colorIndex = 0;
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const spawnInk = (
      x,
      y,
      vx = 0,
      vy = 0,
      count = 2,
      baseRadius = 45
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        const color = PALETTE[colorIndex % PALETTE.length];
        colorIndex++;

        particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: vx * 0.4 + Math.cos(angle) * speed,
          vy: vy * 0.4 + Math.sin(angle) * speed,
          radius: baseRadius * (0.8 + Math.random() * 0.6) * intensity,
          baseRadius: baseRadius * intensity,
          color,
          alpha: 0.65,
          life: 0,
          maxLife: 100 + Math.random() * 80,
        });
      }
    };

    const triggerShockwave = (x, y) => {
      // Create high-density shockwave splash
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: (50 + Math.random() * 40) * intensity,
          baseRadius: 60 * intensity,
          color,
          alpha: 0.8,
          life: 0,
          maxLife: 120 + Math.random() * 60,
        });
      }

      // Add ripple rings
      for (let r = 0; r < 3; r++) {
        ripples.push({
          x,
          y,
          radius: 10 + r * 15,
          maxRadius: 280 + r * 60,
          color: PALETTE[(colorIndex + r) % PALETTE.length],
          alpha: 0.75 - r * 0.15,
          lineWidth: 30 - r * 6,
        });
      }
    };

    const onPointerMove = (e) => {
      if (!interactive) return;
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          return;
        }
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - lastX;
      const dy = clientY - lastY;
      const dist = Math.hypot(dx, dy);

      if (dist > 4) {
        spawnInk(clientX, clientY, dx * 0.15, dy * 0.15, 2, 40);
        lastX = clientX;
        lastY = clientY;
      }
    };

    const onPointerDown = (e) => {
      if (!interactive) return;
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else return;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      triggerShockwave(clientX, clientY);
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown, { passive: true });

    // Initial ambient blobs for organic liquid movement
    const ambientBlobs = [
      { x: width * 0.25, y: height * 0.35, r: 240, color: PALETTE[0], offset: 0, speed: 0.0008 },
      { x: width * 0.75, y: height * 0.25, r: 280, color: PALETTE[1], offset: 2, speed: 0.0007 },
      { x: width * 0.45, y: height * 0.75, r: 260, color: PALETTE[2], offset: 4, speed: 0.0009 },
      { x: width * 0.80, y: height * 0.70, r: 220, color: PALETTE[3], offset: 1.5, speed: 0.0006 },
    ];

    const render = () => {
      time += 0.016;

      // Dark background fill with very subtle trail persistence for liquid viscosity
      ctx.fillStyle = "rgba(10, 14, 22, 0.28)";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      // 1. Draw large breathing liquid ambient metaballs
      ambientBlobs.forEach((blob) => {
        const driftX = Math.sin(time * 0.8 + blob.offset) * 110;
        const driftY = Math.cos(time * 0.6 + blob.offset) * 80;
        const pulse = Math.sin(time * 1.2 + blob.offset) * 35;
        const curRadius = blob.r + pulse;

        const radGrad = ctx.createRadialGradient(
          blob.x + driftX,
          blob.y + driftY,
          curRadius * 0.1,
          blob.x + driftX,
          blob.y + driftY,
          curRadius
        );
        radGrad.addColorStop(0, `${blob.color}0.45)`);
        radGrad.addColorStop(0.5, `${blob.color}0.18)`);
        radGrad.addColorStop(1, `${blob.color}0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(blob.x + driftX, blob.y + driftY, curRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Render shockwave expanding ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 4.5;
        r.alpha *= 0.955;
        r.lineWidth *= 0.97;

        if (r.alpha < 0.01 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${r.color}${r.alpha})`;
        ctx.lineWidth = Math.max(1, r.lineWidth);
        ctx.stroke();
      }

      // 3. Render viscous spreading liquid ink particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.965;
        p.vy *= 0.965;
        p.radius += 0.55;

        const progress = p.life / p.maxLife;
        const curAlpha = p.alpha * Math.max(0, 1 - progress);

        if (curAlpha <= 0.005 || p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          Math.max(1, p.radius)
        );
        grad.addColorStop(0, `${p.color}${curAlpha})`);
        grad.addColorStop(0.4, `${p.color}${curAlpha * 0.6})`);
        grad.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    triggerShockwave(width / 2, height / 2);

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, interactive]);

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-auto ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
      />
      <div className="absolute inset-0 bg-background/35 backdrop-blur-[40px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(5,7,12,0.85)_100%)] pointer-events-none" />
    </div>
  );
}
