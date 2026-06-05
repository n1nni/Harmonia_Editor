/**
 * Auto-Align algorithm: snap a notehead to its nearest staff line or
 * space, but only when the snap target lies inside a 2× bbox search
 * window centred on the note's *current rendered position*.
 *
 * Composition note: a note's rendered cy is
 *
 *   rendered_cy = d.cy + pitchShiftDy + alignDy
 *
 * where `pitchShiftDy` comes from the pitch-shift edit (whole diatonic
 * steps) and `alignDy` is this module's per-pixel correction. Calling
 * Auto-Align replaces `alignDy` so the rendered position lands on the
 * nearest line/space; pitch-shift is preserved (this is alignment, not
 * a pitch change). The search-window check is on *visual movement* —
 * the difference between the snapped position and the current rendered
 * position — so multi-click "drift" cannot occur: once aligned, the
 * snap target IS the current position and the next call is a no-op.
 *
 * Pure function: no React, no store, trivially testable.
 */

import type { Detection, RawStaff } from '@/types/omr';
import type { AlignOffset } from '@/lib/store/useHarmonyStore';
import { snapNoteY } from './addedNotes';

export function computeAutoAlign(
  d: Detection,
  effectiveCy: number,
  pitchShiftDy: number,
  staff: RawStaff,
): AlignOffset | null {
  const searchWindow = d.y2 - d.y1; // user's "2× bbox" = full bbox height
  const { cy: snappedCy } = snapNoteY(effectiveCy, staff);
  const visualDelta = snappedCy - effectiveCy;
  if (Math.abs(visualDelta) > searchWindow) return null;
  // The new alignment offset, expressed relative to d.cy (the OMR's
  // original position), so that d.cy + pitchShiftDy + alignDy == snappedCy.
  const newAlignDy = snappedCy - d.cy - pitchShiftDy;
  return { dx: 0, dy: newAlignDy };
}
