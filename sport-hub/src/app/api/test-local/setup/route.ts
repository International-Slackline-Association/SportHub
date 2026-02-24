import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';

export async function POST() {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json({ error: 'Only available in local development mode' }, { status: 403 });
  }

  try {
    const success = await testHelpers.setupTestEnvironment();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test environment setup completed'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to setup test environment' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error setting up test environment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}