import { STEP_LETTERS, sharpenedStepsForKey, type StepLetter } from '@/lib/music/clefs';
import type { Pitch } from '@/lib/music/pitch';
import type { MxlClef, MxlDocument, MxlDuration, MxlKey, MxlNote } from './types';

const DURATION_TYPES: ReadonlySet<MxlDuration> = new Set([
  'whole', 'half', 'quarter', 'eighth', '16th', '32nd',
]);

function isStepLetter(s: string | null): s is StepLetter {
  return s !== null && (STEP_LETTERS as readonly string[]).includes(s);
}

function indexOfStep(s: StepLetter): number {
  return (STEP_LETTERS as readonly string[]).indexOf(s);
}

function readNumber(el: Element | null, fallback: number): number {
  if (!el) return fallback;
  const n = Number(el.textContent ?? '');
  return Number.isFinite(n) ? n : fallback;
}

function readMxlDuration(typeText: string | null): MxlDuration {
  if (typeText && DURATION_TYPES.has(typeText as MxlDuration)) {
    return typeText as MxlDuration;
  }
  return 'quarter';
}

interface PartContext {
  partId: string;
  keyFifths: number;
}

function parseAttributes(measure: Element, partId: string, ctx: PartContext, out: MxlDocument): void {
  const attrs = measure.querySelector(':scope > attributes');
  if (!attrs) return;

  const keyEl = attrs.querySelector(':scope > key');
  if (keyEl) {
    const fifths = readNumber(keyEl.querySelector(':scope > fifths'), 0);
    const modeText = keyEl.querySelector(':scope > mode')?.textContent ?? null;
    const mode: MxlKey['mode'] =
      modeText === 'major' || modeText === 'minor' ? modeText : null;
    out.keys.push({ partId, fifths, mode });
    ctx.keyFifths = fifths;
  }

  const clefEl = attrs.querySelector(':scope > clef');
  if (clefEl) {
    const sign = clefEl.querySelector(':scope > sign')?.textContent ?? 'G';
    const line = readNumber(clefEl.querySelector(':scope > line'), 2);
    const octaveChange = readNumber(
      clefEl.querySelector(':scope > clef-octave-change'),
      0,
    );
    const clef: MxlClef = { partId, sign, line, octaveChange };
    out.clefs.push(clef);
  }
}

function parseNote(
  noteEl: Element,
  partId: string,
  measureNumber: number,
  keyFifths: number,
): MxlNote | null {
  const detectionId = noteEl.getAttribute('id');
  if (!detectionId) return null;

  const pitchEl = noteEl.querySelector(':scope > pitch');
  if (!pitchEl) return null; // rests / unpitched skipped

  const stepText = pitchEl.querySelector(':scope > step')?.textContent ?? null;
  if (!isStepLetter(stepText)) return null;

  const octave = readNumber(pitchEl.querySelector(':scope > octave'), 4);
  const explicitAlter = pitchEl.querySelector(':scope > alter');

  const sharps = sharpenedStepsForKey(Math.max(0, keyFifths));
  // No flat support in current fixture; if fifths < 0 we'd add flatsForKey later.
  let alter: Pitch['alter'] = 0;
  if (explicitAlter) {
    const n = Number(explicitAlter.textContent ?? '0');
    if (n === -2 || n === -1 || n === 0 || n === 1 || n === 2) alter = n;
  } else if (sharps.has(stepText)) {
    alter = 1;
  }

  const pitch: Pitch = {
    step: stepText,
    stepIdx: indexOfStep(stepText),
    octave,
    alter,
  };

  const typeText = noteEl.querySelector(':scope > type')?.textContent ?? null;
  const duration = readMxlDuration(typeText);
  const divisions = readNumber(noteEl.querySelector(':scope > duration'), 0);
  const voice = readNumber(noteEl.querySelector(':scope > voice'), 1);

  let hasSlurStart = false;
  let hasSlurStop = false;
  const slurs = noteEl.querySelectorAll(':scope > notations > slur');
  slurs.forEach((s) => {
    const t = s.getAttribute('type');
    if (t === 'start') hasSlurStart = true;
    if (t === 'stop') hasSlurStop = true;
  });

  return {
    detectionId,
    partId,
    measureNumber,
    voice,
    pitch,
    duration,
    divisions,
    hasSlurStart,
    hasSlurStop,
  };
}

/**
 * Parse the MusicXML string carried in `OmrResponse.xml` and return a
 * lookup-friendly document keyed by detection id.
 *
 * Failure mode: if XML is malformed or doesn't match the expected shape,
 * returns an empty `MxlDocument`. Downstream code falls back to geometry-only
 * pitch inference (existing behavior).
 */
export function parseMusicXml(xml: string): MxlDocument {
  const out: MxlDocument = {
    notes: new Map<string, MxlNote>(),
    clefs: [],
    keys: [],
  };

  if (typeof window === 'undefined' || !('DOMParser' in window)) {
    return out;
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return out;
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return out;
  }

  const parts = doc.querySelectorAll('score-partwise > part');
  parts.forEach((partEl) => {
    const partId = partEl.getAttribute('id') ?? '';
    const ctx: PartContext = { partId, keyFifths: 0 };

    const measures = partEl.querySelectorAll(':scope > measure');
    measures.forEach((measureEl) => {
      const measureNumber = Number(measureEl.getAttribute('number') ?? '0');
      parseAttributes(measureEl, partId, ctx, out);

      const notes = measureEl.querySelectorAll(':scope > note');
      notes.forEach((noteEl) => {
        const note = parseNote(noteEl, partId, measureNumber, ctx.keyFifths);
        if (note) out.notes.set(note.detectionId, note);
      });
    });
  });

  return out;
}
