import type { SymbolClass } from '@/types/omr';
import type { SmuflGlyphSpec } from '@/types/smufl';

/**
 * SymbolClass -> SMuFL glyph spec.
 * Values for `bbox` are copied verbatim from bravura_metadata.json#glyphBBoxes
 * (units: staff spaces, +y up). Update if the bundled Bravura version changes.
 *
 * NOTE: `slur` and `beam` are deliberately absent — they are rendered as
 * <path> primitives, not glyphs. Lookups for those classes must short-circuit
 * before calling into this table.
 */
export const GLYPH_SPECS: Record<
  Exclude<SymbolClass, 'slur' | 'beam'>,
  SmuflGlyphSpec
> = {
  noteheadBlack: {
    name: 'noteheadBlack',
    codepoint: 0xe0a4,
    bbox: { sw: [0.0, -0.5], ne: [1.18, 0.5] },
  },
  noteheadHalf: {
    name: 'noteheadHalf',
    codepoint: 0xe0a3,
    bbox: { sw: [0.0, -0.5], ne: [1.18, 0.5] },
  },
  clefG: {
    name: 'gClef',
    codepoint: 0xe050,
    bbox: { sw: [0.0, -2.632], ne: [2.684, 4.392] },
  },
  clefF: {
    name: 'fClef',
    codepoint: 0xe062,
    // Note: fClef has slight negative bBoxSW.x (-0.02); kept as-is for fidelity.
    bbox: { sw: [-0.02, -2.54], ne: [2.736, 1.048] },
  },
  clef8: {
    // The OMR detects the "8" below a treble-8vb clef as a SEPARATE small
    // detection (bbox ~11x14 px), NOT as part of a combined clef glyph.
    // We therefore render only the digit using SMuFL's timeSig8 codepoint;
    // a `renderScale` in GLYPH_RENDER below shrinks it to clef-octave size.
    name: 'timeSig8',
    codepoint: 0xe088,
    bbox: { sw: [0.08, -1.036], ne: [1.664, 1.036] },
  },
  keySharp: {
    // Same glyph as accidentalSharp in Bravura.
    name: 'accidentalSharp',
    codepoint: 0xe262,
    bbox: { sw: [0.0, -1.392], ne: [0.996, 1.4] },
  },
  accidentalSharp: {
    name: 'accidentalSharp',
    codepoint: 0xe262,
    bbox: { sw: [0.0, -1.392], ne: [0.996, 1.4] },
  },
  augmentationDot: {
    name: 'augmentationDot',
    codepoint: 0xe1e7,
    bbox: { sw: [0.0, -0.2], ne: [0.4, 0.2] },
  },
  restDoubleWhole: {
    name: 'restDoubleWhole',
    codepoint: 0xe4e2,
    bbox: { sw: [0.0, 0.0], ne: [0.5, 1.0] },
  },
};

export function glyphFor(cls: SymbolClass): SmuflGlyphSpec | null {
  if (cls === 'slur' || cls === 'beam') return null;
  return GLYPH_SPECS[cls];
}

/**
 * Per-class size multiplier relative to the staff-sized default (4 em).
 * Most glyphs render at full staff size (scale = 1). The "8" below an
 * octave-transposed treble clef is conventionally engraved at ~40% — it's
 * a small annotation, not a time-signature digit. The OMR confirms this:
 * its detected bbox for `clef8` is roughly 11x14 px against an 18 px
 * staff-space, i.e. ~0.6 ss wide x ~0.8 ss tall, which matches the
 * standard small-octave-clef-digit size.
 */
export const GLYPH_RENDER_SCALE: Partial<Record<SymbolClass, number>> = {
  clef8: 0.45,
};

export function renderScaleFor(cls: SymbolClass): number {
  return GLYPH_RENDER_SCALE[cls] ?? 1;
}
