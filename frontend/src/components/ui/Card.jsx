import React from 'react';

/**
 * Card primitive
 * Flat 1px border, 10px radius, no shadow.
 */
export const Card = ({
  children,
  className = '',
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={`bg-white border border-[#e5e7eb] rounded-lg ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;
