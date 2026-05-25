'use client';

import { memo, useCallback } from 'react';
import { useRaw, useDeletedIds } from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';

/**
 * Transparent <rect> per detection that captures pointer events.
 * Sits on top of the music layer (but below the debug overlays) and
 * publishes hovered/selected detection ids to the store.
 *
 * pointerEvents is enabled on this layer only — the music & debug layers
 * remain `pointerEvents=none` so glyph stroking can't intercept clicks.
 */
export const HitTestLayer = memo(function HitTestLayer() {
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const { setHovered, setSelected } = useHarmonyActions();

  const onLeave = useCallback(() => setHovered(null), [setHovered]);

  if (!raw) return null;

  return (
    <g onPointerLeave={onLeave} style={{ pointerEvents: 'auto' }}>
      {raw.detections.flatMap((staff) =>
        staff.detections
          .filter((d) => !deletedIds.has(d.id))
          .map((d) => (
            <rect
              key={`hit-${d.id}`}
              x={d.x1}
              y={d.y1}
              width={d.x2 - d.x1}
              height={d.y2 - d.y1}
              fill="transparent"
              pointerEvents="all"
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => setHovered(d.id)}
              onClick={() => setSelected(d.id)}
            />
          )),
      )}
    </g>
  );
});
