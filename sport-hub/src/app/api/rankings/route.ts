import { NextRequest, NextResponse } from 'next/server';
import { getRankingsData } from '@lib/data-services';
import { normalizeGender } from '@utils/gender';

export async function GET(request: NextRequest) {
  try {
    const year = request.nextUrl.searchParams.get('year') ?? undefined;
    const discipline = request.nextUrl.searchParams.get('discipline') ?? undefined;
    const gender = request.nextUrl.searchParams.get('gender');

    const rankings = await getRankingsData(year, discipline, normalizeGender(gender) as Gender);
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings data:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
