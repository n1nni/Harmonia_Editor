'use client';

import { memo } from 'react';
import type { SmuflGlyphSpec } from '@/types/smufl';
import { glyphPlacement } from '@/lib/smufl/anchors';

interface GlyphProps {
  spec: SmuflGlyphSpec;
  cx: number;
  cy: number;
  lineSpacing: number;
  fill?: string;
  opacity?: number;
  /**
   * Uniform glyph scale (default 1). Smaller than 1 shrinks the glyph and
   * its centering offsets together so the bbox-center alignment with
   * (cx, cy) is preserved. Used for sub-sized SMuFL glyphs like clef8.
   */
  scale?: number;
}

/**
 * Renders a single SMuFL glyph as <text>, positioned so that the glyph's
 * bbox center lands at (cx, cy). This bbox-center match is the right metric
 * for "make the overlay land on top of the detected symbol", which is the
 * project's alignment goal.
 *
 * font-size is set per-glyph (rather than inherited from the staff <g>) so
 * staves with slightly different line_spacing each get correct scaling.
 */
export const Glyph = memo(function Glyph({
  spec,
  cx,
  cy,
  lineSpacing,
  fill = 'currentColor',
  opacity,
  scale = 1,
}: GlyphProps) {
  const { x, y, fontSize } = glyphPlacement(spec, cx, cy, lineSpacing, scale);
  return (
    <text
      x={x}
      y={y}
      fontFamily="Bravura"
      fontSize={fontSize}
      fill={fill}
      opacity={opacity}
      dominantBaseline="alphabetic"
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {String.fromCodePoint(spec.codepoint)}
    </text>
  );
});
