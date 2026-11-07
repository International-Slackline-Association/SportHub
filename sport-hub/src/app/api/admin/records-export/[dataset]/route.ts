import { NextResponse } from 'next/server';
import { requireRecordsPermission } from '@lib/records-auth';
import { buildExportCsv, isExportDataset } from '@lib/records-export';

/**
 * GET /api/admin/records-export/{records|firsts|athletes|categories}
 * CSV download of the records and firsts data. Admin only: the middleware
 * guards /api/admin, and the permission is checked here again.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  if (!isExportDataset(dataset)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    await requireRecordsPermission('records:manage');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const csv = await buildExportCsv(dataset);
    const filename = `isa-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
    // The byte order mark makes Excel read the file as UTF-8 (names with accents)
    return new NextResponse(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`Error exporting ${dataset}:`, error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
