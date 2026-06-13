'use client';

import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import {
  useActiveTool,
  useAddNoteDuration,
  useInteraction,
} from '@/lib/store/selectors';
import { ToolButton } from './primitives/ToolButton';
import { SCALED } from './scale';
import {
  AlignNoteIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CursorIcon,
  MagnifierIcon,
  NoteEighthIcon,
  NoteHalfIcon,
  NoteQuarterIcon,
  NoteWholeIcon,
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
  const addNoteDuration = useAddNoteDuration();
  const has = Boolean(selectedId);
  const showDurations = tool === 'add-note';

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
        <ToolButton
          label="Zoom tool"
          shortcut="Z"
          tooltipSide="right"
          onClick={() => a.setActiveTool('zoom')}
          active={tool === 'zoom'}
        >
          <MagnifierIcon />
        </ToolButton>

        {showDurations ? (
          <div className="mt-1 flex flex-col items-center gap-1 rounded-md border border-accent/20 bg-accent/5 p-1">
            <ToolButton
              label="Whole note"
              shortcut="1"
              tooltipSide="right"
              onClick={() => a.setAddNoteDuration('whole')}
              active={addNoteDuration === 'whole'}
            >
              <NoteWholeIcon />
            </ToolButton>
            <ToolButton
              label="Half note"
              shortcut="2"
              tooltipSide="right"
              onClick={() => a.setAddNoteDuration('half')}
              active={addNoteDuration === 'half'}
            >
              <NoteHalfIcon />
            </ToolButton>
            <ToolButton
              label="Quarter note"
              shortcut="4"
              tooltipSide="right"
              onClick={() => a.setAddNoteDuration('quarter')}
              active={addNoteDuration === 'quarter'}
            >
              <NoteQuarterIcon />
            </ToolButton>
            <ToolButton
              label="Eighth note"
              shortcut="8"
              tooltipSide="right"
              onClick={() => a.setAddNoteDuration('eighth')}
              active={addNoteDuration === 'eighth'}
            >
              <NoteEighthIcon />
            </ToolButton>
          </div>
        ) : null}
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

      <div className="flex flex-col items-center gap-1">
        <ToolButton
          label="Auto-align note"
          shortcut="A"
          tooltipSide="right"
          onClick={() => a.autoAlignSelected()}
          disabled={!has}
        >
          <AlignNoteIcon />
        </ToolButton>
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
      </div>
    </aside>
  );
}
