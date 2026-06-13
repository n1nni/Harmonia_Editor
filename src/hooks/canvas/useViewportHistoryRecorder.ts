'use client';

import { useEffect, useRef } from 'react';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';

/**
 * Subscribe to viewport `zoom` and `pan` mutations and push a snapshot
 * to navigation history after the user stops manipulating the viewport
 * for `DEBOUNCE_MS`. This collapses a continuous gesture (mouse-wheel
 * zoom, pan-drag, pinch) into a single history entry.
 *
 * Discrete actions in `useZoomNavigation` push *before* changing the
 * viewport; this recorder operates *after* the change. The two are
 * complementary: discrete actions yield Prev that returns to the
 * pre-action state; the recorder yields Prev that returns to the
 * state observed just before the most recent continuous gesture.
 */
const DEBOUNCE_MS = 500;

export function useViewportHistoryRecorder() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef<{ zoom: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const unsub = useHarmonyStore.subscribe((state, prev) => {
      const vp = state.viewport;
      const pp = prev.viewport;
      if (
        vp.zoom === pp.zoom &&
        vp.pan.x === pp.pan.x &&
        vp.pan.y === pp.pan.y
      ) {
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const cur = useHarmonyStore.getState();
        const v = cur.viewport;
        const prior = lastPushed.current;
        if (
          prior &&
          prior.zoom === v.zoom &&
          prior.px === v.pan.x &&
          prior.py === v.pan.y
        ) {
          return;
        }
        cur.actions.pushViewportHistory();
        lastPushed.current = { zoom: v.zoom, px: v.pan.x, py: v.pan.y };
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
