'use client';

import { memo } from 'react';
import type { Detection, RawStaff } from '@/types/omr';
import { useRaw, useDeletedIds, usePitchShifts } from '@/lib/store/selectors';
import { glyphFor, renderScaleFor } from '@/lib/smufl/glyphMap';
import { applyPitchShiftToDetection } from '@/lib/music/applyEdits';
import { Glyph } from './Glyph';
import { StaffLines } from './StaffLines';
import { Beam } from './Beam';
import { Slur } from './Slur';
import { Stem, type StemDirection } from './Stem';

/**
 * Composes the full reconstructed score:
 *   - one <g> per staff carrying the staff's line_spacing context
 *   - inside each staff: 5 staff lines + every detection routed to the
 *     right primitive (Glyph / Beam / Slur), plus a stem per notehead.
 *
 * Stems use the standard middle-line rule: notes above the middle staff
 * line get stems-down, others get stems-up. (Multi-voice cases will need
 * voice-aware logic later — flagged in the plan.)
 */
export const MusicLayer = memo(function MusicLayer() {
  const raw = useRaw();
  const deletedIds = useDeletedIds();
  const pitchShifts = usePitchShifts();
  if (!raw) return null;

  return (
    <g pointerEvents="none">
      {raw.detections.map((staff) => (
        <StaffGroup
          key={`${staff.part_id}-${staff.staff_in_part}`}
          staff={staff}
          deletedIds={deletedIds}
          pitchShifts={pitchShifts}
        />
      ))}
    </g>
  );
});

function isNoteheadClass(c: Detection['class']): boolean {
  return c === 'noteheadBlack' || c === 'noteheadHalf';
}

interface StaffGroupProps {
  staff: RawStaff;
  deletedIds: ReadonlySet<string>;
  pitchShifts: ReadonlyMap<string, number>;
}

const StaffGroup = memo(function StaffGroup({
  staff,
  deletedIds,
  pitchShifts,
}: StaffGroupProps) {
  const ls = staff.line_spacing;
  // Middle staff line = third element (index 2) in line_positions.
  const middleY = staff.line_positions[2] ?? (staff.top_y + staff.bot_y) / 2;

  // Render order:
  //   1. staff lines
  //   2. beams (block fills behind glyphs)
  //   3. slurs (strokes)
  //   4. stems (under noteheads so the head visually caps the stem)
  //   5. glyphs (always on top)
  //
  // Noteheads carrying a pitch shift are translated vertically here so that
  // the glyph, the stem, and the implicit stem-direction rule all act on the
  // shifted position.
  const beams: Detection[] = [];
  const slurs: Detection[] = [];
  const noteheads: Detection[] = [];
  const otherGlyphs: Detection[] = [];

  for (const d of staff.detections) {
    if (deletedIds.has(d.id)) continue;
    if (d.class === 'beam') beams.push(d);
    else if (d.class === 'slur') slurs.push(d);
    else if (isNoteheadClass(d.class)) {
      const shift = pitchShifts.get(d.id) ?? 0;
      noteheads.push(shift === 0 ? d : applyPitchShiftToDetection(d, shift, ls));
    } else otherGlyphs.push(d);
  }

  return (
    <g data-staff={`${staff.part_id}-${staff.staff_in_part}`}>
      <StaffLines staff={staff} />

      {beams.map((d) => (
        <Beam key={d.id} detection={d} />
      ))}

      {slurs.map((d) => (
        <Slur key={d.id} detection={d} lineSpacing={ls} />
      ))}

      {noteheads.map((d) => {
        const direction: StemDirection = d.cy < middleY ? 'down' : 'up';
        return (
          <Stem
            key={`stem-${d.id}`}
            cx={d.cx}
            cy={d.cy}
            direction={direction}
            lineSpacing={ls}
          />
        );
      })}

      {noteheads.map((d) => {
        const spec = glyphFor(d.class);
        if (!spec) return null;
        return (
          <Glyph
            key={d.id}
            spec={spec}
            cx={d.cx}
            cy={d.cy}
            lineSpacing={ls}
            scale={renderScaleFor(d.class)}
          />
        );
      })}

      {otherGlyphs.map((d) => {
        const spec = glyphFor(d.class);
        if (!spec) return null;
        return (
          <Glyph
            key={d.id}
            spec={spec}
            cx={d.cx}
            cy={d.cy}
            lineSpacing={ls}
            scale={renderScaleFor(d.class)}
          />
        );
      })}
    </g>
  );
});
