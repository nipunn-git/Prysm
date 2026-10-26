"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GradientTracing } from "./ui/gradient-tracing";

export default function AppLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Elegant fade out after the tracer animation plays smoothly
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Exact infinity contour matching the PromptHub logo (canvas 420x280)
  const path = "M 211,142 C 178,102 140,78 98,90 C 62,108 58,162 82,206 C 98,212 120,198 145,190 C 175,180 195,160 211,142 C 235,115 272,80 316,92 C 352,108 355,162 328,190 C 298,206 250,180 211,142 Z";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="prompthub-app-loader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
          }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[99999] bg-[#ffffff] flex items-center justify-center select-none overflow-hidden cursor-default"
          style={{ backgroundColor: "#ffffff" }}
        >
          {/* Centered Single Logo Container with Precision Contour Tracing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center w-[360px] sm:w-[480px] md:w-[560px] aspect-[420/280]"
          >
            {/* The single, centered PromptHub Logo */}
            <img
              src="/logo.png"
              alt="PromptHub"
              className="w-full h-full object-contain pointer-events-none select-none relative z-10 drop-shadow-[0_10px_25px_rgba(0,0,0,0.06)]"
            />

            {/* The Gradient Tracing laser directly outlining the logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <GradientTracing
                width={420}
                height={280}
                path={path}
                baseColor="#e2e8f0"
                gradientColors={["#0070F3", "#7928CA", "#FF0080"]}
                animationDuration={1.8}
                strokeWidth={4}
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
