import type { Detection } from '@/types/omr';

/**
 * Shift a notehead detection vertically by a given number of diatonic steps.
 *
 *   dy = -delta * (lineSpacing / 2)
 *
 * Half of the staff-line spacing equals one diatonic step (line → adjacent
 * space → next line). Up is negative y in image/SVG coordinates, so a
 * positive delta produces a negative dy.
 *
 * Pure function — returns a new detection with updated cy, y1, y2. Bbox
 * width and horizontal centre are preserved.
 */
export function applyPitchShiftToDetection(
  d: Detection,
  delta: number,
  lineSpacing: number,
): Detection {
  if (delta === 0) return d;
  const dy = -delta * (lineSpacing / 2);
  return { ...d, cy: d.cy + dy, y1: d.y1 + dy, y2: d.y2 + dy };
}

export function isNoteheadClass(c: Detection['class']): boolean {
  return c === 'noteheadBlack' || c === 'noteheadHalf';
}
