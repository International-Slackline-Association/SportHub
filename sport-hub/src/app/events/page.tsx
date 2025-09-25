import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { getContestsData, getFeaturedAthletes } from "@lib/data-services";
import FeaturedGrid, { FeaturedCard } from "@ui/FeatureGrid";
import PageLayout from "@ui/PageLayout";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export default async function Page() {
  // Fetch data from DynamoDB
  const [contests, featuredAthletes] = await Promise.all([
    getContestsData(),
    getFeaturedAthletes(4) // Show top athletes as featured for events page
  ]);

  return (
    <PageLayout
      title="Events"
      description="View the latest events and competitions across all disciplines."
      heroImage={{
        src: "/static/images/hero-rigging.jpg",
        alt: "Placeholder Event Image",
        caption: "Placeholder Event Image"
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
        <ContestsTable contests={contests} />
      </section>
    </PageLayout>
  );
}