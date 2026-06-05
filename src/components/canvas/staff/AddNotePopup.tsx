'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  useImageDims,
  usePendingAddedNote,
  useViewport,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { cn } from '@/lib/utils/cn';

/**
 * Octave-picker popup that appears next to a newly-placed note before it
 * is committed. The step letter (B, C, D…) and alter are auto-inferred
 * from clef + snapped y position; this popup lets the user choose the
 * octave (the most ambiguous half of pitch inference).
 *
 *   • Click an octave button → commit at that pitch
 *   • Arrow Up / Down       → bump highlighted octave by ±1
 *   • Enter                 → commit at current highlighted octave
 *   • Esc                   → cancel without adding
 *
 * Positioned to the RIGHT of the pending note in screen space, like the
 * delete confirm popup. Renders nothing when `pendingAddedNote == null`.
 */
const GAP = 12;
const OCTAVES = [2, 3, 4, 5, 6] as const;

export function AddNotePopup() {
  const pending = usePendingAddedNote();
  const dims = useImageDims();
  const { zoom, pan, fitScale, containerSize } = useViewport();
  const { confirmAddNote, cancelAddNote } = useHarmonyActions();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Local octave state — initialised from the inferred pitch's octave each
  // time the popup opens. Stored locally so arrow-key bumping doesn't
  // thrash the store on every keystroke.
  const [chosenOctave, setChosenOctave] = useState<number>(
    pending?.pitch.octave ?? 4,
  );
  // Re-sync when a new pending note arrives.
  useEffect(() => {
    if (pending) setChosenOctave(pending.pitch.octave);
  }, [pending]);

  // Capture keyboard while the popup is open.
  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt &&
        (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)
      ) {
        return;
      }
      // Use stopImmediatePropagation so the global shortcuts handler in
      // useKeyboardShortcuts (also a window-level listener) doesn't also
      // act on the same keystroke.
      if (e.key === 'Escape') {
        cancelAddNote();
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.key === 'Enter') {
        confirmAddNote(chosenOctave);
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.key === 'ArrowUp') {
        setChosenOctave((o) => Math.min(8, o + 1));
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (e.key === 'ArrowDown') {
        setChosenOctave((o) => Math.max(0, o - 1));
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pending, chosenOctave, cancelAddNote, confirmAddNote]);

  if (!pending || !dims || !containerSize) return null;

  const scale = fitScale * zoom;
  const centerX = (containerSize.w - dims.w * scale) / 2 + pan.x;
  const centerY = (containerSize.h - dims.h * scale) / 2 + pan.y;
  // Anchor to the right of the proposed notehead. cx/cy are already in the
  // staff's local image space (pre staff-transform). For Phase 9 the staff
  // transform applied to added notes is identity, so this is correct.
  const screenX = centerX + pending.cx * scale + GAP;
  const screenY = centerY + pending.cy * scale;

  const stepText = pending.pitch.step;
  const alter = pending.pitch.alter ?? 0;
  const alterSign = alter > 0 ? '♯' : alter < 0 ? '♭' : '';
  const pitchText = `${stepText}${alterSign}${chosenOctave}`;

  return (
    <AnimatePresence>
      <motion.div
        ref={wrapRef}
        key="add-note-popup"
        initial={{ opacity: 0, x: -6, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -6, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute z-30 flex -translate-y-1/2 flex-col gap-1 rounded-md border border-line bg-surface-panel px-2 py-1.5 shadow-float"
        style={{ left: screenX, top: screenY }}
        role="dialog"
        aria-label="Pick octave for new note"
        // Tell usePanZoom not to take pan-capture on gestures starting
        // inside the popup. Without this, the canvas container's native
        // pointerdown listener fires before React's click synthesis, takes
        // pointer capture, and the resulting pointerup goes to the
        // container — so the button's onClick never fires.
        data-no-pan="1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            Add note
          </span>
          <button
            type="button"
            onClick={cancelAddNote}
            aria-label="Cancel"
            className="inline-flex h-4 w-4 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center text-accent">
          <span className="text-base font-semibold tabular-nums">{pitchText}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {OCTAVES.map((o) => {
            const active = o === chosenOctave;
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  setChosenOctave(o);
                  confirmAddNote(o);
                }}
                aria-label={`Octave ${o}`}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-sm border font-mono text-[11px] tabular-nums transition-all focus:outline-none',
                  active
                    ? 'border-accent/60 bg-accent/25 text-accent ring-2 ring-accent/40'
                    : 'border-line text-text-secondary hover:bg-surface-hover',
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
