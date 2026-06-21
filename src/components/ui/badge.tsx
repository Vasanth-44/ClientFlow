import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    default: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border border-transparent',
    secondary: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 border border-transparent',
    outline: 'text-zinc-900 border border-zinc-200 dark:text-zinc-100 dark:border-zinc-850',
    danger: 'bg-zinc-50 text-zinc-800 border border-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-850',
    success: 'bg-zinc-900 text-white border border-transparent dark:bg-zinc-100 dark:text-black',
    warning: 'bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800',
    info: 'bg-zinc-50 text-zinc-600 border border-zinc-200 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}

// Helpers to render status badges
export function StatusBadge({ status }: { status: string }) {
  const mapping: Record<string, 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info'> = {
    'Lead': 'info',
    'Proposal Sent': 'warning',
    'In Progress': 'default',
    'Testing': 'warning',
    'Completed': 'success',
    'Cancelled': 'danger',
    
    // Task status
    'Todo': 'secondary',
    'Done': 'success',
    
    // Invoice status
    'Paid': 'success',
    'Unpaid': 'warning',
    'Overdue': 'danger',
  };
  return <Badge variant={mapping[status] || 'secondary'}>{status}</Badge>;
}

// Helpers to render priority badges
export function PriorityBadge({ priority }: { priority: string }) {
  const mapping: Record<string, 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info'> = {
    'Low': 'secondary',
    'Medium': 'info',
    'High': 'warning',
    'Urgent': 'danger',
  };
  return <Badge variant={mapping[priority] || 'secondary'}>{priority}</Badge>;
}
