import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export const Checkbox = React.forwardRef(({ className, checked, onChange, id, disabled, ...props }, ref) => {
  return (
    <div className="inline-flex items-center">
      <input
        type="checkbox"
        id={id}
        ref={ref}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only peer"
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/40 bg-background transition-all duration-150 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:border-primary/80',
          className
        )}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </label>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
