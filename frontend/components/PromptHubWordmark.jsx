'use client';

import React from 'react';

/**
 * PrysmWordmark component:
 * Renders the official Prysm wordmark.
 */
export const PromptHubWordmark = ({
  className = '',
  height = 'text-lg sm:text-xl',
  variant = 'auto',
  alt = 'Prysm',
}) => {
  return (
    <span className={`inline-flex items-center align-middle font-extrabold tracking-tight select-none ${height} ${className}`}>
      Prysm
    </span>
  );
};

export const PrysmWordmark = PromptHubWordmark;
export default PromptHubWordmark;
