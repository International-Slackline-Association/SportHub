import { NextResponse } from 'next/server';
import { DatabaseSeeder } from '@lib/migrations/seed-local-db';

export async function POST() {
  if (process.env.DYNAMODB_LOCAL !== 'true') {
    return NextResponse.json({ error: 'Only available in local development mode' }, { status: 403 });
  }

  try {
    const seeder = new DatabaseSeeder();
    await seeder.fullSeed();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with mock data'
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}