'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  useImageDims,
  useRaw,
  useSelectedStaffKey,
  useSnapToOtherStaves,
  useStaffTransforms,
  useViewport,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { staffContentBboxImage } from '@/lib/staff/bbox';
import { staffKey } from '@/lib/staff/keys';
import { IDENTITY_TRANSFORM, type StaffTransform } from '@/lib/staff/types';
import { applyDrag, type HandleId } from '@/lib/staff/dragMath';
import { snapTransform, type SnapCandidate, type SnapGuide } from '@/lib/staff/snap';

/**
 * DOM layer of resize handles overlaid on the selected staff in screen
 * coordinates. Body + 8 handles. Pointer events drive the staff transform
 * through dragMath + snap; final-mouseup commits a `staff-transform`
 * EditAction so the gesture is one undo step.
 *
 * Why DOM (not SVG): handles must stay 12 px on screen regardless of
 * canvas zoom, cursors are CSS-only, and DOM pointer-capture / Esc-abort
 * are far simpler than fighting nested SVG event masking.
 */

interface DragGuidesContext {
  guides: SnapGuide[];
  setGuides: (g: SnapGuide[]) => void;
}

const DragGuidesCtx = createContext<DragGuidesContext | null>(null);

export function DragGuidesProvider({ children }: { children: ReactNode }) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const value = useMemo<DragGuidesContext>(() => ({ guides, setGuides }), [guides]);
  return <DragGuidesCtx.Provider value={value}>{children}</DragGuidesCtx.Provider>;
}

export function useDragGuides(): DragGuidesContext {
  const ctx = useContext(DragGuidesCtx);
  if (!ctx) throw new Error('useDragGuides must be used inside <DragGuidesProvider>');
  return ctx;
}

const HANDLE_SIZE = 12;

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSORS: Record<HandlePos, string> = {
  nw: 'nwse-resize',
  n:  'ns-resize',
  ne: 'nesw-resize',
  e:  'ew-resize',
  se: 'nwse-resize',
  s:  'ns-resize',
  sw: 'nesw-resize',
  w:  'ew-resize',
};

