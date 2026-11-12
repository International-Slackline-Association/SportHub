/**
 * Signed "Scan to verify" QR codes for record and first certificates.
 *
 * Signing goes through the isa-tools API (github.com/International-Slackline-Association/isa-tools),
 * the same service that signed ISA certificates before SportHub: POST {ISA_TOOLS_API_URL}/sign
 * with the trusted service key in `x-api-key`. isa-tools signs the statement as an RS256 JWT with
 * the ISA key, stores it under an 8-character code and returns
 * https://verify.slacklineinternational.org/?token=<code>, which shows the signed statement.
 *
 * Each signature is stored per entry and athlete (`CertificateSignature` items in the records
 * table) and reused while the statement is unchanged and far from expiry, so repeated downloads
 * keep the same code. Without ISA_TOOLS_API_KEY, or when isa-tools fails, the QR code falls back
 * to the live certificate link, so a certificate is always generated.
 *
 * This file has no database or Next.js imports so it can be unit tested; the route passes the
 * store functions in.
 */

export type CertificateKind = 'record' | 'first';

export const DEFAULT_ISA_TOOLS_API_URL = 'https://tools-api.slacklineinternational.org';
/** A certificate states a historical fact, so its signature should outlive any printed copy. */
export const SIGNATURE_VALIDITY_SECONDS = 10 * 365 * 24 * 60 * 60;
/** Sign again once a stored signature has less than this left. */
const RENEW_BEFORE_MS = 365 * 24 * 60 * 60 * 1000;
const SIGN_TIMEOUT_MS = 8000;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** DD/MM/YYYY (or DD.MM.YYYY) → "12 November 2026"; anything else is returned as is. */
export function prettyDate(date: string): string {
  const m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(date.trim());
  if (!m) return date.trim();
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[1])} ${month} ${m[3]}` : date.trim();
}

export interface StatementInput {
  kind: CertificateKind;
  athleteName: string;
  otherAthletes: string[];
  /** Record: category name. First: trick name. */
  title: string;
  /** Record: formatted value ("1,074 m"). First: category. */
  detail?: string;
  date?: string;
}

/**
 * The sentence isa-tools signs and verify.slacklineinternational.org shows, in the wording the
 * isa-tools certificates used: "<name>" has a valid WORLD RECORD certificate for "<x>" achieved on <date>.
 */
export function certificateStatement(s: StatementInput): string {
  const together = s.otherAthletes.length > 0 ? ` (together with ${s.otherAthletes.join(', ')})` : '';
  const label = s.kind === 'first' ? 'WORLD FIRST' : 'WORLD RECORD';
  const detail = s.detail ? ` (${s.detail})` : '';
  const date = s.date ? ` achieved on ${prettyDate(s.date)}` : '';
  const statement = `"${s.athleteName}"${together} has a valid ${label} certificate for "${s.title}"${detail}${date}`;
  // isa-tools accepts 10 to 1024 characters
  return statement.length > 1024 ? `${statement.slice(0, 1023)}…` : statement;
}

export interface StoredSignature {
  statement: string;
  verificationUrl: string;
  expiresAt: string;
}

/** A stored signature is reused while it signs the same statement and has over a year left. */
export function isReusable(stored: StoredSignature | undefined, statement: string, now = Date.now()): stored is StoredSignature {
  if (!stored || stored.statement !== statement || !stored.verificationUrl) return false;
  const expires = Date.parse(stored.expiresAt);
  return Number.isFinite(expires) && expires - now > RENEW_BEFORE_MS;
}

export interface SignConfig {
  apiUrl: string;
  apiKey: string;
}

export function signConfigFromEnv(env: Record<string, string | undefined> = process.env): SignConfig | undefined {
  const apiKey = env.ISA_TOOLS_API_KEY?.trim();
  if (!apiKey) return undefined;
  return { apiKey, apiUrl: (env.ISA_TOOLS_API_URL?.trim() || DEFAULT_ISA_TOOLS_API_URL).replace(/\/$/, '') };
}

/** Signs one statement with isa-tools and returns its verification URL and expiry. */
export async function signWithIsaTools(
  config: SignConfig,
  subject: string,
  statement: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StoredSignature> {
  const res = await fetchImpl(`${config.apiUrl}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
    body: JSON.stringify({ subject, content: statement, expiresInSeconds: SIGNATURE_VALIDITY_SECONDS, createHash: true }),
    signal: AbortSignal.timeout(SIGN_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`isa-tools /sign returned ${res.status}`);
  const body = await res.json() as { verificationUrl?: unknown; expiresAt?: unknown };
  if (typeof body.verificationUrl !== 'string' || !/^https:\/\//.test(body.verificationUrl)) {
    throw new Error('isa-tools /sign returned no verification URL');
  }
  return {
    statement,
    verificationUrl: body.verificationUrl,
    expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : new Date(Date.now() + SIGNATURE_VALIDITY_SECONDS * 1000).toISOString(),
  };
}

export interface VerifyUrlDeps {
  config: SignConfig | undefined;
  load: () => Promise<StoredSignature | undefined>;
  save: (signature: StoredSignature) => Promise<void>;
  fetchImpl?: typeof fetch;
  log?: (message: string, error?: unknown) => void;
}

/**
 * The URL for the certificate's QR code: a signed isa-tools verification link (stored one if still
 * valid, else a new one), or `fallbackUrl` (the live certificate) when signing is not set up or fails.
 */
export async function certificateVerifyUrl(
  subject: string,
  statement: string,
  fallbackUrl: string,
  deps: VerifyUrlDeps,
): Promise<string> {
  const log = deps.log ?? ((message: string, error?: unknown) => console.warn(message, error ?? ''));
  if (!deps.config) return fallbackUrl;
  try {
    const stored = await deps.load();
    if (isReusable(stored, statement)) return stored.verificationUrl;
    const signed = await signWithIsaTools(deps.config, subject, statement, deps.fetchImpl);
    await deps.save(signed).catch(error => log('Could not store the certificate signature', error));
    return signed.verificationUrl;
  } catch (error) {
    log('Certificate signing failed, the QR code links to the live certificate', error);
    return fallbackUrl;
  }
}
