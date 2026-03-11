import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import { getRankingsData } from '@lib/data-services'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

export const revalidate = false

export default async function Page() {
  const rankingsData = await getRankingsData();

  return (
    <PageLayout
      title="Rankings"
      description="View the latest athlete rankings across all disciplines."
    >
      <FeaturedAthleteSection athletes={rankingsData.slice(0, 3)} />
      <section className="p-4 sm:p-0">
        <RankingsTable initialData={rankingsData} />
      </section>
    </PageLayout>
  )
}