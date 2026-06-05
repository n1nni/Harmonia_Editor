import type { RawStaff } from '@/types/omr';
import type { Bbox } from '@/lib/geometry/bbox';
import {
  computeStaffContentExtent,
  computeStaffExtent,
} from '@/lib/geometry/staffExtent';

/**
 * Image-space bounding box for a staff: horizontal extent from the
 * union of its detections (`computeStaffExtent`) and vertical extent
 * from the top/bottom staff lines, padded by half a staff space so
 * the box visually flanks the lines rather than clipping them.
 *
 * Pure function; called per render. The result is small (a single bbox)
 * so memoisation is unnecessary at this layer.
 */
export function staffBboxImage(staff: RawStaff): Bbox {
  const ext = computeStaffExtent(staff);
  return verticallyExtended(ext, staff);
}

/**
 * Tighter horizontal extent that excludes slurs and beams, used for the
 * Staff-tool hover/click area so the orange tint hugs visible content
 * rather than trailing into empty space where a long slur reaches.
 * Vertical extent is identical to `staffBboxImage`.
 */
export function staffContentBboxImage(staff: RawStaff): Bbox {
  const ext = computeStaffContentExtent(staff);
  return verticallyExtended(ext, staff);
}

function verticallyExtended(
  ext: { x1: number; x2: number },
  staff: RawStaff,
): Bbox {
  const ls = staff.line_spacing;
  const top = (staff.line_positions[0] ?? staff.top_y) - 0.5 * ls;
  const bot =
    (staff.line_positions[staff.line_positions.length - 1] ?? staff.bot_y) +
    0.5 * ls;
  return { x1: ext.x1, y1: top, x2: ext.x2, y2: bot };
}
