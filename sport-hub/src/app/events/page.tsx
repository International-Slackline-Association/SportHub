import type { Metadata } from "next";
import Image from 'next/image'
import ContestsTable from "./components/ContestsTable";
import { mockFeaturedAthletes } from "@mocks/rankings_data";
import FeaturedGrid, { FeaturedCard } from "@ui/FeatureGrid";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export default async function Page() {
  return (
    <div className="stack gap-4">
      <div className="p-4 sm:p-0">
        <h1>Events</h1>
        <p>View the latest athlete rankings across all disciplines.</p>
      </div>
      <figure>
          <Image
            src="/static/images/hero-rigging.jpg"
            alt="Placeholder Event Image"
            width={3840}
            height={2560}
            className="heroImage"
            style={{ width: '100%', height: 'auto' }}
            priority
          />
        <figcaption>Placeholder Event Image</figcaption>
      </figure>

      <FeaturedGrid title="Featured Events">
        {mockFeaturedAthletes.map(athlete => (
          <FeaturedCard
            key={athlete.athleteId}
            id={athlete.athleteId}
            name={athlete.fullName || `${athlete.name} ${athlete.surname}`}
            image={athlete.profileImage || '/static/images/profiles/default.jpg'}
            country={athlete.country}
            countryFlag={`/static/images/flags/${athlete.country.toLowerCase()}.svg`}
            disciplines={athlete.disciplines}
          />
        ))}
      </FeaturedGrid>
      <section>
        <ContestsTable />
      </section>
    </div>
  );
}