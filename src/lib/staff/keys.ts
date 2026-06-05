import type { RawStaff } from '@/types/omr';
import type { StaffKey } from './types';

/** Canonical key for a staff: "<part_id>-<staff_in_part>" (e.g. "P1-0"). */
export function staffKey(staff: Pick<RawStaff, 'part_id' | 'staff_in_part'>): StaffKey {
  return `${staff.part_id}-${staff.staff_in_part}`;
}

export function parseStaffKey(
  key: StaffKey,
): { partId: string; staffInPart: number } | null {
  const idx = key.lastIndexOf('-');
  if (idx < 0) return null;
  const partId = key.slice(0, idx);
  const n = Number(key.slice(idx + 1));
  if (!Number.isFinite(n)) return null;
  return { partId, staffInPart: n };
}
