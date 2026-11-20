/**
 * Unit tests for the isa-users API client (GET /v1/users with a client-credentials token).
 * Run with: pnpm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearIsaTokenCache } from '../isa-oauth';
import { getIsaUser, getIsaUsers, isaIdFromCognitoUsername, isaUsersConfigFromEnv } from '../isa-users-api';

const config = { apiUrl: 'https://users.example', tokenUrl: 'https://auth.example/oauth2/token', clientId: 'sporthub-id', clientSecret: 'secret' };

function fakeFetch(calls: { url: string; init: RequestInit }[], usersStatus = 200) {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url === config.tokenUrl) {
      return new Response(JSON.stringify({ access_token: 'access-1', expires_in: 3600 }), { status: 200 });
    }
    const ids = new URL(url).searchParams.get('ids')!.split(',');
    // Unknown ids (here: any id ending in 0) are left out, like the real API
    const users = ids.filter(id => !id.endsWith('0')).map(id => ({ isaId: id, name: `Name ${id}`, surname: 'S' }));
    return new Response(JSON.stringify({ users }), { status: usersStatus });
  }) as unknown as typeof fetch;
}

test('the ISA id is derived from the Cognito username like isa-users does', () => {
  assert.equal(isaIdFromCognitoUsername('0a1b2c3d-1111-2222-3333-444455556666'), 'ISA_FCD0AF9C');
  assert.match(isaIdFromCognitoUsername('anything'), /^ISA_[0-9A-F]{8}$/);
});

test('config reuses the sporthub-service client; the API URL defaults to ISA', () => {
  assert.equal(isaUsersConfigFromEnv({}), undefined);
  assert.equal(isaUsersConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id' }), undefined);
  assert.deepEqual(isaUsersConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id', ISA_TOOLS_CLIENT_SECRET: 's' }), {
    clientId: 'id',
    clientSecret: 's',
    apiUrl: 'https://account-api.slacklineinternational.org',
    tokenUrl: 'https://auth.slacklineinternational.org/oauth2/token',
  });
  assert.equal(isaUsersConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id', ISA_TOOLS_CLIENT_SECRET: 's', ISA_USERS_API_URL: 'https://x.test/' })?.apiUrl, 'https://x.test');
});

test('users are fetched with a users.get token, 100 ids per call, unknown ids left out', async () => {
  clearIsaTokenCache();
  const calls: { url: string; init: RequestInit }[] = [];
  const ids = Array.from({ length: 150 }, (_, i) => `ISA_${String(i).padStart(8, '0')}`);
  const users = await getIsaUsers([...ids, ids[1]], config, fakeFetch(calls));

  assert.equal(calls.length, 3); // one token, two pages
  assert.equal(new URLSearchParams(calls[0].init.body as string).get('scope'), 'isa-users/users.get');
  assert.equal(new URL(calls[1].url).searchParams.get('ids')!.split(',').length, 100);
  assert.equal(new URL(calls[2].url).searchParams.get('ids')!.split(',').length, 50);
  assert.equal((calls[1].init.headers as Record<string, string>).Authorization, 'Bearer access-1');
  assert.equal(users.size, 135);
  assert.equal(users.get('ISA_00000001')?.name, 'Name ISA_00000001');
  assert.equal(users.has('ISA_00000010'), false);
});

test('one user: null when unknown, error when the API fails or is not configured', async () => {
  clearIsaTokenCache();
  const calls: { url: string; init: RequestInit }[] = [];
  assert.equal((await getIsaUser('ISA_00000001', config, fakeFetch(calls)))?.isaId, 'ISA_00000001');
  assert.equal(await getIsaUser('ISA_00000010', config, fakeFetch(calls)), null);
  assert.equal(calls.filter(c => c.url === config.tokenUrl).length, 1, 'token is cached');

  await assert.rejects(getIsaUser('ISA_00000001', config, fakeFetch([], 500)), /returned 500/);
  await assert.rejects(getIsaUser('ISA_00000001', undefined, fakeFetch([])), /not configured/);
  assert.equal((await getIsaUsers([], undefined, fakeFetch([]))).size, 0);
});
