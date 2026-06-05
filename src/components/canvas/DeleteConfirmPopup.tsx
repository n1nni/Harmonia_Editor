'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  useDeleteFocus,
  useImageDims,
  useInteraction,
  useRaw,
  useViewport,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { cn } from '@/lib/utils/cn';
import type { Detection } from '@/types/omr';

/**
 * Confirmation pill that appears next to a note when the user presses
 * Delete while the note is selected. Two buttons:
 *   - tick (✓) confirms the deletion
 *   - cross (✗) cancels and dismisses the popup
 *
 * Keyboard focus inside the popup is tracked in the store
 * (`interaction.deleteFocus`). ← / → move focus, Enter acts on whichever
 * button is focused. Mouse clicks act directly on either button regardless
 * of focus.
 *
 * Positioned to the RIGHT of the detection bbox so it doesn't collide with
 * the HoverTooltip (which sits above). Lives outside the SVG so its size
 * is constant on screen.
 */
const GAP = 10;

export function DeleteConfirmPopup() {
  const raw = useRaw();
  const dims = useImageDims();
  const { pendingDeleteId } = useInteraction();
  const deleteFocus = useDeleteFocus();
  const { zoom, pan, fitScale, containerSize } = useViewport();
  const { confirmDelete, cancelDelete } = useHarmonyActions();

  const target = useMemo<Detection | null>(() => {
    if (!raw || !pendingDeleteId) return null;
    for (const s of raw.detections) {
      for (const d of s.detections) if (d.id === pendingDeleteId) return d;
    }
    return null;
  }, [raw, pendingDeleteId]);

  if (!target || !dims || !containerSize) return null;

  const scale = fitScale * zoom;
  const centerX = (containerSize.w - dims.w * scale) / 2 + pan.x;
  const centerY = (containerSize.h - dims.h * scale) / 2 + pan.y;
  const screenX = centerX + target.x2 * scale + GAP;
  const screenY = centerY + (target.y1 + target.y2) / 2 * scale;

  const confirmFocused = deleteFocus === 'confirm';
  const cancelFocused = deleteFocus === 'cancel';

  return (
    <AnimatePresence>
      <motion.div
        key={pendingDeleteId}
        initial={{ opacity: 0, x: -6, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -6, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute z-30 flex -translate-y-1/2 items-center gap-1 rounded-md border border-line bg-surface-panel px-1.5 py-1 shadow-float"
        style={{ left: screenX, top: screenY }}
        role="dialog"
        aria-label="Confirm delete note"
      >
        <span className="ml-1 mr-1 font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
          Delete?
        </span>
        <button
          type="button"
          onClick={confirmDelete}
          aria-label="Confirm delete"
          aria-pressed={confirmFocused}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-sm border text-[#3FB778] transition-all focus:outline-none',
            confirmFocused
              ? 'border-[#3FB778]/60 bg-[#3FB778]/25 ring-2 ring-[#3FB778]/50'
              : 'border-[#3FB778]/30 bg-[#3FB778]/10 hover:bg-[#3FB778]/20',
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.5L4.8 9.2L10 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={cancelDelete}
          aria-label="Cancel delete"
          aria-pressed={cancelFocused}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-sm border text-[#E04646] transition-all focus:outline-none',
            cancelFocused
              ? 'border-[#E04646]/60 bg-[#E04646]/25 ring-2 ring-[#E04646]/50'
              : 'border-[#E04646]/30 bg-[#E04646]/10 hover:bg-[#E04646]/20',
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
