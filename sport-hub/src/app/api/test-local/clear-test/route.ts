import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';

export async function POST() {
  try {
    const count = await testHelpers.cleanupTestData('test-');

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} test items`,
      count
    });
  } catch (error) {
    console.error('Error clearing test data:', error);
    return NextResponse.json(
      { error: 'Failed to clear test data' },
      { status: 500 }
    );
  }
}