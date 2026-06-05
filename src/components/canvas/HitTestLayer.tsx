'use client';

import { memo, useCallback, useState } from 'react';
import {
  useActiveTool,
  useAddNoteDuration,
  useDeletedIds,
  usePitchShifts,
  useRaw,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { applyPitchShiftToDetection, isNoteheadClass } from '@/lib/music/applyEdits';
import { staffContentBboxImage } from '@/lib/staff/bbox';
import { staffKey } from '@/lib/staff/keys';
import { newAddedNoteId, snapNoteY, type AddedNote } from '@/lib/staff/addedNotes';
import { clefKindFromClass } from '@/lib/music/clefs';
import {
  applyKeySignature,
  formatPitch,
  pitchFromStepIndex,
  type Pitch,
} from '@/lib/music/pitch';
import { glyphFor } from '@/lib/smufl/glyphMap';
import { glyphPlacement } from '@/lib/smufl/anchors';
import { ENGRAVING_DEFAULTS } from '@/lib/smufl/engravingDefaults';
import type { RawStaff } from '@/types/omr';

/**
 * Tool-dispatching hit-test layer.
 *
 *   Select   → detection rects only (select notes/glyphs)
 *   Staff    → staff bbox rects (select whole staff)
 *   Add-note → staff bbox rects with onPointerMove tracking + a ghost
 *              notehead at the snapped position (with pitch label); click
 *              commits a note of the currently chosen duration.
 *
 * Selection / commit uses `onPointerDown` rather than `onClick` because
 * the parent canvas container takes `setPointerCapture` on every
 * pointerdown (for pan/drag), which suppresses React's synthesised click
 * event on inner SVG elements. `data-no-pan` markers tell `usePanZoom`
 * to skip pan-capture when the gesture starts on one of these rects.
 */

interface GhostState {
  cx: number;
  cy: number;
  staffKey: string;
  lineSpacing: number;
  middleY: number;
  pitch: Pitch | null;
}

/** Compute clef + key signature once per staff so the ghost can show the
 *  pitch the user is about to place. Returns null if no clef detected. */
function inferPitchAt(cy: number, staff: RawStaff): Pitch | null {
  const sorted = [...staff.detections].sort((a, b) => a.cx - b.cx);
  const clefDet = sorted.find(
    (d) => d.class === 'clefG' || d.class === 'clefF' || d.class === 'clef8',
  );
  const clef = clefDet ? clefKindFromClass(clefDet.class) : null;
  if (!clef) return null;
  const firstNoteX =
    sorted.find(
      (d) => d.class === 'noteheadBlack' || d.class === 'noteheadHalf',
    )?.cx ?? Infinity;
  const keySharps = sorted.filter(
    (d) => d.class === 'keySharp' && d.cx < firstNoteX,
  ).length;
  const { stepIndex } = snapNoteY(cy, staff);
  return applyKeySignature(pitchFromStepIndex(stepIndex, clef), keySharps);
}

export const HitTestLayer = memo(function HitTestLayer() {
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const pitchShifts = usePitchShifts();
  const tool = useActiveTool();
  const duration = useAddNoteDuration();
  const { setHovered, setSelected, selectStaff, requestAddNote } = useHarmonyActions();
  const [hoveredStaff, setHoveredStaff] = useState<string | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);

  const onLeave = useCallback(() => {
    setHovered(null);
    setHoveredStaff(null);
    setGhost(null);
  }, [setHovered]);

  if (!raw) return null;

  return (
    <g onPointerLeave={onLeave} style={{ pointerEvents: 'auto' }}>
      {/* Staff rects — mounted in Staff mode AND Add-note mode. */}
      {(tool === 'staff' || tool === 'add-note') &&
        raw.detections.map((staff) => {
          const key = staffKey(staff);
          const bbox = staffContentBboxImage(staff);
          const padX = staff.line_spacing * 0.5;
          const padY = staff.line_spacing * 1.2;
          const x = bbox.x1 - padX;
          const y = bbox.y1 - padY;
          const w = bbox.x2 - bbox.x1 + 2 * padX;
          const h = bbox.y2 - bbox.y1 + 2 * padY;
          const inStaffMode = tool === 'staff';
          const inAddMode = tool === 'add-note';
          const isHovered = hoveredStaff === key;
          const middleY =
            staff.line_positions[2] ?? (staff.top_y + staff.bot_y) / 2;
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
              style={{ cursor: 'crosshair' }}
              onPointerEnter={() => {
                if (inStaffMode) setHoveredStaff(key);
              }}
              onPointerMove={(e) => {
                if (!inAddMode) return;
                const svg = (e.currentTarget as SVGElement).ownerSVGElement;
                if (!svg) return;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svg.getScreenCTM();
                if (!ctm) return;
                const inv = ctm.inverse();
                const local = pt.matrixTransform(inv);
                const { cy: snappedCy } = snapNoteY(local.y, staff);
                setGhost({
                  cx: local.x,
                  cy: snappedCy,
                  staffKey: key,
                  lineSpacing: staff.line_spacing,
                  middleY,
                  pitch: inferPitchAt(local.y, staff),
                });
              }}
              onPointerLeave={() => {
                setHoveredStaff(null);
                setGhost(null);
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                e.preventDefault();
                (document.activeElement as HTMLElement | null)?.blur();
                if (inStaffMode) {
                  selectStaff(key);
                  return;
                }
                // Add-note commit — reuse the ghost's snapped position +
                // pre-computed pitch so what the user saw is exactly what
                // gets placed.
                if (inAddMode && ghost && ghost.staffKey === key && ghost.pitch) {
                  const note: AddedNote = {
                    id: newAddedNoteId(),
                    partId: staff.part_id,
                    staffInPart: staff.staff_in_part,
                    cx: ghost.cx,
                    cy: ghost.cy,
                    duration,
                    voice: 1,
                    pitch: ghost.pitch,
                  };
                  requestAddNote(note);
                }
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

      {/* Ghost notehead preview in Add-note mode. */}
      {tool === 'add-note' && ghost ? (
        <GhostNotehead ghost={ghost} duration={duration} />
      ) : null}
    </g>
  );
});

interface GhostProps {
  ghost: GhostState;
  duration: AddedNote['duration'];
}

function GhostNotehead({ ghost, duration }: GhostProps) {
  const cls =
    duration === 'whole'
      ? 'noteheadWhole'
      : duration === 'half'
        ? 'noteheadHalf'
        : 'noteheadBlack';
  const spec = glyphFor(cls);
  if (!spec) return null;
  const { x, y, fontSize } = glyphPlacement(spec, ghost.cx, ghost.cy, ghost.lineSpacing);
  const ls = ghost.lineSpacing;

  // Tiny ghost stem so half/quarter/eighth read correctly during placement.
  const showStem = duration !== 'whole';
  const stemDirection: 'up' | 'down' = ghost.cy < ghost.middleY ? 'down' : 'up';
  const stemOffset = 0.54 * ls;
  const stemLen = 3.5 * ls;
  const stemX = stemDirection === 'up' ? ghost.cx + stemOffset : ghost.cx - stemOffset;
  const stemY2 = stemDirection === 'up' ? ghost.cy - stemLen : ghost.cy + stemLen;

  // Pitch label — Inter, image-space tied so it follows pan/zoom but stays
  // legible via vector-effect.
  const label = ghost.pitch ? formatPitch(ghost.pitch) : '';
  const labelFontSize = 1.1 * ls;
  const labelX = ghost.cx + 0.9 * ls;
  const labelY = ghost.cy - 1.4 * ls;

  return (
    <g pointerEvents="none">
      <g opacity={0.55}>
        <text
          x={x}
          y={y}
          fontFamily="Bravura"
          fontSize={fontSize}
          fill="#F08237"
        >
          {String.fromCodePoint(spec.codepoint)}
        </text>
        {showStem ? (
          <line
            x1={stemX}
            y1={ghost.cy}
            x2={stemX}
            y2={stemY2}
            stroke="#F08237"
            strokeWidth={ENGRAVING_DEFAULTS.stemThickness * ls}
          />
        ) : null}
      </g>
      {label ? (
        <text
          x={labelX}
          y={labelY}
          fontFamily="var(--font-inter), sans-serif"
          fontSize={labelFontSize}
          fontWeight={600}
          fill="#F08237"
          style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 3 }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
