import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The auth middleware re-issues the session cookie (Set-Cookie) on every
// request it handles. If it ran on prerendered public pages, which are sent
// with "Cache-Control: s-maxage=31536000", a shared cache could store one
// user's session cookie and hand it to other visitors (Nov 2026 incident).
// So the middleware must only match the protected routes it actually checks.
// next.config requires `config.matcher` to be a literal, so we read the source.
const source = readFileSync(fileURLToPath(new URL('../../middleware.ts', import.meta.url)), 'utf8');

const protectedPatterns = [...source.matchAll(/pattern:\s*'([^']+)'/g)].map(m => m[1]);
const matcherBlock = source.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
const matchers = [...matcherBlock.matchAll(/'([^']+)'/g)].map(m => m[1]);

test('middleware matcher lists exactly the protected routes', () => {
  assert.ok(protectedPatterns.length > 0, 'no PROTECTED_ROUTES patterns found');
  assert.deepEqual(
    [...matchers].sort(),
    protectedPatterns.map(p => `${p}/:path*`).sort(),
    'config.matcher must be PROTECTED_ROUTES patterns with /:path*, nothing more',
  );
});

test('middleware matcher has no catch-all pattern', () => {
  for (const m of matchers) {
    assert.ok(!m.includes('(?!') && !m.startsWith('/:path') && m !== '/' && !m.includes('.*'),
      `matcher "${m}" would run the auth middleware on public pages`);
  }
});
