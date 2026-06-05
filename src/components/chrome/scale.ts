/**
 * Chrome size constants expressed as `calc(<base> * var(--ui-scale))`.
 *
 * The `--ui-scale` custom property lives on the root <main> element and
 * is driven by `display.uiScale` in the store. Multiplying every chrome
 * dimension by the same scalar keeps the layout proportionally tidy at
 * any zoom level the user picks.
 *
 * Only chrome — the canvas, music glyphs, hover tooltip, inspector card,
 * and debug labels stay at their own sizes (they have separate zoom).
 */

export const SCALED = {
  /** Top menu bar row height. */
  menuBarHeight: 'calc(96px * var(--ui-scale))',
  /** Brand logo image height (sits inside the menu bar). */
  logoHeight: 'calc(80px * var(--ui-scale))',
  /** Top toolbar row height. */
  toolbarHeight: 'calc(52px * var(--ui-scale))',
  /** Left vertical tool palette width. */
  paletteWidth: 'calc(60px * var(--ui-scale))',
  /** Bottom status bar row height. */
  statusHeight: 'calc(28px * var(--ui-scale))',

  /** Square chrome button (toolbar + palette). */
  buttonSize: 'calc(32px * var(--ui-scale))',
  /** Icon glyph inside a chrome button. */
  iconSize: 'calc(14px * var(--ui-scale))',

  /** Menu-button text size (File, Edit, View…). */
  menuLabelSize: 'calc(13px * var(--ui-scale))',
  /** Wordmark "Harmonia" font size. */
  wordmarkSize: 'calc(15px * var(--ui-scale))',
  /** Zoom-percent chip & opacity slider readout size. */
  chipSize: 'calc(11px * var(--ui-scale))',
  /** Status-bar text size. */
  statusTextSize: 'calc(10px * var(--ui-scale))',

  /** Toolbar opacity-slider track width. */
  sliderWidth: 'calc(96px * var(--ui-scale))',
  /** Zoom-percent chip minimum width. */
  chipMinWidth: 'calc(52px * var(--ui-scale))',
} as const;

export type ScaledKey = keyof typeof SCALED;
