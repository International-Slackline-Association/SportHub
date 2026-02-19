import { NextResponse } from 'next/server';
import { DatabaseSeeder } from '@lib/migrations/seed-local-db';

export async function POST() {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json({ error: 'Only available in local development mode' }, { status: 403 });
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