import type { OmrResponse } from '@/types/omr';
import type { OmrClient } from './client';

/**
 * Production `OmrClient` that POSTs the user's image to the same-origin
 * Next.js proxy at `/api/omr/process`. The proxy is responsible for
 * forwarding to the actual hosted OMR service; this client knows only
 * about the local proxy boundary.
 *
 * Request format: `multipart/form-data` with one field named `image`
 * carrying the file binary. If the upstream service expects a
 * different field name, edit only the constant below; no other code
 * needs to change.
 *
 * Response format: assumes the upstream returns the canonical
 * `OmrResponse` shape (`detections`, `job_id`, `rectified_image_b64`,
 * `rectified_image_mime`, `xml`). If the upstream uses a different
 * naming convention, the `adaptResponse` hook below is the single
 * place to translate.
 */
const FILE_FIELD = 'image';
const PROXY_PATH = '/api/omr/process';

export class RemoteOmrClient implements OmrClient {
  async upload(file?: File | Blob): Promise<OmrResponse> {
    if (!file) {
      throw new Error('RemoteOmrClient.upload requires a file');
    }

    const form = new FormData();
    if (file instanceof File) {
      form.append(FILE_FIELD, file, file.name);
    } else {
      form.append(FILE_FIELD, file, 'upload.bin');
    }

    let res: Response;
    try {
      res = await fetch(PROXY_PATH, { method: 'POST', body: form });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      throw new Error(`OMR upload network error: ${msg}`);
    }

    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `OMR upload failed (${res.status}): non-JSON response: ${text.slice(0, 500)}`,
      );
    }
    if (!res.ok) {
      const errorMsg = extractError(json) ?? `HTTP ${res.status}`;
      throw new Error(`OMR upload failed: ${errorMsg}`);
    }
    return adaptResponse(json);
  }
}

/** Pull a human-readable error string out of a structured failure body. */
function extractError(j: unknown): string | null {
  if (!j || typeof j !== 'object') return null;
  const obj = j as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (obj.upstream && typeof obj.upstream === 'object') {
    const up = obj.upstream as Record<string, unknown>;
    if (typeof up.error === 'string') return up.error;
    if (typeof up.message === 'string') return up.message;
  }
  return null;
}

/**
 * Translate the upstream JSON into the canonical `OmrResponse` shape.
 * Currently a pass-through assuming the upstream already matches.
 * If the upstream uses camelCase or wraps the payload in an envelope
 * (e.g. `{ result: { … } }`), edit this single function.
 */
function adaptResponse(j: unknown): OmrResponse {
  return j as OmrResponse;
}
