import { NextRequest, NextResponse } from 'next/server';
import { getRankingsData } from '@lib/data-services';

export async function GET(request: NextRequest) {
  try {
    const year = request.nextUrl.searchParams.get('year') ?? undefined;
    const discipline = request.nextUrl.searchParams.get('discipline') ?? undefined;
    const rankings = await getRankingsData(year, discipline);
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings data' },
      { status: 500 }
    );
  }
}
