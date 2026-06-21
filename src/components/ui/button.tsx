import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transition-transform duration-100';
    
    const variants = {
      primary: 'bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 shadow-sm focus-visible:ring-zinc-500',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-250 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
      outline: 'border border-zinc-200 bg-transparent hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
      ghost: 'hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
      danger: 'bg-red-650 text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-500',
      success: 'bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black dark:hover:bg-white shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-11 px-8 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
