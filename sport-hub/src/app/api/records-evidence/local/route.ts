import { NextResponse } from 'next/server';
import { listLocalFolder, localEvidenceEnabled, readLocalFile, receiveLocalUpload } from '@lib/records-evidence';

/**
 * Local stand-in for Google Drive during development (lib/records-evidence.ts):
 * PUT ?file={id} receives an upload started by startEvidenceUpload,
 * GET ?file={id} serves a file, GET ?folder={id} lists a folder.
 * Not available when Drive is set up or in production.
 */

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function PUT(req: Request) {
  if (!localEvidenceEnabled()) return notFound();
  const fileId = new URL(req.url).searchParams.get('file') ?? '';
  try {
    const stored = await receiveLocalUpload(fileId, await req.arrayBuffer());
    return stored ? NextResponse.json(stored) : notFound();
  } catch {
    return notFound();
  }
}

export async function GET(req: Request) {
  if (!localEvidenceEnabled()) return notFound();
  const params = new URL(req.url).searchParams;
  try {
    const folder = params.get('folder');
    if (folder) {
      const files = await listLocalFolder(folder);
      const items = files.map(f => `<li><a href="${escapeHtml(f.url)}">${escapeHtml(f.name)}</a></li>`).join('');
      return new NextResponse(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(folder)}</title><h1>Evidence folder ${escapeHtml(folder)}</h1><ul>${items}</ul>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    const file = await readLocalFile(params.get('file') ?? '');
    if (!file) return notFound();
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.meta.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.meta.name)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return notFound();
  }
}
