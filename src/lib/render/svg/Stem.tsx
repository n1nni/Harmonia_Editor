'use client';

import { memo } from 'react';
import { ENGRAVING_DEFAULTS } from '@/lib/smufl/engravingDefaults';

export type StemDirection = 'up' | 'down';

interface StemProps {
  cx: number;
  cy: number;
  direction: StemDirection;
  lineSpacing: number;
  color?: string;
  opacity?: number;
}

/**
 * Note stem rendered as a 1-pixel-axis-aligned <line>.
 *
 * Geometry references Bravura's standard notehead anchor points:
 *   - noteheadBlack width = 1.18 staff spaces
 *   - stem-up attaches at the right edge   (cx + 0.54 * ls)
 *   - stem-down attaches at the left edge  (cx - 0.54 * ls)
 *   - default stem length = 3.5 staff spaces
 *   - stem thickness = engravingDefaults.stemThickness (0.12 ss)
 */
export const Stem = memo(function Stem({
  cx,
  cy,
  direction,
  lineSpacing,
  color = 'currentColor',
  opacity = 1,
}: StemProps) {
  const ls = lineSpacing;
  const offset = 0.54 * ls;
  const length = 3.5 * ls;
  const width = ENGRAVING_DEFAULTS.stemThickness * ls;

  const x = direction === 'up' ? cx + offset : cx - offset;
  const y1 = cy;
  const y2 = direction === 'up' ? cy - length : cy + length;

  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="butt"
      opacity={opacity}
      pointerEvents="none"
    />
  );
});
