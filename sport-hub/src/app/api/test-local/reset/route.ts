import { NextResponse } from 'next/server';
import { DatabaseSeeder } from '@lib/seed-local-db';

export async function POST() {
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