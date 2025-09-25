import { NextResponse } from 'next/server';
import { getRankingsData } from '@lib/data-services';

export async function GET() {
  try {
    const rankings = await getRankingsData();
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings data' },
      { status: 500 }
    );
  }
}