'use client';

import { useCallback } from 'react';
import {
  useHarmonyActions,
  useHarmonyStore,
} from '@/lib/store/useHarmonyStore';
import { isNoteheadClass } from '@/lib/music/applyEdits';
import {
  ANIM_MS,
  PRESET_100,
  PRESET_200,
  PRESET_50,
  ZOOM_STEP,
  clampZoom,
  panForCursorZoom,
  screenToImagePoint,
  unionBbox,
  viewportForBbox,
  type Bbox,
} from '@/lib/viewport/zoomMath';
import {
  animateViewport,
  type ViewportSnapshot,
} from '@/lib/viewport/animateViewport';

/**
 * Container-relative screen point. Passed by the canvas interaction
 * layer when the user clicks at a specific position; absent for
 * button-driven preset zooms (which then centre on the viewport).
 */
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ZoomNavApi {
  zoomIn(cursor?: ScreenPoint): void;
  zoomOut(cursor?: ScreenPoint): void;
  zoomTo(target: number, cursor?: ScreenPoint): void;
  fitDrawing(): void;
  fitPage(): void;
  fitWidth(): void;
  fitSelection(): void;
  zoomToRect(rect: Bbox): void;
  prev(): void;
  next(): void;
}

/**
 * Aggregated zoom-navigation API consumed by every toolbar button and
 * by the canvas's `ZoomInteractionLayer`. Every method:
 *
 *   1. Snapshots the *current* viewport for the navigation history.
 *   2. Computes the target snapshot using pure functions from
 *      `lib/viewport/zoomMath`.
 *   3. Animates from current to target via `animateViewport`.
 *
 * The current viewport is read on demand via `getState()` rather than
 * subscribed via `useViewport()` so the hook's return value is stable
 * across re-renders. Returning a memoised object lets callers wire any
 * button to any action without prop-drilling.
 */
