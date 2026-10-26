"use client";

import React, { useId } from "react";
import { motion } from "motion/react";

export const GradientTracing = ({
  width = 1024,
  height = 682,
  baseColor = "#94a3b8",
  baseOpacity = 0.18,
  gradientColors = ["#00F2FE", "#FFFFFF", "#00A3FF"],
  glowColor = "rgba(0, 242, 254, 0.85)",
  animationDuration = 2.2,
  strokeWidth = 6.5,
  path = `M0,${height / 2} L${width},${height / 2}`,
  className = "",
  style = {},
}) => {
  const reactId = useId();
  const gradientId = `pulse-${reactId.replace(/:/g, "")}`;
  const filterId = `glow-${reactId.replace(/:/g, "")}`;

  const containerStyle = {
    width: className.includes("w-full") ? "100%" : width,
    height: className.includes("h-full") ? "100%" : height,
    ...style,
  };

  return (
    <div className={`relative ${className}`} style={containerStyle}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible w-full h-full"
      >
        <defs>
          {/* Intense Laser Specular Glow Filter */}
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Sweeping High-Intensity Laser Gradient for color depth */}
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="200"
            y1="200"
            x2="830"
            y2="490"
          >
            <stop offset="0%" stopColor={gradientColors[0]} />
            <stop offset="50%" stopColor={gradientColors[1]} />
            <stop offset="100%" stopColor={gradientColors[2] || gradientColors[0]} />
          </linearGradient>
        </defs>

        {/* Faint metallic guide line tracing the logo */}
        <path
          d={path}
          stroke={baseColor}
          strokeOpacity={baseOpacity}
          strokeWidth={Math.max(1.5, strokeWidth - 2)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outer Radiant Glowing Aura moving continuously along the path */}
        <motion.path
          d={path}
          stroke={glowColor}
          strokeWidth={strokeWidth + 5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0.28, pathOffset: 0 }}
          animate={{
            pathOffset: [0, 1],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            filter: `drop-shadow(0 0 14px ${glowColor}) drop-shadow(0 0 28px ${glowColor})`,
            opacity: 0.65,
          }}
        />

        {/* Core Intense Laser Beam (Sharp, Shiny, Pure White-Hot Core) */}
        <motion.path
          d={path}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0.28, pathOffset: 0 }}
          animate={{
            pathOffset: [0, 1],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 4px #ffffff)`,
          }}
        />

        {/* Bright White Leading Tip of the Tracer */}
        <motion.path
          d={path}
          stroke="#FFFFFF"
          strokeWidth={Math.max(2, strokeWidth - 2)}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0.08, pathOffset: 0.2 }}
          animate={{
            pathOffset: [0.2, 1.2],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            filter: `drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 10px ${glowColor})`,
          }}
        />
      </svg>
    </div>
  );
};

export default GradientTracing;
