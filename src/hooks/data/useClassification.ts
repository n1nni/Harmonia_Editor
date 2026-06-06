'use client';

import { useEffect, useState } from 'react';
import type { ClassificationResult } from '@/types/classification';

/**
 * Lazy-loaded classification result for the current score.
 *
 * The fixture lives at `/fixtures/classification.json` and is fetched
 * on first call. Result is held in module-level state so reopening the
 * Classification panel doesn't re-trigger a network request.
 *
 * Future integration with a real backend will replace the fetch URL
 * with a per-score endpoint and key the cache on the score's job_id.
 */

let cached: ClassificationResult | null = null;
let inFlight: Promise<ClassificationResult> | null = null;

async function loadClassification(): Promise<ClassificationResult> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const res = await fetch('/fixtures/classification.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Classification fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as ClassificationResult;
    cached = data;
    return data;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export interface UseClassification {
  data: ClassificationResult | null;
  loading: boolean;
  error: string | null;
}

export function useClassification(enabled: boolean): UseClassification {
  const [data, setData] = useState<ClassificationResult | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadClassification()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, data]);

  return { data, loading, error };
}
