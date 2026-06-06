/**
 * Classification analysis schema.
 *
 * Produced by an upstream Python pipeline that analyses a score's pitch /
 * harmony patterns, predicts which musicological cluster it belongs to,
 * and emits the data as JSON. Harmonia consumes the JSON to render two
 * interactive SVG visualisations: a cluster-similarity bar chart and a
 * pattern-analysis bar chart.
 *
 * The same Python pipeline also embeds pre-rendered JPGs of its own
 * matplotlib plots (`pattern_plot_base64`, `cluster_plot_base64`) as a
 * fallback reference; Harmonia ignores those in favour of native SVG so
 * the visualisations participate in our zoom / scale / theming system.
 */

export type PatternName =
  | 'octal_overall'
  | 'quarter_fifth_chord'
  | 'quintal_overall'
  | 'quint_non_accord'
  | 'regular_bourdon'
  | 'relative_bourdon'
  | 'tertiary_parallelism'
  | 'triad_parallelism';

/** Per-pattern detection record. `feature_value` is the same number used
 *  for the bar in the Pattern Analysis chart; `status` is the upstream
 *  pipeline's threshold decision, retained as authoritative. */
export interface PatternEntry {
  status: 'detected' | 'absent';
  features: { feature_value: number };
  summary: string;
}

/** Per-cluster entry inside `prediction.top_3_clusters`. */
export interface TopCluster {
  cluster: number;
  probability: number;
  confidence: string;
}

export interface PredictionBlock {
  predicted_cluster: number;
  confidence: number;
  confidence_percent: string;
  top_3_clusters: TopCluster[];
  /** Length === number of clusters in the trained model (currently 22).
   *  Indexed 0..N-1; cluster numbering in the UI is 1..N. */
  all_probabilities: number[];
}

export interface ClassificationResult {
  file_name: string;
  file_path: string;
  feature_vector: number[];
  feature_names: PatternName[];
  n_features: number;
  patterns_detected: Record<PatternName, PatternEntry>;
  prediction: PredictionBlock;
  /** Base64-encoded reference image rendered by the upstream pipeline.
   *  Not consumed by the UI — present in the file for archival parity. */
  pattern_plot_base64?: string;
  cluster_plot_base64?: string;
  pattern_plot_path?: string;
  cluster_plot_path?: string;
}
