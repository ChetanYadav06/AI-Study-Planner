import React from 'react';

/**
 * Pathwise Theme Card Primitive
 * - Radius: 16px (card)
 * - Variants: default (surface-1), secondary (surface-2)
 * - Border: 1px solid var(--border)
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
    ? 'bg-surface-2'
    : 'bg-surface-1';

  const borderClass = highlight
    ? 'border border-accent/40'
    : 'border border-border hover:border-border-strong';

  return (
    <Component
      className={`${variantClass} ${borderClass} rounded-[16px] transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;
