'use client';

import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useActiveTool, useInteraction } from '@/lib/store/selectors';
import { ToolButton } from './primitives/ToolButton';
import { SCALED } from './scale';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CursorIcon,
  PlayIcon,
  PlusNoteIcon,
  StaffIcon,
  TrashIcon,
} from './icons';

/**
 * Vertical action column on the left edge. Two layers:
 *
 *  1. **Tools** (top) — radio-style mode buttons that switch between
 *     "Select" (notes / detections) and "Staff" (staff systems). Only one
 *     can be active at a time.
 *
 *  2. **Actions** (below) — buttons that fire single actions on the
 *     current selection (sequence step, pitch shift, delete).
 */
export function LeftToolPalette() {
  const a = useHarmonyActions();
  const { selectedId } = useInteraction();
  const tool = useActiveTool();
  const has = Boolean(selectedId);

  return (
    <aside
      className="flex h-full flex-col items-center border-r border-line-subtle bg-surface-panel py-2"
      style={{ width: SCALED.paletteWidth }}
      aria-label="Tool palette"
    >
      {/* Tools (mode toggles) */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          label="Select tool"
          shortcut="V"
          tooltipSide="right"
          onClick={() => a.setActiveTool('select')}
          active={tool === 'select'}
        >
          <CursorIcon />
        </ToolButton>
        <ToolButton
          label="Staff tool"
          shortcut="S"
          tooltipSide="right"
          onClick={() => a.setActiveTool('staff')}
          active={tool === 'staff'}
        >
          <StaffIcon />
        </ToolButton>
        <ToolButton
          label="Add note"
          shortcut="N"
          tooltipSide="right"
          onClick={() => a.setActiveTool('add-note')}
          active={tool === 'add-note'}
        >
          <PlusNoteIcon />
        </ToolButton>
      </div>

      <div className="my-2 h-px w-5 bg-line-subtle" />

      <div className="flex flex-col items-center gap-1">
        <ToolButton
          label="Start from first note"
          tooltipSide="right"
          onClick={a.selectFirstNote}
        >
          <PlayIcon />
        </ToolButton>
        <ToolButton
          label="Previous note"
          shortcut="←"
          tooltipSide="right"
          onClick={() => a.stepNote(-1)}
          disabled={!has}
        >
          <ArrowLeftIcon />
        </ToolButton>
        <ToolButton
          label="Next note"
          shortcut="→"
          tooltipSide="right"
          onClick={() => a.stepNote(1)}
          disabled={!has}
        >
          <ArrowRightIcon />
        </ToolButton>
      </div>

      <div className="my-2 h-px w-5 bg-line-subtle" />

      <div className="flex flex-col items-center gap-1">
        <ToolButton
          label="Pitch up"
          shortcut="↑"
          tooltipSide="right"
          onClick={() => a.shiftSelectedPitch(1)}
          disabled={!has}
        >
          <ArrowUpIcon />
        </ToolButton>
        <ToolButton
          label="Pitch down"
          shortcut="↓"
          tooltipSide="right"
          onClick={() => a.shiftSelectedPitch(-1)}
          disabled={!has}
        >
          <ArrowDownIcon />
        </ToolButton>
      </div>

      <div className="my-2 h-px w-5 bg-line-subtle" />

      <ToolButton
        label="Delete note"
        shortcut="Del"
        tooltipSide="right"
        onClick={() => {
          if (selectedId) a.requestDelete(selectedId);
        }}
        disabled={!has}
      >
        <TrashIcon />
      </ToolButton>
    </aside>
  );
}
