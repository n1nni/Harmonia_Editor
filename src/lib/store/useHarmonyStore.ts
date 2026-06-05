import { create } from 'zustand';
import type { OmrResponse } from '@/types/omr';
import type { Vec2 } from '@/lib/geometry/bbox';
import { omrClient } from '@/lib/omr/client';
import { getOrderedNoteIds, neighborId } from '@/lib/music/noteSequence';
import { IDENTITY_TRANSFORM, type StaffKey, type StaffTransform } from '@/lib/staff/types';
import type { AddedNote } from '@/lib/staff/addedNotes';

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
export type ActiveTool = 'select' | 'staff' | 'add-note';

/**
 * Editing operations that can be undone / redone. Every operation carries
 * enough state to reverse itself without consulting the surrounding context.
 *   - `delete`: the id that was added to deletedNoteIds
 *   - `pitch-shift`: the id and its before/after cumulative shift values
 */
export type EditAction =
  | { kind: 'delete'; id: string }
  | { kind: 'pitch-shift'; id: string; from: number; to: number }
  | { kind: 'staff-transform'; key: StaffKey; from: StaffTransform; to: StaffTransform }
  | { kind: 'add-note'; note: AddedNote };

interface EditsState {
  deletedNoteIds: ReadonlySet<string>;
  pitchShifts: ReadonlyMap<string, number>;
  staffTransforms: ReadonlyMap<StaffKey, StaffTransform>;
  addedNotes: ReadonlyMap<string, AddedNote>;
}

function isIdentityTransform(t: StaffTransform): boolean {
  return t.tx === 0 && t.ty === 0 && t.sx === 1 && t.sy === 1 && t.theta === 0;
}

/** The note id (if any) an EditAction concerns; null for staff-transform. */
function focusNoteIdOf(a: EditAction): string | null {
  if (a.kind === 'delete') return a.id;
  if (a.kind === 'pitch-shift') return a.id;
  if (a.kind === 'add-note') return a.note.id;
  return null;
}

function applyForward(a: EditAction, edits: EditsState): EditsState {
  if (a.kind === 'delete') {
    const next = new Set(edits.deletedNoteIds);
    next.add(a.id);
    return { ...edits, deletedNoteIds: next };
  }
  if (a.kind === 'pitch-shift') {
    const next = new Map(edits.pitchShifts);
    if (a.to === 0) next.delete(a.id);
    else next.set(a.id, a.to);
    return { ...edits, pitchShifts: next };
  }
  if (a.kind === 'staff-transform') {
    const next = new Map(edits.staffTransforms);
    if (isIdentityTransform(a.to)) next.delete(a.key);
    else next.set(a.key, a.to);
    return { ...edits, staffTransforms: next };
  }
  // add-note
  const next = new Map(edits.addedNotes);
  next.set(a.note.id, a.note);
  return { ...edits, addedNotes: next };
}

