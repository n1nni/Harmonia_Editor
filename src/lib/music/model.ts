import type { Detection } from '@/types/omr';
import type { Bbox } from '@/lib/geometry/bbox';
import type { ClefKind } from './clefs';
import type { Pitch } from './pitch';
import type { MxlDuration } from '@/lib/musicxml/types';

export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Note {
  id: string;
  detectionId: string;
  cx: number;
  cy: number;
  bbox: Bbox;
  /**
   * Canonical pitch for the note. Sourced from the MusicXML embedded in the
   * OMR response when available; falls back to geometry-only inference for
   * notes that have no MXL counterpart.
   */
  pitch: Pitch | null;
  /** True when `pitch` came from the MusicXML, false when geometry-inferred. */
  pitchFromMxl: boolean;
  /** Coarse duration from notehead classification (over-approximation). */
  duration: Duration;
  /** Authoritative duration from MusicXML `<type>` when available. */
  mxlDuration: MxlDuration | null;
  voice: number | null;
  measureNumber: number | null;
  hasSlurStart: boolean;
  hasSlurStop: boolean;
}

export interface StaffSemantic {
  partId: string;
  staffInPart: number;
  clef: ClefKind | null;
  keySharps: number;
  /** All notehead detections, sorted by cx. */
  notes: Note[];
  /** Raw rest detections (Phase 1 keeps these untyped). */
  rests: Detection[];
}

export interface ScoreSemantic {
  staves: StaffSemantic[];
  imageW: number;
  imageH: number;
  /** Map from detection.id -> Note (for fast lookup by hover/select). */
  noteByDetectionId: Map<string, Note>;
}
