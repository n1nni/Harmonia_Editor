'use client';

import { memo } from 'react';
import type { RawStaff } from '@/types/omr';
import { ENGRAVING_DEFAULTS } from '@/lib/smufl/engravingDefaults';
import { computeStaffExtent } from '@/lib/geometry/staffExtent';

interface StaffLinesProps {
  staff: RawStaff;
  color?: string;
  opacity?: number;
}

/**
 * Five staff lines for one staff. Horizontal extent comes from
 * `computeStaffExtent(staff)` — bounded by the staff's own detections
 * with a small pad — so lines no longer run past the real engraving
 * to the image edge. Stroke thickness follows Bravura's
 * `staffLineThickness` engraving default (0.13 staff spaces).
 */
export const StaffLines = memo(function StaffLines({
  staff,
  color = 'currentColor',
  opacity = 1,
}: StaffLinesProps) {
  const ls = staff.line_spacing;
  const stroke = ENGRAVING_DEFAULTS.staffLineThickness * ls;
  const { x1, x2 } = computeStaffExtent(staff);

  if (x2 <= x1) return null;

  return (
    <g pointerEvents="none">
      {staff.line_positions.map((y, i) => (
        <line
          key={i}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="butt"
          opacity={opacity}
        />
      ))}
    </g>
  );
});
