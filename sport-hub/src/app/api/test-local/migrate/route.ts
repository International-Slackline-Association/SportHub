import { NextRequest, NextResponse } from 'next/server';
import { migrate } from '@lib/migrations/migrate-isa-rankings-to-sporthub';

export async function POST(request: NextRequest) {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json(
      { error: 'Migration API is only available in local development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety

    const result = await migrate({ dryRun });

    return NextResponse.json({
      success: result.success,
      dryRun,
      stats: result.stats,
      duration: result.duration,
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + String(error) },
      { status: 500 }
    );
  }
}
