'use client';

import { memo } from 'react';
import type { Detection } from '@/types/omr';
import { ENGRAVING_DEFAULTS } from '@/lib/smufl/engravingDefaults';

interface SlurProps {
  detection: Detection;
  lineSpacing: number;
  color?: string;
  opacity?: number;
}

/**
 * Slur rendered as a stroked quadratic Bézier from the bbox's left-bottom
 * to right-bottom, peaking near the bbox's top edge. Curvature direction is
 * inferred from which corner of the bbox the slur extremum is closer to —
 * since detections do not record orientation, we choose "above" by default
 * (matches the common case in the fixture). This is a Phase-1 approximation;
 * accurate slur geometry needs control-point data from the OMR service.
 */
export const Slur = memo(function Slur({
  detection,
  lineSpacing,
  color = 'currentColor',
  opacity = 1,
}: SlurProps) {
  const sx = detection.x1;
  const sy = detection.y2;
  const ex = detection.x2;
  const ey = detection.y2;
  const px = (sx + ex) / 2;
  // Peak slightly inside the bbox top to avoid stroke clipping.
  const py = detection.y1 + 0.1 * (detection.y2 - detection.y1);

  const midThick = ENGRAVING_DEFAULTS.slurMidpointThickness * lineSpacing;

  return (
    <path
      d={`M ${sx} ${sy} Q ${px} ${py} ${ex} ${ey}`}
      fill="none"
      stroke={color}
      strokeWidth={midThick}
      strokeLinecap="round"
      opacity={opacity}
      pointerEvents="none"
    />
  );
});
