import type { SmuflGlyphSpec } from '@/types/smufl';

/**
 * Compute the SVG <text> (x, y) so the glyph's bbox center lands at (cx, cy).
 *
 * Math:
 *   bbox center in SMuFL space (staff spaces):
 *     ccx = (sw[0] + ne[0]) / 2
 *     ccy = (sw[1] + ne[1]) / 2   (+y up)
 *
 *   In SVG space, font-size = 4 * lineSpacing px so that
 *     1 staff space = lineSpacing px.
 *
 *   SMuFL +y -> SVG +y flip:
 *     visualCenter_svg.x = text.x + ccx * lineSpacing
 *     visualCenter_svg.y = text.y - ccy * lineSpacing
 *
 *   Solving for (text.x, text.y) given (cx, cy):
 *     text.x = cx - ccx * lineSpacing
 *     text.y = cy + ccy * lineSpacing
 *
 *   The optional `scale` shrinks the entire glyph uniformly (font-size and
 *   centering offsets both multiply by scale). Used for sub-sized glyphs
 *   like the "8" digit below an octave-transposed clef, which is rendered
 *   smaller than a time-signature digit even though it shares the codepoint.
 */
export function glyphPlacement(
  spec: SmuflGlyphSpec,
  cx: number,
  cy: number,
  lineSpacing: number,
  scale = 1,
): { x: number; y: number; fontSize: number } {
  const ccx = (spec.bbox.sw[0] + spec.bbox.ne[0]) / 2;
  const ccy = (spec.bbox.sw[1] + spec.bbox.ne[1]) / 2;
  const effLs = lineSpacing * scale;
  return {
    x: cx - ccx * effLs,
    y: cy + ccy * effLs,
    fontSize: 4 * effLs,
  };
}
