import type { OmrResponse } from '@/types/omr';
import { RemoteOmrClient } from './remoteClient';

/**
 * Abstraction over how an OMR response is fetched.
 *
 * The application talks to its data layer exclusively through this
 * interface; the concrete implementation is swapped at the bottom of
 * this file. `RemoteOmrClient` is the production default; the
 * `FixtureOmrClient` below is retained for offline development and
 * tests.
 */
export interface OmrClient {
  upload(file?: File | Blob): Promise<OmrResponse>;
}

export class FixtureOmrClient implements OmrClient {
  constructor(private readonly fixtureUrl: string = '/fixtures/omrResponse.json') {}

  async upload(): Promise<OmrResponse> {
    // `no-store` so edits to the fixture JSON during development show up
    // on every refresh without manual cache busting.
    const res = await fetch(this.fixtureUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Fixture fetch failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as OmrResponse;
  }
}

// Production client. The Remote implementation routes through the
// Next.js proxy at `/api/omr/process` to avoid mixed-content and CORS
// problems against the hosted OMR service.
export const omrClient: OmrClient = new RemoteOmrClient();
