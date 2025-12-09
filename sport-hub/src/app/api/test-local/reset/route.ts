import { NextResponse } from 'next/server';
import { DatabaseSeeder } from '@lib/seed-local-db';
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
    const seeder = new DatabaseSeeder();
    await seeder.resetAndSeed();

    return NextResponse.json({
      success: true,
      message: 'Database reset and seeded successfully'
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}