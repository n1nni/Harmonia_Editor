'use client';

import { useMemo, useState } from 'react';
import type { PatternName, PatternEntry } from '@/types/classification';

/**
 * Pattern Analysis bar chart, rendered in pure SVG.
 *
 *  - One bar per pattern in the upstream `patterns_detected` map.
 *  - Bars are sorted in descending order of `feature_value`, mirroring
 *    the reference matplotlib output.
 *  - Color encodes the strength of the pattern:
 *
 *        Not detected (=0)   light grey
 *        Low (<0.2)          light blue
 *        Moderate (0.2-0.5)  blue
 *        High (0.5-1.0)      dark blue
 *        Very high (>1.0)    very dark blue
 *
 *  - The y-axis is computed dynamically: it tops out at the next 0.05
 *    boundary above the max value, with a 0.05 floor so a sparse score
 *    isn't displayed against a degenerate axis.
 *  - Pattern labels run along the x-axis at a slight angle so long
 *    identifiers (e.g. `quarter_fifth_chord`) remain legible.
 */

interface Props {
  patterns: Record<PatternName, PatternEntry>;
  /** Display order for the upstream feature_names. Bars are sorted by
   *  value descending; this argument fixes a stable secondary order so
   *  ties don't flip on re-render. */
  order: readonly PatternName[];
  predictedCluster: number;
  confidencePercent: string;
}

interface BarDatum {
  name: PatternName;
  value: number;
  status: 'detected' | 'absent';
}

const W = 920;
const H = 360;
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 24;
const PAD_B = 90;

interface HoverInfo {
  name: PatternName;
  value: number;
  status: 'detected' | 'absent';
  screenX: number;
  screenY: number;
}

function colorFor(value: number): { fill: string; stroke: string; label: string } {
  if (value <= 0) return { fill: '#E5E7EB', stroke: '#9CA3AF', label: 'Not detected (0)' };
  if (value < 0.2) return { fill: '#BFDBFE', stroke: '#60A5FA', label: 'Low (< 0.2)' };
  if (value < 0.5) return { fill: '#60A5FA', stroke: '#2563EB', label: 'Moderate (0.2-0.5)' };
  if (value <= 1.0) return { fill: '#2563EB', stroke: '#1E3A8A', label: 'High (0.5-1.0)' };
  return { fill: '#1E3A8A', stroke: '#0F172A', label: 'Very high (> 1.0)' };
}

const LEGEND_ROWS: Array<{ color: string; stroke: string; label: string }> = [
  { color: '#E5E7EB', stroke: '#9CA3AF', label: 'Not detected (0)' },
  { color: '#BFDBFE', stroke: '#60A5FA', label: 'Low (< 0.2)' },
  { color: '#60A5FA', stroke: '#2563EB', label: 'Moderate (0.2-0.5)' },
  { color: '#2563EB', stroke: '#1E3A8A', label: 'High (0.5-1.0)' },
  { color: '#1E3A8A', stroke: '#0F172A', label: 'Very high (> 1.0)' },
];

export function PatternAnalysisChart({ patterns, order }: Props) {
  // Build sorted dataset. Sort descending by value; ties broken by the
  // upstream order so the bar layout is stable across renders.
  const bars: BarDatum[] = useMemo(() => {
    const indexOf = (n: PatternName) => order.indexOf(n);
    return (Object.keys(patterns) as PatternName[])
      .map<BarDatum>((name) => ({
        name,
        value: patterns[name].features.feature_value,
        status: patterns[name].status,
      }))
      .sort((a, b) => (b.value - a.value) || (indexOf(a.name) - indexOf(b.name)));
  }, [patterns, order]);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const maxV = Math.max(...bars.map((b) => b.value));
  const yMax = Math.max(0.05, Math.ceil(maxV / 0.025) * 0.025);
  const yTickStep = yMax > 0.1 ? 0.025 : 0.0125;

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += yTickStep) {
    yTicks.push(Math.round(v * 1000) / 1000);
  }

  const barGap = 16;
  const n = bars.length;
  const barW = (innerW - barGap * (n - 1)) / n;
  const yScale = (v: number) => (1 - v / yMax) * innerH + PAD_T;
  const xForBar = (i: number) => PAD_L + i * (barW + barGap);

  const [hover, setHover] = useState<HoverInfo | null>(null);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        role="img"
        aria-label="Pattern analysis bar chart"
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? undefined : '2 3'}
              />
              <text
                x={PAD_L - 8}
                y={y + 4}
                textAnchor="end"
                fontFamily="var(--font-inter), sans-serif"
                fontSize={11}
                fill="#6B7280"
              >
                {tick.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => {
          const c = colorFor(bar.value);
          const y0 = yScale(0);
          const y1 = yScale(bar.value);
          const height = Math.max(0, y0 - y1);
          const x = xForBar(i);
          return (
            <g key={bar.name}>
              <rect
                x={x}
                y={y1}
                width={barW}
                height={height}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={1}
                rx={1}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as SVGRectElement;
                  const r = target.getBoundingClientRect();
                  setHover({
                    name: bar.name,
                    value: bar.value,
                    status: bar.status,
                    screenX: r.left + r.width / 2,
                    screenY: r.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${bar.name}: ${bar.value.toFixed(3)} (${c.label})`}</title>
              </rect>
              {/* Value label */}
              {bar.value > 0 ? (
                <text
                  x={x + barW / 2}
                  y={y1 - 5}
                  textAnchor="middle"
                  fontFamily="var(--font-inter), sans-serif"
                  fontSize={11}
                  fontWeight={600}
                  fill="#1F2937"
                >
                  {bar.value.toFixed(3)}
                </text>
              ) : null}
              {/* Rotated x-axis pattern label */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 10}
                textAnchor="end"
                transform={`rotate(-30 ${x + barW / 2} ${H - PAD_B + 10})`}
                fontFamily="var(--font-inter), sans-serif"
                fontSize={11}
                fill={bar.value > 0 ? '#111827' : '#9CA3AF'}
              >
                {bar.name}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          fontFamily="var(--font-inter), sans-serif"
          fontSize={12}
          fontWeight={600}
          fill="#374151"
        >
          Pattern
        </text>
        <text
          x={16}
          y={H / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${H / 2})`}
          fontFamily="var(--font-inter), sans-serif"
          fontSize={12}
          fontWeight={600}
          fill="#374151"
        >
          Pattern Value
        </text>
      </svg>

      {/* Legend (DOM-level so font size stays constant) */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded border border-line bg-surface-panel/90 px-2 py-1.5 text-[11px] shadow-sm">
        {LEGEND_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: row.color, border: `1px solid ${row.stroke}` }}
            />
            <span>{row.label}</span>
          </div>
        ))}
      </div>

      {/* Floating tooltip */}
      {hover ? (
        <div
          className="pointer-events-none fixed z-50 rounded border border-line bg-surface-panel px-2 py-1 text-[11px] shadow-float"
          style={{
            left: hover.screenX,
            top: hover.screenY - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold">{hover.name}</div>
          <div className="tabular-nums text-text-secondary">
            value: {hover.value.toFixed(4)}
          </div>
          <div className="text-text-secondary">
            status: {hover.status}
          </div>
        </div>
      ) : null}
    </div>
  );
}
