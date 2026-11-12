/**
 * Unit tests for signed certificate QR codes (isa-tools /sign).
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  certificateStatement,
  certificateVerifyUrl,
  isReusable,
  prettyDate,
  signConfigFromEnv,
  type StoredSignature,
} from '../certificate-signing';

const config = { apiUrl: 'https://tools.example', apiKey: 'key-123' };
const FUTURE = new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString();

function fakeFetch(calls: { url: string; init: RequestInit }[], response: { status?: number; body?: unknown } = {}) {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
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
  assert.equal(prettyDate('unknown'), 'unknown');
  assert.equal(prettyDate('31.12.2020'), '31 December 2020');
});

test('a stored signature is reused only for the same statement with over a year left', () => {
  const stored: StoredSignature = { statement: 'S', verificationUrl: 'https://v/?token=1', expiresAt: FUTURE };
  assert.equal(isReusable(stored, 'S'), true);
  assert.equal(isReusable(stored, 'changed'), false);
  assert.equal(isReusable({ ...stored, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() }, 'S'), false);
  assert.equal(isReusable(undefined, 'S'), false);
});

test('config comes from ISA_TOOLS_API_KEY, URL defaults to the isa-tools API', () => {
  assert.equal(signConfigFromEnv({}), undefined);
  assert.deepEqual(signConfigFromEnv({ ISA_TOOLS_API_KEY: 'k' }), { apiKey: 'k', apiUrl: 'https://tools-api.slacklineinternational.org' });
  assert.equal(signConfigFromEnv({ ISA_TOOLS_API_KEY: 'k', ISA_TOOLS_API_URL: 'https://x.test/' })?.apiUrl, 'https://x.test');
});

test('signs with isa-tools, stores the result and returns the verification URL', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  let saved: StoredSignature | undefined;
  const url = await certificateVerifyUrl('Jaan Roose', 'statement text', 'https://live', {
    config,
    load: async () => undefined,
    save: async s => { saved = s; },
    fetchImpl: fakeFetch(calls),
  });
  assert.equal(url, 'https://verify.slacklineinternational.org/?token=abcd1234');
  assert.equal(calls[0].url, 'https://tools.example/sign');
  assert.equal((calls[0].init.headers as Record<string, string>)['x-api-key'], 'key-123');
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.subject, 'Jaan Roose');
  assert.equal(body.content, 'statement text');
  assert.equal(body.createHash, true);
  assert.equal(saved?.statement, 'statement text');
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

test('falls back to the live link without a key or when isa-tools fails', async () => {
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
});
