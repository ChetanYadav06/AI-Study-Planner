import React from 'react';

/**
 * Premium SaaS Card primitive
 * Flat 1px border, 14-16px radius, subtle dark purple/slate line.
 * Variants: default (#141725), secondary (#191D2D), highlighted/gradient
 */
export const Card = ({
  children,
  variant = 'default',
  highlight = false,
  className = '',
  as: Component = 'div',
  ...props
}) => {
  const variantClass = variant === 'secondary'
    ? 'bg-surface-secondary'
    : 'bg-surface';

  const highlightClass = highlight
    ? 'gradient-card-border'
    : 'border border-line hover:border-line-highlight/80';

  return (
    <Component
      className={`${variantClass} ${highlightClass} rounded-xl transition-all duration-200 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;
