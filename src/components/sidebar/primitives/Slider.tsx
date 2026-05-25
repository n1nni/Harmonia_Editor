'use client';

import { useCallback } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.currentTarget.value));
    },
    [onChange],
  );

  return (
    <div className="px-2 py-1.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-text-primary">{label}</span>
        <span className="font-mono text-xs text-text-secondary">
          {format ? format(value) : value}
        </span>
      </div>
      <div className="relative">
        <div
          className="h-1 rounded-full bg-surface-elevated"
          style={{
            backgroundImage: `linear-gradient(to right, #7C5CFF ${pct}%, transparent ${pct}%)`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
          style={{ WebkitAppearance: 'none' }}
        />
        <style jsx>{`
          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #7c5cff;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
            cursor: pointer;
            margin-top: -6px;
          }
          input[type='range']::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid #7c5cff;
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
