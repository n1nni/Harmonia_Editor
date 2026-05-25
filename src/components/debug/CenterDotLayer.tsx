'use client';

import { memo } from 'react';
import { useRaw } from '@/lib/store/selectors';

/**
 * 2px CSS-pixel dot at each detection's (cx, cy).
 * Used to validate that the "center" of every glyph is where we think
 * it is — important before placing Bravura glyphs at the same anchors.
 */
export const CenterDotLayer = memo(function CenterDotLayer() {
  const raw = useRaw();
  if (!raw) return null;

  return (
    <g pointerEvents="none">
      {raw.detections.flatMap((staff) =>
        staff.detections.map((d) => (
          <circle
            key={d.id}
            cx={d.cx}
            cy={d.cy}
            r={2}
            fill="#FFFFFF"
            fillOpacity={0.95}
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}
    </g>
  );
});
