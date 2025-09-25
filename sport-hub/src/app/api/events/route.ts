import { NextResponse } from 'next/server';
import { getContestsData } from '@lib/data-services';

export async function GET() {
  try {
    const events = await getContestsData();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events data' },
      { status: 500 }
    );
  }
}