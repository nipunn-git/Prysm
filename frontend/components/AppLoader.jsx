"use client";

import React, { useEffect, useState, useRef } from "react";

export default function AppLoader() {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Smooth next-frame trigger for blur-fade-in entrance
    const enterTimer = requestAnimationFrame(() => {
      setMounted(true);
    });

    // Elegant stay duration (~1.9s) before starting blur fade-out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1900);

    // Completely remove from DOM after fade-out transition finishes
    const destroyTimer = setTimeout(() => {
      setIsDestroyed(true);
    }, 2650);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(fadeTimer);
      clearTimeout(destroyTimer);
    };
  }, []);

  // High-performance, zero-latency 2D harmonic wave (Runs at locked 60/120fps with ZERO WebGL stall)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const cols = 56;
    const rows = 28;
    let step = 0;

    const render = () => {
      step += 0.024;
      ctx.clearRect(0, 0, width, height);

      const spacingX = width / (cols + 2);
      const spacingY = height / (rows + 4);
      const startY = height * 0.42;

      for (let ix = 0; ix < cols; ix++) {
        for (let iy = 0; iy < rows; iy++) {
          const x = (ix + 1.5) * spacingX;
          // Dual sine wave with perspective curvature
          const wave1 = Math.sin(ix * 0.18 + step * 1.5);
          const wave2 = Math.cos(iy * 0.22 + step * 1.2);
          const wave3 = Math.sin((ix + iy) * 0.1 + step * 0.9);

          const elevation = (wave1 + wave2 + wave3 * 0.6) * 16;
          const y = startY + iy * spacingY + elevation;

          // Depth-based opacity & size for fine black dots
          const depthRatio = (iy + 1) / rows;
          const alpha = (0.06 + depthRatio * 0.26) * 0.85;
          const radius = 0.8 + depthRatio * 0.9;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sub-pixel ribbon path extracted from logo.png (1024x682 native canvas)
  const logoPath =
    "M 512,338 C 575,270 635,240 710,248 C 760,255 798,295 798,340 C 798,385 760,430 695,442 C 630,450 570,405 512,342 C 455,275 395,242 325,245 C 265,248 220,285 225,340 C 230,390 255,450 272,485 C 282,492 302,460 312,425 C 350,425 440,420 512,338 Z";

  if (isDestroyed) return null;

  return (
    <div
      onClick={() => setIsFadingOut(true)}
      title="Click to skip"
      className={`fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden cursor-pointer bg-[#ffffff] transition-all duration-700 ease-out ${
        isFadingOut
          ? "opacity-0 blur-xl scale-[1.04] pointer-events-none"
          : mounted
          ? "opacity-100 blur-0 scale-100"
          : "opacity-0 blur-lg scale-95"
      }`}
    >
      {/* Dynamic Keyframes for smooth continuous tracing & breathing */}
      <style jsx global>{`
        @keyframes logoTracerSweep {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -1565;
          }
        }
        .prompthub-tracer-beam {
          stroke-dasharray: 380 1185;
          animation: logoTracerSweep 2.2s linear infinite;
          will-change: stroke-dashoffset;
          transform: translateZ(0);
        }
        @keyframes aliveFloatPulse {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-3.5px) scale(1.012);
          }
        }
        .alive-logo-container {
          animation: aliveFloatPulse 3.4s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* High-Performance 2D Wave Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Ethereal Soft Ambient Radiant Aura (Gently breathing behind the logo) */}
      <div 
        className="absolute w-[440px] sm:w-[600px] h-[300px] bg-gradient-to-r from-cyan-400/12 via-sky-300/18 to-blue-400/10 blur-3xl rounded-full pointer-events-none transition-opacity duration-1000"
        style={{ animation: "pulse 4s ease-in-out infinite" }}
      />

      {/* Centered Single Logo Container with Blur-Fade Entrance & Floating Alive Motion */}
      <div
        className={`relative flex items-center justify-center w-[300px] sm:w-[440px] md:w-[520px] aspect-[1024/682] z-10 transition-all duration-700 ease-out alive-logo-container ${
          isFadingOut
            ? "opacity-0 blur-lg scale-105"
            : mounted
            ? "opacity-100 blur-0 scale-100"
            : "opacity-0 blur-md scale-90"
        }`}
      >
        {/* The PromptHub Metallic Infinity Logo */}
        <img
          src="/logo.png"
          alt="Prysm"
          className="w-full h-full object-contain pointer-events-none select-none relative z-10 drop-shadow-[0_12px_36px_rgba(0,0,0,0.08)]"
        />

        {/* Glowing Shiny Cyber-Cyan Beam Exactly Tracing the Logo Ribbon in Loop */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <svg
            viewBox="0 0 1024 682"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <filter id="logoLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="logoLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F2FE" />
                <stop offset="50%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>

            {/* Subtle Metallic Guide Trace */}
            <path
              d={logoPath}
              stroke="#94a3b8"
              strokeOpacity="0.16"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Glowing Aura Beam */}
            <path
              d={logoPath}
              stroke="rgba(0, 242, 254, 0.95)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#logoLaserGlow)"
              className="prompthub-tracer-beam"
              style={{ opacity: 0.85 }}
            />

            {/* Core Shiny Laser Line */}
            <path
              d={logoPath}
              stroke="url(#logoLaserGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="prompthub-tracer-beam"
              style={{ filter: "drop-shadow(0 0 6px #00F2FE)" }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
