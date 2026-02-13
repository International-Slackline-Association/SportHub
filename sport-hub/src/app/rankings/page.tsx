import { FeaturedAthleteSection } from '@ui/FeaturedAthleteCard'
import { getFeaturedAthletes } from '@lib/data-services'
import PageLayout from '@ui/PageLayout'
import RankingsTable from './components/RankingsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

// Enable ISR (Incremental Static Regeneration)
// Revalidate this page every hour (3600 seconds)
export const revalidate = 3600

export default async function Page() {
  // Only fetch featured athletes server-side for SEO
  const featuredAthletes = await getFeaturedAthletes(4);

  return (
    <PageLayout
      title="Rankings"
      description="View the latest athlete rankings across all disciplines."
    >
      <FeaturedAthleteSection athletes={featuredAthletes.slice(0, 3)} />
      <section className="p-4 sm:p-0">
        <RankingsTable />
      </section>
    </PageLayout>
  )
}