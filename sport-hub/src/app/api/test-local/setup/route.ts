import { NextResponse } from 'next/server';
import { testHelpers } from '@lib/test-helpers';
import { canAccessTestAPI } from '@lib/test-page-access';

export async function POST() {
  const accessCheck = await canAccessTestAPI();
  if (!accessCheck.allowed) {
    return NextResponse.json(
      { error: accessCheck.reason },
      { status: accessCheck.status }
    );
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