'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface IconButtonProps {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function IconButton({
  ariaLabel,
  onClick,
  children,
  className,
  disabled,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-line-subtle bg-surface-elevated text-text-secondary',
        'transition-colors hover:border-line-strong hover:text-text-primary',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}
