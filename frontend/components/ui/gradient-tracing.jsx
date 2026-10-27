"use client";

import React, { useId, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export const GradientTracing = ({
  width = 1024,
  height = 682,
  baseColor = "#94a3b8",
  baseOpacity = 0.18,
  gradientColors = ["#00F2FE", "#FFFFFF", "#00A3FF"],
  glowColor = "rgba(0, 242, 254, 0.85)",
  animationDuration = 2.4,
  strokeWidth = 6.5,
  path = `M0,${height / 2} L${width},${height / 2}`,
  className = "",
  style = {},
}) => {
  const reactId = useId();
  const gradientId = `pulse-${reactId.replace(/:/g, "")}`;
  const glowFilterId = `glow-${reactId.replace(/:/g, "")}`;
  const pathRef = useRef(null);
  const [totalLength, setTotalLength] = useState(1565);

  useEffect(() => {
    if (pathRef.current) {
      try {
        const len = pathRef.current.getTotalLength();
        if (len && len > 0) {
          setTotalLength(len);
        }
      } catch (e) {
        // Fallback length already initialized
      }
    }
  }, [path]);

  const containerStyle = {
    width: className.includes("w-full") ? "100%" : width,
    height: className.includes("h-full") ? "100%" : height,
    ...style,
  };

  // Mathematically seamless dash configuration:
  // Dash + Gap === totalLength guarantees 100% seamless looping when strokeDashoffset shifts by -totalLength!
  const beamDash = Math.round(totalLength * 0.24);
  const beamGap = Math.max(1, Math.round(totalLength - beamDash));
  const beamDashArray = `${beamDash} ${beamGap}`;

  // Tip is positioned at the leading front of the beam
  const tipDash = Math.max(16, Math.round(totalLength * 0.05));
  const tipGap = Math.max(1, Math.round(totalLength - tipDash));
  const tipDashArray = `${tipDash} ${tipGap}`;
  const tipLeadOffset = -(beamDash - tipDash);

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
          {/* Hardware-accelerated SVG glow filter */}
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Sweeping High-Intensity Laser Gradient for color depth */}
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="220"
            y1="220"
            x2="800"
            y2="460"
          >
            <stop offset="0%" stopColor={gradientColors[0]} />
            <stop offset="50%" stopColor={gradientColors[1]} />
            <stop offset="100%" stopColor={gradientColors[2] || gradientColors[0]} />
          </linearGradient>
        </defs>

        {/* Faint metallic guide line tracing the logo */}
        <path
          ref={pathRef}
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
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={beamDashArray}
          initial={{ strokeDashoffset: 0 }}
          animate={{
            strokeDashoffset: [0, -totalLength],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          filter={`url(#${glowFilterId})`}
          style={{
            opacity: 0.75,
            willChange: "stroke-dashoffset",
          }}
        />

        {/* Core Intense Laser Beam (Sharp, Shiny, Pure White-Cyan Core) */}
        <motion.path
          d={path}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={beamDashArray}
          initial={{ strokeDashoffset: 0 }}
          animate={{
            strokeDashoffset: [0, -totalLength],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            filter: `drop-shadow(0 0 6px ${glowColor})`,
            willChange: "stroke-dashoffset",
          }}
        />

        {/* Bright White Leading Tip of the Tracer - locked in lockstep with the beam */}
        <motion.path
          d={path}
          stroke="#FFFFFF"
          strokeWidth={Math.max(2, strokeWidth - 1.5)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={tipDashArray}
          initial={{ strokeDashoffset: tipLeadOffset }}
          animate={{
            strokeDashoffset: [tipLeadOffset, tipLeadOffset - totalLength],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            filter: "drop-shadow(0 0 4px #FFFFFF) drop-shadow(0 0 8px #00F2FE)",
            willChange: "stroke-dashoffset",
          }}
        />
      </svg>
    </div>
  );
};

export default GradientTracing;
