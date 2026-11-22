import React from 'react';

/**
 * Premium SaaS Badge primitive
 * Variants: accent, success, warning, danger, neutral
 */
export const Badge = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon: Icon = null,
  ...props
}) => {
  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-[13px] px-3 py-1 gap-1.5',
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  const variantClasses = {
    accent: 'bg-accent/15 text-accent border border-accent/30',
    accentSecondary: 'bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/30',
    success: 'bg-success/15 text-success border border-success/30',
    warning: 'bg-warning/15 text-warning border border-warning/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    neutral: 'bg-surface-secondary text-muted border border-line',
    glow: 'bg-accent/20 text-ink border border-accent/50 badge-glow font-medium',
  }[variant] || 'bg-surface-secondary text-muted border border-line';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
};

export default Badge;
