'use client';

import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';

export function UploadButton() {
  const { loadFixture } = useHarmonyActions();
  const status = useHarmonyStore((s) => s.data.status);

  return (
    <div className="px-3 pb-2 pt-3">
      <button
        type="button"
        onClick={() => void loadFixture()}
        disabled={status === 'loading'}
        className="group relative flex w-full items-center justify-between rounded-lg border border-line bg-surface-elevated px-4 py-3 text-left shadow-inset-hairline transition-all hover:border-accent/40 hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:opacity-60"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2.5v8m0-8L5 5.5m3-3L11 5.5M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-medium text-text-primary">
              {status === 'loading' ? 'Loading…' : 'Upload score'}
            </span>
            <span className="block text-xs text-text-tertiary">
              {status === 'ready' ? 'Fixture loaded' : 'Sample fixture'}
            </span>
          </span>
        </span>
        <svg
          className="opacity-0 transition-opacity group-hover:opacity-100"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6 12l4-4-4-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
