import React from 'react';

/**
 * Pathwise Theme ProgressBar Primitive
 * Fill: --accent-solid (or --done when complete)
 * Track: --border
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  height = 'h-2',
  variant = 'accent',
  className = '',
  ariaLabel = 'Progress',
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const isComplete = percentage >= 100;

  const fillClass = (isComplete || variant === 'done')
    ? 'bg-done'
    : 'bg-accent-solid';

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={`w-full ${height} bg-border rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full ${fillClass} transition-all duration-300 ease-out rounded-full`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
