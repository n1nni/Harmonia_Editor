'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface TooltipProps {
  label: string;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom';
  className?: string;
  children: ReactNode;
}

/**
 * Lightweight CSS-positioned tooltip. Shows after a short hover delay,
 * fades out on leave. No external dep; framer-motion handles the fade.
 *
 * The trigger child receives onMouseEnter / onMouseLeave handlers via
 * the wrapping div. Use this for chrome buttons (toolbar, palette, menu).
 */
export function Tooltip({ label, shortcut, side = 'bottom', className, children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  const sidePos =
    side === 'top'
      ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
      : side === 'right'
        ? 'left-full top-1/2 ml-1.5 -translate-y-1/2'
        : 'top-full left-1/2 mt-1.5 -translate-x-1/2';

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 2 : -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-line bg-surface-panel px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary shadow-float',
              sidePos,
            )}
          >
            {label}
            {shortcut ? (
              <span className="ml-2 text-text-tertiary">{shortcut}</span>
            ) : null}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
