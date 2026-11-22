import React from 'react';

/**
 * Premium SaaS Button primitive
 * Variants: primary (gradient), secondary, outline, ghost, danger
 * Rounded: 10px (rounded-md / rounded-lg)
 * Min tap target: 40px
 * Focus ring: 2px accent outline
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  icon: Icon = null,
  onClick,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 select-none active:scale-[0.98]';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-[13px] px-3.5 py-2 min-h-[40px] gap-2',
    lg: 'text-sm px-4.5 py-2.5 min-h-[44px] gap-2.5',
  }[size] || 'text-[13px] px-3.5 py-2 min-h-[40px] gap-2';

  const variantClasses = {
    primary: 'gradient-btn text-white border border-accent/40 shadow-sm shadow-accent/25 hover:shadow-accent/40',
    secondary: 'bg-surface hover:bg-surface-secondary text-ink border border-line hover:border-line-highlight shadow-xs',
    outline: 'bg-transparent hover:bg-surface text-ink border border-line hover:border-accent/50',
    ghost: 'bg-transparent hover:bg-accent-soft text-muted hover:text-ink border border-transparent',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
  }[variant] || 'gradient-btn text-white border border-accent/40';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
