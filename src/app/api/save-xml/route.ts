import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * POST /api/save-xml
 * Body: { xml: string; jobId?: string }
 *
 * Writes the edited MusicXML to `<project root>/edited_score/<filename>` and
 * returns the absolute path that was written. Filename pattern:
 *   `score-<jobId>-<isoTimestamp>.musicxml`
 *
 * The browser-side Downloads copy is triggered separately, client-side,
 * by `saveEditedXml` in the store — this route only maintains the
 * project's own versioned archive.
 *
 * Safety:
 *   - file name is sanitized to alphanumerics, dashes, underscores, dots
 *   - target directory is always inside `process.cwd()/edited_score`
 *   - input XML size is capped at 8 MB (well above any realistic score)
 */
const MAX_BYTES = 8 * 1024 * 1024;

function sanitize(name: string): string {
  return name.replace(/[^\w.-]/g, '_').slice(0, 120);
}

export async function POST(req: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null) {
    return new NextResponse('Invalid body', { status: 400 });
  }
  const { xml, jobId } = payload as { xml?: unknown; jobId?: unknown };
  if (typeof xml !== 'string') {
    return new NextResponse('Missing or non-string `xml`', { status: 400 });
  }
  if (xml.length > MAX_BYTES) {
    return new NextResponse('Payload too large', { status: 413 });
  }

  const dir = path.join(process.cwd(), 'edited_score');
  await fs.mkdir(dir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jobSegment =
    typeof jobId === 'string' && jobId.length > 0 ? `-${sanitize(jobId)}` : '';
  const filename = `score${jobSegment}-${ts}.musicxml`;
  const filepath = path.join(dir, filename);

  await fs.writeFile(filepath, xml, 'utf8');

  return NextResponse.json({
    ok: true,
    path: filepath,
    filename,
    bytes: Buffer.byteLength(xml, 'utf8'),
  });
}