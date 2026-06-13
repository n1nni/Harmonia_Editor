/**
 * Cancellable rAF-based animator for viewport transitions.
 *
 * Interpolates `(zoom, pan)` from a `from` snapshot to a `to` snapshot
 * over `duration` milliseconds, calling `apply` on every animation
 * frame. A module-level cancellation ref ensures that initiating a new
 * animation cleanly cancels any prior in-flight animation so the
 * viewport does not "fight" two competing tweens.
 *
 * Default duration: 200 ms; default easing: ease-out cubic. Matches
 * the timing of professional graphics editors and stays comfortably
 * under the 250 ms threshold for "feels instant".
 *
 * No React. The caller's `apply` callback writes the store; the store
 * subscribers then re-render. Because `apply` is a synchronous function
 * pointer, the animation is decoupled from React reconciliation —
 * there is no `useState` in the loop and no React re-render scheduling
 * beyond what the store subscription naturally triggers.
 */

import type { Vec2 } from '@/lib/geometry/bbox';

export interface ViewportSnapshot {
  zoom: number;
  pan: Vec2;
}

export interface AnimateOpts {
  /** Milliseconds. Default 200. */
  duration?: number;
  /** Easing function on `[0, 1] → [0, 1]`. Default ease-out cubic. */
  easing?: (t: number) => number;
  /** Optional completion callback. */
  onDone?: () => void;
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

let cancelCurrent: (() => void) | null = null;

/**
 * Animate the viewport from `from` to `to`, writing every interpolated
 * snapshot to the store via `apply`. Returns a cancel function; calling
 * it stops the animation without applying further frames.
 */
export function animateViewport(
  from: ViewportSnapshot,
  to: ViewportSnapshot,
  apply: (snap: ViewportSnapshot) => void,
  opts: AnimateOpts = {},
): () => void {
  // Cancel any in-flight animation before starting a new one.
  if (cancelCurrent) cancelCurrent();

  const duration = Math.max(0, opts.duration ?? 200);
  const easing = opts.easing ?? easeOutCubic;

  // Degenerate path: zero duration → apply target immediately.
  if (duration === 0) {
    apply(to);
    opts.onDone?.();
    cancelCurrent = null;
    return () => {};
  }

  let raf = 0;
  let cancelled = false;
  const start = performance.now();

  function frame(now: number) {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    const e = easing(t);
    const snap: ViewportSnapshot = {
      zoom: from.zoom + (to.zoom - from.zoom) * e,
      pan: {
        x: from.pan.x + (to.pan.x - from.pan.x) * e,
        y: from.pan.y + (to.pan.y - from.pan.y) * e,
      },
    };
    apply(snap);
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelCurrent = null;
      opts.onDone?.();
    }
  }
  raf = requestAnimationFrame(frame);

  const cancel = () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    cancelCurrent = null;
  };
  cancelCurrent = cancel;
  return cancel;
}
