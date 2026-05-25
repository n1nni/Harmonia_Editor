import { create } from 'zustand';
import type { OmrResponse } from '@/types/omr';
import type { Vec2 } from '@/lib/geometry/bbox';
import { omrClient } from '@/lib/omr/client';
import { getOrderedNoteIds, neighborId } from '@/lib/music/noteSequence';

export interface ImageDims {
  w: number;
  h: number;
}

export interface DebugFlags {
  bboxes: boolean;
  centers: boolean;
  baselines: boolean;
  labels: boolean;
  grid: boolean;
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface HarmonyState {
  data: {
    raw: OmrResponse | null;
    imageDims: ImageDims | null;
    status: LoadStatus;
    error: string | null;
  };
  viewport: {
    zoom: number;
    pan: Vec2;
    fitScale: number;
    containerSize: { w: number; h: number } | null;
  };
  display: {
    overlayOpacity: number;
    reconstructionOn: boolean;
    debug: DebugFlags;
  };
  interaction: {
    hoveredId: string | null;
    selectedId: string | null;
    /** When non-null, a Delete confirmation popup is showing for this id. */
    pendingDeleteId: string | null;
  };
  /**
   * Detection ids the user has deleted. Lives in interaction-adjacent state
   * because deletions are an editing layer over the immutable OMR response.
   * Rendering and sequence navigation both filter these out.
   */
  edits: {
    deletedNoteIds: ReadonlySet<string>;
  };
  save: {
    status: SaveStatus;
    lastPath: string | null;
    error: string | null;
  };
  fonts: {
    bravuraLoaded: boolean;
  };
  actions: {
    loadFixture(): Promise<void>;
    setImageDims(dims: ImageDims): void;
    setContainerSize(size: { w: number; h: number }): void;
    setZoom(z: number): void;
    setPan(p: Vec2): void;
    fitToScreen(): void;
    setOverlayOpacity(o: number): void;
    setReconstructionOn(v: boolean): void;
    toggleDebug(k: keyof DebugFlags): void;
    setHovered(id: string | null): void;
    setSelected(id: string | null): void;
    selectFirstNote(): void;
    stepNote(direction: 1 | -1): void;
    requestDelete(id: string): void;
    cancelDelete(): void;
    confirmDelete(): void;
    setBravuraLoaded(v: boolean): void;
    saveEditedXml(): Promise<void>;
  };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function computeFitScale(
  container: { w: number; h: number } | null,
  image: ImageDims | null,
): number {
  if (!container || !image) return 1;
  const sx = container.w / image.w;
  const sy = container.h / image.h;
  // 0.94 leaves a small breathing margin around the score
  return Math.min(sx, sy) * 0.94;
}

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  data: { raw: null, imageDims: null, status: 'idle', error: null },
  viewport: { zoom: 1, pan: { x: 0, y: 0 }, fitScale: 1, containerSize: null },
  display: {
    overlayOpacity: 1,
    reconstructionOn: true,
    debug: { bboxes: false, centers: false, baselines: false, labels: false, grid: false },
  },
  interaction: { hoveredId: null, selectedId: null, pendingDeleteId: null },
  edits: { deletedNoteIds: new Set<string>() },
  save: { status: 'idle', lastPath: null, error: null },
  fonts: { bravuraLoaded: false },
  actions: {
    async loadFixture() {
      set((s) => ({ data: { ...s.data, status: 'loading', error: null } }));
      try {
        const raw = await omrClient.upload();
        set((s) => ({ data: { ...s.data, raw, status: 'ready' } }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        set((s) => ({ data: { ...s.data, status: 'error', error: msg } }));
      }
    },
    setImageDims(dims) {
      set((s) => {
        const fitScale = computeFitScale(s.viewport.containerSize, dims);
        return {
          data: { ...s.data, imageDims: dims },
          viewport: { ...s.viewport, fitScale, zoom: 1, pan: { x: 0, y: 0 } },
        };
      });
    },
    setContainerSize(size) {
      set((s) => {
        const fitScale = computeFitScale(size, s.data.imageDims);
        return { viewport: { ...s.viewport, containerSize: size, fitScale } };
      });
    },
    setZoom(z) {
      set((s) => ({ viewport: { ...s.viewport, zoom: clamp(z, MIN_ZOOM, MAX_ZOOM) } }));
    },
    setPan(p) {
      set((s) => ({ viewport: { ...s.viewport, pan: p } }));
    },
    fitToScreen() {
      set((s) => {
        const fitScale = computeFitScale(s.viewport.containerSize, s.data.imageDims);
        return { viewport: { ...s.viewport, fitScale, zoom: 1, pan: { x: 0, y: 0 } } };
      });
    },
    setOverlayOpacity(o) {
      set((s) => ({ display: { ...s.display, overlayOpacity: clamp(o, 0, 1) } }));
    },
    setReconstructionOn(v) {
      set((s) => ({ display: { ...s.display, reconstructionOn: v } }));
    },
    toggleDebug(k) {
      set((s) => ({
        display: { ...s.display, debug: { ...s.display.debug, [k]: !s.display.debug[k] } },
      }));
    },
    setHovered(id) {
      set((s) => ({ interaction: { ...s.interaction, hoveredId: id } }));
    },
    setSelected(id) {
      set((s) => ({
        interaction: { ...s.interaction, selectedId: id, pendingDeleteId: null },
      }));
    },
    selectFirstNote() {
      const { raw } = get().data;
      if (!raw) return;
      const ids = getOrderedNoteIds(raw, get().edits.deletedNoteIds);
      const first = ids[0] ?? null;
      set((s) => ({
        interaction: { ...s.interaction, selectedId: first, pendingDeleteId: null },
      }));
    },
    stepNote(direction) {
      const state = get();
      const raw = state.data.raw;
      if (!raw) return;
      const ids = getOrderedNoteIds(raw, state.edits.deletedNoteIds);
      const next = neighborId(ids, state.interaction.selectedId, direction);
      set((s) => ({
        interaction: { ...s.interaction, selectedId: next, pendingDeleteId: null },
      }));
    },
    requestDelete(id) {
      set((s) => ({ interaction: { ...s.interaction, pendingDeleteId: id } }));
    },
    cancelDelete() {
      set((s) => ({ interaction: { ...s.interaction, pendingDeleteId: null } }));
    },
    confirmDelete() {
      const state = get();
      const id = state.interaction.pendingDeleteId;
      if (!id || !state.data.raw) return;
      const nextDeleted = new Set(state.edits.deletedNoteIds);
      nextDeleted.add(id);
      // Move selection to the next surviving note in the sequence.
      const survivingIds = getOrderedNoteIds(state.data.raw, nextDeleted);
      const nextSelected = neighborId(survivingIds, id, 1) ?? survivingIds[0] ?? null;
      set((s) => ({
        edits: { deletedNoteIds: nextDeleted },
        interaction: { ...s.interaction, pendingDeleteId: null, selectedId: nextSelected },
      }));
    },
    setBravuraLoaded(v) {
      set((s) => ({ fonts: { ...s.fonts, bravuraLoaded: v } }));
    },
    async saveEditedXml() {
      const state = get();
      const raw = state.data.raw;
      if (!raw) return;
      set((s) => ({ save: { ...s.save, status: 'saving', error: null } }));
      try {
        // Lazy import to keep the serializer out of the initial bundle.
        const { serializeEditedMusicXml } = await import('@/lib/musicxml/serialize');
        const edited = serializeEditedMusicXml(raw.xml, state.edits.deletedNoteIds);
        const res = await fetch('/api/save-xml', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ xml: edited, jobId: raw.job_id }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Save failed (${res.status}): ${txt}`);
        }
        const data = (await res.json()) as { path?: string };
        set((s) => ({
          save: { status: 'saved', lastPath: data.path ?? null, error: null },
        }));
        // Auto-clear the "saved" banner after a moment so it doesn't linger.
        setTimeout(() => {
          if (get().save.status === 'saved') {
            set((s) => ({ save: { ...s.save, status: 'idle' } }));
          }
        }, 2400);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        set((s) => ({ save: { status: 'error', lastPath: s.save.lastPath, error: msg } }));
      }
    },
  },
}));

export const useHarmonyActions = () => useHarmonyStore((s) => s.actions);

export { MIN_ZOOM, MAX_ZOOM };

// Compatibility export — get() reference, in case future code needs imperative access
export const harmonyGet = () => useHarmonyStore.getState();
