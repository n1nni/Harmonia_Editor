import type { Pitch } from '@/lib/music/pitch';

export type MxlDuration =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | '16th'
  | '32nd';

export interface MxlNote {
  /** Matches Detection.id via `<note id="det_XXXX">`. */
  detectionId: string;
  partId: string;
  measureNumber: number;
  voice: number;
  /** Pitch after key-signature application. */
  pitch: Pitch;
  duration: MxlDuration;
  /** Raw `<duration>` divisions value, kept for future timing work. */
  divisions: number;
  hasSlurStart: boolean;
  hasSlurStop: boolean;
}

export interface MxlClef {
  partId: string;
  sign: 'G' | 'F' | 'C' | string;
  line: number;
  octaveChange: number;
}

export interface MxlKey {
  partId: string;
  fifths: number;
  mode: 'major' | 'minor' | null;
}

export interface MxlDocument {
  notes: Map<string, MxlNote>;
  clefs: MxlClef[];
  keys: MxlKey[];
}
