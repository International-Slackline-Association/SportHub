import { NextResponse } from 'next/server';
import { getWorldRecordsSheet, getWorldFirstsSheet } from '@lib/google-sheets';

// TEMPORARY debug endpoint — remove after diagnosing production 500
export async function GET() {
  const env = {
    ISA_CERTIFICATES_SPREADSHEET_ID: process.env.ISA_CERTIFICATES_SPREADSHEET_ID ? '***SET***' : 'MISSING',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'MISSING',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      ? `SET (starts with: ${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.slice(0, 40)}...)`
      : 'MISSING',
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
