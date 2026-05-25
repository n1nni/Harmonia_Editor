'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useDeletedIds, useSave } from '@/lib/store/selectors';

/**
 * Compact icon-button in the sidebar header that writes the edited
 * MusicXML to `edited_score/` via /api/save-xml. Shows a small badge
 * indicating "saving", "saved", or "error" via tooltip-style label.
 */
export function SaveButton() {
  const { saveEditedXml } = useHarmonyActions();
  const save = useSave();
  const deletedIds = useDeletedIds();
  const edits = deletedIds.size;

  const tone =
    save.status === 'error'
      ? '#F75B5B'
      : save.status === 'saved'
        ? '#5BF7AC'
        : save.status === 'saving'
          ? '#F7C75B'
          : edits > 0
            ? '#FF8A3D'
            : '#5F5F6B';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void saveEditedXml()}
        disabled={save.status === 'saving'}
        title={
          save.status === 'error'
            ? (save.error ?? 'Save failed')
            : save.status === 'saved'
              ? `Saved · ${save.lastPath ?? ''}`
              : edits > 0
                ? `Save edited MusicXML (${edits} deletion${edits === 1 ? '' : 's'})`
                : 'Save current MusicXML'
        }
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface-elevated px-2 text-text-secondary transition-colors hover:border-line-strong hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-60"
      >
        <span
          aria-hidden
          style={{ background: tone }}
          className="inline-block h-1.5 w-1.5 rounded-full"
        />
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 3v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-2-2H4a1 1 0 0 0-1 1z M5 3v3h6V3 M6 10h4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-medium">Save</span>
      </button>

      <AnimatePresence>
        {save.status === 'saved' || save.status === 'error' ? (
          <motion.div
            key={save.status}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-surface-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-widest shadow-panel"
            style={{ color: tone }}
          >
            {save.status === 'saved' ? 'Saved' : 'Failed'}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
