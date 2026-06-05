'use client';

import { useEffect } from 'react';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';

/**
 * Global keyboard shortcuts:
 *   F             — fit-to-screen
 *   + / =         — zoom in
 *   - / _         — zoom out
 *   0             — reset zoom to 100%
 *   Esc           — cancel pending delete or clear selection
 *   Del / Bksp    — request delete on selected note
 *   Enter         — confirm pending delete (respecting current popup focus)
 *   ← / →         — step prev / next note, OR switch popup focus while
 *                   the delete-confirm popup is open
 *   ↑ / ↓         — shift selected note's pitch up / down by one diatonic
 *                   step (disabled while delete-confirm popup is open)
 *   Ctrl/Cmd + S  — save edited MusicXML
 *   Ctrl/Cmd + O  — upload score (load fixture)
 *   Ctrl/Cmd + Z  — undo last edit
 *   Ctrl/Cmd + Y  — redo last undone edit
 *   Ctrl/Cmd + Shift + Z  — redo (alternate)
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
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd-modified actions handled separately so they don't collide
      // with the unmodified-letter cases below.
      if (mod) {
        if (e.key === 's' || e.key === 'S') {
          if (state.data.status === 'ready') void actions.saveEditedXml();
          e.preventDefault();
          return;
        }
        if (e.key === 'o' || e.key === 'O') {
          void actions.loadFixture();
          e.preventDefault();
          return;
        }
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) actions.redo();
          else actions.undo();
          e.preventDefault();
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          actions.redo();
          e.preventDefault();
          return;
        }
        return;
      }

      const pendingDelete = Boolean(interaction.pendingDeleteId);

      switch (e.key) {
        case 'v':
        case 'V':
          actions.setActiveTool('select');
          break;
        case 's':
        case 'S':
          actions.setActiveTool('staff');
          break;
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
          if (pendingDelete) {
            actions.cancelDelete();
          } else if (state.display.activeTool === 'staff' && !state.interaction.selectedStaffKey) {
            // Empty Staff mode → leave the tool.
            actions.setActiveTool('select');
          } else {
            actions.setSelected(null);
            actions.selectStaff(null);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (interaction.selectedId && !pendingDelete) {
            actions.requestDelete(interaction.selectedId);
          } else {
            return;
          }
          break;
        case 'Enter':
          if (pendingDelete) {
            if (interaction.deleteFocus === 'cancel') actions.cancelDelete();
            else actions.confirmDelete();
          }
          // Falls through to preventDefault below so that even when we
          // have nothing semantic to do with Enter, the browser cannot
          // activate a chrome button that still holds document focus.
          break;
        case 'ArrowRight':
          if (pendingDelete) {
            // Popup layout is [✓ confirm] [✗ cancel] left-to-right.
            // → moves focus rightward, to the cancel button.
            actions.setDeleteFocus('cancel');
          } else if (interaction.selectedId === null) {
            actions.selectFirstNote();
          } else {
            actions.stepNote(1);
          }
          break;
        case 'ArrowLeft':
          if (pendingDelete) {
            // ← moves focus leftward, back to the confirm button.
            actions.setDeleteFocus('confirm');
          } else if (interaction.selectedId === null) {
            actions.selectFirstNote();
          } else {
            actions.stepNote(-1);
          }
          break;
        case 'ArrowUp':
          if (pendingDelete) return;
          if (interaction.selectedId) {
            actions.shiftSelectedPitch(1);
          } else {
            return;
          }
          break;
        case 'ArrowDown':
          if (pendingDelete) return;
          if (interaction.selectedId) {
            actions.shiftSelectedPitch(-1);
          } else {
            return;
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
