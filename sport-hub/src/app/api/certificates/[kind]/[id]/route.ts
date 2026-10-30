import { NextResponse } from 'next/server';
import { getPublicEntry } from '@lib/records-service';
import { buildCertificatePdf } from '@lib/records-certificates';
import { hasCertificate } from '@lib/records-logic';

/**
 * GET /api/certificates/{record|first}/{entryId}?athlete={index}
 * Certificate PDF for one athlete of a published (or historical) entry (FR-26).
 * Published entries are public, so their certificates are too.
 */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== 'record' && kind !== 'first') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const entry = kind === 'record' ? await getPublicEntry('record', id) : await getPublicEntry('first', id);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Not a World Record yet: certificates come once the category is challenged (§4)
    if ('standing' in entry && !hasCertificate(entry.standing)) {
      return NextResponse.json({ error: 'No certificate while the category is Unchallenged' }, { status: 404 });
    }
    const index = Number(new URL(req.url).searchParams.get('athlete') ?? 0);
    const athlete = entry.athletes[index];
    if (!athlete) return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });

    const pdf = await buildCertificatePdf(kind, entry, athlete);
    const filename = `ISA-${kind === 'first' ? 'World-First' : 'World-Record'}-${athlete.name}`.normalize('NFKD').replace(/[^A-Za-z0-9-]+/g, '-');
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: 'Failed to generate the certificate' }, { status: 500 });
  }
}
