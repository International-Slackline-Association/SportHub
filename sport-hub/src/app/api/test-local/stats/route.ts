import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';

export async function GET() {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json({ error: 'Only available in local development mode' }, { status: 403 });
  }

  try {
    const stats = await testHelpers.getTestStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}