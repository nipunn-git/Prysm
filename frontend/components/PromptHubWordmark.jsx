'use client';

import React from 'react';

/**
 * PromptHubWordmark component:
 * Renders the official PromptHub wordmark image.
 * 
 * - When variant="light": renders black wordmark for white/light backgrounds.
 * - When variant="dark": renders white wordmark for black/dark backgrounds.
 * - When variant="auto" (default): automatically switches between black (light themes)
 *   and white (dark themes) via responsive theme CSS classes.
 */
export const PromptHubWordmark = ({
  className = '',
  height = 'h-5 sm:h-6',
  variant = 'auto',
  alt = 'PromptHub',
}) => {
  if (variant === 'dark') {
    return (
      <img
        src="/prompthub-wordmark-white.png"
        alt={alt}
        className={`w-auto object-contain select-none pointer-events-none inline-block ${height} ${className}`}
      />
    );
  }

  if (variant === 'light') {
    return (
      <img
        src="/prompthub-wordmark-black.png"
        alt={alt}
        className={`w-auto object-contain select-none pointer-events-none inline-block ${height} ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      {/* Visible in Light Theme (Black Wordmark on Light Background) */}
      <img
        src="/prompthub-wordmark-black.png"
        alt={alt}
        className={`prompthub-wordmark-light w-auto object-contain select-none pointer-events-none ${height}`}
      />
      {/* Visible in Dark Theme (White Wordmark on Dark Background) */}
      <img
        src="/prompthub-wordmark-white.png"
        alt={alt}
        className={`prompthub-wordmark-dark w-auto object-contain select-none pointer-events-none ${height}`}
      />
    </span>
  );
};

export default PromptHubWordmark;
