/**
 * Module-level cache of the rectified score image's grayscale pixel data,
 * used by the IoU-based Auto-Align algorithm. Populated once per image
 * load (by `ImageBackdrop`'s onLoad handler) and cleared whenever a new
 * score is loaded (by `loadFixture`).
 *
 * The cache stores a single-channel luminance buffer (one byte per pixel,
 * row-major) rather than the original RGBA so memory is ¼ what `getImageData`
 * returns and pixel reads are simpler. Grayscale conversion uses the
 * standard ITU-R BT.601 luminance weights.
 *
 * The cache is intentionally module-level state rather than store state:
 * pixel buffers are large, change rarely, and never need React subscribers
 * — the only consumer is `autoAlignSelected` which runs on user click.
 */

export interface ImagePixels {
  /** Image width in pixels (== `img.naturalWidth`). */
  w: number;
  /** Image height in pixels (== `img.naturalHeight`). */
  h: number;
  /** Row-major grayscale buffer, length `w * h`, values in `[0, 255]`. */
  data: Uint8Array;
}

let cache: ImagePixels | null = null;

/**
 * Decode the given image element into the cache. Idempotent — calling
 * this for the same image dimensions overwrites the buffer with the new
 * pixel data. Safe to call on every onLoad.
 *
 * Catches and swallows tainted-canvas errors (cross-origin images that
 * cannot be read back); the cache simply remains null and Auto-Align
 * falls back to its Y-only snap.
 */
export function setImagePixels(img: HTMLImageElement): void {
  if (typeof document === 'undefined') return;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w === 0 || h === 0) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) {
      // ITU-R BT.601 luminance.
      const r = rgba[i] ?? 0;
      const g = rgba[i + 1] ?? 0;
      const b = rgba[i + 2] ?? 0;
      gray[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    }
    cache = { w, h, data: gray };
  } catch {
    // Tainted canvas (cross-origin), out of memory, etc. — leave cache as is.
    // Auto-Align falls back to the Y-only snap path.
  }
}

export function getImagePixels(): ImagePixels | null {
  return cache;
}

export function clearImagePixels(): void {
  cache = null;
}
