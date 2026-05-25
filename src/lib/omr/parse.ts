import type { OmrResponse, Detection, RawStaff } from '@/types/omr';
import { clefKindFromClass } from '@/lib/music/clefs';
import {
  stepIndexFromY,
  pitchFromStepIndex,
  applyKeySignature,
  type Pitch,
} from '@/lib/music/pitch';
import type {
  Note,
  ScoreSemantic,
  StaffSemantic,
  Duration,
} from '@/lib/music/model';
import type { MxlDocument } from '@/lib/musicxml/types';

function noteDurationFromClass(cls: Detection['class']): Duration {
  if (cls === 'noteheadHalf') return 'half';
  return 'quarter'; // noteheadBlack -> quarter (beams/flags not associated yet)
}

function isNotehead(d: Detection): boolean {
  return d.class === 'noteheadBlack' || d.class === 'noteheadHalf';
}

function parseStaff(staff: RawStaff, mxl: MxlDocument | null): StaffSemantic {
  // Sort by cx so "leftmost clef" / "first N sharps" semantics work.
  const sorted = [...staff.detections].sort((a, b) => a.cx - b.cx);

  // Find the staff's clef: leftmost clef-class detection.
  const clefDet = sorted.find(
    (d) => d.class === 'clefG' || d.class === 'clefF' || d.class === 'clef8',
  );
  const clef = clefDet ? clefKindFromClass(clefDet.class) : null;

  // Count key sharps: keySharp detections that appear BEFORE the first
  // notehead (or after the clef, whichever comes first).
  const firstNoteX = sorted.find(isNotehead)?.cx ?? Infinity;
  const keySharps = sorted.filter(
    (d) => d.class === 'keySharp' && d.cx < firstNoteX,
  ).length;

  const bottomLineY = staff.line_positions[staff.line_positions.length - 1] ?? 0;

  const notes: Note[] = sorted.filter(isNotehead).map<Note>((d) => {
    const mxlNote = mxl?.notes.get(d.id) ?? null;

    let pitch: Pitch | null = null;
    let pitchFromMxl = false;
    if (mxlNote) {
      pitch = mxlNote.pitch;
      pitchFromMxl = true;
    } else if (clef) {
      const idx = stepIndexFromY(d.cy, bottomLineY, staff.line_spacing);
      pitch = applyKeySignature(pitchFromStepIndex(idx, clef), keySharps);
    }

    return {
      id: `${d.id}-note`,
      detectionId: d.id,
      cx: d.cx,
      cy: d.cy,
      bbox: { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 },
      pitch,
      pitchFromMxl,
      duration: noteDurationFromClass(d.class),
      mxlDuration: mxlNote?.duration ?? null,
      voice: mxlNote?.voice ?? null,
      measureNumber: mxlNote?.measureNumber ?? null,
      hasSlurStart: mxlNote?.hasSlurStart ?? false,
      hasSlurStop: mxlNote?.hasSlurStop ?? false,
    };
  });

  const rests = sorted.filter((d) => d.class === 'restDoubleWhole');

  return {
    partId: staff.part_id,
    staffInPart: staff.staff_in_part,
    clef,
    keySharps,
    notes,
    rests,
  };
}

/**
 * Build the semantic score from a raw OMR response and (optionally) the
 * parsed MusicXML document. The MXL is the source of truth for pitch and
 * duration when present; geometry inference is the fallback.
 */
export function parseScore(
  raw: OmrResponse,
  imageW: number,
  imageH: number,
  mxl: MxlDocument | null,
): ScoreSemantic {
  const staves = raw.detections.map((s) => parseStaff(s, mxl));
  const noteByDetectionId = new Map<string, Note>();
  for (const s of staves) {
    for (const n of s.notes) noteByDetectionId.set(n.detectionId, n);
  }
  return { staves, imageW, imageH, noteByDetectionId };
}
