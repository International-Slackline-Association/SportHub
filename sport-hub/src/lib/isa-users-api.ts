/**
 * ISA user identities from the isa-users API.
 *
 * SportHub never reads isa-users' table: it calls GET {ISA_USERS_API_URL}/v1/users?ids=ISA_…,ISA_…
 * (up to 100 ids, unknown ids left out) with a client-credentials token of the `sporthub-service`
 * client for the `isa-users/users.get` scope. It is the same client as certificate signing, so it
 * uses the same ISA_TOOLS_CLIENT_ID / ISA_TOOLS_CLIENT_SECRET.
 *
 * At sign-in the ISA id comes from the Cognito username, the same way isa-users derives it
 * (`generateISAIdFromUsername` in the ISA monorepo), so no lookup by email is needed.
 *
 * No database or Next.js imports, so it can be unit tested with a fake fetch.
 */

import { createHash } from 'node:crypto';
import { DEFAULT_ISA_TOKEN_URL, clearIsaTokenCache, isaAccessToken, type IsaClientCredentials } from './isa-oauth';

export const DEFAULT_ISA_USERS_API_URL = 'https://account-api.slacklineinternational.org';
export const USERS_GET_SCOPE = 'isa-users/users.get';
const MAX_IDS_PER_CALL = 100;
const REQUEST_TIMEOUT_MS = 8000;

export interface IsaUser {
  isaId: string;
  email?: string;
  name?: string;
  surname?: string;
  gender?: string;
  birthDate?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  profilePictureUrl?: string;
  createdDateTime?: string;
}

export interface IsaUsersConfig extends IsaClientCredentials {
  apiUrl: string;
}

export function isaUsersConfigFromEnv(env: Record<string, string | undefined> = process.env): IsaUsersConfig | undefined {
  const clientId = env.ISA_TOOLS_CLIENT_ID?.trim();
  const clientSecret = env.ISA_TOOLS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return undefined;
  return {
    clientId,
    clientSecret,
    apiUrl: (env.ISA_USERS_API_URL?.trim() || DEFAULT_ISA_USERS_API_URL).replace(/\/$/, ''),
    tokenUrl: env.ISA_TOOLS_TOKEN_URL?.trim() || DEFAULT_ISA_TOKEN_URL,
  };
}

/** The ISA id of a Cognito user: "ISA_" + the first 8 hex characters of sha256(username), upper case. */
export function isaIdFromCognitoUsername(username: string): string {
  const hash = createHash('sha256').update(username).digest('hex');
  return `ISA_${hash.substring(0, 8)}`.toUpperCase();
}

/** Users by ISA id, in calls of up to 100 ids. Unknown ids are missing from the map. */
export async function getIsaUsers(
  ids: string[],
  config: IsaUsersConfig | undefined = isaUsersConfigFromEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, IsaUser>> {
  const users = new Map<string, IsaUser>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return users;
  if (!config) throw new Error('isa-users API is not configured (ISA_TOOLS_CLIENT_ID / ISA_TOOLS_CLIENT_SECRET)');

  for (let i = 0; i < unique.length; i += MAX_IDS_PER_CALL) {
    const chunk = unique.slice(i, i + MAX_IDS_PER_CALL);
    const token = await isaAccessToken(config, USERS_GET_SCOPE, fetchImpl);
    const res = await fetchImpl(`${config.apiUrl}/v1/users?ids=${chunk.map(encodeURIComponent).join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) clearIsaTokenCache(config, USERS_GET_SCOPE);
    if (!res.ok) throw new Error(`isa-users /v1/users returned ${res.status}`);
    const body = await res.json() as { users?: IsaUser[] };
    for (const user of body.users ?? []) {
      if (user?.isaId) users.set(user.isaId, user);
    }
  }
  return users;
}

/** One user by ISA id, or null when isa-users does not know it. */
export async function getIsaUser(
  id: string,
  config: IsaUsersConfig | undefined = isaUsersConfigFromEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<IsaUser | null> {
  return (await getIsaUsers([id], config, fetchImpl)).get(id) ?? null;
}
