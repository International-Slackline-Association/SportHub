import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedAthletes } from '@lib/data-services';
import { DISCIPLINE_DATA } from '@utils/consts';

export async function GET(request: NextRequest) {
  try {
    const discipline = request.nextUrl.searchParams.get('discipline') as Discipline | null;
    const normalizedDiscipline = discipline === 'TRICKLINE' ? 'TRICKLINE_AERIAL' : discipline;
    const config = DISCIPLINE_DATA[normalizedDiscipline as keyof typeof DISCIPLINE_DATA];

    if (!config?.enumValue) {
      return NextResponse.json(
        { error: 'Unsupported discipline' },
        { status: 400 }
      );
    }

    const athletes = await getFeaturedAthletes(String(config.enumValue));
    return NextResponse.json(athletes);
  } catch (error) {
    console.error('Error fetching featured athletes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured athletes' },
      { status: 500 }
    );
  }
}