import React from 'react';

/**
 * Premium SaaS ProgressBar primitive
 * Supports gradient fill and smooth progress transitions.
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  height = 'h-2',
  variant = 'gradient', // 'gradient' | 'accent' | 'success'
  className = '',
  ariaLabel = 'Progress',
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const isComplete = percentage >= 100;

  const fillClasses = {
    gradient: isComplete
      ? 'bg-success'
      : 'bg-gradient-to-r from-accent via-accent to-accent-secondary',
    accent: 'bg-accent',
    success: 'bg-success',
  }[variant] || 'bg-gradient-to-r from-accent to-accent-secondary';

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={`w-full ${height} bg-line/60 rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full ${fillClasses} transition-all duration-500 ease-out rounded-full`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
