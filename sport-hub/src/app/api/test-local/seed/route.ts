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
    await seeder.fullSeed(true);

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