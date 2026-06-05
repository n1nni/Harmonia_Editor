/**
 * Pure drag math for staff transforms.
 *
 * The SVG transform applied to a staff group is `translate(tx,ty) scale(sx,sy)`,
 * which maps an image-space point p to `(tx + p.x*sx, ty + p.y*sy)`. Crucially
 * the scale is about the SVG origin (0,0), NOT the staff's bbox. So pulling
 * one edge of the bbox without also adjusting `tx` makes every other edge
 * move too (they all scale away from the origin). Hence each resize gesture
 * must update **both** the scale and the translation so the OPPOSITE edge
 * (or, with Alt, the centre) stays exactly where it was on screen.
 *
 * Derivation (1D, east-handle case, anchor at west edge `a`, dragged east
 * edge at `b`, cursor moves by `d` in image space):
 *
 *   pre-drag  anchor position on screen: tx_old + a * sx_old
 *   pre-drag  east position on screen:   tx_old + b * sx_old
 *   post-drag anchor (unchanged):        tx_new + a * sx_new = tx_old + a * sx_old
 *   post-drag east (cursor follows):     tx_new + b * sx_new = tx_old + b * sx_old + d
 *
 *   Subtract:    (b - a) * sx_new = (b - a) * sx_old + d
 *   →            sx_new = sx_old + d / (b - a)           (additive, not multiplicative)
 *   From west:   tx_new = tx_old + a * (sx_old - sx_new)
 *
 * Modifiers (match Figma / Illustrator):
 *   Shift — lock aspect ratio on corner drags (sx/sy stays at its pre-drag ratio)
 *   Alt   — anchor the gesture at the BBox centre instead of the opposite edge
 */

import type { Bbox } from '@/lib/geometry/bbox';
import type { StaffTransform } from './types';

export type HandleId =
  | 'body'
  | 'nw' | 'n' | 'ne'
  | 'e'
  | 'se' | 's' | 'sw'
  | 'w';

export interface Modifiers {
  shift: boolean;
  alt: boolean;
}

export interface DragContext {
  baseBbox: Bbox;                  // staff bbox in image space (pre-transform)
  baseTransform: StaffTransform;   // transform at gesture start
  handle: HandleId;
  screenDx: number;                // cumulative since start, in screen pixels
  screenDy: number;
  scale: number;                   // fitScale * zoom (image → screen)
  modifiers: Modifiers;
}

const MIN_SCALE = 0.05;

/**
 * For each handle, the anchor (edge that stays put) and the dragged edge,
 * per axis. `null` means "this axis is not affected by this handle".
 */
function axesFor(handle: HandleId, b: Bbox) {
  let aX: number | null = null, dX: number | null = null;
  let aY: number | null = null, dY: number | null = null;
  switch (handle) {
    case 'nw': aX = b.x2; dX = b.x1; aY = b.y2; dY = b.y1; break;
    case 'n':                        aY = b.y2; dY = b.y1; break;
    case 'ne': aX = b.x1; dX = b.x2; aY = b.y2; dY = b.y1; break;
    case 'e':  aX = b.x1; dX = b.x2;                       break;
    case 'se': aX = b.x1; dX = b.x2; aY = b.y1; dY = b.y2; break;
    case 's':                        aY = b.y1; dY = b.y2; break;
    case 'sw': aX = b.x2; dX = b.x1; aY = b.y1; dY = b.y2; break;
    case 'w':  aX = b.x2; dX = b.x1;                       break;
    case 'body': break;
  }
  return { aX, dX, aY, dY };
}

export function applyDrag(ctx: DragContext): StaffTransform {
  const dx = ctx.screenDx / ctx.scale;
  const dy = ctx.screenDy / ctx.scale;
  const t = ctx.baseTransform;

  if (ctx.handle === 'body') {
    return { ...t, tx: t.tx + dx, ty: t.ty + dy };
  }

  const b = ctx.baseBbox;
  let { aX, dX, aY, dY } = axesFor(ctx.handle, b);

  // Alt → anchor at centre. Replace the anchor with the bbox centre on each
  // affected axis. The dragged edge keeps its identity.
  if (ctx.modifiers.alt) {
    if (aX !== null && dX !== null) aX = (b.x1 + b.x2) / 2;
    if (aY !== null && dY !== null) aY = (b.y1 + b.y2) / 2;
  }

  let sxNew = t.sx;
  let syNew = t.sy;

  // Compute per-axis additive scale deltas.
  if (aX !== null && dX !== null) {
    const span = dX - aX; // signed
    if (span !== 0) sxNew = Math.max(MIN_SCALE, t.sx + dx / span);
  }
  if (aY !== null && dY !== null) {
    const span = dY - aY;
    if (span !== 0) syNew = Math.max(MIN_SCALE, t.sy + dy / span);
  }

  // Shift + corner → lock aspect (keep sx/sy ratio at its pre-drag value).
  // Choose the axis with the larger absolute scale change to drive both.
  const isCorner =
    ctx.handle === 'nw' || ctx.handle === 'ne' ||
    ctx.handle === 'sw' || ctx.handle === 'se';
  if (ctx.modifiers.shift && isCorner && aX !== null && aY !== null) {
    const dSx = Math.abs(sxNew - t.sx);
    const dSy = Math.abs(syNew - t.sy);
    const dominant = dSx >= dSy ? 'x' : 'y';
    const k = dominant === 'x' ? sxNew / t.sx : syNew / t.sy;
    sxNew = Math.max(MIN_SCALE, t.sx * k);
    syNew = Math.max(MIN_SCALE, t.sy * k);
  }

  // Compute tx / ty so the anchor stays put on screen.
  //   tx_new + a * sx_new = tx_old + a * sx_old
  //   → tx_new = tx_old + a * (sx_old - sx_new)
  let txNew = t.tx;
  let tyNew = t.ty;
  if (aX !== null) txNew = t.tx + aX * (t.sx - sxNew);
  if (aY !== null) tyNew = t.ty + aY * (t.sy - syNew);

  return { tx: txNew, ty: tyNew, sx: sxNew, sy: syNew, theta: t.theta };
}
