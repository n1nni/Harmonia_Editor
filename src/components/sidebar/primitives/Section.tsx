'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** Initial expanded state. Sections start collapsed by default to keep
   *  the sidebar compact; the user opens what they need. */
  defaultOpen?: boolean;
}

/**
 * Collapsible sidebar section. Header is a clickable row with a rotating
 * chevron; body animates open/closed with framer-motion height.
 *
 * Defaults to closed for compactness — most controls are reachable in one
 * click and the sidebar is dense rather than long.
 */
export function Section({
  title,
  children,
  className,
  defaultOpen = false,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('select-none', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors hover:bg-surface-hover/30 focus:outline-none focus-visible:bg-surface-hover/40"
      >
        <span className="font-mono text-label uppercase text-text-tertiary">
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="text-text-tertiary"
          aria-hidden
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 2l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-3 pt-1 space-y-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function Divider() {
  return <div className="mx-5 border-t border-line-subtle" />;
}
