import { NextResponse } from 'next/server';
import { getWorldRecordsSheet, getWorldFirstsSheet } from '@lib/google-sheets';
import { evidenceUploadsEnabled } from '@lib/records-evidence';

// TEMPORARY debug endpoint — remove after diagnosing production 500
export async function GET() {
  const env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'MISSING',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      ? `SET (starts with: ${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.slice(0, 40)}...)`
      : 'MISSING',
    RECORDS_EVIDENCE_FOLDER_ID: process.env.RECORDS_EVIDENCE_FOLDER_ID ? 'SET' : 'MISSING',
    GOOGLE_DRIVE_IMPERSONATE_USER: process.env.GOOGLE_DRIVE_IMPERSONATE_USER ? 'SET' : 'NOT SET (optional)',
    evidenceUploadsEnabled: evidenceUploadsEnabled(),
    NODE_ENV: process.env.NODE_ENV,
  };

  let recordsResult: { ok: boolean; count?: number; error?: string } = { ok: false };
  let firstsResult: { ok: boolean; count?: number; error?: string } = { ok: false };

  try {
    const records = await getWorldRecordsSheet();
    recordsResult = { ok: true, count: records.length };
  } catch (err) {
    recordsResult = { ok: false, error: err instanceof Error ? `${err.message}\n${err.stack}` : String(err) };
  }

  try {
    const firsts = await getWorldFirstsSheet();
    firstsResult = { ok: true, count: firsts.length };
  } catch (err) {
    firstsResult = { ok: false, error: err instanceof Error ? `${err.message}\n${err.stack}` : String(err) };
  }

  return NextResponse.json({ env, records: recordsResult, firsts: firstsResult });
}
