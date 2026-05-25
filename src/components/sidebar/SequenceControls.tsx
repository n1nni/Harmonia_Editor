'use client';

import { useMemo } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useDeletedIds, useInteraction, useRaw } from '@/lib/store/selectors';
import { getOrderedNoteIds, indexOfId } from '@/lib/music/noteSequence';
import { IconButton } from './primitives/IconButton';

/**
 * Sequence-navigation controls. Selects the first detected note and lets
 * the user walk forward / backward with arrow keys or the on-screen
 * Prev / Next buttons. Currently-selected note is rendered in orange by
 * <HoverHighlight/>.
 */
export function SequenceControls() {
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const { selectedId } = useInteraction();
  const ready = useHarmonyStore((s) => s.data.status === 'ready');
  const { selectFirstNote, stepNote } = useHarmonyActions();

  const orderedIds = useMemo(
    () => (raw ? getOrderedNoteIds(raw, deletedIds) : []),
    [raw, deletedIds],
  );
  const total = orderedIds.length;
  const index = selectedId ? indexOfId(orderedIds, selectedId) : -1;
  const atStart = index <= 0;
  const atEnd = index === -1 || index >= total - 1;

  const positionLabel =
    index >= 0 ? `${index + 1} / ${total}` : total > 0 ? `– / ${total}` : '—';

  return (
    <div className="space-y-2 px-2 py-1.5">
      <button
        type="button"
        onClick={selectFirstNote}
        disabled={!ready || total === 0}
        className="group flex w-full items-center justify-between rounded-md border border-line bg-surface-elevated px-3 py-2 text-left text-sm text-text-primary transition-colors hover:border-accent/40 hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[#FF8A3D]/15 text-[#FF8A3D]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1 L9 5 L2 9 Z" />
            </svg>
          </span>
          <span>Start from first note</span>
        </span>
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconButton
            ariaLabel="Previous note"
            onClick={() => stepNote(-1)}
            disabled={!ready || total === 0 || atStart}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
          <IconButton
            ariaLabel="Next note"
            onClick={() => stepNote(1)}
            disabled={!ready || total === 0 || atEnd}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        </div>
        <span className="font-mono text-xs tabular-nums text-text-secondary">
          {positionLabel}
        </span>
      </div>

      <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
        ← / → to step
      </p>
    </div>
  );
}
