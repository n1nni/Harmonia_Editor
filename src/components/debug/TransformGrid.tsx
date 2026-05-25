'use client';

import { memo } from 'react';
import { useImageDims } from '@/lib/store/selectors';

const STEP = 100;

/**
 * 100-px image-space grid for visual sanity checks of the coordinate pipeline.
 * If a glyph drifts by N pixels under zoom, the grid will betray it.
 */
export const TransformGrid = memo(function TransformGrid() {
  const dims = useImageDims();
  if (!dims) return null;

  const xs: number[] = [];
  for (let x = 0; x <= dims.w; x += STEP) xs.push(x);
  const ys: number[] = [];
  for (let y = 0; y <= dims.h; y += STEP) ys.push(y);

  return (
    <g pointerEvents="none" opacity={0.25}>
      {xs.map((x) => (
        <line
          key={`gx-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={dims.h}
          stroke="#7C5CFF"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {ys.map((y) => (
        <line
          key={`gy-${y}`}
          x1={0}
          y1={y}
          x2={dims.w}
          y2={y}
          stroke="#7C5CFF"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});
