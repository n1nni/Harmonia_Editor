'use client';

import { useMemo } from 'react';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';
import {
  useDeletedIds,
  useInteraction,
  usePitchShifts,
  useRaw,
  useViewport,
} from '@/lib/store/selectors';
import { getOrderedNoteIds, indexOfId } from '@/lib/music/noteSequence';
import { SCALED } from './scale';

/**
 * Bottom-of-shell status strip (24px). Live read of viewport zoom, current
 * note position in the sequence, edit counters, and overall load status.
 */
export function StatusBar() {
  const status = useHarmonyStore((s) => s.data.status);
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const pitchShifts = usePitchShifts();
  const { zoom } = useViewport();
  const { selectedId } = useInteraction();

  const orderedIds = useMemo(
    () => (raw ? getOrderedNoteIds(raw, deletedIds) : []),
    [raw, deletedIds],
  );
  const idx = indexOfId(orderedIds, selectedId);
  const total = orderedIds.length;
  const position =
    idx >= 0
      ? `note ${idx + 1} / ${total}`
      : total > 0
        ? `${total} notes`
        : '—';

  const tone =
    status === 'ready'
      ? '#3FB778'
      : status === 'loading'
        ? '#D89E22'
        : status === 'error'
          ? '#F75B5B'
          : '#A0A0A8';

  return (
    <footer
      className="flex items-center justify-between border-t border-line-subtle bg-surface-panel px-3 font-mono uppercase tracking-widest text-text-tertiary"
      style={{ height: SCALED.statusHeight, fontSize: SCALED.statusTextSize }}
      aria-label="Status"
    >
      <div className="flex items-center gap-3">
        <span className="tabular-nums">{(zoom * 100).toFixed(0)}%</span>
        <Dot />
        <span>{position}</span>
        {pitchShifts.size > 0 ? (
          <>
            <Dot />
            <span className="text-text-secondary">
              {pitchShifts.size} pitch shift{pitchShifts.size === 1 ? '' : 's'}
            </span>
          </>
        ) : null}
        {deletedIds.size > 0 ? (
          <>
            <Dot />
            <span className="text-text-secondary">
              {deletedIds.size} deletion{deletedIds.size === 1 ? '' : 's'}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          style={{ background: tone }}
          className="inline-block h-1.5 w-1.5 rounded-full"
        />
        <span>{status}</span>
      </div>
    </footer>
  );
}

function Dot() {
  return <span aria-hidden className="text-text-tertiary/50">·</span>;
}
