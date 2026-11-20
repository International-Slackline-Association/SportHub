/**
 * Client-credentials tokens for ISA services (isa-tools, isa-users).
 *
 * SportHub calls ISA services with its own `sporthub-service` client in the ISA user pool, which
 * holds one scope per endpoint (see "How apps reach ISA services", docs/engineering/app-access.md
 * in the ISA monorepo). Tokens are cached per client and scope until a minute before they expire.
 *
 * No database or Next.js imports, so callers can be unit tested with a fake fetch.
 */

export const DEFAULT_ISA_TOKEN_URL = 'https://auth.slacklineinternational.org/oauth2/token';
const TOKEN_TIMEOUT_MS = 8000;

export interface IsaClientCredentials {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

const cache = new Map<string, { value: string; expiresAt: number }>();

/** For tests, and after a 401/403: forget cached tokens (all, or one scope's). */
export function clearIsaTokenCache(credentials?: IsaClientCredentials, scope?: string) {
  if (credentials && scope) cache.delete(`${credentials.clientId} ${scope}`);
  else cache.clear();
}

export async function isaAccessToken(
  credentials: IsaClientCredentials,
  scope: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const key = `${credentials.clientId} ${scope}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const res = await fetchImpl(credentials.tokenUrl, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }).toString(),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ISA token request returned ${res.status}`);
  const body = await res.json() as { access_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== 'string') throw new Error('ISA token request returned no access token');
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
  cache.set(key, { value: body.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return body.access_token;
}
