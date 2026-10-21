import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedAthletes } from '@lib/data-services';
import { DISCIPLINE_DATA } from '@utils/consts';
import { normalizeGender } from '@utils/gender';

export async function GET(request: NextRequest) {
  try {
    const discipline = request.nextUrl.searchParams.get('discipline') as Discipline | null;
    const season = request.nextUrl.searchParams.get('season') ?? undefined;
    const genderParam = request.nextUrl.searchParams.get('gender');
    const normalizedDiscipline = discipline === 'TRICKLINE' ? 'TRICKLINE_AERIAL' : discipline;
    const config = DISCIPLINE_DATA[normalizedDiscipline as keyof typeof DISCIPLINE_DATA];

    if (!config?.enumValue) {
      return NextResponse.json(
        { error: 'Unsupported discipline' },
        { status: 400 }
      );
    }

    const athletes = await getFeaturedAthletes({
      discipline: String(config.enumValue),
      gender: normalizeGender(genderParam) as Gender,
      year: season,
    });
    return NextResponse.json(athletes);
  } catch (error) {
    console.error('Error fetching featured athletes:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}