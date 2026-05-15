import { Suspense } from 'react'
import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import { getFeaturedAthletes } from '@lib/data-services'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import type { Metadata } from 'next'
import { randomS3ImageForDiscipline } from '@utils/images'
import Spinner from '@ui/Spinner'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

export const revalidate = false

export default async function Page({ searchParams }: { searchParams: Promise<{ discipline?: string }> }) {
  const { discipline } = await searchParams;

  const athletes = await getFeaturedAthletes(discipline);

  return (
    <PageLayout
      description="View the latest athlete rankings across all disciplines."
      heroImage={randomS3ImageForDiscipline(discipline)}
      title="Rankings"
    >
      <FeaturedAthleteSection athletes={athletes} />
      <section className="p-4 sm:p-0">
        <Suspense fallback={<div className="flex justify-center min-h-64 items-center"><Spinner /></div>}>
          <RankingsTable initialDiscipline={discipline || ""} />
        </Suspense>
      </section>
    </PageLayout>
  )
}
