'use client';

import { memo, useCallback, useState } from 'react';
import { useActiveTool, useRaw, useDeletedIds, usePitchShifts } from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { applyPitchShiftToDetection, isNoteheadClass } from '@/lib/music/applyEdits';
import { staffContentBboxImage } from '@/lib/staff/bbox';
import { staffKey } from '@/lib/staff/keys';

/**
 * Two-tier pointer capture for the canvas:
 *   1. A transparent <rect> per staff covering its bounding box. In Staff
 *      tool mode every click anywhere inside this rect selects the staff.
 *      Hovering it in Staff mode gives a faint orange tint so the
 *      clickable area is visible.
 *   2. A transparent <rect> per detection — only mounted in Select tool
 *      mode. Clicking selects the detection (existing behaviour).
 *
 * Selection uses `onPointerUp` rather than `onClick` because the parent
 * canvas container takes `setPointerCapture` on every pointerdown (for
 * pan/drag), which can suppress React's synthesised click event on inner
 * SVG elements. `onPointerUp` is unaffected by capture.
 */
export const HitTestLayer = memo(function HitTestLayer() {
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const pitchShifts = usePitchShifts();
  const tool = useActiveTool();
  const { setHovered, setSelected, selectStaff } = useHarmonyActions();
  const [hoveredStaff, setHoveredStaff] = useState<string | null>(null);

  const onLeave = useCallback(() => {
    setHovered(null);
    setHoveredStaff(null);
  }, [setHovered]);

  if (!raw) return null;

  return (
    <g onPointerLeave={onLeave} style={{ pointerEvents: 'auto' }}>
      {/* Staff-area rects — only mounted when the Staff tool is active.
         In Select mode the staves are not selectable; clicks fall through
         to the canvas (pan-drag) or to the detection rects below. */}
      {tool === 'staff' && raw.detections.map((staff) => {
        const key = staffKey(staff);
        const bbox = staffContentBboxImage(staff);
        const padX = staff.line_spacing * 0.5;
        const padY = staff.line_spacing * 1.2;
        const x = bbox.x1 - padX;
        const y = bbox.y1 - padY;
        const w = bbox.x2 - bbox.x1 + 2 * padX;
        const h = bbox.y2 - bbox.y1 + 2 * padY;
        const inStaffMode = tool === 'staff';
        const isHovered = hoveredStaff === key;
        return (
          <rect
            key={`staff-hit-${key}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={inStaffMode && isHovered ? '#F08237' : 'transparent'}
            fillOpacity={inStaffMode && isHovered ? 0.12 : 0}
            pointerEvents="all"
            data-no-pan="1"
            style={{ cursor: inStaffMode ? 'crosshair' : 'pointer' }}
            onPointerEnter={() => inStaffMode && setHoveredStaff(key)}
            onPointerLeave={() => setHoveredStaff(null)}
            onPointerDown={(e) => {
              // onPointerDown fires on the original target BEFORE the
              // container's pan/zoom handler takes pointer capture.
              // stopPropagation prevents that capture from being taken
              // at all, so the gesture stays local to this rect.
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              (document.activeElement as HTMLElement | null)?.blur();
              selectStaff(key);
            }}
          />
        );
      })}

      {/* Detection rects — only mounted in Select tool. */}
      {tool === 'select' && raw.detections.flatMap((staff) =>
        staff.detections
          .filter((d) => !deletedIds.has(d.id))
          .map((raw) => {
            const shift = isNoteheadClass(raw.class)
              ? (pitchShifts.get(raw.id) ?? 0)
              : 0;
            const d =
              shift === 0
                ? raw
                : applyPitchShiftToDetection(raw, shift, staff.line_spacing);
            return (
              <rect
                key={`hit-${d.id}`}
                x={d.x1}
                y={d.y1}
                width={d.x2 - d.x1}
                height={d.y2 - d.y1}
                fill="transparent"
                pointerEvents="all"
                data-no-pan="1"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setHovered(d.id)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  e.preventDefault();
                  (document.activeElement as HTMLElement | null)?.blur();
                  setSelected(d.id);
                }}
              />
            );
          }),
      )}
    </g>
  );
});
