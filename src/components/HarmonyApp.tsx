'use client';

import { type CSSProperties } from 'react';
import { useUiScale } from '@/lib/store/selectors';
import { CanvasStage } from './canvas/CanvasStage';
import { useKeyboardShortcuts } from './canvas/useKeyboardShortcuts';
import { useImageUpload } from '@/hooks/data/useImageUpload';
import { TopMenuBar } from './chrome/TopMenuBar';
import { TopToolbar } from './chrome/TopToolbar';
import { LeftToolPalette } from './chrome/LeftToolPalette';
import { StatusBar } from './chrome/StatusBar';
import { SCALED } from './chrome/scale';
import { ClassificationPanel } from './analysis/ClassificationPanel';

/**
 * Top-level composition. Arranges the Inkscape-style chrome:
 *   row 1 — TopMenuBar       (SCALED.menuBarHeight)
 *   row 2 — TopToolbar       (SCALED.toolbarHeight)
 *   row 3 — LeftToolPalette  (SCALED.paletteWidth) | CanvasStage
 *   row 4 — StatusBar        (SCALED.statusHeight)
 *
 * The `--ui-scale` CSS custom property is the single source of truth for
 * chrome size; every dimension above is `calc(<base> * var(--ui-scale))`.
 *
 * The application no longer auto-loads a fixture on mount. The user
 * picks a score file through File → Upload score… (or Ctrl+O, or the
 * toolbar's Upload icon); the resulting upload is dispatched through
 * `useImageUpload`, which mounts the hidden `<input type="file">`
 * below and routes the selected file into `actions.uploadImage`.
 */
export function HarmonyApp() {
  const uiScale = useUiScale();
  const { renderInput } = useImageUpload();

  useKeyboardShortcuts();

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

      {renderInput()}
    </main>
  );
}
