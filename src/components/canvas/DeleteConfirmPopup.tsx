'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  useImageDims,
  useInteraction,
  useRaw,
  useViewport,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import type { Detection } from '@/types/omr';

/**
 * Confirmation pill that appears next to a note when the user presses
 * Delete while the note is selected. Two buttons:
 *   - tick (✓) confirms the deletion (note is removed from the edited MXL)
 *   - cross (✗) cancels and dismisses the popup
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

  return (
    <AnimatePresence>
      <motion.div
        key={pendingDeleteId}
        initial={{ opacity: 0, x: -6, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -6, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute z-30 flex -translate-y-1/2 items-center gap-1 rounded-md border border-line bg-surface-elevated/95 px-1.5 py-1 shadow-panel backdrop-blur"
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
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[#5BF7AC]/30 bg-[#5BF7AC]/10 text-[#5BF7AC] transition-colors hover:bg-[#5BF7AC]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5BF7AC]/60"
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
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[#F75B5B]/30 bg-[#F75B5B]/10 text-[#F75B5B] transition-colors hover:bg-[#F75B5B]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F75B5B]/60"
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
