import { NextRequest, NextResponse } from 'next/server';
import { getAthleteProfile, getAthleteContests, getAthleteWorldRecords, getAthleteWorldFirsts } from '@lib/data-services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { athleteId } = await params;
    const decodedAthleteId = decodeURIComponent(athleteId);

    if (!decodedAthleteId) {
      return NextResponse.json({ error: 'Athlete ID is required' }, { status: 400 });
    }

    // Fetch all data in parallel
    const [profile, contests, worldRecords, worldFirsts] = await Promise.all([
      getAthleteProfile(decodedAthleteId),
      getAthleteContests(decodedAthleteId),
      getAthleteWorldRecords(decodedAthleteId),
      getAthleteWorldFirsts(decodedAthleteId),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile,
      contests,
      worldRecords,
      worldFirsts
    });
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch athlete data' },
      { status: 500 }
    );
  }
}