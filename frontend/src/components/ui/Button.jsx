import React from 'react';

/**
 * Pathwise Theme Button Primitive
 * Variants:
 *  - primary: subtle gradient from --accent to --accent-solid, pure white text
 *  - secondary: --surface-2 bg, --text, --border outline
 *  - outline: transparent bg, --text, --border outline, hover:border-accent
 *  - ghost: transparent bg, --text-muted, hover:bg-surface-2
 *  - danger: --danger/10 bg, --danger text, --danger/30 border
 *
 * Rules:
 *  - Touch target at least 44x44px
 *  - Focus ring: 2px solid var(--accent), 2px offset
 *  - Radius: 10px (control)
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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-[10px] transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 select-none active:scale-[0.99] min-h-[44px] min-w-[44px]';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  }[size] || 'text-sm px-4 py-2.5 gap-2';

  const variantClasses = {
    primary: 'btn-primary-gradient text-white border border-transparent shadow-xs',
    secondary: 'bg-surface-2 hover:bg-surface-1 text-text border border-border hover:border-border-strong',
    outline: 'bg-transparent hover:bg-surface-2 text-text border border-border hover:border-accent',
    ghost: 'bg-transparent hover:bg-surface-2 text-text-muted hover:text-text border border-transparent',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
  }[variant] || 'btn-primary-gradient text-white border border-transparent';

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
