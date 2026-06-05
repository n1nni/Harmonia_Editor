import type { RawStaff } from '@/types/omr';
import type { Vec2 } from '@/lib/geometry/bbox';
import { staffBboxImage } from './bbox';
import { staffKey } from './keys';
import type { StaffKey } from './types';

/**
 * Find the staff whose bounding box contains the given image-space point.
 *
 * Staves in this fixture do not vertically overlap, so first-hit wins.
 * Should staves ever overlap (e.g., grand-staff systems with brace), the
 * caller can pre-sort or pass a filtered subset.
 */
export function hitTestStaff(point: Vec2, staves: readonly RawStaff[]): StaffKey | null {
  for (const s of staves) {
    const b = staffBboxImage(s);
    if (point.x >= b.x1 && point.x <= b.x2 && point.y >= b.y1 && point.y <= b.y2) {
      return staffKey(s);
    }
  }
  return null;
}
