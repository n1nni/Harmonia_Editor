'use client';

import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import {
  useDeletedIds,
  useDisplay,
  usePitchShifts,
  useSave,
  useViewport,
} from '@/lib/store/selectors';
import { ToolButton } from './primitives/ToolButton';
import { SCALED } from './scale';
import {
  BboxIcon,
  DotIcon,
  EyeIcon,
  EyeOffIcon,
  FitIcon,
  GridIcon,
  LabelIcon,
  RulerIcon,
  SaveIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons';

/**
 * Top horizontal toolbar (44px). Groups:
 *   - File: Upload, Save
 *   - Viewport: Fit, Zoom out, zoom %, Zoom in
 *   - Display: Source-image toggle, opacity slider, reconstruction toggle
 *   - Debug: bboxes, centers, baselines, labels, grid (icon toggles)
 *
 * Every control mirrors a top-menu item; this is the keyboard-free path.
 */
export function TopToolbar() {
  const a = useHarmonyActions();
  const { zoom } = useViewport();
  const display = useDisplay();
  const save = useSave();
  const deletedIds = useDeletedIds();
  const pitchShifts = usePitchShifts();
  const ready = useHarmonyStore((s) => s.data.status === 'ready');
  const edits = deletedIds.size + pitchShifts.size;

  return (
    <div
      className="flex items-center gap-1 border-b border-line-subtle bg-surface-panel px-3"
      style={{ height: SCALED.toolbarHeight }}
    >
      {/* File */}
      <Group>
        <ToolButton label="Upload score" shortcut="Ctrl+O" onClick={() => void a.loadFixture()}>
          <UploadIcon />
        </ToolButton>
        <SaveButton
          edits={edits}
          status={save.status}
          ready={ready}
          onSave={() => void a.saveEditedXml()}
        />
      </Group>

      <Sep />

      {/* Viewport */}
      <Group>
        <ToolButton label="Fit to screen" shortcut="F" onClick={a.fitToScreen}>
          <FitIcon />
        </ToolButton>
        <ToolButton label="Zoom out" shortcut="-" onClick={() => a.setZoom(zoom / 1.2)}>
          <ZoomOutIcon />
        </ToolButton>
        <span
          className="inline-flex items-center justify-center rounded-md border border-line bg-surface-elevated px-2 font-mono tabular-nums text-text-secondary"
          style={{
            height: SCALED.buttonSize,
            minWidth: SCALED.chipMinWidth,
            fontSize: SCALED.chipSize,
          }}
        >
          {(zoom * 100).toFixed(0)}%
        </span>
        <ToolButton label="Zoom in" shortcut="+" onClick={() => a.setZoom(zoom * 1.2)}>
          <ZoomInIcon />
        </ToolButton>
      </Group>

      <Sep />

      {/* Display */}
      <Group>
        <ToolButton
          label={display.reconstructionOn ? 'Hide source image' : 'Show source image'}
          onClick={() => a.setReconstructionOn(!display.reconstructionOn)}
          active={display.reconstructionOn}
        >
          {display.reconstructionOn ? <EyeIcon /> : <EyeOffIcon />}
        </ToolButton>
        <OpacitySlider
          value={display.overlayOpacity}
          onChange={(v) => a.setOverlayOpacity(v)}
        />
      </Group>

      <Sep />

      {/* Debug */}
      <Group>
        <ToolButton
          label="Bounding boxes"
          onClick={() => a.toggleDebug('bboxes')}
          active={display.debug.bboxes}
        >
          <BboxIcon />
        </ToolButton>
        <ToolButton
          label="Centers"
          onClick={() => a.toggleDebug('centers')}
          active={display.debug.centers}
        >
          <DotIcon />
        </ToolButton>
        <ToolButton
          label="Staff baselines"
          onClick={() => a.toggleDebug('baselines')}
          active={display.debug.baselines}
        >
          <RulerIcon />
        </ToolButton>
        <ToolButton
          label="Class labels"
          onClick={() => a.toggleDebug('labels')}
          active={display.debug.labels}
        >
          <LabelIcon />
        </ToolButton>
        <ToolButton
          label="Image grid"
          onClick={() => a.toggleDebug('grid')}
          active={display.debug.grid}
        >
          <GridIcon />
        </ToolButton>
      </Group>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function Sep() {
  return <div className="mx-1.5 h-5 w-px bg-line-subtle" aria-hidden />;
}

interface SaveButtonProps {
  edits: number;
  status: ReturnType<typeof useSave>['status'];
  ready: boolean;
  onSave: () => void;
}

function SaveButton({ edits, status, ready, onSave }: SaveButtonProps) {
  const tone =
    status === 'error'
      ? '#F75B5B'
      : status === 'saved'
        ? '#3FB778'
        : status === 'saving'
          ? '#D89E22'
          : edits > 0
            ? '#F08237'
            : '#A0A0A8';
  const label =
    status === 'error'
      ? 'Save failed'
      : status === 'saved'
        ? 'Saved'
        : edits > 0
          ? `Save (${edits} edit${edits === 1 ? '' : 's'})`
          : 'Save';
  return (
    <ToolButton label={label} shortcut="Ctrl+S" onClick={onSave} disabled={!ready}>
      <span className="relative">
        <SaveIcon />
        <span
          aria-hidden
          style={{ background: tone }}
          className="absolute -right-0.5 -top-0.5 inline-block h-1.5 w-1.5 rounded-full ring-2 ring-surface-panel"
        />
      </span>
    </ToolButton>
  );
}

interface OpacitySliderProps {
  value: number;
  onChange: (v: number) => void;
}

function OpacitySlider({ value, onChange }: OpacitySliderProps) {
  const pct = Math.round(value * 100);
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-line bg-surface-elevated px-2"
      style={{ height: SCALED.buttonSize }}
    >
      <span
        className="font-mono uppercase tracking-widest text-text-tertiary"
        style={{ fontSize: SCALED.statusTextSize }}
      >
        Opacity
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
        className="opacity-slider"
        aria-label="Overlay opacity"
        style={{ width: SCALED.sliderWidth }}
      />
      <span
        className="text-right font-mono tabular-nums text-text-secondary"
        style={{ width: SCALED.chipMinWidth, fontSize: SCALED.chipSize }}
      >
        {pct}%
      </span>
      <style jsx>{`
        .opacity-slider {
          height: 4px;
          appearance: none;
          background: linear-gradient(
            to right,
            #6442ff 0%,
            #6442ff ${pct}%,
            #d8d8de ${pct}%,
            #d8d8de 100%
          );
          border-radius: 999px;
          outline: none;
        }
        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid #6442ff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          margin-top: 0;
        }
        .opacity-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid #6442ff;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
