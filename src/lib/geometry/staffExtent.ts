import type { RawStaff } from '@/types/omr';

export interface StaffExtent {
  x1: number;
  x2: number;
}

/**
 * Compute a staff's actual horizontal extent from its detections.
 *
 * The OMR response does NOT carry a `crop_x2` field — only `crop_x1` which is
 * uniformly 0 in this fixture. Drawing staff lines from `crop_x1` to image
 * width visibly overshoots the real engraving by 30-60 px.
 *
 * Strategy: union of all detection bboxes, padded by half a staff space on
 * each side so the lines visually flank (rather than clip) the outermost
 * glyphs.
 *
 * Fallback for an empty staff: a zero-width extent. The caller should not
 * render staff lines in that case (no glyphs to bracket anyway).
 */
export function computeStaffExtent(staff: RawStaff): StaffExtent {
  if (staff.detections.length === 0) {
    return { x1: staff.crop_x1, x2: staff.crop_x1 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const d of staff.detections) {
    if (d.x1 < minX) minX = d.x1;
    if (d.x2 > maxX) maxX = d.x2;
  }
  const pad = 0.5 * staff.line_spacing;
  return { x1: Math.max(0, minX - pad), x2: maxX + pad };
}
