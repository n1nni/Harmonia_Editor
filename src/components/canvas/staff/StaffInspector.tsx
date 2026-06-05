'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  useDpi,
  useRaw,
  useSelectedStaffKey,
  useStaffInspectorVisible,
  useStaffTransforms,
} from '@/lib/store/selectors';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { staffBboxImage } from '@/lib/staff/bbox';
import { staffKey } from '@/lib/staff/keys';
import { IDENTITY_TRANSFORM, type StaffTransform } from '@/lib/staff/types';
import { cn } from '@/lib/utils/cn';

/**
 * Top-right inspector for the selected staff.
 *
 * Phase 8b: X / Y / W / H are LIVE editable inputs. Typing updates the
 * transform in real time via setStaffTransform; on blur or Enter we
 * commit a `staff-transform` EditAction so the typed change is one
 * undo step.
 *
 * Units toggle px/mm is wired through `display.dpi` (default 300).
 * Lock toggle constrains the aspect ratio on W/H changes.
 *
 * Inputs use uncontrolled (`defaultValue`) for the active field so the
 * user's typing is never overwritten mid-keystroke by a re-render. The
 * "current" values from props drive the OTHER (not-active) fields.
 */

type Field = 'x' | 'y' | 'w' | 'h';

export function StaffInspector() {
  const visible = useStaffInspectorVisible();
  const raw = useRaw();
  const selectedKey = useSelectedStaffKey();
  const transforms = useStaffTransforms();
  const dpi = useDpi();
  const { selectStaff, setStaffTransform, recordStaffTransform } = useHarmonyActions();

  const [unit, setUnit] = useState<'px' | 'mm'>('px');
  const [locked, setLocked] = useState(false);
  const editingRef = useRef<{ field: Field; baseTransform: StaffTransform } | null>(null);

  // px ↔ mm: 1 inch = 25.4 mm; px/mm = dpi / 25.4.
  const pxPerMm = dpi / 25.4;
  const fromUnits = useCallback(
    (display: number) => (unit === 'mm' ? display * pxPerMm : display),
    [unit, pxPerMm],
  );
  const toUnits = useCallback(
    (px: number) => (unit === 'mm' ? px / pxPerMm : px),
    [unit, pxPerMm],
  );

  const target = useMemo(() => {
    if (!raw || !selectedKey) return null;
    const staff = raw.detections.find((s) => staffKey(s) === selectedKey);
    if (!staff) return null;
    const bbox = staffBboxImage(staff);
    const t = transforms.get(selectedKey) ?? IDENTITY_TRANSFORM;
    const w0 = bbox.x2 - bbox.x1;
    const h0 = bbox.y2 - bbox.y1;
    return {
      key: selectedKey,
      partId: staff.part_id,
      staffInPart: staff.staff_in_part,
      base: { x: bbox.x1, y: bbox.y1, w: w0, h: h0 },
      transform: t,
      effective: {
        x: bbox.x1 + t.tx,
        y: bbox.y1 + t.ty,
        w: w0 * t.sx,
        h: h0 * t.sy,
      },
    };
  }, [raw, selectedKey, transforms]);

  if (!visible || !target) return null;

  const { base, effective, transform, key: targetKey } = target;

  /**
   * Build a new StaffTransform when the user types a single field.
   * For W/H, locked mode mirrors the change to the other axis.
   */
  function transformFor(field: Field, valuePx: number): StaffTransform {
    const nextT = { ...transform };
    if (field === 'x') {
      nextT.tx = valuePx - base.x;
    } else if (field === 'y') {
      nextT.ty = valuePx - base.y;
    } else if (field === 'w') {
      const newSx = Math.max(0.05, valuePx / base.w);
      nextT.sx = newSx;
      if (locked) nextT.sy = newSx;
    } else {
      const newSy = Math.max(0.05, valuePx / base.h);
      nextT.sy = newSy;
      if (locked) nextT.sx = newSy;
    }
    return nextT;
  }

  function onFieldChange(field: Field) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (!editingRef.current || editingRef.current.field !== field) {
        editingRef.current = { field, baseTransform: transform };
      }
      const v = Number(e.currentTarget.value);
      if (!Number.isFinite(v)) return;
      const px = fromUnits(v);
      setStaffTransform(targetKey, transformFor(field, px));
    };
  }

  function commit() {
    if (!editingRef.current) return;
    const { baseTransform } = editingRef.current;
    const current = transforms.get(targetKey) ?? IDENTITY_TRANSFORM;
    recordStaffTransform(targetKey, baseTransform, current);
    editingRef.current = null;
  }

  function onKeyDown(field: Field) {
    return (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.currentTarget as HTMLInputElement).blur();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const sign = e.key === 'ArrowUp' ? +1 : -1;
        const currentDisplay = Number(e.currentTarget.value) || toUnits(effective[field]);
        const next = currentDisplay + sign * step;
        e.currentTarget.value = String(next);
        if (!editingRef.current) {
          editingRef.current = { field, baseTransform: transform };
        }
        setStaffTransform(targetKey, transformFor(field, fromUnits(next)));
      }
    };
  }

  const fmt = (px: number) => toUnits(px).toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        key={target.key}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute right-5 top-5 z-10 w-[260px] rounded-lg border border-line bg-surface-panel px-4 py-3 shadow-float"
      >
        <header className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
          <span>Staff</span>
          <span>{target.partId} · {target.staffInPart}</span>
        </header>

        <div className="mb-2 text-sm font-medium text-text-primary">
          {target.key}
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-1.5 font-mono text-[11px] tabular-nums">
          <Field label="X" value={fmt(effective.x)} onChange={onFieldChange('x')} onKeyDown={onKeyDown('x')} onBlur={commit} />
          <Field label="Y" value={fmt(effective.y)} onChange={onFieldChange('y')} onKeyDown={onKeyDown('y')} onBlur={commit} />
          <Field label="W" value={fmt(effective.w)} onChange={onFieldChange('w')} onKeyDown={onKeyDown('w')} onBlur={commit} />
          <Field label="H" value={fmt(effective.h)} onChange={onFieldChange('h')} onKeyDown={onKeyDown('h')} onBlur={commit} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex rounded-md border border-line bg-surface-elevated p-0.5 font-mono text-[10px] uppercase tracking-widest">
            {(['px', 'mm'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  u === unit ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            aria-pressed={locked}
            title="Lock aspect ratio (W and H scale together)"
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest',
              locked
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line bg-surface-elevated text-text-tertiary',
            )}
          >
            <LockGlyph locked={locked} />
            Lock
          </button>
        </div>

        <button
          type="button"
          onClick={() => selectStaff(null)}
          className="mt-3 w-full rounded-md border border-line bg-surface-elevated py-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          Deselect
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

function Field({ label, value, onChange, onKeyDown, onBlur }: FieldProps) {
  return (
    <>
      <span className="text-text-tertiary">{label}</span>
      <input
        type="number"
        step={0.1}
        // `key={value}` would reset typing — instead use defaultValue keyed
        // so when the value changes externally (drag), the input updates.
        // We accomplish that by passing `value` as the key.
        key={value}
        defaultValue={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="w-full rounded border border-line bg-surface-elevated px-1.5 py-0.5 text-right text-text-primary tabular-nums focus:border-accent/50 focus:outline-none"
      />
    </>
  );
}

function LockGlyph({ locked }: { locked: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path
        d={locked ? 'M4 5.5V4a2 2 0 0 1 4 0v1.5' : 'M4 5.5V4a2 2 0 0 1 4 0'}
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}
