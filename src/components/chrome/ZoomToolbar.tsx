'use client';

import { useViewport, useViewportHistory, useInteraction } from '@/lib/store/selectors';
import { useZoomNavigation } from '@/hooks/canvas/useZoomNavigation';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { ToolButton } from './primitives/ToolButton';
import { SCALED } from './scale';
import {
  FitDrawingIcon,
  FitPageIcon,
  FitSelectionIcon,
  FitWidthIcon,
  HistoryBackIcon,
  HistoryForwardIcon,
  MagnifierMinusIcon,
  MagnifierPlusIcon,
} from './icons';

/**
 * Context-specific top-toolbar contents, rendered by `TopToolbar` when
 * `activeTool === 'zoom'`. Mirrors the layout convention used by
 * professional graphics editors:
 *
 *   [Zoom In] [Zoom Out] [zoom%]  |  [100] [50] [200]
 *      |
 *      [Fit Selection] [Fit Drawing] [Fit Page] [Fit Width]
 *      |
 *      [Prev] [Next]
 *
 * Each button is wired through `useZoomNavigation`, which centralises
 * the math and the history-push semantics. Disabled states are derived
 * from selectors so the buttons reflect live state without a parent
 * component having to inject props.
 */
export function ZoomToolbar() {
  const nav = useZoomNavigation();
  const { zoom } = useViewport();
  const { canPrev, canNext } = useViewportHistory();
  const { selectedId } = useInteraction();
  const ready = useHarmonyStore((s) => s.data.status === 'ready');
  const hasSelection = Boolean(selectedId);

  return (
    <>
      <Group>
        <ToolButton label="Zoom in" shortcut="Click" onClick={() => nav.zoomIn()} disabled={!ready}>
          <MagnifierPlusIcon />
        </ToolButton>
        <ToolButton label="Zoom out" shortcut="Shift+Click" onClick={() => nav.zoomOut()} disabled={!ready}>
          <MagnifierMinusIcon />
        </ToolButton>
        <ZoomChip zoom={zoom} />
      </Group>

      <Sep />

      <Group>
        <PresetButton label="100%" value={1.0} disabled={!ready} onSelect={() => nav.zoomTo(1.0)} />
        <PresetButton label="50%"  value={0.5} disabled={!ready} onSelect={() => nav.zoomTo(0.5)} />
        <PresetButton label="200%" value={2.0} disabled={!ready} onSelect={() => nav.zoomTo(2.0)} />
      </Group>

      <Sep />

      <Group>
        <ToolButton
          label="Fit selection"
          disabledHint="Fit selection — select a note first (press V then click)"
          onClick={nav.fitSelection}
          disabled={!ready || !hasSelection}
        >
          <FitSelectionIcon />
        </ToolButton>
        <ToolButton label="Fit drawing" onClick={nav.fitDrawing} disabled={!ready}>
          <FitDrawingIcon />
        </ToolButton>
        <ToolButton label="Fit page" onClick={nav.fitPage} disabled={!ready}>
          <FitPageIcon />
        </ToolButton>
        <ToolButton label="Fit width" onClick={nav.fitWidth} disabled={!ready}>
          <FitWidthIcon />
        </ToolButton>
      </Group>

      <Sep />

      <Group>
        <ToolButton
          label="Previous zoom"
          disabledHint="Previous zoom — no history yet; zoom or pan to record"
          onClick={nav.prev}
          disabled={!canPrev}
        >
          <HistoryBackIcon />
        </ToolButton>
        <ToolButton
          label="Next zoom"
          disabledHint="Next zoom — go back first (Previous zoom)"
          onClick={nav.next}
          disabled={!canNext}
        >
          <HistoryForwardIcon />
        </ToolButton>
      </Group>
    </>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function Sep() {
  return <div className="mx-1.5 h-5 w-px bg-line-subtle" aria-hidden />;
}

function ZoomChip({ zoom }: { zoom: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md border border-line bg-surface-elevated px-2 font-mono tabular-nums text-text-secondary"
      style={{
        height: SCALED.buttonSize,
        minWidth: SCALED.chipMinWidth,
        fontSize: SCALED.chipSize,
      }}
      aria-label={`Current zoom ${(zoom * 100).toFixed(0)} percent`}
    >
      {(zoom * 100).toFixed(0)}%
    </span>
  );
}

interface PresetButtonProps {
  label: string;
  value: number;
  disabled?: boolean;
  onSelect: () => void;
}

function PresetButton({ label, value, disabled, onSelect }: PresetButtonProps) {
  const currentZoom = useViewport().zoom;
  const active = Math.abs(currentZoom - value) < 0.005;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className="inline-flex items-center justify-center rounded-md border border-line bg-surface-elevated px-2 font-mono tabular-nums transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-text-tertiary disabled:hover:bg-surface-elevated"
      style={{
        height: SCALED.buttonSize,
        minWidth: SCALED.chipMinWidth,
        fontSize: SCALED.chipSize,
        color: active ? 'var(--color-accent)' : undefined,
        borderColor: active ? 'rgb(240 130 55 / 0.6)' : undefined,
      }}
    >
      {label}
    </button>
  );
}
