/**
 * Snap a proposed staff transform to alignment with other staves.
 *
 * Phase 8b implements edge-to-edge and centre-to-centre alignment with
 * other (non-selected) staves. Grid snapping and column / system snapping
 * can layer on later without changing this API.
 *
 * The snap threshold is expressed in screen pixels so it feels constant
 * regardless of zoom (a "magnetic" feel needs to translate to roughly the
 * same on-screen distance at any zoom level). The caller passes the
 * current scale; internally we divide to image space.
 */

import type { Bbox } from '@/lib/geometry/bbox';
import type { StaffTransform } from './types';

export interface SnapCandidate {
  partKey: string;
  bbox: Bbox;
}

export interface SnapGuide {
  /** 'h' = horizontal line (constant y), 'v' = vertical line. */
  axis: 'h' | 'v';
  /** Constant coordinate in image space. */
  pos: number;
  /** Span (image space) — the line is drawn between these endpoints. */
  span: [number, number];
}

export interface SnapResult {
  transform: StaffTransform;
  guides: SnapGuide[];
}

const SNAP_THRESHOLD_PX = 6; // screen pixels

/**
 * Apply edge and centre snapping. Only TRANSLATION snaps in Phase 8b;
 * scale-aware snapping is deferred.
 */
export function snapTransform(
  proposed: StaffTransform,
  selectedBaseBbox: Bbox,
  candidates: readonly SnapCandidate[],
  scale: number,
): SnapResult {
  if (candidates.length === 0) {
    return { transform: proposed, guides: [] };
  }

  const threshold = SNAP_THRESHOLD_PX / scale; // → image-space px

  // Effective bbox of the staff after the proposed transform.
  const bw = (selectedBaseBbox.x2 - selectedBaseBbox.x1) * proposed.sx;
  const bh = (selectedBaseBbox.y2 - selectedBaseBbox.y1) * proposed.sy;
  const left = selectedBaseBbox.x1 + proposed.tx;
  const top  = selectedBaseBbox.y1 + proposed.ty;
  const right  = left + bw;
  const bottom = top + bh;
  const midX = left + bw / 2;
  const midY = top + bh / 2;

  interface SnapPick { delta: number; guide: SnapGuide; }
  const snapX: { value: SnapPick | null } = { value: null };
  const snapY: { value: SnapPick | null } = { value: null };

  const offerX = (selfEdge: number, otherEdge: number, span: [number, number]) => {
    const delta = otherEdge - selfEdge;
    if (Math.abs(delta) <= threshold && (!snapX.value || Math.abs(delta) < Math.abs(snapX.value.delta))) {
      snapX.value = { delta, guide: { axis: 'v', pos: otherEdge, span } };
    }
  };
  const offerY = (selfEdge: number, otherEdge: number, span: [number, number]) => {
    const delta = otherEdge - selfEdge;
    if (Math.abs(delta) <= threshold && (!snapY.value || Math.abs(delta) < Math.abs(snapY.value.delta))) {
      snapY.value = { delta, guide: { axis: 'h', pos: otherEdge, span } };
    }
  };

  for (const c of candidates) {
    const cb = c.bbox;
    const cMidX = (cb.x1 + cb.x2) / 2;
    const cMidY = (cb.y1 + cb.y2) / 2;
    // Horizontal lines: align top/bottom/centre to candidate's top/bottom/centre.
    const ySpan: [number, number] = [Math.min(left, cb.x1), Math.max(right, cb.x2)];
    offerY(top,    cb.y1, ySpan);
    offerY(bottom, cb.y2, ySpan);
    offerY(midY,   cMidY, ySpan);
    offerY(top,    cb.y2, ySpan); // self-top to other-bottom (stacking)
    offerY(bottom, cb.y1, ySpan); // self-bottom to other-top
    // Vertical lines: align left/right/centre.
    const xSpan: [number, number] = [Math.min(top, cb.y1), Math.max(bottom, cb.y2)];
    offerX(left,  cb.x1, xSpan);
    offerX(right, cb.x2, xSpan);
    offerX(midX,  cMidX, xSpan);
    offerX(left,  cb.x2, xSpan);
    offerX(right, cb.x1, xSpan);
  }

  const transform: StaffTransform = {
    ...proposed,
    tx: snapX.value ? proposed.tx + snapX.value.delta : proposed.tx,
    ty: snapY.value ? proposed.ty + snapY.value.delta : proposed.ty,
  };

  const guides: SnapGuide[] = [];
  if (snapX.value) guides.push(snapX.value.guide);
  if (snapY.value) guides.push(snapY.value.guide);

  return { transform, guides };
}
