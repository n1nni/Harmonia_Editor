'use client';

import { memo } from 'react';
import { useRaw } from '@/lib/store/selectors';

const STROKE_BY_CLASS: Record<string, string> = {
  noteheadBlack: '#7C5CFF',
  noteheadHalf: '#9B82FF',
  clefG: '#5BD3F7',
  clefF: '#5BD3F7',
  clef8: '#5BD3F7',
  keySharp: '#F7C75B',
  accidentalSharp: '#F7C75B',
  augmentationDot: '#F78A5B',
  slur: '#5BF7AC',
  beam: '#F75B9B',
  restDoubleWhole: '#C9C9D2',
};

/**
 * Renders one <rect vector-effect="non-scaling-stroke"> per detection.
 * Used to visually verify that detection coordinates land on the correct
 * symbols in the rectified image. Color-coded by class.
 */
export const BboxLayer = memo(function BboxLayer() {
  const raw = useRaw();
  if (!raw) return null;

  return (
    <g pointerEvents="none">
      {raw.detections.flatMap((staff) =>
        staff.detections.map((d) => {
          const stroke = STROKE_BY_CLASS[d.class] ?? '#7C5CFF';
          return (
            <rect
              key={d.id}
              x={d.x1}
              y={d.y1}
              width={d.x2 - d.x1}
              height={d.y2 - d.y1}
              fill="none"
              stroke={stroke}
              strokeWidth={1}
              strokeOpacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          );
        }),
      )}
    </g>
  );
});
