'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHarmonyActions } from '@/lib/store/useHarmonyStore';
import { useClassificationPanelOpen } from '@/lib/store/selectors';
import { useClassification } from '@/hooks/data/useClassification';
import { ClusterSimilarityChart } from './ClusterSimilarityChart';
import { PatternAnalysisChart } from './PatternAnalysisChart';

/**
 * Modal frame hosting the two classification visualisations.
 *
 *  - Renders nothing when `display.classificationPanelOpen` is false.
 *  - Lazy-loads `/fixtures/classification.json` the first time it opens;
 *    subsequent opens reuse the cached payload.
 *  - Escape closes the panel; clicking the dark backdrop closes the panel.
 *  - The content card stops pointer events from bubbling so clicks
 *    inside the charts don't dismiss the modal.
 *
 * The panel intentionally sits OUTSIDE the canvas so the
 * `setPointerCapture`-based pan/zoom infrastructure cannot interfere
 * with chart interaction.
 */
export function ClassificationPanel() {
  const open = useClassificationPanelOpen();
  const { setClassificationPanelOpen } = useHarmonyActions();
  const { data, loading, error } = useClassification(open);

  // Escape closes the panel. Listener installed only while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setClassificationPanelOpen(false);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setClassificationPanelOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="classification-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          onPointerDown={() => setClassificationPanelOpen(false)}
        >
          <motion.div
            key="classification-card"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92vh] w-[min(1180px,94vw)] flex-col overflow-hidden rounded-xl border border-line bg-surface-panel shadow-float"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Header
              predictedCluster={data?.prediction.predicted_cluster ?? null}
              confidencePercent={data?.prediction.confidence_percent ?? null}
              onClose={() => setClassificationPanelOpen(false)}
            />

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? <LoadingState /> : null}
              {error ? <ErrorState message={error} /> : null}
              {data ? (
                <div className="flex flex-col gap-8">
                  <Section
                    title="Cluster Similarity Analysis"
                    subtitle={`Most similar: Cluster ${data.prediction.predicted_cluster} (${data.prediction.confidence_percent})`}
                  >
                    <ClusterSimilarityChart prediction={data.prediction} />
                  </Section>
                  <Section
                    title="Pattern Analysis"
                    subtitle={`Predicted Cluster: ${data.prediction.predicted_cluster} · Confidence: ${data.prediction.confidence_percent}`}
                  >
                    <PatternAnalysisChart
                      patterns={data.patterns_detected}
                      order={data.feature_names}
                      predictedCluster={data.prediction.predicted_cluster}
                      confidencePercent={data.prediction.confidence_percent}
                    />
                  </Section>
                  <TopClustersTable
                    items={data.prediction.top_3_clusters}
                  />
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Header({
  predictedCluster,
  confidencePercent,
  onClose,
}: {
  predictedCluster: number | null;
  confidencePercent: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-6 py-4">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold tracking-tight text-text-primary">
          Classification Analysis
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {predictedCluster !== null && confidencePercent ? (
          <div className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
            <span className="font-semibold">Cluster {predictedCluster}</span>
            <span className="mx-1.5 opacity-60">·</span>
            <span className="tabular-nums">{confidencePercent}</span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2">
        <h3 className="text-[13px] font-semibold text-text-primary">{title}</h3>
        <p className="text-[11px] text-text-secondary">{subtitle}</p>
      </div>
      <div className="rounded-lg border border-line-subtle bg-surface-canvas p-3">
        {children}
      </div>
    </section>
  );
}

function TopClustersTable({
  items,
}: {
  items: { cluster: number; probability: number; confidence: string }[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold text-text-primary">
        Top-3 candidate clusters
      </h3>
      <div className="overflow-hidden rounded-lg border border-line-subtle">
        <table className="w-full table-fixed text-[12px]">
          <thead>
            <tr className="bg-surface-elevated text-left text-[11px] uppercase tracking-widest text-text-tertiary">
              <th className="px-3 py-2 font-mono">Rank</th>
              <th className="px-3 py-2 font-mono">Cluster</th>
              <th className="px-3 py-2 font-mono">Probability</th>
              <th className="px-3 py-2 font-mono">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={it.cluster}
                className={
                  i === 0
                    ? 'bg-accent/5 font-semibold text-accent'
                    : 'border-t border-line-subtle text-text-primary'
                }
              >
                <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 tabular-nums">Cluster {it.cluster}</td>
                <td className="px-3 py-2 tabular-nums">{it.probability.toFixed(3)}</td>
                <td className="px-3 py-2 tabular-nums">{it.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center text-[12px] text-text-tertiary">
      Loading classification data…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
      Failed to load classification: {message}
    </div>
  );
}
