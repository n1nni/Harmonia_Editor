import type { OmrResponse, Detection } from '@/types/omr';

function isNotehead(d: Detection): boolean {
  return d.class === 'noteheadBlack' || d.class === 'noteheadHalf';
}

const EMPTY_SET = new Set<string>();

/**
 * Reading order over every surviving notehead detection:
 *   - staves walked in response order (P1·0, P1·1, P1·2, P2·0, …)
 *   - within each staff, notes sorted left-to-right by `cx`
 *   - any id in `deletedIds` is excluded
 *
 * Pass `deletedIds` to keep selection / sequence navigation in sync with
 * the user's edits. The default empty set means "no deletions".
 */
export function getOrderedNoteIds(
  raw: OmrResponse,
  deletedIds: ReadonlySet<string> = EMPTY_SET,
): string[] {
  const ids: string[] = [];
  for (const staff of raw.detections) {
    const notes = staff.detections
      .filter(isNotehead)
      .filter((d) => !deletedIds.has(d.id))
      .slice()
      .sort((a, b) => a.cx - b.cx);
    for (const d of notes) ids.push(d.id);
  }
  return ids;
}

export function indexOfId(orderedIds: readonly string[], id: string | null): number {
  if (id === null) return -1;
  return orderedIds.indexOf(id);
}

export function neighborId(
  orderedIds: readonly string[],
  currentId: string | null,
  step: 1 | -1,
): string | null {
  if (orderedIds.length === 0) return null;
  const idx = indexOfId(orderedIds, currentId);
  if (idx < 0) return orderedIds[0] ?? null;
  const next = idx + step;
  if (next < 0 || next >= orderedIds.length) return currentId; // clamp at ends
  return orderedIds[next] ?? null;
}
