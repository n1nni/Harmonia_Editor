'use client';

import { Toggle } from './primitives/Toggle';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useDebugFlags } from '@/lib/store/selectors';
import type { DebugFlags } from '@/lib/store/useHarmonyStore';

const ITEMS: { key: keyof DebugFlags; label: string; description?: string }[] = [
  { key: 'bboxes', label: 'Bounding boxes', description: 'Per-detection rectangle' },
  { key: 'centers', label: 'Centers', description: 'Notehead anchor dots' },
  { key: 'baselines', label: 'Staff baselines', description: 'Five-line rulers' },
  { key: 'labels', label: 'Class labels', description: 'Symbol class + confidence' },
  { key: 'grid', label: 'Image grid', description: '100-px coordinate grid' },
];

export function DebugToggles() {
  const flags = useDebugFlags();
  const { toggleDebug } = useHarmonyActions();
  return (
    <div className="space-y-0">
      {ITEMS.map((it) => (
        <Toggle
          key={it.key}
          label={it.label}
          description={it.description}
          checked={flags[it.key]}
          onChange={() => toggleDebug(it.key)}
          dense
        />
      ))}
    </div>
  );
}
