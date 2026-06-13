/**
 * Pure math for the zoom tool.
 *
 * The application's effective on-screen scale is `s = fitScale * zoom`.
 * `fitScale` is determined by `containerSize` and `imageDims` (the
 * baseline that fits the image in the viewport with a 6 % margin);
 * `zoom` is the user-controllable multiplier. The image is centred
 * inside the viewport and then shifted by `pan`, so the screen-space
 * position of an image-space point `(ix, iy)` is
 *
 *     sx = (cw - iw*s) / 2 + pan.x + ix * s
 *     sy = (ch - ih*s) / 2 + pan.y + iy * s
 *
 * where `(cw, ch)` is the container size and `(iw, ih)` is the image
 * size. Inverting this relationship gives the inverse mapping that
 * `panForCursorZoom` uses to solve "what pan keeps the cursor's image
 * point at the same screen point after a scale change?".
 *
 * No React, no DOM, no store. Trivially testable.
 */

import { MIN_ZOOM, MAX_ZOOM } from '@/lib/store/useHarmonyStore';
import type { Vec2 } from '@/lib/geometry/bbox';

export const ZOOM_STEP = 1.25;
export const ANIM_MS = 200;
export const FIT_PADDING = 0.9;
export const PRESET_100 = 1.0;
export const PRESET_50 = 0.5;
export const PRESET_200 = 2.0;

export interface ViewportFrame {
  containerSize: { w: number; h: number };
  imageDims: { w: number; h: number };
  fitScale: number;
}

export interface Bbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

/**
 * Convert a container-relative screen point `(sx, sy)` to image space
 * at the current viewport. Pure inverse of the forward mapping above.
 */
export function screenToImagePoint(
  sx: number,
  sy: number,
  zoom: number,
  pan: Vec2,
  frame: ViewportFrame,
): Vec2 {
  const s = frame.fitScale * zoom;
  const cx = (frame.containerSize.w - frame.imageDims.w * s) / 2;
  const cy = (frame.containerSize.h - frame.imageDims.h * s) / 2;
  return { x: (sx - cx - pan.x) / s, y: (sy - cy - pan.y) / s };
}

/**
 * Given an image-space anchor (e.g. obtained by `screenToImagePoint`
 * BEFORE the zoom change), compute the pan that would keep that anchor
 * pinned under the original screen point AFTER the zoom changes from
 * `oldZoom` to `newZoom`.
 *
 *   newScale = fitScale * newZoom
 *   wanted: sx = (cw - iw*newScale)/2 + newPan.x + anchor.x * newScale
 *   solving: newPan.x = sx - (cw - iw*newScale)/2 - anchor.x * newScale
 */
export function panForCursorZoom(
  newZoom: number,
  cursorScreen: { x: number; y: number },
  anchorImage: Vec2,
  frame: ViewportFrame,
): Vec2 {
  const ns = frame.fitScale * newZoom;
  const cx = (frame.containerSize.w - frame.imageDims.w * ns) / 2;
  const cy = (frame.containerSize.h - frame.imageDims.h * ns) / 2;
  return {
    x: cursorScreen.x - cx - anchorImage.x * ns,
    y: cursorScreen.y - cy - anchorImage.y * ns,
  };
}

/**
 * Compute the pan that keeps the image centred in the viewport at the
 * given zoom. Used by the percentage presets where no cursor anchor
 * exists.
 */
export function centeredPan(): Vec2 {
  // The image is auto-centred by the centerOffset formula in the
  // CanvasStage transform composition; an additional pan of (0, 0)
  // keeps it exactly centred. Returning a fresh object so callers can
  // store it without aliasing concerns.
  return { x: 0, y: 0 };
}

/**
 * Compute (zoom, pan) so that an image-space bbox fits the viewport.
 *
 *  mode 'contain' — fit BOTH axes inside the viewport. The bbox is
 *                   centred horizontally AND vertically.
 *  mode 'width'   — fit ONLY the width of the bbox to the viewport.
 *                   Height is allowed to overflow; the bbox is centred
 *                   horizontally and on its vertical midpoint.
 *
 * `pad` is a multiplicative shrink (e.g. 0.9 leaves 10 % visual margin).
 */
export function viewportForBbox(
  bbox: Bbox,
  frame: ViewportFrame,
  opts: { mode: 'contain' | 'width'; pad?: number } = { mode: 'contain' },
): { zoom: number; pan: Vec2 } {
  const pad = opts.pad ?? FIT_PADDING;
  const bw = Math.max(1, bbox.x2 - bbox.x1);
  const bh = Math.max(1, bbox.y2 - bbox.y1);
  // `targetScale` is the on-screen scale we want for the bbox, i.e.
  //    containerW / bbox.width
  // Then `zoom` follows from `s = fitScale * zoom`.
  let targetScaleX = frame.containerSize.w / bw;
  let targetScaleY = frame.containerSize.h / bh;
  if (opts.mode === 'width') {
    targetScaleY = Number.POSITIVE_INFINITY; // ignore height
  }
  const targetScale = Math.min(targetScaleX, targetScaleY) * pad;
  const zoom = clampZoom(targetScale / frame.fitScale);
  // Pan to centre the bbox in the viewport.
  const ns = frame.fitScale * zoom;
  const bboxCx = (bbox.x1 + bbox.x2) / 2;
  const bboxCy = (bbox.y1 + bbox.y2) / 2;
  // Solve for pan such that bbox centre lands at viewport centre.
  const cx = (frame.containerSize.w - frame.imageDims.w * ns) / 2;
  const cy = (frame.containerSize.h - frame.imageDims.h * ns) / 2;
  const panX = frame.containerSize.w / 2 - cx - bboxCx * ns;
  const panY = frame.containerSize.h / 2 - cy - bboxCy * ns;
  return { zoom, pan: { x: panX, y: panY } };
}

/**
 * Union an array of bboxes into a single enclosing bbox. Returns null
 * if the input array is empty.
 */
export function unionBbox(boxes: readonly Bbox[]): Bbox | null {
  if (boxes.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const b of boxes) {
    if (b.x1 < x1) x1 = b.x1;
    if (b.y1 < y1) y1 = b.y1;
    if (b.x2 > x2) x2 = b.x2;
    if (b.y2 > y2) y2 = b.y2;
  }
  if (!Number.isFinite(x1)) return null;
  return { x1, y1, x2, y2 };
}
