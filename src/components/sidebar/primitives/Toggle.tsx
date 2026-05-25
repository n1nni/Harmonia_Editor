'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  dense?: boolean;
}

export function Toggle({ label, description, checked, onChange, dense }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-center justify-between rounded-md text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        dense ? 'px-2 py-1.5' : 'px-2 py-2',
        'hover:bg-surface-hover/40',
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm text-text-primary">{label}</div>
        {description ? (
          <div className="truncate text-xs text-text-tertiary">{description}</div>
        ) : null}
      </div>
      <span
        className={cn(
          'relative ml-3 inline-flex h-[18px] w-[32px] flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-surface-elevated',
        )}
      >
        <motion.span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}
