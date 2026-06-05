import type { Detection, RawStaff } from '@/types/omr';
import type { Pitch } from '@/lib/music/pitch';

/**
 * A note placed by the user with the Add-Note tool. Lives alongside the
 * OMR's original detections; rendered through the same Glyph/Stem pipeline
 * via `addedNoteToDetection` and persisted into the saved MusicXML.
 */
export interface AddedNote {
  id: string;                          // e.g. "add_<n>"
  partId: string;
  staffInPart: number;
  cx: number;                          // image-space centre x
  cy: number;                          // image-space centre y (post-snap)
  duration: 'whole' | 'half' | 'quarter';
  voice: number;                       // default 1
  pitch: Pitch;
}

let counter = 1;
export function newAddedNoteId(): string {
  return `add_${String(counter++).padStart(4, '0')}`;
}

/**
 * Snap a cursor y-coordinate to the nearest staff line OR space on the
 * given staff. Returns the snapped cy and the diatonic step index relative
 * to the bottom staff line (step 0 = bottom line; +1 = space above it; +2
 * = next line up; …). Half of the staff-line spacing equals one step.
 */
export function snapNoteY(
  cy: number,
  staff: RawStaff,
): { cy: number; stepIndex: number } {
  const ls = staff.line_spacing;
  const bottomY = staff.line_positions[staff.line_positions.length - 1] ?? staff.bot_y;
  const stepIndex = Math.round((bottomY - cy) / (ls / 2));
  const snappedCy = bottomY - stepIndex * (ls / 2);
  return { cy: snappedCy, stepIndex };
}

/**
 * Convert an AddedNote into a synthetic `Detection`. The MusicLayer then
 * renders it through the existing Glyph (noteheadBlack/Half) + Stem path
 * without any per-component changes.
 *
 * The bbox uses Bravura's nominal notehead dimensions (1.18 × 1.0 staff
 * spaces) centred on (cx, cy) — enough for hit-testing and the inspector's
 * size readout.
 */
export function addedNoteToDetection(note: AddedNote, staff: RawStaff): Detection {
  const ls = staff.line_spacing;
  const halfW = 0.59 * ls;
  const halfH = 0.5 * ls;
  const cls: Detection['class'] =
    note.duration === 'quarter' ? 'noteheadBlack' : 'noteheadHalf';
  return {
    id: note.id,
    class: cls,
    conf: 1.0,
    cx: note.cx,
    cy: note.cy,
    x1: note.cx - halfW,
    y1: note.cy - halfH,
    x2: note.cx + halfW,
    y2: note.cy + halfH,
    part_id: note.partId,
    staff_in_part: note.staffInPart,
  };
}
