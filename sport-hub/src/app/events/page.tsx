import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { getContestsData } from "@lib/data-services";
import PageLayout from "@ui/PageLayout";
import { FeaturedEventSection } from "@ui/FeaturedEventCard";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export const revalidate = false

export default async function Page() {
  const contestsData = await getContestsData();

  return (
    <PageLayout
      title="Events"
      description="View the latest events and competitions across all disciplines."
    >
      <FeaturedEventSection events={contestsData.slice(0,3)} />

      <section className="p-4 sm:p-0">
        <ContestsTable initialData={contestsData} />
      </section>
    </PageLayout>
  );
}
