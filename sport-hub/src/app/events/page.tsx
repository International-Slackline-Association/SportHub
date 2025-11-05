import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { getFeaturedAthletes } from "@lib/data-services";
import FeaturedGrid, { FeaturedCard } from "@ui/FeatureGrid";
import PageLayout from "@ui/PageLayout";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

// Enable ISR (Incremental Static Regeneration)
// Revalidate this page every hour (3600 seconds)
export const revalidate = 3600

export default async function Page() {
  // Only fetch featured athletes server-side for SEO
  const featuredAthletes = await getFeaturedAthletes(4);

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
            key={athlete.userId}
            id={athlete.userId}
            name={athlete.fullName || athlete.name}
            image={athlete.profileImage || '/static/images/profiles/default.jpg'}
            country={athlete.country}
            disciplines={athlete.disciplines as Discipline[]}
          />
        ))}
      </FeaturedGrid>
      <section className="p-4 sm:p-0">
        <ContestsTable />
      </section>
    </PageLayout>
  );
}