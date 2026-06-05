import { STEP_LETTERS, type StepLetter } from '@/lib/music/clefs';
import type { StaffTransform } from '@/lib/staff/types';
import type { AddedNote } from '@/lib/staff/addedNotes';
import type { OmrResponse, RawStaff } from '@/types/omr';

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
  addedNotes: ReadonlyMap<string, AddedNote> = new Map(),
  raw: OmrResponse | null = null,
): string {
  const hasAnyEdit =
    deletedIds.size > 0 ||
    pitchShifts.size > 0 ||
    staffTransforms.size > 0 ||
    addedNotes.size > 0;
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

  // 3. Added notes — insert one <note> per AddedNote into the right
  //    measure of the right part. The anchor is the existing detection
  //    note in the same (partId, staffInPart) whose cx is closest to the
  //    added note's cx; the new <note> is inserted before/after that
  //    anchor based on relative cx position.
  let added = 0;
  if (addedNotes.size > 0 && raw !== null) {
    addedNotes.forEach((note) => {
      const anchor = findAnchorDetectionId(note, raw);
      if (!anchor) return;
      const anchorEl = doc.querySelector(`note[id="${cssEscape(anchor.id)}"]`);
      if (!anchorEl) return;
      const measureEl = anchorEl.closest('measure');
      if (!measureEl) return;
      const divisions = readDivisions(doc, note.partId) ?? 4;

      // Engraver coordinates in MusicXML tenths (10 tenths = 1 staff space).
      // default-x: anchor's default-x + (Δcx in image pixels) → tenths
      // default-y: image-space delta from the staff's top line, sign-flipped
      //           because MusicXML +y is UP and image +y is DOWN.
      const tenthsPerPx = 10 / anchor.staff.line_spacing;
      const anchorDefaultX = parseFloat(
        anchorEl.getAttribute('default-x') ?? '0',
      );
      const defaultX =
        anchorDefaultX + (note.cx - anchor.cx) * tenthsPerPx;
      const topLineY =
        anchor.staff.line_positions[0] ?? anchor.staff.top_y;
      const defaultY = -(note.cy - topLineY) * tenthsPerPx;

      const newNote = buildAddedNoteElement(
        doc,
        note,
        divisions,
        defaultX,
        defaultY,
      );
      // Insert after the anchor if the added note is to its right; before otherwise.
      if (note.cx >= anchor.cx) {
        if (anchorEl.nextSibling) measureEl.insertBefore(newNote, anchorEl.nextSibling);
        else measureEl.appendChild(newNote);
      } else {
        measureEl.insertBefore(newNote, anchorEl);
      }
      added += 1;
    });
  }

  // 4. Staff transforms — JSON in identification.miscellaneous.
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

  if (removed === 0 && shifted === 0 && added === 0 && transformsWritten === 0) return xml;

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

/** Find the existing notehead detection in the same (partId, staffInPart)
 *  closest in cx to the added note. Returns the anchor's id + cx alongside
 *  the matching RawStaff (needed by the caller to compute engraver-tenth
 *  coordinates for the new note). */
function findAnchorDetectionId(
  note: AddedNote,
  raw: OmrResponse,
): { id: string; cx: number; staff: RawStaff } | null {
  let best: { id: string; cx: number; staff: RawStaff } | null = null;
  let bestDist = Infinity;
  for (const staff of raw.detections) {
    if (staff.part_id !== note.partId) continue;
    if (staff.staff_in_part !== note.staffInPart) continue;
    for (const d of staff.detections) {
      if (d.class !== 'noteheadBlack' && d.class !== 'noteheadHalf') continue;
      const dist = Math.abs(d.cx - note.cx);
      if (dist < bestDist) {
        bestDist = dist;
        best = { id: d.id, cx: d.cx, staff };
      }
    }
  }
  return best;
}

/** Read the divisions value declared in the first measure of the given part.
 *  Falls back to null if absent. */
function readDivisions(doc: Document, partId: string): number | null {
  const part = doc.querySelector(`part[id="${cssEscape(partId)}"]`);
  if (!part) return null;
  const divisionsEl = part.querySelector('measure > attributes > divisions');
  const n = Number(divisionsEl?.textContent ?? '');
  return Number.isFinite(n) ? n : null;
}

/** Build a new <note> element for an AddedNote — matches the schema of an
 *  OMR-detected note (default-x, default-y, id attributes; pitch / duration
 *  / voice / type children). default-x and default-y are in MusicXML
 *  "tenths" (10 tenths = 1 staff space). */
function buildAddedNoteElement(
  doc: Document,
  note: AddedNote,
  divisions: number,
  defaultX: number,
  defaultY: number,
): Element {
  const el = doc.createElement('note');
  el.setAttribute('default-x', defaultX.toFixed(2));
  el.setAttribute('default-y', defaultY.toFixed(2));
  el.setAttribute('id', note.id);

  const pitch = doc.createElement('pitch');
  const step = doc.createElement('step');
  step.textContent = note.pitch.step;
  pitch.appendChild(step);
  // alter omitted; key signature handles it
  const octave = doc.createElement('octave');
  octave.textContent = String(note.pitch.octave);
  pitch.appendChild(octave);
  el.appendChild(pitch);

  const durationFactor =
    note.duration === 'whole'
      ? 4
      : note.duration === 'half'
        ? 2
        : note.duration === 'eighth'
          ? 0.5
          : 1; // quarter
  const durationValue = Math.max(1, Math.round(divisions * durationFactor));
  const duration = doc.createElement('duration');
  duration.textContent = String(durationValue);
  el.appendChild(duration);

  const voice = doc.createElement('voice');
  voice.textContent = String(note.voice);
  el.appendChild(voice);

  const type = doc.createElement('type');
  type.textContent = note.duration;
  el.appendChild(type);

  // <staff>N</staff> — MusicXML's 1-based within-part staff index. Makes
  // it explicit which physical staff inside a multi-staff part the added
  // note lives on (matches the canonical MXL schema for multi-staff parts).
  const staffEl = doc.createElement('staff');
  staffEl.textContent = String(note.staffInPart + 1);
  el.appendChild(staffEl);

  return el;
}
