'use client';

import { useEffect, useState } from 'react';
import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { setImagePixels } from '@/lib/staff/imagePixels';

/**
 * Renders the rectified sheet-music image (from `rectified_image_b64`).
 * On load, writes natural pixel dimensions into the store so the overlay
 * can lock its viewBox and the canvas can compute fit-scale.
 *
 * Coordinate contract: image displays at its native pixel size in this
 * component's local coordinate space. The parent <CanvasStage> applies
 * the CSS transform that scales both backdrop and overlay together.
 */
export function ImageBackdrop() {
  const raw = useHarmonyStore((s) => s.data.raw);
  const { setImageDims } = useHarmonyActions();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) return;
    setSrc(`data:${raw.rectified_image_mime};base64,${raw.rectified_image_b64}`);
  }, [raw]);

  if (!src) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="Rectified sheet music"
      draggable={false}
      onLoad={(e) => {
        const el = e.currentTarget;
        setImageDims({ w: el.naturalWidth, h: el.naturalHeight });
        // Populate the grayscale pixel cache used by IoU Auto-Align. Safe
        // to call synchronously — the img element is fully decoded by the
        // time onLoad fires.
        setImagePixels(el);
      }}
      style={{
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        // Natural pixel size; outer CSS transform handles scaling.
        width: 'auto',
        height: 'auto',
        imageRendering: 'auto',
      }}
    />
  );
}
