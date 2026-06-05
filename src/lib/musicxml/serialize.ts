import { STEP_LETTERS, type StepLetter } from '@/lib/music/clefs';

/**
 * Produce an edited MusicXML string by:
 *   1. removing `<note>` elements whose `id` is in `deletedIds`
 *   2. shifting `<pitch><step>` and `<pitch><octave>` for every id present
 *      in `pitchShifts` (delta in diatonic steps; +ve = up, -ve = down)
 *
 * Deletions take precedence: an id present in both maps is removed.
 * `<alter>` is intentionally left untouched — the fixture's MusicXML omits
 * it and relies on the part's `<key><fifths>` for accidentals; downstream
 * consumers (Verovio, MuseScore) derive accidentals from the key signature.
 *
 * Implementation notes:
 *  - Uses browser-native DOMParser + XMLSerializer to avoid a heavyweight
 *    XML dependency.
 *  - Pure function: input strings and maps are never mutated.
 *  - If neither edit map is non-empty, the input is returned unchanged.
 */
export function serializeEditedMusicXml(
  xml: string,
  deletedIds: ReadonlySet<string>,
  pitchShifts: ReadonlyMap<string, number> = new Map(),
): string {
  if (deletedIds.size === 0 && pitchShifts.size === 0) return xml;

  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    return xml;
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return xml;

  // 1. Deletions.
  let removed = 0;
  if (deletedIds.size > 0) {
    const notes = doc.querySelectorAll('note[id]');
    notes.forEach((n) => {
      const id = n.getAttribute('id');
      if (id && deletedIds.has(id)) {
        n.parentNode?.removeChild(n);
        removed += 1;
      }
    });
  }

  // 2. Pitch shifts (skip ids that were deleted above).
  let shifted = 0;
  if (pitchShifts.size > 0) {
    pitchShifts.forEach((delta, id) => {
      if (delta === 0 || deletedIds.has(id)) return;
      const note = doc.querySelector(`note[id="${cssEscape(id)}"]`);
      if (!note) return;
      const stepEl = note.querySelector(':scope > pitch > step');
      const octEl = note.querySelector(':scope > pitch > octave');
      if (!stepEl || !octEl) return;
      const stepText = stepEl.textContent ?? '';
      const octText = octEl.textContent ?? '';
      if (!isStepLetter(stepText)) return;
      const octave = Number(octText);
      if (!Number.isFinite(octave)) return;

      const { newStep, newOctave } = shiftStepOctave(stepText, octave, delta);
      stepEl.textContent = newStep;
      octEl.textContent = String(newOctave);
      shifted += 1;
    });
  }

  if (removed === 0 && shifted === 0) return xml;

  const out = new XMLSerializer().serializeToString(doc);
  if (!/^<\?xml/i.test(out)) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${out}`;
  }
  return out;
}

function isStepLetter(s: string): s is StepLetter {
  return (STEP_LETTERS as readonly string[]).includes(s);
}

function shiftStepOctave(
  step: StepLetter,
  octave: number,
  delta: number,
): { newStep: StepLetter; newOctave: number } {
  const stepIdx = (STEP_LETTERS as readonly string[]).indexOf(step);
  const absolute = octave * 7 + stepIdx + delta;
  const newOctave = Math.floor(absolute / 7);
  const newIdx = ((absolute % 7) + 7) % 7;
  const newStep = STEP_LETTERS[newIdx];
  if (!newStep) throw new Error(`Invalid step index ${newIdx}`);
  return { newStep, newOctave };
}

/** Minimal CSS attribute-selector escape for ids like "det_0003". */
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, (c) => `\\${c}`);
}
