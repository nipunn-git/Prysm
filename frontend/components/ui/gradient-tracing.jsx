"use client";

import React, { useId } from "react";
import { motion } from "motion/react";

export const GradientTracing = ({
  width,
  height,
  baseColor = "black",
  gradientColors = ["#2EB9DF", "#2EB9DF", "#9E00FF"],
  animationDuration = 2,
  strokeWidth = 2,
  path = `M0,${height / 2} L${width},${height / 2}`,
  className = "",
  style = {},
}) => {
  const reactId = useId();
  const gradientId = `pulse-${reactId.replace(/:/g, "")}`;

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
        className="overflow-visible w-full h-full"
      >
        <path
          d={path}
          stroke={baseColor}
          strokeOpacity="0.2"
          strokeWidth={strokeWidth}
        />
        <path
          d={path}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          style={{
            filter: "drop-shadow(0 0 8px rgba(121, 40, 202, 0.5))",
          }}
        />
        <defs>
          <motion.linearGradient
            animate={{
              x1: [0, width * 2],
              x2: [0, width],
            }}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: "linear",
            }}
            id={gradientId}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={gradientColors[0]} stopOpacity="0" />
            <stop stopColor={gradientColors[1]} />
            <stop offset="1" stopColor={gradientColors[2]} stopOpacity="0" />
          </motion.linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default GradientTracing;
