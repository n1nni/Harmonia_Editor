import type { SymbolClass } from '@/types/omr';

export type ClefKind = 'G' | 'F' | 'G8vb';

/**
 * Diatonic step letters in ascending order.
 * Step index 0 = C, 1 = D, ..., 6 = B.
 */
export const STEP_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type StepLetter = (typeof STEP_LETTERS)[number];

export interface PitchRef {
  step: StepLetter;
  /** Index into STEP_LETTERS (0..6). */
  stepIdx: number;
  octave: number;
}

/**
 * Bottom-line reference pitch for each clef kind.
 *
 *   Treble (G clef):       line_positions[4] = E4
 *   Bass   (F clef):       line_positions[4] = G2
 *   Treble-8vb (G clef 8 below):  line_positions[4] = E3
 *
 * The "step_index = 0" point in our pitch.ts ladder is this pitch.
 * Each +1 step_index = one diatonic step UP (half a staff-line spacing).
 */
export const BOTTOM_LINE_PITCH: Record<ClefKind, PitchRef> = {
  G: { step: 'E', stepIdx: 2, octave: 4 },
  F: { step: 'G', stepIdx: 4, octave: 2 },
  G8vb: { step: 'E', stepIdx: 2, octave: 3 },
};

export function clefKindFromClass(cls: SymbolClass): ClefKind | null {
  if (cls === 'clefG') return 'G';
  if (cls === 'clefF') return 'F';
  if (cls === 'clef8') return 'G8vb';
  return null;
}

/**
 * Standard order of sharps in a key signature: F, C, G, D, A, E, B.
 * Returns the first N entries as step letters.
 */
const SHARP_ORDER: StepLetter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

export function sharpenedStepsForKey(numSharps: number): ReadonlySet<StepLetter> {
  return new Set(SHARP_ORDER.slice(0, Math.max(0, Math.min(7, numSharps))));
}
