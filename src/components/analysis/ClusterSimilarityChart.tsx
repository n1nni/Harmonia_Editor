'use client';

import { useState } from 'react';
import type { PredictionBlock } from '@/types/classification';

/**
 * Cluster Similarity bar chart, rendered in pure SVG.
 *
 *  - One bar per cluster in `prediction.all_probabilities` (typically 22).
 *  - The predicted cluster (the argmax) is highlighted in green with a
 *    red border, matching the conventional palette of the reference
 *    matplotlib output.
 *  - All other bars are accent-blue.
 *  - A dashed reference line marks the 5 % confidence floor: clusters
 *    below it are considered noise.
 *  - Each bar carries an `<title>` element so the browser shows a native
 *    tooltip on hover; in-app hover state also drives a richer tooltip
 *    rendered as an absolutely-positioned floating div.
 *
 * The chart is fully responsive: it scales to fill its parent container
 * via the SVG `viewBox` + `preserveAspectRatio="xMidYMid meet"` model.
 */

interface Props {
  prediction: PredictionBlock;
}

const W = 920;            // virtual viewBox width
const H = 360;            // virtual viewBox height
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 24;
const PAD_B = 44;
const THRESHOLD = 0.05;   // 5 % reference line

interface HoverInfo {
  clusterNumber: number;
  probability: number;
  screenX: number;
  screenY: number;
}

export function ClusterSimilarityChart({ prediction }: Props) {
  const probs = prediction.all_probabilities;
  const n = probs.length;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // Y-axis upper bound: round up to the next 10 % beyond the max, with a
  // 70 % minimum so a confident prediction doesn't visually saturate.
  const maxProb = Math.max(...probs);
  const yMax = Math.max(0.7, Math.ceil(maxProb * 10) / 10);

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += 0.1) yTicks.push(Math.round(v * 10) / 10);

  const barGap = 6;
  const barW = (innerW - barGap * (n - 1)) / n;
  const yScale = (p: number) => (1 - p / yMax) * innerH + PAD_T;
  const xForBar = (i: number) => PAD_L + i * (barW + barGap);

  const [hover, setHover] = useState<HoverInfo | null>(null);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        role="img"
        aria-label="Cluster similarity bar chart"
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
                {Math.round(tick * 100)}%
              </text>
            </g>
          );
        })}

        {/* 5 % threshold reference line */}
        <line
          x1={PAD_L}
          y1={yScale(THRESHOLD)}
          x2={W - PAD_R}
          y2={yScale(THRESHOLD)}
          stroke="#9CA3AF"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <text
          x={W - PAD_R - 4}
          y={yScale(THRESHOLD) - 4}
          textAnchor="end"
          fontFamily="var(--font-inter), sans-serif"
          fontSize={10}
          fill="#6B7280"
          fontStyle="italic"
        >
          5% threshold
        </text>

        {/* Bars */}
        {probs.map((p, i) => {
          const clusterNumber = i + 1;
          const isPredicted = clusterNumber === prediction.predicted_cluster;
          const y0 = yScale(0);
          const y1 = yScale(p);
          const height = Math.max(0, y0 - y1);
          const x = xForBar(i);
          const fill = isPredicted ? '#86EFAC' : '#93C5FD';
          const stroke = isPredicted ? '#DC2626' : '#1D4ED8';
          const sw = isPredicted ? 2 : 1;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y1}
                width={barW}
                height={height}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
                rx={1}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as SVGRectElement;
                  const r = target.getBoundingClientRect();
                  setHover({
                    clusterNumber,
                    probability: p,
                    screenX: r.left + r.width / 2,
                    screenY: r.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`Cluster ${clusterNumber}: ${(p * 100).toFixed(1)}%`}</title>
              </rect>
              {/* Value label on top of non-zero bars */}
              {p > 0.005 ? (
                <text
                  x={x + barW / 2}
                  y={y1 - 4}
                  textAnchor="middle"
                  fontFamily="var(--font-inter), sans-serif"
                  fontSize={p > 0.1 ? 11 : 9}
                  fontWeight={isPredicted ? 700 : 500}
                  fill={isPredicted ? '#166534' : '#1E3A8A'}
                >
                  {(p * 100).toFixed(1)}%
                </text>
              ) : null}
              {/* X-axis label */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 16}
                textAnchor="middle"
                fontFamily="var(--font-inter), sans-serif"
                fontSize={10}
                fill={isPredicted ? '#DC2626' : '#6B7280'}
                fontWeight={isPredicted ? 700 : 500}
              >
                {clusterNumber}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 6}
          textAnchor="middle"
          fontFamily="var(--font-inter), sans-serif"
          fontSize={12}
          fontWeight={600}
          fill="#374151"
        >
          Cluster
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
          Similarity (%)
        </text>
      </svg>

      {/* Legend (positioned in DOM so its font size stays constant) */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded border border-line bg-surface-panel/90 px-2 py-1.5 text-[11px] shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: '#86EFAC', border: '1.5px solid #DC2626' }}
          />
          <span>Predicted: Cluster {prediction.predicted_cluster}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: '#93C5FD', border: '1px solid #1D4ED8' }}
          />
          <span>Other clusters</span>
        </div>
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
          <div className="font-semibold">Cluster {hover.clusterNumber}</div>
          <div className="tabular-nums text-text-secondary">
            {(hover.probability * 100).toFixed(2)}%
          </div>
        </div>
      ) : null}
    </div>
  );
}
