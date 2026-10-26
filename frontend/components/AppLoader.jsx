"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GradientTracing } from "./ui/gradient-tracing";

export default function AppLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [statusText, setStatusText] = useState("INITIALIZING PROMPTHUB...");

  useEffect(() => {
    // Smooth progress simulation that completes cleanly
    const progressTimer1 = setTimeout(() => {
      setLoadingProgress(45);
      setStatusText("LOADING CORE REPOSITORIES...");
    }, 400);

    const progressTimer2 = setTimeout(() => {
      setLoadingProgress(82);
      setStatusText("SYNCING WORKSPACE MATRIX...");
    }, 900);

    const progressTimer3 = setTimeout(() => {
      setLoadingProgress(100);
      setStatusText("READY");
    }, 1750);

    // Dismiss the splash screen after full ignition
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2400);

    return () => {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(dismissTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="prompthub-app-loader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.04, 
            filter: "blur(12px)", 
            transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } 
          }}
          className="fixed inset-0 z-[99999] bg-[#000000] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ backgroundColor: "#000000" }}
        >
          {/* Deep Space Cosmic Ambient Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-25"
              style={{
                background: "radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(147, 51, 234, 0.3) 45%, rgba(0, 0, 0, 0) 70%)"
              }}
            />
            {/* Subtle cyber grid backdrop */}
            <div 
              className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" 
            />
          </div>

          {/* Centerpiece Container */}
          <div className="relative flex flex-col items-center justify-center z-10">
            
            {/* Orbiting Futuristic Gradient Tracers */}
            <div className="absolute -inset-16 flex items-center justify-center pointer-events-none">
              <GradientTracing
                width={520}
                height={280}
                path="M40,140 C40,40 120,15 260,15 C400,15 480,40 480,140 C480,240 400,265 260,265 C120,265 40,240 40,140"
                baseColor="#21262d"
                gradientColors={["#00F2FE", "#4FACFE", "#9E00FF"]}
                animationDuration={2.6}
                strokeWidth={2}
                className="opacity-80"
              />
            </div>

            {/* Main PromptHub Logo - Upper Object (BADA BADA LOGO) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: -15 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -8, 0] 
              }}
              transition={{
                opacity: { duration: 0.6, ease: "easeOut" },
                scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                y: { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
              }}
              className="relative flex flex-col items-center"
            >
              {/* Pulsing White & Cyan Flashlight Aura */}
              <div 
                className="absolute inset-0 -inset-x-12 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.95)_0%,rgba(56,189,248,0.45)_35%,rgba(147,51,234,0.2)_60%,transparent_80%)] blur-[35px] pointer-events-none rounded-full animate-pulse"
                aria-hidden="true" 
              />
              
              <img
                src="/logo.png"
                alt="PromptHub"
                className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain relative z-10 transition-transform drop-shadow-[0_0_35px_rgba(255,255,255,0.95)]"
                style={{
                  filter: "drop-shadow(0 0 30px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 65px rgba(56, 189, 248, 0.7)) drop-shadow(0 0 100px rgba(147, 51, 234, 0.4))"
                }}
              />
            </motion.div>

            {/* Glowing Laser Horizon Line (Mirror plane intersection) */}
            <div className="relative w-80 sm:w-[480px] my-1 flex items-center justify-center">
              <GradientTracing
                width={480}
                height={16}
                path="M0,8 L480,8"
                baseColor="#161b22"
                gradientColors={["#38bdf8", "#818cf8", "#c084fc"]}
                animationDuration={1.3}
                strokeWidth={2.5}
                className="drop-shadow-[0_0_15px_rgba(56,189,248,0.9)]"
              />
              <div className="absolute inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#ffffff] to-transparent opacity-80 blur-[0.5px]" />
            </div>

            {/* THE CRAZY MIRROR REFLECTION UNDERNEATH (WET GLASS FLOOR) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ delay: 0.25, duration: 0.8 }}
              className="relative flex flex-col items-center pointer-events-none select-none -mt-4 sm:-mt-6"
              style={{
                transform: "scaleY(-1)",
                WebkitMaskImage: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 40%, transparent 80%)",
                maskImage: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 40%, transparent 80%)"
              }}
            >
              <img
                src="/logo.png"
                alt=""
                className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain blur-[1.5px]"
                style={{
                  filter: "drop-shadow(0 0 30px rgba(56, 189, 248, 0.8)) drop-shadow(0 0 60px rgba(147, 51, 234, 0.5))"
                }}
              />
              {/* Floor ambient light sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(56,189,248,0.08)] to-transparent pointer-events-none" />
            </motion.div>

            {/* Brand Typography & Progress */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-6 flex flex-col items-center gap-3 text-center"
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl sm:text-3xl tracking-[0.28em] sm:tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#c9d1d9] to-[#8b949e] uppercase drop-shadow-[0_2px_15px_rgba(255,255,255,0.35)]">
                  PROMPTHUB
                </span>
              </div>

              {/* Status info & futuristic progress bar */}
              <div className="w-56 sm:w-64 flex flex-col items-center gap-2">
                <div className="w-full bg-[#161b22] border border-[#30363d]/70 h-1.5 rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#00F2FE] via-[#4FACFE] to-[#9E00FF] rounded-full shadow-[0_0_12px_rgba(0,242,254,0.7)]"
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ ease: "easeInOut", duration: 0.4 }}
                  />
                </div>
                <div className="flex items-center justify-between w-full text-[10px] font-mono tracking-widest text-[#8b949e]">
                  <span>{statusText}</span>
                  <span className="text-[#38bdf8] font-bold">{loadingProgress}%</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Quick Skip button for immediate entry */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            onClick={() => setIsVisible(false)}
            className="absolute bottom-6 text-[11px] font-mono uppercase tracking-widest text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] px-3 py-1 rounded-full bg-[#161b22]/40 backdrop-blur transition"
          >
            Press anywhere or click to enter →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
