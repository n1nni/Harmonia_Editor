'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useZoomNavigation } from '@/hooks/canvas/useZoomNavigation';
import { screenToImagePoint } from '@/lib/viewport/zoomMath';

/**
 * Pointer-event surface for Zoom Mode. Mounted by `CanvasStage` only
 * when `activeTool === 'zoom'`. Sits above the rendered overlay so it
 * receives every pointer event before anything below; the `data-no-pan`
 * attribute opts out of `usePanZoom`'s pan-capture mechanism so it
 * does not compete with the zoom drag gesture.
 *
 * Gestures supported (Inkscape parity):
 *
 *   - Click            → zoom in at the cursor
 *   - Shift + Click    → zoom out at the cursor
 *   - Click + drag     → draw a rubber-band rectangle; on release the
 *                        viewport zooms to fit that rectangle in image
 *                        space. Below an 8 px threshold the gesture is
 *                        treated as a plain click instead.
 *
 * Cursor: native `zoom-in`, switching to `zoom-out` while Shift is held.
 */

const DRAG_THRESHOLD = 8;

interface DragRect {
  /** Container-relative starting point of the drag. */
  startX: number;
  startY: number;
  /** Current pointer position. */
  curX: number;
  curY: number;
  pointerId: number;
}

export function ZoomInteractionLayer() {
  const nav = useZoomNavigation();
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragRect | null>(null);
  const [shift, setShift] = useState(false);

  // Track Shift independently so the cursor responds even while not
  // dragging. Capture phase so it can't be intercepted by inputs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Shift') setShift(e.type === 'keydown');
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, []);

  /** Convert a screen-space pointer event into a container-relative
   *  coordinate pair. The container is `ref.current`. */
  const localOf = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = localOf(e);
    if (!p) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ startX: p.x, startY: p.y, curX: p.x, curY: p.y, pointerId: e.pointerId });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = localOf(e);
    if (!p) return;
    setDrag({ ...drag, curX: p.x, curY: p.y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = Math.abs(drag.curX - drag.startX);
    const dy = Math.abs(drag.curY - drag.startY);
    const cursor = { x: drag.curX, y: drag.curY };
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(drag.pointerId);
    } catch {
      // already released
    }
    setDrag(null);

    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      // Treat as a click. Shift = zoom out, otherwise zoom in.
      if (e.shiftKey) nav.zoomOut(cursor);
      else nav.zoomIn(cursor);
      return;
    }

    // Rubber-band → convert two screen corners to image-space corners
    // at the CURRENT viewport, then call zoomToRect.
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    if (!dims || !container) return;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const a = screenToImagePoint(drag.startX, drag.startY, s.viewport.zoom, s.viewport.pan, frame);
    const b = screenToImagePoint(drag.curX, drag.curY, s.viewport.zoom, s.viewport.pan, frame);
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x, b.x);
    const y2 = Math.max(a.y, b.y);
    nav.zoomToRect({ x1, y1, x2, y2 });
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
  };

  // Derived rubber-band rectangle in screen coordinates.
  const band = drag
    ? {
        left: Math.min(drag.startX, drag.curX),
        top: Math.min(drag.startY, drag.curY),
        width: Math.abs(drag.curX - drag.startX),
        height: Math.abs(drag.curY - drag.startY),
      }
    : null;

  return (
    <div
      ref={ref}
      data-no-pan="1"
      role="presentation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0"
      style={{
        cursor: shift ? 'zoom-out' : 'zoom-in',
        touchAction: 'none',
        zIndex: 25,
      }}
    >
      {band && band.width >= DRAG_THRESHOLD && band.height >= DRAG_THRESHOLD ? (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: band.left,
            top: band.top,
            width: band.width,
            height: band.height,
            border: '1.5px dashed #F08237',
            background: 'rgba(240, 130, 55, 0.08)',
          }}
        />
      ) : null}
    </div>
  );
}
