/**
 * Unit tests for signed certificate QR codes (isa-tools POST /v1/sign with a client-credentials token).
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  certificateStatement,
  certificateVerifyUrl,
  clearTokenCache,
  isReusable,
  signConfigFromEnv,
  type StoredSignature,
} from '../certificate-signing';
import { formatLongDay } from '../../utils/dates';

const config = { apiUrl: 'https://tools.example', tokenUrl: 'https://auth.example/oauth2/token', clientId: 'sporthub-id', clientSecret: 'secret' };
const FUTURE = new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString();

function fakeFetch(
  calls: { url: string; init: RequestInit }[],
  response: { status?: number; body?: unknown; tokenStatus?: number } = {},
) {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url === config.tokenUrl) {
      return new Response(JSON.stringify({ access_token: 'access-1', expires_in: 3600, token_type: 'Bearer' }), { status: response.tokenStatus ?? 200 });
    }
    return new Response(JSON.stringify(response.body ?? {
      token: 'abcd1234',
      verificationUrl: 'https://verify.slacklineinternational.org/?token=abcd1234',
      expiresAt: FUTURE,
    }), { status: response.status ?? 200 });
  }) as unknown as typeof fetch;
}

test('statement uses the isa-tools wording with value and readable date', () => {
  assert.equal(
    certificateStatement({ kind: 'record', athleteName: 'Jaan Roose', otherAthletes: [], title: 'Longest urban highline sent', detail: '1,074 m', date: '05/09/2023' }),
    '"Jaan Roose" has a valid WORLD RECORD certificate for "Longest urban highline sent" (1,074 m) achieved on 5 September 2023',
  );
  assert.equal(
    certificateStatement({ kind: 'first', athleteName: 'A', otherAthletes: ['B', 'C'], title: 'Double front flip', date: '' }),
    '"A" (together with B, C) has a valid WORLD FIRST certificate for "Double front flip"',
  );
  assert.equal(formatLongDay('unknown'), 'unknown');
  assert.equal(formatLongDay('31.12.2020'), '31 December 2020');
  assert.equal(formatLongDay('31/02/2020'), '31/02/2020');
});

test('a stored signature is reused only for the same statement with over a year left', () => {
  const stored: StoredSignature = { statement: 'S', verificationUrl: 'https://v/?token=1', expiresAt: FUTURE };
  assert.equal(isReusable(stored, 'S'), true);
  assert.equal(isReusable(stored, 'changed'), false);
  assert.equal(isReusable({ ...stored, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() }, 'S'), false);
  assert.equal(isReusable(undefined, 'S'), false);
});

test('config needs the sporthub-service client id and secret; URLs default to ISA', () => {
  assert.equal(signConfigFromEnv({}), undefined);
  assert.equal(signConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id' }), undefined);
  assert.deepEqual(signConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id', ISA_TOOLS_CLIENT_SECRET: 's' }), {
    clientId: 'id',
    clientSecret: 's',
    apiUrl: 'https://tools-api.slacklineinternational.org',
    tokenUrl: 'https://auth.slacklineinternational.org/oauth2/token',
  });
  assert.equal(signConfigFromEnv({ ISA_TOOLS_CLIENT_ID: 'id', ISA_TOOLS_CLIENT_SECRET: 's', ISA_TOOLS_API_URL: 'https://x.test/' })?.apiUrl, 'https://x.test');
});

test('gets a client-credentials token, signs with /v1/sign, stores the result', async () => {
  clearTokenCache();
  const calls: { url: string; init: RequestInit }[] = [];
  let saved: StoredSignature | undefined;
  const url = await certificateVerifyUrl('Jaan Roose', 'statement text', 'https://live', {
    config,
    load: async () => undefined,
    save: async s => { saved = s; },
    fetchImpl: fakeFetch(calls),
  });
  assert.equal(url, 'https://verify.slacklineinternational.org/?token=abcd1234');

  assert.equal(calls[0].url, 'https://auth.example/oauth2/token');
  const tokenHeaders = calls[0].init.headers as Record<string, string>;
  assert.equal(tokenHeaders.Authorization, `Basic ${Buffer.from('sporthub-id:secret').toString('base64')}`);
  const tokenBody = new URLSearchParams(String(calls[0].init.body));
  assert.equal(tokenBody.get('grant_type'), 'client_credentials');
  assert.equal(tokenBody.get('scope'), 'isa-tools/documents.sign');

  assert.equal(calls[1].url, 'https://tools.example/v1/sign');
  assert.equal((calls[1].init.headers as Record<string, string>).Authorization, 'Bearer access-1');
  const body = JSON.parse(String(calls[1].init.body));
  assert.equal(body.subject, 'Jaan Roose');
  assert.equal(body.content, 'statement text');
  assert.equal(body.createHash, true);
  assert.equal(saved?.statement, 'statement text');
});

test('the access token is reused for the next signature', async () => {
  clearTokenCache();
  const calls: { url: string; init: RequestInit }[] = [];
  const deps = { config, load: async () => undefined, save: async () => {}, fetchImpl: fakeFetch(calls) };
  await certificateVerifyUrl('A', 'statement one', 'https://live', deps);
  await certificateVerifyUrl('B', 'statement two', 'https://live', deps);
  assert.deepEqual(calls.map(c => c.url), [config.tokenUrl, 'https://tools.example/v1/sign', 'https://tools.example/v1/sign']);
});

test('reuses a stored signature without calling isa-tools', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const url = await certificateVerifyUrl('A', 'S', 'https://live', {
    config,
    load: async () => ({ statement: 'S', verificationUrl: 'https://verify/?token=old', expiresAt: FUTURE }),
    save: async () => { throw new Error('should not save'); },
    fetchImpl: fakeFetch(calls),
  });
  assert.equal(url, 'https://verify/?token=old');
  assert.equal(calls.length, 0);
});

test('falls back to the live link without a client or when isa-tools fails', async () => {
  clearTokenCache();
  const quiet = () => {};
  const noKey = await certificateVerifyUrl('A', 'S', 'https://live', { config: undefined, load: async () => undefined, save: async () => {}, log: quiet });
  assert.equal(noKey, 'https://live');
  const failed = await certificateVerifyUrl('A', 'S', 'https://live', {
    config, load: async () => undefined, save: async () => {}, fetchImpl: fakeFetch([], { status: 401 }), log: quiet,
  });
  assert.equal(failed, 'https://live');
  const badBody = await certificateVerifyUrl('A', 'S', 'https://live', {
    config, load: async () => undefined, save: async () => {}, fetchImpl: fakeFetch([], { body: { error: 'x' } }), log: quiet,
  });
  assert.equal(badBody, 'https://live');
  clearTokenCache();
  const noToken = await certificateVerifyUrl('A', 'S', 'https://live', {
    config, load: async () => undefined, save: async () => {}, fetchImpl: fakeFetch([], { tokenStatus: 400 }), log: quiet,
  });
  assert.equal(noToken, 'https://live');
});
