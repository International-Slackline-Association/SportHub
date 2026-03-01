import { NextResponse } from 'next/server';
import { getEventsData } from '@lib/data-services';

export async function GET() {
  try {
    const events = await getEventsData();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events data' },
      { status: 500 }
    );
  }
}
