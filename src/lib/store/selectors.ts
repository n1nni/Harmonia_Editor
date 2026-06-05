import { useHarmonyStore } from './useHarmonyStore';
import { useShallow } from 'zustand/react/shallow';

export const useRaw = () => useHarmonyStore((s) => s.data.raw);
export const useImageDims = () => useHarmonyStore((s) => s.data.imageDims);
export const useLoadStatus = () => useHarmonyStore((s) => s.data.status);

export const useViewport = () =>
  useHarmonyStore(
    useShallow((s) => ({
      zoom: s.viewport.zoom,
      pan: s.viewport.pan,
      fitScale: s.viewport.fitScale,
      containerSize: s.viewport.containerSize,
    })),
  );

export const useDisplay = () =>
  useHarmonyStore(
    useShallow((s) => ({
      overlayOpacity: s.display.overlayOpacity,
      reconstructionOn: s.display.reconstructionOn,
      debug: s.display.debug,
      uiScale: s.display.uiScale,
      staffInspectorVisible: s.display.staffInspectorVisible,
      dpi: s.display.dpi,
      snapToOtherStaves: s.display.snapToOtherStaves,
      activeTool: s.display.activeTool,
      addNoteDuration: s.display.addNoteDuration,
    })),
  );

export const useActiveTool = () => useHarmonyStore((s) => s.display.activeTool);
export const useAddNoteDuration = () =>
  useHarmonyStore((s) => s.display.addNoteDuration);

export const useDpi = () => useHarmonyStore((s) => s.display.dpi);
export const useSnapToOtherStaves = () =>
  useHarmonyStore((s) => s.display.snapToOtherStaves);

export const useUiScale = () => useHarmonyStore((s) => s.display.uiScale);

export const useSelectedStaffKey = () =>
  useHarmonyStore((s) => s.interaction.selectedStaffKey);

export const useStaffTransforms = () =>
  useHarmonyStore((s) => s.edits.staffTransforms);

export const useStaffInspectorVisible = () =>
  useHarmonyStore((s) => s.display.staffInspectorVisible);

export const useDebugFlags = () => useHarmonyStore(useShallow((s) => s.display.debug));

export const useInteraction = () =>
  useHarmonyStore(useShallow((s) => s.interaction));

export const useDeletedIds = () =>
  useHarmonyStore((s) => s.edits.deletedNoteIds);

export const usePitchShifts = () =>
  useHarmonyStore((s) => s.edits.pitchShifts);

export const useAddedNotes = () =>
  useHarmonyStore((s) => s.edits.addedNotes);

export const useAlignOffsets = () =>
  useHarmonyStore((s) => s.edits.alignOffsets);

export const usePendingAddedNote = () =>
  useHarmonyStore((s) => s.interaction.pendingAddedNote);

export const useSave = () =>
  useHarmonyStore(useShallow((s) => s.save));

export const useDeleteFocus = () =>
  useHarmonyStore((s) => s.interaction.deleteFocus);

export const useHistory = () =>
  useHarmonyStore(
    useShallow((s) => ({
      canUndo: s.history.past.length > 0,
      canRedo: s.history.future.length > 0,
      pastCount: s.history.past.length,
      futureCount: s.history.future.length,
    })),
  );