function applyInverse(a: EditAction, edits: EditsState): EditsState {
  if (a.kind === 'delete') {
    const next = new Set(edits.deletedNoteIds);
    next.delete(a.id);
    return { ...edits, deletedNoteIds: next };
  }
  if (a.kind === 'pitch-shift') {
    const next = new Map(edits.pitchShifts);
    if (a.from === 0) next.delete(a.id);
    else next.set(a.id, a.from);
    return { ...edits, pitchShifts: next };
  }
  if (a.kind === 'staff-transform') {
    const next = new Map(edits.staffTransforms);
    if (isIdentityTransform(a.from)) next.delete(a.key);
    else next.set(a.key, a.from);
    return { ...edits, staffTransforms: next };
  }
  // add-note inverse: remove from map
  const next = new Map(edits.addedNotes);
  next.delete(a.note.id);
  return { ...edits, addedNotes: next };
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
    /** Visibility of the floating Staff Inspector. */
    staffInspectorVisible: boolean;
    /** Dots per inch used for px ↔ mm conversion in the staff inspector. */
    dpi: number;
    /** When true, dragging a staff snaps it to other staves' edges/centres. */
    snapToOtherStaves: boolean;
    /** Active editing tool — drives click routing & cursor.
     *  'select' = default; detection clicks pick notes/glyphs.
     *  'staff'  = every canvas click picks a staff system. */
    activeTool: ActiveTool;
  };
  interaction: {
    hoveredId: string | null;
    selectedId: string | null;
    /** When non-null, a Delete confirmation popup is showing for this id. */
    pendingDeleteId: string | null;
    /** Which button inside the pending-delete popup is keyboard-focused. */
    deleteFocus: DeleteFocus;
    /** Currently selected staff (for staff-level editing). Mutually
     *  exclusive with detection-level selection in interaction.selectedId. */
    selectedStaffKey: StaffKey | null;
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
    setStaffInspectorVisible(v: boolean): void;
    setDpi(dpi: number): void;
    setSnapToOtherStaves(v: boolean): void;
    setActiveTool(tool: ActiveTool): void;
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
    selectStaff(key: StaffKey | null): void;
    setStaffTransform(key: StaffKey, transform: StaffTransform): void;
    recordStaffTransform(key: StaffKey, from: StaffTransform, to: StaffTransform): void;
    addNote(note: AddedNote): void;
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
    staffInspectorVisible: true,
    dpi: 300,
    snapToOtherStaves: true,
    activeTool: 'select',
  },
  interaction: {
    hoveredId: null,
    selectedId: null,
    pendingDeleteId: null,
    deleteFocus: 'confirm',
    selectedStaffKey: null,
  },
  edits: {
    deletedNoteIds: new Set<string>(),
    pitchShifts: new Map<string, number>(),
    staffTransforms: new Map<StaffKey, StaffTransform>(),
    addedNotes: new Map<string, AddedNote>(),
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
            staffTransforms: new Map<StaffKey, StaffTransform>(),
            addedNotes: new Map<string, AddedNote>(),
          },
          history: { past: [], future: [] },
          interaction: {
            hoveredId: null,
            selectedId: null,
            pendingDeleteId: null,
            deleteFocus: 'confirm',
            selectedStaffKey: null,
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
    setStaffInspectorVisible(v) {
      set((s) => ({ display: { ...s.display, staffInspectorVisible: v } }));
    },
    setDpi(dpi) {
      const clamped = clamp(dpi, 24, 2400);
      set((s) => ({ display: { ...s.display, dpi: clamped } }));
    },
    setSnapToOtherStaves(v) {
      set((s) => ({ display: { ...s.display, snapToOtherStaves: v } }));
    },
    setActiveTool(tool) {
      set((s) => ({
        display: { ...s.display, activeTool: tool },
        // Clear the OTHER level of selection so we never highlight both.
        interaction: {
          ...s.interaction,
          selectedId: tool === 'staff' ? null : s.interaction.selectedId,
          selectedStaffKey: tool === 'select' ? null : s.interaction.selectedStaffKey,
          pendingDeleteId: null,
          deleteFocus: 'confirm',
        },
      }));
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
        interaction: {
          ...s.interaction,
          selectedId: id,
          pendingDeleteId: null,
          deleteFocus: 'confirm',
          // Selecting a detection clears any active staff selection so the
          // user is never editing both levels at once.
          selectedStaffKey: id ? null : s.interaction.selectedStaffKey,
        },
      }));
    },
    selectStaff(key) {
      set((s) => ({
        interaction: {
          ...s.interaction,
          selectedStaffKey: key,
          // Selecting a staff clears detection selection (mutually exclusive).
          selectedId: key ? null : s.interaction.selectedId,
          pendingDeleteId: null,
          deleteFocus: 'confirm',
        },
      }));
    },
    setStaffTransform(key, transform) {
      const next = new Map(get().edits.staffTransforms);
      if (isIdentityTransform(transform)) next.delete(key);
      else next.set(key, transform);
      set((s) => ({ edits: { ...s.edits, staffTransforms: next } }));
    },
    addNote(note) {
      const action: EditAction = { kind: 'add-note', note };
      const nextEdits = applyForward(action, get().edits);
      set((s) => ({
        edits: nextEdits,
        history: { past: [...s.history.past, action], future: [] },
      }));
    },
    recordStaffTransform(key, from, to) {
      // If from === to, the user committed a no-op gesture; skip history.
      const same =
        from.tx === to.tx && from.ty === to.ty &&
        from.sx === to.sx && from.sy === to.sy && from.theta === to.theta;
      const next = new Map(get().edits.staffTransforms);
      if (isIdentityTransform(to)) next.delete(key);
      else next.set(key, to);
      set((s) => ({
        edits: { ...s.edits, staffTransforms: next },
        history: same
          ? s.history
          : { past: [...s.history.past, { kind: 'staff-transform', key, from, to }], future: [] },
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
      const focusedNoteId = focusNoteIdOf(last);
      const focusedStaffKey = last.kind === 'staff-transform' ? last.key : null;
      set((s) => ({
        edits: nextEdits,
        history: {
          past: s.history.past.slice(0, -1),
          future: [...s.history.future, last],
        },
        interaction: {
          ...s.interaction,
          selectedId: focusedNoteId ?? s.interaction.selectedId,
          selectedStaffKey: focusedStaffKey ?? s.interaction.selectedStaffKey,
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
      const focusedNoteId = focusNoteIdOf(next);
      const focusedStaffKey = next.kind === 'staff-transform' ? next.key : null;
      set((s) => ({
        edits: nextEdits,
        history: {
          past: [...s.history.past, next],
          future: s.history.future.slice(0, -1),
        },
        interaction: {
          ...s.interaction,
          selectedId: focusedNoteId ?? s.interaction.selectedId,
          selectedStaffKey: focusedStaffKey ?? s.interaction.selectedStaffKey,
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
          state.edits.staffTransforms,
          state.edits.addedNotes,
          raw,
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
