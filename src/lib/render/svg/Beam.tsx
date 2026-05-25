'use client';

import { memo } from 'react';
import type { Detection } from '@/types/omr';

interface BeamProps {
  detection: Detection;
  fill?: string;
  opacity?: number;
}

/**
 * Beam rendered as a filled rectangle matching the detection bbox.
 *
 * Phase-1 simplification: the underlying OMR response does not expose
 * stem endpoints, so a true angled-beam polygon cannot be reconstructed.
 * The bbox quad is a reasonable visual stand-in until that data lands.
 */
export const Beam = memo(function Beam({
  detection,
  fill = 'currentColor',
  opacity = 1,
}: BeamProps) {
  const w = detection.x2 - detection.x1;
  const h = detection.y2 - detection.y1;
  return (
    <rect
      x={detection.x1}
      y={detection.y1}
      width={w}
      height={h}
      fill={fill}
      opacity={opacity}
      rx={1}
      pointerEvents="none"
    />
  );
});
