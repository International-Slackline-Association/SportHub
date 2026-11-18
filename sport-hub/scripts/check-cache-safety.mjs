#!/usr/bin/env node
/**
 * Cache-safety check: no response that a shared cache (CDN) may store is
 * allowed to set a cookie.
 *
 * Why: in Nov 2026 the auth middleware re-issued the signed-in user's session
 * cookie on prerendered pages sent with "Cache-Control: s-maxage=31536000".
 * The CDN could store that response and give one user's session to others.
 *
 * Usage (after `next build`):  pnpm check:cache-safety
 * Starts `next start` on a free port, signs in with a fake session cookie and
 * requests every prerendered page (HTML and RSC prefetch) plus a few public
 * and protected pages. Fails if any response carries Set-Cookie without
 * Cache-Control private/no-store.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { encode } from 'next-auth/jwt';

const SECRET = process.env.AUTH_SECRET || 'cache-safety-check-secret';
const COOKIE_NAME = '__Secure-next-auth.session-token'; // production cookie name (src/lib/auth.ts)

// Pages rendered per request; checked too in case they become static later.
const EXTRA_ROUTES = ['/', '/world_records', '/events', '/admin', '/dashboard', '/world_records/my-claims'];

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on('error', reject);
  });
}

function isSharedCacheable(cacheControl) {
  const cc = (cacheControl || '').toLowerCase();
  if (cc.includes('private') || cc.includes('no-store')) return false;
  return true; // missing header or public/s-maxage/max-age: a CDN may store it
}

async function waitForServer(base, server) {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('next start exited early');
    try { await fetch(base + '/favicon.ico'); return; } catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error('next start did not come up within 60s');
}

const prerendered = Object.keys(JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8')).routes);
const routes = [...new Set([...prerendered, ...EXTRA_ROUTES])];

const token = await encode({
  token: {
    sub: 'cache-safety-check', email: 'cache-safety@example.invalid', name: 'Cache Safety Check',
    sportHubUserId: 'cache-safety-check', roles: ['admin'], permissions: [], userSubTypes: ['athlete'], rolesVersion: 2,
  },
  secret: SECRET,
  salt: COOKIE_NAME,
});

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const server = spawn('npx', ['next', 'start', '-p', String(port)], {
  env: {
    ...process.env, NODE_ENV: 'production', AUTH_SECRET: SECRET, AUTH_URL: base,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || 'x', COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET || 'x',
    COGNITO_REGION: process.env.COGNITO_REGION || 'eu-central-1', COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'x',
  },
  stdio: ['ignore', 'ignore', 'inherit'],
  detached: true,
});

const failures = [];
try {
  await waitForServer(base, server);
  const variants = [
    { label: 'html', headers: {} },
    { label: 'rsc-prefetch', headers: { RSC: '1', 'Next-Router-Prefetch': '1' }, query: '?_rsc=check' },
  ];
  for (const route of routes) {
    for (const v of variants) {
      for (const signedIn of [true, false]) {
        const headers = { ...v.headers, ...(signedIn ? { Cookie: `${COOKIE_NAME}=${token}` } : {}) };
        let res;
        try {
          res = await fetch(base + route + (v.query || ''), { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
        } catch (err) {
          console.warn(`  skip ${route} (${v.label}): ${err.message}`);
          continue;
        }
        const setCookies = res.headers.getSetCookie();
        const cc = res.headers.get('cache-control');
        if (setCookies.length > 0 && isSharedCacheable(cc)) {
          failures.push(`${route} [${v.label}, ${signedIn ? 'signed in' : 'anonymous'}] status ${res.status}, `
            + `Cache-Control "${cc ?? '(none)'}" with Set-Cookie: ${setCookies.map(c => c.split('=')[0]).join(', ')}`);
        }
        await res.arrayBuffer().catch(() => {});
      }
    }
  }
} finally {
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
}

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} cacheable response(s) set cookies. A CDN could serve these cookies to other visitors:`);
  for (const f of failures) console.error('  - ' + f);
  console.error('\nKeep the auth middleware off public pages (see the matcher in src/middleware.ts).');
  process.exit(1);
}
console.log(`✓ Cache safety: ${routes.length} routes checked; no cacheable response sets a cookie.`);
