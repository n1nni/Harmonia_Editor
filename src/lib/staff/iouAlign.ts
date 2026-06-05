/**
 * IoU-based 2D Auto-Align algorithm.
 *
 * Given a notehead detection `d`, its current rendered position, and the
 * image pixel buffer, find the position inside a 2× bbox search window
 * where a hypothetical bbox of the same size best overlaps the actual
 * ink (dark pixels) in the image.
 *
 * Steps:
 *   1. Carve an analysis region around the note's current effective position.
 *      Size = 3× bbox so every candidate's bbox fits entirely inside it.
 *   2. Threshold the analysis region's grayscale pixels to a binary ink mask.
 *   3. Build a summed-area table (integral image) of the mask for O(1)
 *      rectangle sums.
 *   4. Score every candidate centre (cx, cy) inside the search window by
 *      IoU between the candidate bbox and the ink mask.
 *   5. Return the offset (relative to OMR's `d.cx, d.cy`) that aligns the
 *      bbox with the best-IoU position.
 *
 * Since `|A| = w*h` and `|B| = totalInk` are constants across candidates,
 * argmax IoU reduces to argmax (ink-pixels inside candidate bbox). The
 * IoU value itself is still useful as a confidence floor.
 *
 * Pure function: no React, no DOM, no store. Testable by handing it a
 * hand-rolled `ImagePixels` buffer with a known ink blob.
 */

import type { Detection } from '@/types/omr';
import type { AlignOffset } from '@/lib/store/useHarmonyStore';
import type { ImagePixels } from './imagePixels';

const INK_THRESHOLD = 128; // pixel luminance < 128 == ink
const MIN_IOU = 0.05; // refuse to move if the best overlap is weaker than this

export interface IoUAlignResult {
  offset: AlignOffset;
  iou: number;
}

export function computeAutoAlignIoU(
  d: Detection,
  effectiveCx: number,
  effectiveCy: number,
  pitchShiftDy: number,
  pixels: ImagePixels,
): IoUAlignResult | null {
  const w = d.x2 - d.x1;
  const h = d.y2 - d.y1;
  if (w <= 0 || h <= 0) return null;

  // Analysis region: 3× bbox, centred on current effective position. Must
  // cover every candidate's bbox plus margin. Clipped to image bounds.
  const halfW = w / 2;
  const halfH = h / 2;
  const padW = 1.5 * w;
  const padH = 1.5 * h;
  const ax0 = Math.max(0, Math.floor(effectiveCx - padW));
  const ay0 = Math.max(0, Math.floor(effectiveCy - padH));
  const ax1 = Math.min(pixels.w, Math.ceil(effectiveCx + padW));
  const ay1 = Math.min(pixels.h, Math.ceil(effectiveCy + padH));
  const aW = ax1 - ax0;
  const aH = ay1 - ay0;
  if (aW <= 0 || aH <= 0) return null;

  // Threshold + integral image in one pass. S has dimensions (aH+1)×(aW+1)
  // with the first row & column zero, so rectangle sums need no bounds
  // checks. Using Int32Array for safe accumulation (max value ~ aW*aH).
  const S = new Int32Array((aH + 1) * (aW + 1));
  const stride = aW + 1;
  for (let y = 0; y < aH; y++) {
    const srcRowStart = (ay0 + y) * pixels.w + ax0;
    const dstRowStart = (y + 1) * stride + 1;
    const prevRowStart = y * stride + 1;
    let rowSum = 0;
    for (let x = 0; x < aW; x++) {
      const px = pixels.data[srcRowStart + x] ?? 255;
      rowSum += px < INK_THRESHOLD ? 1 : 0;
      S[dstRowStart + x] = rowSum + (S[prevRowStart + x] ?? 0);
    }
  }
  const totalInk = S[(aH + 1) * stride - 1] ?? 0;
  if (totalInk === 0) return null;

  const sumRect = (x0: number, y0: number, x1: number, y1: number): number => {
    // x0/y0 inclusive, x1/y1 exclusive — both in analysis-region coords.
    // Clipped to [0, aW]×[0, aH].
    const cx0 = Math.max(0, x0);
    const cy0 = Math.max(0, y0);
    const cx1 = Math.min(aW, x1);
    const cy1 = Math.min(aH, y1);
    if (cx1 <= cx0 || cy1 <= cy0) return 0;
    return (
      (S[cy1 * stride + cx1] ?? 0) -
      (S[cy0 * stride + cx1] ?? 0) -
      (S[cy1 * stride + cx0] ?? 0) +
      (S[cy0 * stride + cx0] ?? 0)
    );
  };

  // Search window: ±w horizontally, ±h vertically around effective position.
  // Iterate integer candidate centres. Round bbox corners with the same
  // half-width convention used throughout the renderer.
  const candCx0 = Math.floor(effectiveCx - w);
  const candCy0 = Math.floor(effectiveCy - h);
  const candCx1 = Math.ceil(effectiveCx + w);
  const candCy1 = Math.ceil(effectiveCy + h);
  const bboxArea = w * h;

  let bestIou = -1;
  let bestCx = effectiveCx;
  let bestCy = effectiveCy;
  let bestDist = Infinity;

  for (let cy = candCy0; cy <= candCy1; cy++) {
    for (let cx = candCx0; cx <= candCx1; cx++) {
      // Candidate bbox in analysis-region coordinates.
      const bx0 = Math.round(cx - halfW) - ax0;
      const by0 = Math.round(cy - halfH) - ay0;
      const bx1 = Math.round(cx + halfW) - ax0;
      const by1 = Math.round(cy + halfH) - ay0;
      const inkInA = sumRect(bx0, by0, bx1, by1);
      // IoU = inkInA / (|A| + |B| - inkInA)
      const iou = inkInA / (bboxArea + totalInk - inkInA);
      if (iou < bestIou) continue;
      const dx = cx - effectiveCx;
      const dy = cy - effectiveCy;
      const dist = dx * dx + dy * dy;
      // Strict-greater wins outright; tie goes to the smallest visual move.
      if (iou > bestIou || dist < bestDist) {
        bestIou = iou;
        bestCx = cx;
        bestCy = cy;
        bestDist = dist;
      }
    }
  }

  if (bestIou < MIN_IOU) return null;
  if (bestCx === effectiveCx && bestCy === effectiveCy) return null;

  const dxNew = bestCx - d.cx;
  const dyNew = bestCy - d.cy - pitchShiftDy;
  return { offset: { dx: dxNew, dy: dyNew }, iou: bestIou };
}
