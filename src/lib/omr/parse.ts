import type { OmrResponse, Detection, RawStaff } from '@/types/omr';
import { clefKindFromClass } from '@/lib/music/clefs';
import {
  stepIndexFromY,
  pitchFromStepIndex,
  applyKeySignature,
  shiftPitchDiatonic,
  type Pitch,
} from '@/lib/music/pitch';
import type {
  Note,
  ScoreSemantic,
  StaffSemantic,
  Duration,
} from '@/lib/music/model';
import type { MxlDocument } from '@/lib/musicxml/types';
import { applyPitchShiftToDetection } from '@/lib/music/applyEdits';

function noteDurationFromClass(cls: Detection['class']): Duration {
  if (cls === 'noteheadHalf') return 'half';
  return 'quarter';
}

function isNotehead(d: Detection): boolean {
  return d.class === 'noteheadBlack' || d.class === 'noteheadHalf';
}

function parseStaff(
  staff: RawStaff,
  mxl: MxlDocument | null,
  pitchShifts: ReadonlyMap<string, number>,
): StaffSemantic {
  const sorted = [...staff.detections].sort((a, b) => a.cx - b.cx);

  const clefDet = sorted.find(
    (d) => d.class === 'clefG' || d.class === 'clefF' || d.class === 'clef8',
  );
  const clef = clefDet ? clefKindFromClass(clefDet.class) : null;

  const firstNoteX = sorted.find(isNotehead)?.cx ?? Infinity;
  const keySharps = sorted.filter(
    (d) => d.class === 'keySharp' && d.cx < firstNoteX,
  ).length;

  const bottomLineY = staff.line_positions[staff.line_positions.length - 1] ?? 0;

  const notes: Note[] = sorted.filter(isNotehead).map<Note>((d) => {
    const shift = pitchShifts.get(d.id) ?? 0;
    const eff = applyPitchShiftToDetection(d, shift, staff.line_spacing);
    const mxlNote = mxl?.notes.get(d.id) ?? null;

    let pitch: Pitch | null = null;
    let pitchFromMxl = false;
    if (mxlNote) {
      pitch = shift === 0
        ? mxlNote.pitch
        : shiftPitchDiatonic(mxlNote.pitch, shift, keySharps);
      pitchFromMxl = true;
    } else if (clef) {
      const idx = stepIndexFromY(eff.cy, bottomLineY, staff.line_spacing);
      pitch = applyKeySignature(pitchFromStepIndex(idx, clef), keySharps);
    }

    return {
      id: `${d.id}-note`,
      detectionId: d.id,
      cx: eff.cx,
      cy: eff.cy,
      bbox: { x1: eff.x1, y1: eff.y1, x2: eff.x2, y2: eff.y2 },
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

const EMPTY_SHIFTS: ReadonlyMap<string, number> = new Map();

/**
 * Build the semantic score from a raw OMR response, the parsed MusicXML,
 * and the user's pitch-shift edit map. Each notehead is transformed in
 * lockstep: its geometry is shifted by the diatonic delta and its pitch
 * is shifted diatonically with the key signature re-applied.
 */
export function parseScore(
  raw: OmrResponse,
  imageW: number,
  imageH: number,
  mxl: MxlDocument | null,
  pitchShifts: ReadonlyMap<string, number> = EMPTY_SHIFTS,
): ScoreSemantic {
  const staves = raw.detections.map((s) => parseStaff(s, mxl, pitchShifts));
  const noteByDetectionId = new Map<string, Note>();
  for (const s of staves) {
    for (const n of s.notes) noteByDetectionId.set(n.detectionId, n);
  }
  return { staves, imageW, imageH, noteByDetectionId };
}
