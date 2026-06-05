'use client';

import { useImageDims, useDebugFlags } from '@/lib/store/selectors';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useBravuraFont } from '@/lib/smufl/useBravuraFont';
import { BboxLayer } from '@/components/debug/BboxLayer';
import { CenterDotLayer } from '@/components/debug/CenterDotLayer';
import { StaffBaselineLayer } from '@/components/debug/StaffBaselineLayer';
import { LabelLayer } from '@/components/debug/LabelLayer';
import { TransformGrid } from '@/components/debug/TransformGrid';
import { MusicLayer } from '@/lib/render/svg/MusicLayer';
import { HoverHighlight } from './HoverHighlight';
import { HitTestLayer } from './HitTestLayer';
import { StaffSelectionOverlay } from './staff/StaffSelectionOverlay';

/**
 * Root SVG layer. Sized to the image's natural pixel dimensions with
 * `viewBox = "0 0 imageW imageH"` -> SVG user space == image space.
 *
 * Layer order (bottom -> top):
 *   1. TransformGrid (debug)
 *   2. StaffBaselineLayer (debug)
 *   3. MusicLayer (staff lines + beams + slurs + SMuFL glyphs)
 *   4. HoverHighlight (selection/hover glow under the hit-test layer)
 *   5. BboxLayer (debug)
 *   6. CenterDotLayer (debug)
 *   7. LabelLayer (debug)
 *   8. HitTestLayer (transparent pointer capture; topmost)
 */
export function OverlaySvg() {
  const dims = useImageDims();
  const debug = useDebugFlags();
  const bravuraLoaded = useBravuraFont();
  // When the source image is visible, overlay reads in accent violet.
  // When the source image is hidden, the reconstruction stands alone on
  // the light canvas backdrop; switch to near-black for ink-on-paper feel.
  const overlayColor = useHarmonyStore((s) =>
    s.display.reconstructionOn ? '#6442FF' : '#16161C',
  );

  if (!dims) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dims.w}
      height={dims.h}
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', color: overlayColor }}
    >
      {debug.grid ? <TransformGrid /> : null}
      {debug.baselines ? <StaffBaselineLayer /> : null}

      {bravuraLoaded ? <MusicLayer /> : null}

      <HoverHighlight />
      <StaffSelectionOverlay />

      {debug.bboxes ? <BboxLayer /> : null}
      {debug.centers ? <CenterDotLayer /> : null}
      {debug.labels ? <LabelLayer /> : null}

      <HitTestLayer />
    </svg>
  );
}
