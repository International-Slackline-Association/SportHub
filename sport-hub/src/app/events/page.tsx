import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { getContestsData } from "@lib/data-services";
import PageLayout from "@ui/PageLayout";
import { FeaturedEventSection } from "@ui/FeaturedEventCard";
import { randomS3Image } from "@utils/images";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const contestsData = await getContestsData();

  return (
    <PageLayout
      title="Events"
      description="View the latest events and competitions across all disciplines."
      heroImage={randomS3Image('EVENTS')}
    >
      <FeaturedEventSection events={contestsData.slice(0,3)} />

      <section className="p-4 sm:p-0">
        <ContestsTable initialData={contestsData} />
      </section>
    </PageLayout>
  );
}
