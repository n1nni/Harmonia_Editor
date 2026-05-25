'use client';

import { useEffect } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { CanvasStage } from './canvas/CanvasStage';
import { Sidebar } from './sidebar/Sidebar';
import { useKeyboardShortcuts } from './canvas/useKeyboardShortcuts';

/**
 * Top-level composition. Triggers fixture load on mount. Two-panel layout:
 * sidebar (280px) + canvas (rest).
 */
export function HarmonyApp() {
  const { loadFixture } = useHarmonyActions();
  const status = useHarmonyStore((s) => s.data.status);

  useKeyboardShortcuts();

  useEffect(() => {
    if (status === 'idle') void loadFixture();
  }, [status, loadFixture]);

  return (
    <main className="grid h-screen w-screen grid-cols-[280px_1fr] overflow-hidden bg-surface-base">
      <Sidebar />
      <section className="relative h-full w-full">
        <CanvasStage />
      </section>
    </main>
  );
}
