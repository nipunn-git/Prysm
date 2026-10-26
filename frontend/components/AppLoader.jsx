"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GradientTracing } from "./ui/gradient-tracing";
import { ParticleWave } from "./ui/particle-wave";

export default function AppLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Keep visible for 2.6 seconds so the shiny tracer smoothly circuits the logo
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  // Refined sub-pixel ribbon path extracted directly from logo.png (1024x682 native canvas)
  const logoPath =
    "M 512,338 C 575,270 635,240 710,248 C 760,255 798,295 798,340 C 798,385 760,430 695,442 C 630,450 570,405 512,342 C 455,275 395,242 325,245 C 265,248 220,285 225,340 C 230,390 255,450 272,485 C 282,492 302,460 312,425 C 350,425 440,420 512,338 Z";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="prompthub-app-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
          }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[99999] bg-[#ffffff] flex items-center justify-center select-none overflow-hidden cursor-default"
          style={{ backgroundColor: "#ffffff" }}
        >
          {/* Subtle 3D Ambient Particle Wave Background (Three.js GPU-Accelerated) */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <ParticleWave
              particleColor="#0284c7"
              particleCountX={60}
              particleCountZ={60}
              particleSeparation={1.6}
              waveSpeed={0.9}
              waveAmplitude={1.6}
              cameraHeight={12}
              cameraDistance={24}
              opacity={0.4}
            />
          </div>

          {/* Centered Single Logo Container with Pixel-Perfect 1024x682 Ratio */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center w-[340px] sm:w-[480px] md:w-[580px] aspect-[1024/682] z-10"
          >
            {/* The PromptHub Metallic Infinity Logo */}
            <img
              src="/logo.png"
              alt="PromptHub"
              className="w-full h-full object-contain pointer-events-none select-none relative z-10 drop-shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
            />

            {/* Glowing Shiny Cyber-Cyan Beam Exactly Tracing the Logo Ribbon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <GradientTracing
                width={1024}
                height={682}
                path={logoPath}
                baseColor="#94a3b8"
                baseOpacity={0.16}
                gradientColors={["#00F2FE", "#FFFFFF", "#0284C7"]}
                glowColor="rgba(0, 242, 254, 0.95)"
                animationDuration={2.0}
                strokeWidth={7}
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
