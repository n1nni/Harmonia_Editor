'use client';

import { useMemo } from 'react';
import { useImageDims, useRaw, usePitchShifts } from '@/lib/store/selectors';
import { parseScore } from '@/lib/omr/parse';
import { parseMusicXml } from '@/lib/musicxml/parse';
import type { ScoreSemantic } from './model';
import type { MxlDocument } from '@/lib/musicxml/types';

/**
 * Memoized semantic score. Recomputed when raw OMR data, image dimensions,
 * or the user's pitch-shift edit map changes. MusicXML is parsed only
 * when the raw response changes, not on every edit.
 */
export function useScore(): ScoreSemantic | null {
  const raw = useRaw();
  const dims = useImageDims();
  const pitchShifts = usePitchShifts();

  const mxl: MxlDocument | null = useMemo(() => {
    if (!raw?.xml) return null;
    return parseMusicXml(raw.xml);
  }, [raw]);

  return useMemo<ScoreSemantic | null>(() => {
    if (!raw || !dims) return null;
    return parseScore(raw, dims.w, dims.h, mxl, pitchShifts);
  }, [raw, dims, mxl, pitchShifts]);
}
