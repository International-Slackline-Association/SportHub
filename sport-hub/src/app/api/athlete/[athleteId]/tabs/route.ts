import { NextRequest, NextResponse } from 'next/server';
import { getAthleteContests, getWorldRecords, getWorldFirsts } from '@lib/data-services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { athleteId } = await params;

    if (!athleteId) {
      return NextResponse.json({ error: 'Athlete ID is required' }, { status: 400 });
    }

    // Fetch tab data in parallel
    const [contests, worldRecords, worldFirsts] = await Promise.all([
      getAthleteContests(athleteId),
      getWorldRecords(),
      getWorldFirsts()
    ]);

    return NextResponse.json({
      contests,
      worldRecords,
      worldFirsts
    });
  } catch (error) {
    console.error('Error fetching athlete tab data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch athlete tab data' },
      { status: 500 }
    );
  }
}