export function StaffHandlesLayer() {
  const raw = useRaw();
  const dims = useImageDims();
  const selectedKey = useSelectedStaffKey();
  const transforms = useStaffTransforms();
  const { zoom, pan, fitScale, containerSize } = useViewport();
  const snapOn = useSnapToOtherStaves();
  const { setStaffTransform, recordStaffTransform } = useHarmonyActions();
  const { setGuides } = useDragGuides();

  // Drag-session bookkeeping. Refs (not state) so the move handler stays
  // a stable closure and we don't re-render at pointer-move rate.
  const session = useRef<{
    pointerId: number;
    handle: HandleId;
    startScreenX: number;
    startScreenY: number;
    baseTransform: StaffTransform;
  } | null>(null);

  const targets = useMemo(() => {
    if (!raw || !selectedKey) return null;
    const staff = raw.detections.find((s) => staffKey(s) === selectedKey);
    if (!staff) return null;
    const baseBbox = staffContentBboxImage(staff);
    const candidates: SnapCandidate[] = raw.detections
      .filter((s) => staffKey(s) !== selectedKey)
      .map((s) => ({ partKey: staffKey(s), bbox: staffContentBboxImage(s) }));
    return { baseBbox, candidates, transform: transforms.get(selectedKey) ?? IDENTITY_TRANSFORM };
  }, [raw, selectedKey, transforms]);

  // Image-to-screen transform (matches usePanZoom math).
  const toScreen = useCallback(
    (x: number, y: number) => {
      if (!dims || !containerSize) return { x: 0, y: 0 };
      const s = fitScale * zoom;
      const cx = (containerSize.w - dims.w * s) / 2 + pan.x;
      const cy = (containerSize.h - dims.h * s) / 2 + pan.y;
      return { x: cx + x * s, y: cy + y * s };
    },
    [dims, containerSize, fitScale, zoom, pan.x, pan.y],
  );

  // Escape during a drag aborts and restores the pre-drag transform.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || !session.current || !selectedKey) return;
      setStaffTransform(selectedKey, session.current.baseTransform);
      setGuides([]);
      session.current = null;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKey, setStaffTransform, setGuides]);

  if (!targets || !selectedKey) return null;

  const { baseBbox, candidates, transform } = targets;
  const scale = fitScale * zoom;

  // Post-transform corner positions in image space. The SVG transform
  // `translate(tx,ty) scale(sx,sy)` maps (x,y) → (x*sx + tx, y*sy + ty),
  // so sx / sy must multiply the bbox coordinates BEFORE adding the
  // translation. The previous formula (x1 + tx) was correct only at
  // identity scale and made the handles drift after a resize.
  const ex1 = baseBbox.x1 * transform.sx + transform.tx;
  const ey1 = baseBbox.y1 * transform.sy + transform.ty;
  const ex2 = baseBbox.x2 * transform.sx + transform.tx;
  const ey2 = baseBbox.y2 * transform.sy + transform.ty;
  const emidX = (ex1 + ex2) / 2;
  const emidY = (ey1 + ey2) / 2;

  const screenNW = toScreen(ex1, ey1);
  const screenSE = toScreen(ex2, ey2);
  const bodyLeft = screenNW.x;
  const bodyTop = screenNW.y;
  const bodyW = screenSE.x - screenNW.x;
  const bodyH = screenSE.y - screenNW.y;

  const onPointerDown = (handle: HandleId) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (document.activeElement as HTMLElement | null)?.blur();
    session.current = {
      pointerId: e.pointerId,
      handle,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      baseTransform: transform,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!session.current || e.pointerId !== session.current.pointerId) return;
    const s = session.current;
    const proposed = applyDrag({
      baseBbox,
      baseTransform: s.baseTransform,
      handle: s.handle,
      screenDx: e.clientX - s.startScreenX,
      screenDy: e.clientY - s.startScreenY,
      scale,
      modifiers: { shift: e.shiftKey, alt: e.altKey },
    });
    if (snapOn && candidates.length > 0) {
      const { transform: snapped, guides } = snapTransform(proposed, baseBbox, candidates, scale);
      setStaffTransform(selectedKey, snapped);
      setGuides(guides);
    } else {
      setStaffTransform(selectedKey, proposed);
      setGuides([]);
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!session.current || e.pointerId !== session.current.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    const s = session.current;
    // Read final transform from store via the current props snapshot.
    // `transform` is the prop value at the moment of render, which mirrors
    // the latest `setStaffTransform` call we issued during move.
    const final = transforms.get(selectedKey) ?? IDENTITY_TRANSFORM;
    recordStaffTransform(selectedKey, s.baseTransform, final);
    setGuides([]);
    session.current = null;
  };

  const positions: { id: HandlePos; cx: number; cy: number }[] = [
    { id: 'nw', cx: ex1,   cy: ey1   },
    { id: 'n',  cx: emidX, cy: ey1   },
    { id: 'ne', cx: ex2,   cy: ey1   },
    { id: 'e',  cx: ex2,   cy: emidY },
    { id: 'se', cx: ex2,   cy: ey2   },
    { id: 's',  cx: emidX, cy: ey2   },
    { id: 'sw', cx: ex1,   cy: ey2   },
    { id: 'w',  cx: ex1,   cy: emidY },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Body drag area — translation. */}
      <div
        role="presentation"
        data-no-pan="1"
        onPointerDown={onPointerDown('body')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'absolute',
          left: bodyLeft,
          top: bodyTop,
          width: bodyW,
          height: bodyH,
          cursor: 'move',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />
      {/* Handles. */}
      {positions.map((p) => {
        const screen = toScreen(p.cx, p.cy);
        const style: CSSProperties = {
          position: 'absolute',
          left: screen.x - HANDLE_SIZE / 2,
          top: screen.y - HANDLE_SIZE / 2,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: '#FFFFFF',
          border: '1.5px solid #F08237',
          borderRadius: 3,
          cursor: HANDLE_CURSORS[p.id],
          pointerEvents: 'auto',
          touchAction: 'none',
          boxShadow: '0 1px 2px rgba(20,20,30,0.15)',
        };
        return (
          <div
            key={p.id}
            role="presentation"
            data-handle={p.id}
            data-no-pan="1"
            style={style}
            onPointerDown={onPointerDown(p.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        );
      })}
    </div>
  );
}
