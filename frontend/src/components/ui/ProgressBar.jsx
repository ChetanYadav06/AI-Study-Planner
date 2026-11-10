import React from 'react';

/**
 * ProgressBar primitive
 * 6px height, solid accent fill (#0f766e), no gradient, rounded-full.
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  className = '',
  ariaLabel = 'Progress',
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={`w-full h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-[#0f766e] transition-[width] duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
