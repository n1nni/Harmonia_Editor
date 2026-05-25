'use client';

import { useEffect, useRef } from 'react';
import { useHarmonyStore, MIN_ZOOM, MAX_ZOOM } from '@/lib/store/useHarmonyStore';

/**
 * Pan/zoom hook bound to a container element.
 *
 *  Wheel zoom: anchored on the cursor. The image point under the cursor
 *  stays fixed during the zoom (the canonical "Photoshop" feel).
 *
 *  Drag pan: any primary-button pointer drag inside the container. Uses
 *  pointer capture so dragging out of the container still moves the canvas.
 *
 *  Pinch (touch / trackpad): two-pointer distance ratio drives zoom; the
 *  midpoint between fingers anchors it.
 *
 *  Anchor math (derivation):
 *    Screen point P, container size (cw, ch), image dims (iw, ih),
 *    scale s = fitScale * zoom, pan p.
 *    The image point under P is:
 *       I = (P - centerOffset(s) - p) / s
 *    where centerOffset(s) = ((cw - iw*s)/2, (ch - ih*s)/2).
 *    For new scale s' to keep I under P, solve for p':
 *       p' = P - centerOffset(s') - I * s'
 */

interface Pointer {
  id: number;
  x: number;
  y: number;
}

interface ImageAnchor {
  mx: number;
  my: number;
  ix: number;
  iy: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function usePanZoom(target: React.RefObject<HTMLElement>) {
  const pointers = useRef<Map<number, Pointer>>(new Map());
  const dragging = useRef(false);
  const prevPinchDist = useRef<number | null>(null);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const getState = () => useHarmonyStore.getState();

    function screenToImage(sx: number, sy: number): ImageAnchor | null {
      if (!el) return null;
      const s = getState();
      const dims = s.data.imageDims;
      const container = s.viewport.containerSize;
      if (!dims || !container) return null;
      const rect = el.getBoundingClientRect();
      const mx = sx - rect.left;
      const my = sy - rect.top;
      const scale = s.viewport.fitScale * s.viewport.zoom;
      const cx = (container.w - dims.w * scale) / 2;
      const cy = (container.h - dims.h * scale) / 2;
      const tx = cx + s.viewport.pan.x;
      const ty = cy + s.viewport.pan.y;
      return { ix: (mx - tx) / scale, iy: (my - ty) / scale, mx, my };
    }

    function applyZoom(newZoom: number, anchor: ImageAnchor) {
      const s = getState();
      const dims = s.data.imageDims;
      const container = s.viewport.containerSize;
      if (!dims || !container) return;
      const clamped = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
      const newScale = s.viewport.fitScale * clamped;
      const cxNew = (container.w - dims.w * newScale) / 2;
      const cyNew = (container.h - dims.h * newScale) / 2;
      const panX = anchor.mx - cxNew - anchor.ix * newScale;
      const panY = anchor.my - cyNew - anchor.iy * newScale;
      s.actions.setZoom(clamped);
      s.actions.setPan({ x: panX, y: panY });
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const anchor = screenToImage(e.clientX, e.clientY);
      if (!anchor) return;
      const z = getState().viewport.zoom;
      const intensity = e.ctrlKey ? 0.02 : 0.0015;
      const next = z * Math.exp(-e.deltaY * intensity);
      applyZoom(next, anchor);
    }

    function onPointerDown(e: PointerEvent) {
      pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
      if (
        pointers.current.size === 1 &&
        (e.button === 0 || e.pointerType !== 'mouse')
      ) {
        dragging.current = true;
        el?.setPointerCapture(e.pointerId);
      }
    }

    function onPointerMove(e: PointerEvent) {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        const p1 = pts[0];
        const p2 = pts[1];
        if (!p1 || !p2) return;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (prevPinchDist.current) {
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          const anchor = screenToImage(mx, my);
          if (anchor) {
            const ratio = dist / prevPinchDist.current;
            const z = getState().viewport.zoom;
            applyZoom(z * ratio, anchor);
          }
        }
        prevPinchDist.current = dist;
        return;
      } else {
        prevPinchDist.current = null;
      }

      if (dragging.current && pointers.current.size === 1) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        const s = getState();
        s.actions.setPan({ x: s.viewport.pan.x + dx, y: s.viewport.pan.y + dy });
      }
    }

    function onPointerUp(e: PointerEvent) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) prevPinchDist.current = null;
      if (pointers.current.size === 0) {
        dragging.current = false;
        try {
          el?.releasePointerCapture(e.pointerId);
        } catch {
          // already released
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [target]);
}
