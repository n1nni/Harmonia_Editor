'use client';

import { useEffect, type CSSProperties } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useUiScale } from '@/lib/store/selectors';
import { CanvasStage } from './canvas/CanvasStage';
import { useKeyboardShortcuts } from './canvas/useKeyboardShortcuts';
import { TopMenuBar } from './chrome/TopMenuBar';
import { TopToolbar } from './chrome/TopToolbar';
import { LeftToolPalette } from './chrome/LeftToolPalette';
import { StatusBar } from './chrome/StatusBar';
import { SCALED } from './chrome/scale';
import { ClassificationPanel } from './analysis/ClassificationPanel';

/**
 * Top-level composition. Loads the fixture on mount and arranges the
 * Inkscape-style chrome:
 *   row 1 — TopMenuBar       (SCALED.menuBarHeight)
 *   row 2 — TopToolbar       (SCALED.toolbarHeight)
 *   row 3 — LeftToolPalette  (SCALED.paletteWidth) | CanvasStage
 *   row 4 — StatusBar        (SCALED.statusHeight)
 *
 * The `--ui-scale` CSS custom property is the single source of truth for
 * chrome size; every dimension above is `calc(<base> * var(--ui-scale))`.
 */
export function HarmonyApp() {
  const { loadFixture } = useHarmonyActions();
  const status = useHarmonyStore((s) => s.data.status);
  const uiScale = useUiScale();

  useKeyboardShortcuts();

  useEffect(() => {
    if (status === 'idle') void loadFixture();
  }, [status, loadFixture]);

  const rootStyle = {
    '--ui-scale': uiScale,
    gridTemplateRows: `${SCALED.menuBarHeight} ${SCALED.toolbarHeight} 1fr ${SCALED.statusHeight}`,
    gridTemplateColumns: `${SCALED.paletteWidth} 1fr`,
  } as CSSProperties;

  return (
    <main
      className="grid h-screen w-screen overflow-hidden bg-surface-base"
      style={rootStyle}
    >
      <div className="col-span-2 row-start-1"><TopMenuBar /></div>
      <div className="col-span-2 row-start-2"><TopToolbar /></div>

      <div className="col-start-1 row-start-3"><LeftToolPalette /></div>
      <section className="col-start-2 row-start-3 relative h-full w-full">
        <CanvasStage />
      </section>

      <div className="col-span-2 row-start-4"><StatusBar /></div>

      <ClassificationPanel />
    </main>
  );
}
