'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tooltip } from './Tooltip';
import { SCALED } from '../scale';

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  tooltipSide?: 'top' | 'right' | 'bottom';
  /** Set when the button is decorative (e.g. zoom % chip in toolbar). */
  asChip?: boolean;
  /** Optional tooltip override shown ONLY while the button is disabled.
   *  Intended for buttons whose prerequisite is non-obvious — e.g.
   *  "Fit Selection — select a note first". Suppresses the shortcut
   *  display because the shortcut alone cannot enable the button. */
  disabledHint?: string;
}

/**
 * Square icon-only button with a tooltip and disabled / active states.
 * Used by both the top toolbar and the left tool palette.
 *
 * Dimensions follow the global UI scale via `SCALED.buttonSize` and
 * `SCALED.iconSize`, so the buttons grow / shrink with the rest of the
 * chrome when the user picks a different UI scale in the View menu.
 */
export function ToolButton({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  children,
  tooltipSide = 'bottom',
  asChip,
  disabledHint,
}: ToolButtonProps) {
  // When the button is disabled AND a hint is set, prefer the hint as
  // the tooltip and drop the shortcut line. Otherwise use the default
  // `label` + `shortcut` combo.
  const tooltipLabel = disabled && disabledHint ? disabledHint : label;
  const tooltipShortcut = disabled && disabledHint ? undefined : shortcut;
  const btn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      style={{
        height: SCALED.buttonSize,
        width: SCALED.buttonSize,
        fontSize: SCALED.iconSize,
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        asChip
          ? 'border-line text-text-secondary'
          : active
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-transparent text-text-secondary hover:border-line hover:bg-surface-hover hover:text-text-primary',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-tertiary',
      )}
    >
      {/* Children inherit currentColor; SVG icons default to width/height="1em"
          and therefore follow this button's `font-size` (= SCALED.iconSize). */}
      {children}
    </button>
  );

  if (!tooltipLabel) return btn;
  return (
    <Tooltip label={tooltipLabel} shortcut={tooltipShortcut} side={tooltipSide}>
      {btn}
    </Tooltip>
  );
}
