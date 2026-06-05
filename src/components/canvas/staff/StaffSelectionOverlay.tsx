'use client';

import { memo, useMemo } from 'react';
import { useRaw, useSelectedStaffKey, useStaffTransforms } from '@/lib/store/selectors';
import { staffContentBboxImage } from '@/lib/staff/bbox';
import { staffKey } from '@/lib/staff/keys';
import { IDENTITY_TRANSFORM } from '@/lib/staff/types';
import { transformToSvg } from '@/lib/staff/transform';

/**
 * SVG-layer overlay that decorates the currently selected staff with a
 * dashed bounding box plus eight handle dots (four corners + four edge
 * midpoints). Runs inside the canvas SVG so it scales and pans with the
 * score, but uses `vector-effect="non-scaling-stroke"` so the outline
 * width stays constant on screen regardless of zoom.
 *
 * Phase 8a: purely decorative (read-only). Phase 8b will wire the
 * interactive handles via a sibling DOM layer.
 */
export const StaffSelectionOverlay = memo(function StaffSelectionOverlay() {
  const raw = useRaw();
  const selectedKey = useSelectedStaffKey();
  const transforms = useStaffTransforms();

  const target = useMemo(() => {
    if (!raw || !selectedKey) return null;
    const staff = raw.detections.find((s) => staffKey(s) === selectedKey);
    if (!staff) return null;
    const bbox = staffContentBboxImage(staff);
    const transform = transforms.get(selectedKey) ?? IDENTITY_TRANSFORM;
    return { bbox, transform };
  }, [raw, selectedKey, transforms]);

  if (!target) return null;

  const { bbox, transform } = target;
  const w = bbox.x2 - bbox.x1;
  const h = bbox.y2 - bbox.y1;
  const midX = (bbox.x1 + bbox.x2) / 2;
  const midY = (bbox.y1 + bbox.y2) / 2;

  const handles: { x: number; y: number }[] = [
    { x: bbox.x1, y: bbox.y1 },
    { x: midX,    y: bbox.y1 },
    { x: bbox.x2, y: bbox.y1 },
    { x: bbox.x2, y: midY },
    { x: bbox.x2, y: bbox.y2 },
    { x: midX,    y: bbox.y2 },
    { x: bbox.x1, y: bbox.y2 },
    { x: bbox.x1, y: midY },
  ];

  return (
    <g
      data-staff-overlay={selectedKey}
      transform={transformToSvg(transform)}
      pointerEvents="none"
    >
      <rect
        x={bbox.x1}
        y={bbox.y1}
        width={w}
        height={h}
        fill="#F08237"
        fillOpacity={0.06}
        stroke="#F08237"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        vectorEffect="non-scaling-stroke"
        rx={2}
      />
      {handles.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#FFFFFF"
          stroke="#F08237"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});
