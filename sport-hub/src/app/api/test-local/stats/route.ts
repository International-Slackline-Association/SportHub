import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';

export async function GET() {
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