import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({
  className,
  variant = 'default',
  size = 'default',
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]';

  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
  };

  const sizes = {
    default: 'h-10 px-4 py-2 rounded-lg text-sm',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-11 rounded-xl px-8 text-base font-semibold',
    icon: 'h-9 w-9 rounded-lg p-0',
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
