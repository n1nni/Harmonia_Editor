import { STEP_LETTERS, type StepLetter } from '@/lib/music/clefs';
import type { StaffTransform } from '@/lib/staff/types';

/**
 * Produce an edited MusicXML string by:
 *   1. removing `<note>` elements whose `id` is in `deletedIds`
 *   2. shifting `<pitch><step>` and `<pitch><octave>` for every id present
 *      in `pitchShifts` (delta in diatonic steps; +ve = up, -ve = down)
 *   3. embedding the user's per-staff transform map under
 *      `<identification><miscellaneous><miscellaneous-field
 *      name="harmonia-staff-transforms">JSON</miscellaneous-field>`
 *
 * Deletions take precedence: an id present in both maps is removed.
 * `<alter>` is intentionally left untouched — the fixture's MusicXML omits
 * it and relies on the part's `<key><fifths>` for accidentals; downstream
 * consumers (Verovio, MuseScore) derive accidentals from the key signature.
 *
 * The staff-transforms field is round-trippable: the same JSON shape is
 * stored in `edits.staffTransforms` at runtime, so on a future "open" flow
 * we can parse it back and restore the user's layout edits.
 */
export function serializeEditedMusicXml(
  xml: string,
  deletedIds: ReadonlySet<string>,
  pitchShifts: ReadonlyMap<string, number> = new Map(),
  staffTransforms: ReadonlyMap<string, StaffTransform> = new Map(),
): string {
  const hasAnyEdit =
    deletedIds.size > 0 || pitchShifts.size > 0 || staffTransforms.size > 0;
  if (!hasAnyEdit) return xml;

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

  // 3. Staff transforms — JSON in identification.miscellaneous.
  let transformsWritten = 0;
  if (staffTransforms.size > 0) {
    const payload: Record<string, StaffTransform> = {};
    staffTransforms.forEach((t, key) => {
      payload[key] = t;
    });
    upsertMiscellaneousField(
      doc,
      'harmonia-staff-transforms',
      JSON.stringify(payload),
    );
    transformsWritten = staffTransforms.size;
  }

  if (removed === 0 && shifted === 0 && transformsWritten === 0) return xml;

  const out = new XMLSerializer().serializeToString(doc);
  if (!/^<\?xml/i.test(out)) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${out}`;
  }
  return out;
}

/**
 * Insert (or replace) a `<miscellaneous-field name="...">value</...>` under
 * `<identification><miscellaneous>`. Creates the parent chain if absent. The
 * MusicXML 3.0 schema places `<identification>` as the second child of
 * `<score-partwise>` (after `<work>`), and `<miscellaneous>` is the last
 * child of `<identification>`.
 */
function upsertMiscellaneousField(doc: Document, name: string, value: string) {
  const root = doc.documentElement; // <score-partwise>
  let identification = root.querySelector(':scope > identification');
  if (!identification) {
    identification = doc.createElement('identification');
    // Insert as the first child by default; consumers don't require strict
    // schema order at this fixture's tolerance.
    root.insertBefore(identification, root.firstChild);
  }
  let miscellaneous = identification.querySelector(':scope > miscellaneous');
  if (!miscellaneous) {
    miscellaneous = doc.createElement('miscellaneous');
    identification.appendChild(miscellaneous);
  }
  let field = miscellaneous.querySelector(
    `:scope > miscellaneous-field[name="${cssEscape(name)}"]`,
  );
  if (!field) {
    field = doc.createElement('miscellaneous-field');
    field.setAttribute('name', name);
    miscellaneous.appendChild(field);
  }
  field.textContent = value;
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
