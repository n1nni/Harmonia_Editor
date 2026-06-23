import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy to the hosted OMR service.
 *
 * The browser cannot speak directly to `http://5.83.153.81:25576/process`
 * for two reasons:
 *
 *   1. **Mixed content** — if Harmonia is served over HTTPS the browser
 *      blocks plain-HTTP outbound calls.
 *   2. **CORS** — the service does not set
 *      `Access-Control-Allow-Origin`, so a direct fetch from any other
 *      origin is rejected even on plain HTTP.
 *
 * Routing through this Next.js API route sidesteps both: the browser
 * POSTs to `/api/omr/process` on the same origin; this handler runs on
 * the server and forwards the multipart payload to the upstream service
 * with no cross-origin restrictions.
 *
 * The upstream URL is configurable via the `OMR_API_BASE` environment
 * variable so deployments can point to a different host without a
 * code change.
 */

const OMR_API_BASE = process.env.OMR_API_BASE ?? 'http://5.83.153.81:25576';
const UPSTREAM_POST = '/process';
const UPSTREAM_FULL = '/full';
const MAX_BODY_BYTES = 32 * 1024 * 1024; // 32 MB safety cap

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { ok: false, error: 'Expected multipart/form-data' },
        { status: 400 },
      );
    }

    const lengthHeader = req.headers.get('content-length');
    if (lengthHeader) {
      const len = Number(lengthHeader);
      if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
        return NextResponse.json(
          { ok: false, error: `Image too large (${len} bytes; max ${MAX_BODY_BYTES})` },
          { status: 413 },
        );
      }
    }

    // Re-encode the FormData onto a fresh outbound request so the
    // upstream sees a clean Content-Type with its own boundary token.
    const inboundForm = await req.formData();
    const outboundForm = new FormData();
    for (const [key, value] of inboundForm.entries()) {
      // `value` is either a string or a File/Blob. Pass through as-is.
      if (typeof value === 'string') {
        outboundForm.append(key, value);
      } else {
        outboundForm.append(key, value, value.name);
      }
    }

    // Step 1: POST /process — runs the pipeline. The upstream caches
    // the result server-side. According to the API documentation, the
    // POST response may include only a subset of the data (e.g. just
    // rectified image + MusicXML); the full record is retrievable via
    // the subsequent GET /full call.
    const postUrl = `${OMR_API_BASE}${UPSTREAM_POST}`;
    let postRes: Response;
    try {
      postRes = await fetch(postUrl, {
        method: 'POST',
        body: outboundForm,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return NextResponse.json(
        { ok: false, error: `Upstream unreachable: ${msg}` },
        { status: 502 },
      );
    }

    if (!postRes.ok) {
      const txt = await postRes.text();
      let upstreamJson: unknown = null;
      try {
        upstreamJson = JSON.parse(txt);
      } catch {
        // Non-JSON error body.
      }
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream POST /process failed (HTTP ${postRes.status})`,
          upstream: upstreamJson ?? txt.slice(0, 2000),
        },
        { status: postRes.status },
      );
    }
    // We don't actually consume the POST body — the GET /full is the
    // canonical source of truth and is guaranteed to return every field
    // the client needs (rectified image, MusicXML, detections, job id).
    await postRes.body?.cancel();

    // Step 2: GET /full — fetches the cached, complete result.
    const fullUrl = `${OMR_API_BASE}${UPSTREAM_FULL}`;
    let fullRes: Response;
    try {
      fullRes = await fetch(fullUrl, { method: 'GET' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return NextResponse.json(
        { ok: false, error: `Upstream /full unreachable: ${msg}` },
        { status: 502 },
      );
    }

    const fullText = await fullRes.text();
    let fullJson: unknown = null;
    try {
      fullJson = JSON.parse(fullText);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream /full returned non-JSON (status ${fullRes.status})`,
          body: fullText.slice(0, 2000),
        },
        { status: fullRes.ok ? 502 : fullRes.status },
      );
    }

    if (!fullRes.ok) {
      return NextResponse.json(
        { ok: false, error: 'Upstream /full error', upstream: fullJson },
        { status: fullRes.status },
      );
    }
    return NextResponse.json(fullJson, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
