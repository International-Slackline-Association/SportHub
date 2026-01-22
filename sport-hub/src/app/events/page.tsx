import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { getContestsData } from "@lib/data-services";
import PageLayout from "@ui/PageLayout";
import { FeaturedEventSection } from "@ui/FeaturedEventCard";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

// Enable ISR (Incremental Static Regeneration)
// Revalidate this page every hour (3600 seconds)
export const revalidate = 3600

export default async function Page() {
  const featuredEvents = await getContestsData();

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
      <FeaturedEventSection events={featuredEvents.slice(0,3)} />
      <section className="p-4 sm:p-0">
        <ContestsTable />
      </section>
    </PageLayout>
  );
}