export function useZoomNavigation(): ZoomNavApi {
  const actions = useHarmonyActions();

  // Compose: read current viewport snapshot, animate to target.
  const animateTo = useCallback(
    (target: ViewportSnapshot) => {
      const s = useHarmonyStore.getState();
      const from: ViewportSnapshot = {
        zoom: s.viewport.zoom,
        pan: { x: s.viewport.pan.x, y: s.viewport.pan.y },
      };
      const safeZoom = clampZoom(target.zoom);
      const targetSafe: ViewportSnapshot = { zoom: safeZoom, pan: target.pan };
      // Push the *current* viewport before starting the animation so
      // Prev returns to the pre-zoom state.
      actions.pushViewportHistory();
      animateViewport(from, targetSafe, (snap) => {
        actions.setZoom(snap.zoom);
        actions.setPan(snap.pan);
      }, { duration: ANIM_MS });
    },
    [actions],
  );

  // Cursor-anchored zoom (zoom in, zoom out). When no cursor is given,
  // anchor on the viewport centre so the visual centre stays fixed.
  const cursorZoom = useCallback(
    (factor: number, cursor?: ScreenPoint) => {
      const s = useHarmonyStore.getState();
      const dims = s.data.imageDims;
      const container = s.viewport.containerSize;
      if (!dims || !container) return;
      const frame = {
        containerSize: container,
        imageDims: dims,
        fitScale: s.viewport.fitScale,
      };
      const screen = cursor ?? { x: container.w / 2, y: container.h / 2 };
      const oldZoom = s.viewport.zoom;
      const newZoom = clampZoom(oldZoom * factor);
      if (newZoom === oldZoom) return;
      const anchor = screenToImagePoint(
        screen.x, screen.y, oldZoom, s.viewport.pan, frame,
      );
      const newPan = panForCursorZoom(newZoom, screen, anchor, frame);
      animateTo({ zoom: newZoom, pan: newPan });
    },
    [animateTo],
  );

  const zoomIn = useCallback(
    (cursor?: ScreenPoint) => cursorZoom(ZOOM_STEP, cursor),
    [cursorZoom],
  );
  const zoomOut = useCallback(
    (cursor?: ScreenPoint) => cursorZoom(1 / ZOOM_STEP, cursor),
    [cursorZoom],
  );

  // Preset zoom (100 %, 50 %, 200 %). Anchors on the cursor when
  // provided; otherwise centres the image in the viewport.
  const zoomTo = useCallback(
    (target: number, cursor?: ScreenPoint) => {
      const s = useHarmonyStore.getState();
      const dims = s.data.imageDims;
      const container = s.viewport.containerSize;
      if (!dims || !container) return;
      const frame = {
        containerSize: container,
        imageDims: dims,
        fitScale: s.viewport.fitScale,
      };
      const newZoom = clampZoom(target);
      const screen = cursor ?? { x: container.w / 2, y: container.h / 2 };
      const anchor = screenToImagePoint(
        screen.x, screen.y, s.viewport.zoom, s.viewport.pan, frame,
      );
      const newPan = cursor
        ? panForCursorZoom(newZoom, screen, anchor, frame)
        : { x: 0, y: 0 };
      animateTo({ zoom: newZoom, pan: newPan });
    },
    [animateTo],
  );

  const fitPage = useCallback(() => {
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    if (!dims || !container) return;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const target = viewportForBbox(
      { x1: 0, y1: 0, x2: dims.w, y2: dims.h },
      frame,
      { mode: 'contain', pad: 1.0 },
    );
    animateTo(target);
  }, [animateTo]);

  const fitWidth = useCallback(() => {
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    if (!dims || !container) return;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const target = viewportForBbox(
      { x1: 0, y1: 0, x2: dims.w, y2: dims.h },
      frame,
      { mode: 'width', pad: 1.0 },
    );
    animateTo(target);
  }, [animateTo]);

  const fitDrawing = useCallback(() => {
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    const raw = s.data.raw;
    if (!dims || !container || !raw) return;
    // Union every non-slur, non-beam detection bbox across every staff.
    // Slurs and beams often span artificially wide regions that would
    // shrink the "fit drawing" to be uselessly small; excluding them
    // matches the engraving convention used by `staffContentBboxImage`.
    const boxes: Bbox[] = [];
    for (const staff of raw.detections) {
      for (const d of staff.detections) {
        if (d.class === 'slur' || d.class === 'beam') continue;
        if (s.edits.deletedNoteIds.has(d.id)) continue;
        boxes.push({ x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 });
      }
    }
    const bbox = unionBbox(boxes);
    if (!bbox) return;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const target = viewportForBbox(bbox, frame, { mode: 'contain' });
    animateTo(target);
  }, [animateTo]);

  const fitSelection = useCallback(() => {
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    const raw = s.data.raw;
    const id = s.interaction.selectedId;
    if (!dims || !container || !raw || !id) return;
    let found: { x1: number; y1: number; x2: number; y2: number } | null = null;
    for (const staff of raw.detections) {
      for (const d of staff.detections) {
        if (d.id === id && isNoteheadClass(d.class)) {
          found = { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 };
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;
    // Generous pad so the selected note is comfortably framed.
    const pad = 0.4;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const target = viewportForBbox(found, frame, { mode: 'contain', pad });
    animateTo(target);
  }, [animateTo]);

  const zoomToRect = useCallback((rect: Bbox) => {
    const s = useHarmonyStore.getState();
    const dims = s.data.imageDims;
    const container = s.viewport.containerSize;
    if (!dims || !container) return;
    const frame = {
      containerSize: container,
      imageDims: dims,
      fitScale: s.viewport.fitScale,
    };
    const target = viewportForBbox(rect, frame, { mode: 'contain' });
    animateTo(target);
  }, [animateTo]);

  const prev = useCallback(() => actions.viewportPrev(), [actions]);
  const next = useCallback(() => actions.viewportNext(), [actions]);

  return {
    zoomIn,
    zoomOut,
    zoomTo,
    fitDrawing,
    fitPage,
    fitWidth,
    fitSelection,
    zoomToRect,
    prev,
    next,
  };
}
