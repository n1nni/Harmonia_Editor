'use client';

import { useEffect } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';

/**
 * Drives `fonts.bravuraLoaded` in the store. Once Bravura is ready,
 * glyph layers may render — before then, they'd paint with the fallback
 * font (serif), shifting every glyph's metrics and breaking alignment.
 */
export function useBravuraFont(): boolean {
  const loaded = useHarmonyStore((s) => s.fonts.bravuraLoaded);
  const { setBravuraLoaded } = useHarmonyActions();

  useEffect(() => {
    if (loaded) return;
    if (typeof document === 'undefined' || !document.fonts) {
      // Older browser / SSR. Assume loaded so we still render.
      setBravuraLoaded(true);
      return;
    }
    let cancelled = false;
    document.fonts.load('1em Bravura').then(
      () => {
        if (!cancelled) setBravuraLoaded(true);
      },
      () => {
        if (!cancelled) setBravuraLoaded(true); // fail-open, do not block
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loaded, setBravuraLoaded]);

  return loaded;
}
