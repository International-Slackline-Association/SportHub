import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';

export async function POST() {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json({ error: 'Only available in local development mode' }, { status: 403 });
  }

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