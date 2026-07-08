import { Suspense } from 'react';
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import { getFeaturedAthletes } from '@lib/data-services'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import type { Metadata } from 'next'
import { randomS3ImageForDiscipline } from '@utils/images'
import Spinner from '@ui/Spinner'
import { DISCIPLINE_DATA, SUPPORTED_DISCIPLINES } from '@utils/consts'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

export const revalidate = false

const SUPPORTED_DISCIPLINES_ENUM_VALUES = SUPPORTED_DISCIPLINES.map(d => DISCIPLINE_DATA[d].enumValue);

export default async function Page({ searchParams }: { searchParams: Promise<{ discipline?: string }> }) {
  const { discipline } = await searchParams;
  let validDiscipline = discipline;

  const isDisciplineInvalid = !SUPPORTED_DISCIPLINES_ENUM_VALUES.includes(Number(discipline));

  if (isDisciplineInvalid) {
    console.log("Invalid discipline in URL, switching to random discipline");
    const randomIdx = Math.floor(Math.random() * SUPPORTED_DISCIPLINES_ENUM_VALUES.length);
    validDiscipline = String(SUPPORTED_DISCIPLINES_ENUM_VALUES[randomIdx]);
  }

  const athletes = await getFeaturedAthletes(validDiscipline);

  return (
    <PageLayout
      description="View the latest athlete rankings across all disciplines."
      heroImage={randomS3ImageForDiscipline(validDiscipline)}
      title="Rankings"
    >
      <FeaturedAthleteSection athletes={athletes} />
      <section className="p-4 sm:p-0">
        <Suspense fallback={<div className="flex justify-center min-h-64 items-center"><Spinner /></div>}>
          <RankingsTable disciplineEnumValue={validDiscipline} />
        </Suspense>
      </section>
    </PageLayout>
  )
}
