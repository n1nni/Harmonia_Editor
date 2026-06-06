import type { OmrResponse } from '@/types/omr';

/**
 * Abstraction over how an OMR response is fetched.
 * Phase 1 ships `FixtureOmrClient`; a real backend can drop in later
 * by implementing the same interface — UI is untouched.
 */
export interface OmrClient {
  upload(file?: File | Blob): Promise<OmrResponse>;
}

export class FixtureOmrClient implements OmrClient {
  constructor(private readonly fixtureUrl: string = '/fixtures/omrResponse.json') {}

  async upload(): Promise<OmrResponse> {
    // `no-store` so edits to the fixture JSON during development show up
    // on every refresh without manual cache busting. In production this
    // would normally be cached, but Phase 1's fixture loader is itself a
    // dev-only path — the real client will hit a server endpoint.
    const res = await fetch(this.fixtureUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Fixture fetch failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as OmrResponse;
  }
}

export const omrClient: OmrClient = new FixtureOmrClient();
