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
    })),
  );

export const useUiScale = () => useHarmonyStore((s) => s.display.uiScale);

export const useDebugFlags = () => useHarmonyStore(useShallow((s) => s.display.debug));

export const useInteraction = () =>
  useHarmonyStore(useShallow((s) => s.interaction));

export const useDeletedIds = () =>
  useHarmonyStore((s) => s.edits.deletedNoteIds);

export const usePitchShifts = () =>
  useHarmonyStore((s) => s.edits.pitchShifts);

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
