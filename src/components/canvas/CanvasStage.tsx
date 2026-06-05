'use client';

import { useEffect, useRef } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import {
  useViewport,
  useImageDims,
  useDisplay,
  useRaw,
} from '@/lib/store/selectors';
import { ImageBackdrop } from './ImageBackdrop';
import { OverlaySvg } from './OverlaySvg';
import { InspectorCard } from './InspectorCard';
import { HoverTooltip } from './HoverTooltip';
import { DeleteConfirmPopup } from './DeleteConfirmPopup';
import { StaffInspector } from './staff/StaffInspector';
import {
  DragGuidesProvider,
  StaffHandlesLayer,
} from './staff/StaffHandlesLayer';
import { SnapGuides } from './staff/SnapGuides';
import { usePanZoom } from './usePanZoom';

/**
 * The interactive canvas. Owns:
 *   - container size observation (drives fitScale)
 *   - a single CSS transform that co-scales backdrop + overlay
 *   - centering of the image inside the viewport
 *   - mounting the backdrop EARLY (even before dims are known) so its
 *     <img onLoad> can fire and populate the store.
 */
export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setContainerSize } = useHarmonyActions();
  const { zoom, pan, fitScale, containerSize } = useViewport();
  const dims = useImageDims();
  const { overlayOpacity, reconstructionOn, activeTool } = useDisplay();
  const raw = useRaw();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      const { width, height } = e.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setContainerSize]);

  usePanZoom(containerRef);

  // Compute the canvas-stage transform. When dims are not yet known we
  // still mount the <img> off-screen so the load event can fire.
  const ready = dims !== null && containerSize !== null;
  const s = ready && dims ? fitScale * zoom : 1;
  const centerOffset = ready && dims && containerSize
    ? {
        x: (containerSize.w - dims.w * s) / 2,
        y: (containerSize.h - dims.h * s) / 2,
      }
    : { x: 0, y: 0 };
  const tx = centerOffset.x + pan.x;
  const ty = centerOffset.y + pan.y;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-surface-canvas"
      style={{ touchAction: 'none', cursor: activeTool === 'staff' ? 'crosshair' : undefined }}
    >
      <BackgroundGrid />

      {/* Mount the backdrop as soon as raw data arrives, so onLoad can fire
         even before dims are known. We hide it off-screen until ready. */}
      {raw ? (
        <div
          style={
            ready
              ? {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: dims?.w,
                  height: dims?.h,
                  transform: `translate3d(${tx}px, ${ty}px, 0) scale(${s})`,
                  transformOrigin: '0 0',
                  willChange: 'transform',
                }
              : {
                  position: 'absolute',
                  left: -99999,
                  top: -99999,
                  visibility: 'hidden',
                }
          }
        >
          <div
            style={{
              position: 'relative',
              width: dims?.w,
              height: dims?.h,
              opacity: reconstructionOn ? 1 : 0,
              transition: 'opacity 200ms ease-out',
            }}
          >
            <ImageBackdrop />
          </div>
          {ready ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: overlayOpacity,
                pointerEvents: 'auto',
              }}
            >
              <OverlaySvg />
            </div>
          ) : null}
        </div>
      ) : null}

      {!ready ? <BackdropSkeleton /> : null}

      <HoverTooltip />
      <DeleteConfirmPopup />
      <InspectorCard />

      <DragGuidesProvider>
        <StaffHandlesLayer />
        <SnapGuides />
        <StaffInspector />
      </DragGuidesProvider>
    </div>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}

function BackdropSkeleton() {
  const status = useHarmonyStore((s) => s.data.status);
  const label =
    status === 'loading'
      ? 'Loading score…'
      : status === 'ready'
        ? 'Decoding image…'
        : status === 'error'
          ? 'Load failed'
          : 'Awaiting upload';
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[60%] w-[70%] max-w-[1100px] overflow-hidden rounded-lg border border-line-subtle bg-surface-panel">
        <div className="absolute inset-0 animate-pulse opacity-40" />
        <div className="absolute bottom-4 left-4 font-mono text-label uppercase text-text-tertiary">
          {label}
        </div>
      </div>
    </div>
  );
}
