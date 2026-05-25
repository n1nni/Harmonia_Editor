'use client';

import { Toggle } from './primitives/Toggle';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useDisplay } from '@/lib/store/selectors';

export function ReconstructionToggle() {
  const { reconstructionOn } = useDisplay();
  const { setReconstructionOn } = useHarmonyActions();
  return (
    <Toggle
      label="Show source image"
      description="Hide to view overlay only"
      checked={reconstructionOn}
      onChange={setReconstructionOn}
    />
  );
}
