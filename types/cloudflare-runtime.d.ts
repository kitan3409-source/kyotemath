/** Minimal local declarations for the Cloudflare bindings used by the Sites worker.
 * The deployment runtime supplies the complete Workers types; keeping these
 * small declarations here also lets the repository type-check before Wrangler
 * generates its environment-specific bindings.
 */
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type D1Database = Record<string, unknown>;

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [binding: string]: unknown;
  };
}
