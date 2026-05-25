'use client';

import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useViewport } from '@/lib/store/selectors';
import { IconButton } from './primitives/IconButton';

export function ZoomControls() {
  const { zoom } = useViewport();
  const { setZoom, fitToScreen } = useHarmonyActions();

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <div className="flex items-center gap-1">
        <IconButton ariaLabel="Zoom out" onClick={() => setZoom(zoom / 1.2)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </IconButton>
        <IconButton ariaLabel="Zoom in" onClick={() => setZoom(zoom * 1.2)}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
        <IconButton ariaLabel="Fit to screen" onClick={fitToScreen}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      </div>
      <span className="font-mono text-xs tabular-nums text-text-secondary">
        {(zoom * 100).toFixed(0)}%
      </span>
    </div>
  );
}
