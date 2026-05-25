/**
 * SMuFL glyph descriptors.
 *
 * Coordinate convention:
 *   - Bounding-box values are in STAFF SPACES (SMuFL spec).
 *     1 em = 4 staff spaces. font-size = 4 * line_spacing pixels makes
 *     1 staff space = line_spacing pixels.
 *   - +y in SMuFL space is UP (cartesian). SVG +y is DOWN — we flip
 *     when converting at render time.
 *   - Origin (x=0, y=0) is the glyph's nominal advance origin, on the
 *     baseline. For most stand-alone glyphs (noteheads, sharps,
 *     augmentation dots) the baseline runs through the visual center,
 *     so converting bbox center → screen pixel center is straightforward.
 */

export interface SmuflBBox {
  /** South-west (left, lower-y in SMuFL coords). Values in staff spaces. */
  sw: [number, number];
  /** North-east (right, upper-y). Values in staff spaces. */
  ne: [number, number];
}

export interface SmuflGlyphSpec {
  /** Human-readable SMuFL name (matches metadata.json keys). */
  name: string;
  /** Unicode codepoint in Bravura's private-use area. */
  codepoint: number;
  /** Bounding box from bravura_metadata.json#glyphBBoxes. */
  bbox: SmuflBBox;
}
