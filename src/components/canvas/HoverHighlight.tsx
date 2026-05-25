'use client';

import { memo, useMemo } from 'react';
import { useRaw, useInteraction } from '@/lib/store/selectors';

/**
 * Faint glow around the currently hovered or selected detection.
 * Lives inside the SVG so the highlight scales with zoom.
 */
export const HoverHighlight = memo(function HoverHighlight() {
  const raw = useRaw();
  const { hoveredId, selectedId } = useInteraction();

  const targets = useMemo(() => {
    if (!raw) return [];
    const ids = new Set([hoveredId, selectedId].filter(Boolean) as string[]);
    if (ids.size === 0) return [];
    const out: { id: string; selected: boolean; x: number; y: number; w: number; h: number }[] = [];
    for (const staff of raw.detections) {
      for (const d of staff.detections) {
        if (!ids.has(d.id)) continue;
        out.push({
          id: d.id,
          selected: d.id === selectedId,
          x: d.x1,
          y: d.y1,
          w: d.x2 - d.x1,
          h: d.y2 - d.y1,
        });
      }
    }
    return out;
  }, [raw, hoveredId, selectedId]);

  if (targets.length === 0) return null;

  return (
    <g pointerEvents="none">
      {targets.map((t) => {
        const pad = Math.max(2, 0.06 * Math.max(t.w, t.h));
        // Selected gets the warm orange used in the user's reference brace.
        // Hovered stays violet so the two states are unambiguous when both
        // are active on different detections at once.
        const color = t.selected ? '#FF8A3D' : '#7C5CFF';
        const fillOpacity = t.selected ? 0.22 : 0.12;
        const strokeWidth = t.selected ? 2 : 1.5;
        return (
          <g key={t.id}>
            <rect
              x={t.x - pad}
              y={t.y - pad}
              width={t.w + 2 * pad}
              height={t.h + 2 * pad}
              fill={color}
              fillOpacity={fillOpacity}
              rx={3}
            />
            <rect
              x={t.x - pad}
              y={t.y - pad}
              width={t.w + 2 * pad}
              height={t.h + 2 * pad}
              fill="none"
              stroke={color}
              strokeOpacity={t.selected ? 1 : 0.85}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              rx={3}
            />
          </g>
        );
      })}
    </g>
  );
});
