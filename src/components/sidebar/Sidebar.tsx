'use client';

import { Section } from './primitives/Section';
import { UploadButton } from './UploadButton';
import { ReconstructionToggle } from './ReconstructionToggle';
import { OverlayOpacitySlider } from './OverlayOpacitySlider';
import { ZoomControls } from './ZoomControls';
import { DebugToggles } from './DebugToggles';
import { SequenceControls } from './SequenceControls';
import { SaveButton } from './SaveButton';
import { useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useRaw } from '@/lib/store/selectors';

export function Sidebar() {
  const status = useHarmonyStore((s) => s.data.status);
  const raw = useRaw();

  const totalDetections =
    raw?.detections.reduce((acc, s) => acc + s.detections.length, 0) ?? 0;
  const staffCount = raw?.detections.length ?? 0;

  return (
    <aside className="flex h-full flex-col border-r border-line-subtle bg-surface-panel">
      {/* Brand + Save */}
      <header className="flex h-14 items-center justify-between border-b border-line-subtle px-4">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="font-semibold tracking-tight text-text-primary">
            Harmony
          </span>
        </div>
        <SaveButton />
      </header>

      <div className="flex-1 overflow-y-auto py-1">
        <UploadButton />

        <Section title="Display">
          <ReconstructionToggle />
          <OverlayOpacitySlider />
        </Section>

        <Section title="Viewport">
          <ZoomControls />
        </Section>

        <Section title="Sequence" defaultOpen>
          <SequenceControls />
        </Section>

        <Section title="Debug">
          <DebugToggles />
        </Section>
      </div>

      {/* Status strip */}
      <footer className="border-t border-line-subtle px-5 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
          <span>
            <StatusDot status={status} /> {status}
          </span>
          {staffCount > 0 ? (
            <span>
              {staffCount} staves · {totalDetections} det
            </span>
          ) : null}
        </div>
      </footer>
    </aside>
  );
}

function BrandMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" stroke="#7C5CFF" strokeWidth="1.2" />
      <path
        d="M6 5.5v6M12 4v6M6 11.5a1.5 1.5 0 1 1-1.5-1.5M12 10a1.5 1.5 0 1 1-1.5-1.5M6 7l6-1.5"
        stroke="#7C5CFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ready'
      ? '#5BF7AC'
      : status === 'loading'
        ? '#F7C75B'
        : status === 'error'
          ? '#F75B5B'
          : '#5F5F6B';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
        verticalAlign: 'middle',
      }}
    />
  );
}
