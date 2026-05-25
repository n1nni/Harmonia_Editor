'use client';

import { useMemo } from 'react';
import { useImageDims, useRaw } from '@/lib/store/selectors';
import { parseScore } from '@/lib/omr/parse';
import { parseMusicXml } from '@/lib/musicxml/parse';
import type { ScoreSemantic } from './model';
import type { MxlDocument } from '@/lib/musicxml/types';

/**
 * Memoized semantic score, recomputed only when raw OMR data or
 * image dimensions change. Parses the MusicXML payload once and threads
 * the resulting `MxlDocument` into `parseScore` so notes pick up
 * authoritative pitch/duration/measure/voice from the OMR's own XML.
 */
export function useScore(): ScoreSemantic | null {
  const raw = useRaw();
  const dims = useImageDims();

  const mxl: MxlDocument | null = useMemo(() => {
    if (!raw?.xml) return null;
    return parseMusicXml(raw.xml);
  }, [raw]);

  return useMemo<ScoreSemantic | null>(() => {
    if (!raw || !dims) return null;
    return parseScore(raw, dims.w, dims.h, mxl);
  }, [raw, dims, mxl]);
}
