'use client';

import { memo } from 'react';
import { useRaw } from '@/lib/store/selectors';
import { computeStaffExtent } from '@/lib/geometry/staffExtent';

/**
 * Dashed horizontal lines at each `linePositions[i]` per staff. Bounded
 * by the same per-staff extent the real staff lines use, so the green
 * ruler does not run past the engraving either.
 */
export const StaffBaselineLayer = memo(function StaffBaselineLayer() {
  const raw = useRaw();
  if (!raw) return null;

  return (
    <g pointerEvents="none">
      {raw.detections.map((staff) => {
        const { x1, x2 } = computeStaffExtent(staff);
        if (x2 <= x1) return null;
        return staff.line_positions.map((y, i) => (
          <line
            key={`${staff.part_id}-${staff.staff_in_part}-${i}`}
            x1={x1}
            y1={y}
            x2={x2}
            y2={y}
            stroke="#5BF7AC"
            strokeWidth={1}
            strokeOpacity={0.55}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        ));
      })}
    </g>
  );
});
