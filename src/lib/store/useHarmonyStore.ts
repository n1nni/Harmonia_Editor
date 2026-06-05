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
export type DeleteFocus = 'confirm' | 'cancel';

/**
 * Editing operations that can be undone / redone. Every operation carries
 * enough state to reverse itself without consulting the surrounding context.
 *   - `delete`: the id that was added to deletedNoteIds
 *   - `pitch-shift`: the id and its before/after cumulative shift values
 */
export type EditAction =
  | { kind: 'delete'; id: string }
  | { kind: 'pitch-shift'; id: string; from: number; to: number };

interface EditsState {
  deletedNoteIds: ReadonlySet<string>;
  pitchShifts: ReadonlyMap<string, number>;
}

function applyForward(a: EditAction, edits: EditsState): EditsState {
  if (a.kind === 'delete') {
    const next = new Set(edits.deletedNoteIds);
    next.add(a.id);
    return { ...edits, deletedNoteIds: next };
  }
  const next = new Map(edits.pitchShifts);
  if (a.to === 0) next.delete(a.id);
  else next.set(a.id, a.to);
  return { ...edits, pitchShifts: next };
}

function applyInverse(a: EditAction, edits: EditsState): EditsState {
  if (a.kind === 'delete') {
    const next = new Set(edits.deletedNoteIds);
    next.delete(a.id);
    return { ...edits, deletedNoteIds: next };
  }
  const next = new Map(edits.pitchShifts);
  if (a.from === 0) next.delete(a.id);
  else next.set(a.id, a.from);
  return { ...edits, pitchShifts: next };
}

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
    /** Multiplier applied to chrome dimensions (menu bar, toolbar, palette,
     *  status bar). 1.0 = the new default; clamped to [0.7, 2.0]. */
    uiScale: number;
  };
  interaction: {
    hoveredId: string | null;
    selectedId: string | null;
    /** When non-null, a Delete confirmation popup is showing for this id. */
    pendingDeleteId: string | null;
    /** Which button inside the pending-delete popup is keyboard-focused. */
    deleteFocus: DeleteFocus;
  };
  /**
   * Editing layer over the immutable OMR response. Two delta maps; nothing
   * in the response itself is mutated.
   */
  edits: EditsState;
  /**
   * Linear undo/redo history. New edits append to `past` and clear `future`.
   * `undo()` pops from `past` and pushes onto `future`; `redo()` is the
   * mirror. Resetting `loadFixture` empties both stacks.
   */
  history: {
    past: EditAction[];
    future: EditAction[];
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
    setUiScale(scale: number): void;
    toggleDebug(k: keyof DebugFlags): void;
    setHovered(id: string | null): void;
    setSelected(id: string | null): void;
    selectFirstNote(): void;
    stepNote(direction: 1 | -1): void;
    requestDelete(id: string): void;
    cancelDelete(): void;
    confirmDelete(): void;
    setDeleteFocus(focus: DeleteFocus): void;
    shiftSelectedPitch(delta: 1 | -1): void;
    undo(): void;
    redo(): void;
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
  return Math.min(sx, sy) * 0.94;
}

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  data: { raw: null, imageDims: null, status: 'idle', error: null },
  viewport: { zoom: 1, pan: { x: 0, y: 0 }, fitScale: 1, containerSize: null },
  display: {
    overlayOpacity: 1,
    reconstructionOn: true,
    debug: { bboxes: false, centers: false, baselines: false, labels: false, grid: false },
    // Default to a compact-ish scale so the bigger base sizes don't
    // dominate the screen on first load. User can step up in View > UI scale.
    uiScale: 0.85,
  },
  interaction: {
    hoveredId: null,
    selectedId: null,
    pendingDeleteId: null,
    deleteFocus: 'confirm',
  },
  edits: {
    deletedNoteIds: new Set<string>(),
    pitchShifts: new Map<string, number>(),
  },
  history: { past: [], future: [] },
  save: { status: 'idle', lastPath: null, error: null },
  fonts: { bravuraLoaded: false },
  actions: {
    async loadFixture() {
      set((s) => ({ data: { ...s.data, status: 'loading', error: null } }));
      try {
        const raw = await omrClient.upload();
        set(() => ({
          data: { raw, imageDims: null, status: 'ready', error: null },
          edits: {
            deletedNoteIds: new Set<string>(),
            pitchShifts: new Map<string, number>(),
          },
          history: { past: [], future: [] },
          interaction: {
            hoveredId: null,
            selectedId: null,
            pendingDeleteId: null,
            deleteFocus: 'confirm',
          },
        }));
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
    setUiScale(scale) {
      const clamped = clamp(scale, 0.7, 2.0);
      set((s) => ({ display: { ...s.display, uiScale: clamped } }));
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
        interaction: { ...s.interaction, selectedId: id, pendingDeleteId: null, deleteFocus: 'confirm' },
      }));
    },
    selectFirstNote() {
      const { raw } = get().data;
      if (!raw) return;
      const ids = getOrderedNoteIds(raw, get().edits.deletedNoteIds);
      const first = ids[0] ?? null;
      set((s) => ({
        interaction: { ...s.interaction, selectedId: first, pendingDeleteId: null, deleteFocus: 'confirm' },
      }));
    },
    stepNote(direction) {
      const state = get();
      const raw = state.data.raw;
      if (!raw) return;
      const ids = getOrderedNoteIds(raw, state.edits.deletedNoteIds);
      const next = neighborId(ids, state.interaction.selectedId, direction);
      set((s) => ({
        interaction: { ...s.interaction, selectedId: next, pendingDeleteId: null, deleteFocus: 'confirm' },
      }));
    },
    requestDelete(id) {
      set((s) => ({
        interaction: { ...s.interaction, pendingDeleteId: id, deleteFocus: 'confirm' },
      }));
    },
    cancelDelete() {
      set((s) => ({
        interaction: { ...s.interaction, pendingDeleteId: null, deleteFocus: 'confirm' },
      }));
    },
    confirmDelete() {
      const state = get();
      const id = state.interaction.pendingDeleteId;
      if (!id || !state.data.raw) return;

      const action: EditAction = { kind: 'delete', id };
      const nextEdits = applyForward(action, state.edits);
      const survivingIds = getOrderedNoteIds(
        state.data.raw,
        nextEdits.deletedNoteIds,
      );
      const nextSelected = neighborId(survivingIds, id, 1) ?? survivingIds[0] ?? null;

      set((s) => ({
        edits: nextEdits,
        history: { past: [...s.history.past, action], future: [] },
        interaction: {
          ...s.interaction,
          pendingDeleteId: null,
          selectedId: nextSelected,
          deleteFocus: 'confirm',
        },
      }));
    },
    setDeleteFocus(focus) {
      set((s) => ({ interaction: { ...s.interaction, deleteFocus: focus } }));
    },
    shiftSelectedPitch(delta) {
      const state = get();
      const id = state.interaction.selectedId;
      if (!id || !state.data.raw) return;

      // Only noteheads are pitch-shiftable. Look up the detection.
      let isNote = false;
      for (const staff of state.data.raw.detections) {
        for (const d of staff.detections) {
          if (d.id === id) {
            isNote = d.class === 'noteheadBlack' || d.class === 'noteheadHalf';
            break;
          }
        }
        if (isNote) break;
      }
      if (!isNote) return;

      const from = state.edits.pitchShifts.get(id) ?? 0;
      const to = from + delta;
      const action: EditAction = { kind: 'pitch-shift', id, from, to };
      const nextEdits = applyForward(action, state.edits);

      set((s) => ({
        edits: nextEdits,
        history: { past: [...s.history.past, action], future: [] },
      }));
    },
    undo() {
      const state = get();
      const last = state.history.past[state.history.past.length - 1];
      if (!last) return;
      const nextEdits = applyInverse(last, state.edits);
      set((s) => ({
        edits: nextEdits,
        history: {
          past: s.history.past.slice(0, -1),
          future: [...s.history.future, last],
        },
        interaction: {
          ...s.interaction,
          selectedId: last.id,
          pendingDeleteId: null,
          deleteFocus: 'confirm',
        },
      }));
    },
    redo() {
      const state = get();
      const next = state.history.future[state.history.future.length - 1];
      if (!next) return;
      const nextEdits = applyForward(next, state.edits);
      set((s) => ({
        edits: nextEdits,
        history: {
          past: [...s.history.past, next],
          future: s.history.future.slice(0, -1),
        },
        interaction: {
          ...s.interaction,
          selectedId: next.id,
          pendingDeleteId: null,
          deleteFocus: 'confirm',
        },
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
        const { serializeEditedMusicXml } = await import('@/lib/musicxml/serialize');
        const edited = serializeEditedMusicXml(
          raw.xml,
          state.edits.deletedNoteIds,
          state.edits.pitchShifts,
        );
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
        set(() => ({
          save: { status: 'saved', lastPath: data.path ?? null, error: null },
        }));
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

export const harmonyGet = () => useHarmonyStore.getState();
