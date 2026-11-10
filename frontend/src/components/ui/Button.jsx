import React from 'react';

/**
 * Button primitive
 * Variants: primary, secondary, ghost, danger
 * Radius: 8px controls
 * Min tap target: 40px (min-h-[40px])
 * Focus ring: 2px accent outline
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px]',
    md: 'text-sm px-3.5 py-2 min-h-[40px]',
    lg: 'text-sm px-4 py-2.5 min-h-[44px]',
  }[size] || 'text-sm px-3.5 py-2 min-h-[40px]';

  const variantClasses = {
    primary: 'bg-accent hover:bg-accent-hover text-white border border-accent',
    secondary: 'bg-white hover:bg-page text-ink border border-line',
    ghost: 'bg-transparent hover:bg-accent-soft text-muted hover:text-accent border border-transparent',
    danger: 'bg-white hover:bg-red-50 text-danger border border-line hover:border-red-200',
  }[variant] || 'bg-accent hover:bg-accent-hover text-white border border-accent';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
