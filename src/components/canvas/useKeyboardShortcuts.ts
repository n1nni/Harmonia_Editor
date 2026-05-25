'use client';

import { useEffect } from 'react';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';

/**
 * Global keyboard shortcuts:
 *   F        — fit-to-screen
 *   + / =    — zoom in
 *   - / _    — zoom out
 *   0        — reset zoom to 100%
 *   Esc      — clear selection
 *
 * Shortcuts no-op when a form input is focused.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) {
        return;
      }
      const state = useHarmonyStore.getState();
      const { actions, viewport, interaction } = state;
      switch (e.key) {
        case 'f':
        case 'F':
          actions.fitToScreen();
          break;
        case '+':
        case '=':
          actions.setZoom(viewport.zoom * 1.2);
          break;
        case '-':
        case '_':
          actions.setZoom(viewport.zoom / 1.2);
          break;
        case '0':
          actions.setZoom(1);
          actions.setPan({ x: 0, y: 0 });
          break;
        case 'Escape':
          if (interaction.pendingDeleteId) {
            actions.cancelDelete();
          } else {
            actions.setSelected(null);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (interaction.selectedId) {
            actions.requestDelete(interaction.selectedId);
          } else {
            return;
          }
          break;
        case 'Enter':
          if (interaction.pendingDeleteId) {
            actions.confirmDelete();
          } else {
            return;
          }
          break;
        case 'ArrowRight':
          if (state.interaction.selectedId === null) {
            actions.selectFirstNote();
          } else {
            actions.stepNote(1);
          }
          break;
        case 'ArrowLeft':
          if (state.interaction.selectedId === null) {
            actions.selectFirstNote();
          } else {
            actions.stepNote(-1);
          }
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
