import type { Metadata } from 'next'
import { getFeaturedAthletes, getRankingsData } from '@lib/data-services'
import RankingsTable from './components/RankingsTable'
import FeaturedGrid, { FeaturedCard } from '@ui/FeatureGrid'
import PageLayout from '@ui/PageLayout'

export const metadata: Metadata = {
  title: 'SportHub - Rankings',
}

export default async function Page() {
  // Fetch data from DynamoDB
  const [featuredAthletes, allRankings] = await Promise.all([
    getFeaturedAthletes(4),
    getRankingsData()
  ]);

  return (
    <PageLayout
      title="Rankings"
      description="View the latest athlete rankings across all disciplines."
      heroImage={{
        src: "/static/images/hero-freestyle.png",
        alt: "Highline World Championship",
        caption: "Laax Highline World Championship, 2024"
      }}
    >
      <FeaturedGrid title="Featured Athletes">
        {featuredAthletes.map(athlete => (
          <FeaturedCard
            key={athlete.athleteId}
            id={athlete.athleteId}
            name={athlete.fullName || athlete.name}
            image={athlete.profileImage || '/static/images/profiles/default.jpg'}
            country={athlete.country}
            countryFlag={`/static/images/flags/${athlete.country.toLowerCase()}.svg`}
            disciplines={athlete.disciplines as Discipline[]}
          />
        ))}
      </FeaturedGrid>
      <section className="p-4 sm:p-0">
        <RankingsTable rankings={allRankings} />
      </section>
    </PageLayout>
  )
}