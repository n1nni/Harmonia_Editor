'use client';

import { Slider } from './primitives/Slider';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useDisplay } from '@/lib/store/selectors';

export function OverlayOpacitySlider() {
  const { overlayOpacity } = useDisplay();
  const { setOverlayOpacity } = useHarmonyActions();
  return (
    <Slider
      label="Overlay opacity"
      value={Math.round(overlayOpacity * 100)}
      min={0}
      max={100}
      onChange={(v) => setOverlayOpacity(v / 100)}
      format={(v) => `${v}%`}
    />
  );
}
