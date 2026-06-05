'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  useImageDims,
  useInteraction,
  useRaw,
  useViewport,
} from '@/lib/store/selectors';
import { useScore } from '@/lib/music/useScore';
import { formatPitch } from '@/lib/music/pitch';
import type { Detection } from '@/types/omr';

/**
 * Small floating pill anchored to the currently hovered detection.
 * Renders OUTSIDE the SVG (and outside the pan/zoom transform) so its
 * size stays constant on screen — only its position moves with the canvas.
 *
 * Position math mirrors `usePanZoom`'s screen-transform:
 *   scale       = fitScale * zoom
 *   centerX     = (container.w - imgW * scale) / 2 + pan.x
 *   centerY     = (container.h - imgH * scale) / 2 + pan.y
 *   screenX     = centerX + d.cx * scale
 *   screenY     = centerY + d.y1 * scale - GAP
 */
const GAP = 12;

function humanizeClass(c: Detection['class']): string {
  switch (c) {
    case 'clefG':
      return 'treble clef';
    case 'clefF':
      return 'bass clef';
    case 'clef8':
      return 'treble clef 8vb';
    case 'keySharp':
      return 'key sharp';
    case 'accidentalSharp':
      return 'sharp';
    case 'augmentationDot':
      return 'augmentation dot';
    case 'restDoubleWhole':
      return 'double-whole rest';
    case 'slur':
      return 'slur';
    case 'beam':
      return 'beam';
    case 'noteheadBlack':
      return 'quarter note';
    case 'noteheadHalf':
      return 'half note';
  }
}

export function HoverTooltip() {
  const raw = useRaw();
  const score = useScore();
  const dims = useImageDims();
  const { hoveredId } = useInteraction();
  const { zoom, pan, fitScale, containerSize } = useViewport();

  const target = useMemo<Detection | null>(() => {
    if (!raw || !hoveredId) return null;
    for (const s of raw.detections) {
      for (const d of s.detections) if (d.id === hoveredId) return d;
    }
    return null;
  }, [raw, hoveredId]);

  if (!target || !dims || !containerSize) return null;

  const scale = fitScale * zoom;
  const centerX = (containerSize.w - dims.w * scale) / 2 + pan.x;
  const centerY = (containerSize.h - dims.h * scale) / 2 + pan.y;
  const screenX = centerX + target.cx * scale;
  const screenY = centerY + target.y1 * scale - GAP;

  const note = score?.noteByDetectionId.get(target.id) ?? null;
  const pitch = note?.pitch ?? null;
  const isNote =
    target.class === 'noteheadBlack' || target.class === 'noteheadHalf';

  return (
    <AnimatePresence>
      <motion.div
        key={target.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface-panel px-2.5 py-1 shadow-float"
        style={{ left: screenX, top: screenY }}
      >
        <span className="font-mono text-[11px] tabular-nums">
          <span className="text-text-tertiary">{target.id}</span>
          <span className="mx-1.5 text-text-tertiary/60">·</span>
          {isNote && pitch ? (
            <>
              <span className="text-accent">{formatPitch(pitch)}</span>
              {note?.mxlDuration ? (
                <span className="ml-1.5 text-text-secondary">
                  · {note.mxlDuration}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-text-primary">
              {humanizeClass(target.class)}
            </span>
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
