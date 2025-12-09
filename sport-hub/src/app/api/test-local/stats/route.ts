import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';
import { canAccessTestAPI } from '@lib/test-page-access';

export async function GET() {
  const accessCheck = await canAccessTestAPI();
  if (!accessCheck.allowed) {
    return NextResponse.json(
      { error: accessCheck.reason },
      { status: accessCheck.status }
    );
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