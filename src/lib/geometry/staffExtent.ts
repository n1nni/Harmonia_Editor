import type { RawStaff, SymbolClass } from '@/types/omr';

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

/**
 * Tighter horizontal extent that considers only "content" detections —
 * clefs, key signatures, accidentals, noteheads, augmentation dots, rests.
 * Slurs and beams are excluded because they often span huge horizontal
 * runs that extend far past where the score visually has content, which
 * makes the hover hit-rect feel like it floats into empty space.
 *
 * Used by the Staff-tool hover/click area in `HitTestLayer`. Staff line
 * rendering and the selection bounding box continue to use the wider
 * `computeStaffExtent` so the visible engraving and the selection frame
 * still encompass any reaching slurs/beams.
 */
const CONTENT_CLASSES: ReadonlySet<SymbolClass> = new Set([
  'noteheadBlack',
  'noteheadHalf',
  'clefG',
  'clefF',
  'clef8',
  'keySharp',
  'accidentalSharp',
  'augmentationDot',
  'restDoubleWhole',
]);

export function computeStaffContentExtent(staff: RawStaff): StaffExtent {
  let minX = Infinity;
  let maxX = -Infinity;
  let any = false;
  for (const d of staff.detections) {
    if (!CONTENT_CLASSES.has(d.class)) continue;
    any = true;
    if (d.x1 < minX) minX = d.x1;
    if (d.x2 > maxX) maxX = d.x2;
  }
  if (!any) return computeStaffExtent(staff);
  const pad = 0.5 * staff.line_spacing;
  return { x1: Math.max(0, minX - pad), x2: maxX + pad };
}
