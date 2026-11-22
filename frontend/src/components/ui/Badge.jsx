import React from 'react';

/**
 * Pathwise Theme Badge Primitive
 * - Radius: 999px (pill)
 * - Variants: accent, done, next, danger, info, neutral
 * - Rule: Status is never shown by color alone (always pair with label text or icon)
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
    xs: 'text-xs px-2.5 py-0.5 gap-1.5',
    sm: 'text-xs px-3 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1 gap-2',
  }[size] || 'text-xs px-3 py-1 gap-1.5';

  const variantClasses = {
    accent: 'bg-accent/15 text-accent border border-accent/30',
    done: 'bg-done/15 text-done border border-done/30',
    success: 'bg-done/15 text-done border border-done/30',
    next: 'bg-next/15 text-next border border-next/30',
    warning: 'bg-next/15 text-next border border-next/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    info: 'bg-info/15 text-info border border-info/30',
    neutral: 'bg-surface-2 text-text-muted border border-border',
  }[variant] || 'bg-surface-2 text-text-muted border border-border';

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
