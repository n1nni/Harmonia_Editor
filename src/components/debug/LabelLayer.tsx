'use client';

import { memo } from 'react';
import { useRaw } from '@/lib/store/selectors';
import { useScore } from '@/lib/music/useScore';
import { formatPitch } from '@/lib/music/pitch';

/**
 * Per-detection text label. For notes with a MusicXML match, appends the
 * authoritative pitch and `<type>` duration (e.g. "noteheadBlack · 0.92 ·
 * F♯4 · quarter"). Non-note detections show class + confidence only.
 */
export const LabelLayer = memo(function LabelLayer() {
  const raw = useRaw();
  const score = useScore();
  if (!raw) return null;

  return (
    <g pointerEvents="none">
      {raw.detections.flatMap((staff) => {
        const ls = staff.line_spacing;
        const fs = Math.max(8, 0.55 * ls);
        return staff.detections.map((d) => {
          const note = score?.noteByDetectionId.get(d.id);
          const parts: string[] = [d.class, d.conf.toFixed(2)];
          if (note?.pitch) parts.push(formatPitch(note.pitch));
          if (note?.mxlDuration) parts.push(note.mxlDuration);

          return (
            <text
              key={`lbl-${d.id}`}
              x={d.cx}
              y={d.y1 - 0.25 * ls}
              textAnchor="middle"
              fontSize={fs}
              fontFamily="var(--font-inter), sans-serif"
              fill="#EDEDF0"
              fillOpacity={0.92}
              style={{ paintOrder: 'stroke', stroke: '#0B0B0E', strokeWidth: 2 }}
            >
              {parts.join(' · ')}
            </text>
          );
        });
      })}
    </g>
  );
});
