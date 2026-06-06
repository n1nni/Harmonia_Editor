'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useRaw, useInteraction } from '@/lib/store/selectors';
import { useScore } from '@/lib/music/useScore';
import { formatPitch } from '@/lib/music/pitch';
import type { Detection } from '@/types/omr';

/**
 * Floating bottom-left card showing details about the hovered/selected
 * detection. Lives outside the SVG so it does not zoom and never blocks
 * interaction with the canvas.
 */
export function InspectorCard() {
  const raw = useRaw();
  const score = useScore();
  const { hoveredId, selectedId } = useInteraction();

  const focus = useMemo<Detection | null>(() => {
    if (!raw) return null;
    const id = hoveredId ?? selectedId;
    if (!id) return null;
    for (const s of raw.detections) {
      for (const d of s.detections) if (d.id === id) return d;
    }
    return null;
  }, [raw, hoveredId, selectedId]);

  const note = focus ? (score?.noteByDetectionId.get(focus.id) ?? null) : null;
  const pitch = note?.pitch ?? null;

  return (
    <AnimatePresence>
      {focus ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute bottom-5 left-5 z-10 min-w-[240px] rounded-lg border border-line bg-surface-panel/95 px-4 py-3 shadow-panel backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            <span>{selectedId === focus.id ? 'Selected' : 'Hovered'}</span>
            <span>{focus.id}</span>
          </div>
          <div className="mb-1 text-sm font-medium text-text-primary">
            {focus.class}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-text-secondary">
            <span className="text-text-tertiary">conf</span>
            <span className="tabular-nums text-right">
              {focus.conf.toFixed(3)}
            </span>

            <span className="text-text-tertiary">center</span>
            <span className="tabular-nums text-right">
              {Math.round(focus.cx)}, {Math.round(focus.cy)}
            </span>

            <span className="text-text-tertiary">size</span>
            <span className="tabular-nums text-right">
              {Math.round(focus.x2 - focus.x1)} × {Math.round(focus.y2 - focus.y1)}
            </span>

            <span className="text-text-tertiary">part</span>
            <span className="text-right">
              {focus.part_id} · {focus.staff_in_part}
            </span>

            {pitch ? (
              <>
                <span className="text-text-tertiary">pitch</span>
                <span className="text-right text-accent">
                  {formatPitch(pitch)}
                  {note?.pitchFromMxl ? null : (
                    <span className="ml-1 text-[9px] text-text-tertiary">≈</span>
                  )}
                </span>
              </>
            ) : null}

            {note?.mxlDuration ? (
              <>
                <span className="text-text-tertiary">duration</span>
                <span className="text-right">{note.mxlDuration}</span>
              </>
            ) : null}

            {note?.measureNumber ? (
              <>
                <span className="text-text-tertiary">measure</span>
                <span className="tabular-nums text-right">
                  {note.measureNumber}
                </span>
              </>
            ) : null}

            {note?.voice ? (
              <>
                <span className="text-text-tertiary">voice</span>
                <span className="tabular-nums text-right">{note.voice}</span>
              </>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
