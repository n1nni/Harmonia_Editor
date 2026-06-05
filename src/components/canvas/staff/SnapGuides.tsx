'use client';

import { useCallback } from 'react';
import { useImageDims, useViewport } from '@/lib/store/selectors';
import { useDragGuides } from './StaffHandlesLayer';

/**
 * Dashed accent-coloured alignment guides rendered in DOM during an
 * active staff drag. Each guide is provided in image-space by the snap
 * algorithm; here we convert to screen-space using the same math as
 * usePanZoom.
 *
 * Lives outside the SVG so the dash pattern stays crisp at any zoom.
 */
export function SnapGuides() {
  const { guides } = useDragGuides();
  const dims = useImageDims();
  const { zoom, pan, fitScale, containerSize } = useViewport();

  const toScreen = useCallback(
    (x: number, y: number) => {
      if (!dims || !containerSize) return { x: 0, y: 0 };
      const s = fitScale * zoom;
      const cx = (containerSize.w - dims.w * s) / 2 + pan.x;
      const cy = (containerSize.h - dims.h * s) / 2 + pan.y;
      return { x: cx + x * s, y: cy + y * s };
    },
    [dims, containerSize, fitScale, zoom, pan.x, pan.y],
  );

  if (guides.length === 0 || !dims || !containerSize) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {guides.map((g, i) => {
        const a = toScreen(g.axis === 'v' ? g.pos : g.span[0], g.axis === 'h' ? g.pos : g.span[0]);
        const b = toScreen(g.axis === 'v' ? g.pos : g.span[1], g.axis === 'h' ? g.pos : g.span[1]);
        const isVertical = g.axis === 'v';
        const style: React.CSSProperties = isVertical
          ? {
              position: 'absolute',
              left: a.x - 0.5,
              top: Math.min(a.y, b.y),
              width: 1,
              height: Math.abs(b.y - a.y),
              borderLeft: '1px dashed #F08237',
            }
          : {
              position: 'absolute',
              top: a.y - 0.5,
              left: Math.min(a.x, b.x),
              height: 1,
              width: Math.abs(b.x - a.x),
              borderTop: '1px dashed #F08237',
            };
        return <div key={i} style={style} />;
      })}
    </div>
  );
}
