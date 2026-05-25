import type { Detection } from '@/types/omr';
import {
  BOTTOM_LINE_PITCH,
  STEP_LETTERS,
  sharpenedStepsForKey,
  type ClefKind,
  type PitchRef,
  type StepLetter,
} from './clefs';

export interface Pitch {
  step: StepLetter;
  stepIdx: number;
  octave: number;
  /** -2..+2; -2 = double-flat, +1 = sharp, +2 = double-sharp. */
  alter: -2 | -1 | 0 | 1 | 2;
}

/**
 * Convert a notehead's cy to a diatonic step index relative to the staff's
 * bottom line. step_index = 0 → bottom line; each +1 = one diatonic step up.
 *
 * Half-staff-spacing (line_spacing / 2) corresponds to one diatonic step.
 * Rounding to nearest integer absorbs detection jitter up to ±s/4.
 */
export function stepIndexFromY(
  cy: number,
  bottomLineY: number,
  lineSpacing: number,
): number {
  return Math.round((bottomLineY - cy) / (lineSpacing / 2));
}

/**
 * Walk N diatonic steps from a reference pitch. Octave boundary is C.
 */
export function shiftPitch(ref: PitchRef, n: number): { step: StepLetter; stepIdx: number; octave: number } {
  const absolute = ref.octave * 7 + ref.stepIdx + n;
  const octave = Math.floor(absolute / 7);
  const stepIdx = ((absolute % 7) + 7) % 7;
  const step = STEP_LETTERS[stepIdx];
  if (!step) {
    // Should be unreachable given (absolute % 7) is always 0..6.
    throw new Error(`Invalid step index ${stepIdx}`);
  }
  return { step, stepIdx, octave };
}

export function pitchFromStepIndex(idx: number, clef: ClefKind): Pitch {
  const ref = BOTTOM_LINE_PITCH[clef];
  const shifted = shiftPitch(ref, idx);
  return { ...shifted, alter: 0 };
}

/**
 * Apply key signature to a raw diatonic pitch. Phase 1 only handles sharps
 * (the fixture has no flats). Inline accidentals from `accidentalSharp`
 * detections override the key for that staff position; left for the parser
 * to thread in (since proximity logic is parse-time).
 */
export function applyKeySignature(p: Pitch, numSharps: number): Pitch {
  if (numSharps <= 0) return p;
  const sharps = sharpenedStepsForKey(numSharps);
  if (sharps.has(p.step)) return { ...p, alter: 1 };
  return p;
}

/** Formats a Pitch as "A#4", "Bb3", etc. */
export function formatPitch(p: Pitch | null): string {
  if (!p) return '—';
  const acc = p.alter === 1 ? '♯' : p.alter === -1 ? '♭' : p.alter === 2 ? '𝄪' : p.alter === -2 ? '𝄫' : '';
  return `${p.step}${acc}${p.octave}`;
}

/**
 * Heuristic accidental-to-notehead association.
 * For an inline `accidentalSharp` detection at (ax1..ax2, ay1..ay2), the affected
 * notehead is the next notehead to the RIGHT on the same staff whose vertical
 * center is within ±0.75 * lineSpacing of the accidental's vertical center.
 * Returns the notehead detection id, or null if no candidate.
 */
export function associateAccidental(
  accidental: Detection,
  candidates: readonly Detection[],
  lineSpacing: number,
): string | null {
  let bestId: string | null = null;
  let bestDx = Infinity;
  const acy = accidental.cy;
  for (const c of candidates) {
    if (c.class !== 'noteheadBlack' && c.class !== 'noteheadHalf') continue;
    if (c.cx <= accidental.cx) continue;
    const dx = c.cx - accidental.cx;
    if (Math.abs(c.cy - acy) > 0.75 * lineSpacing) continue;
    if (dx < bestDx) {
      bestDx = dx;
      bestId = c.id;
    }
  }
  return bestId;
}
