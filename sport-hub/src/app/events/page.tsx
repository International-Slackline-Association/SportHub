import type { Metadata } from "next";
import ContestsTable from "./components/ContestsTable";
import { ContestData, getContestsData } from "@lib/data-services";
import PageLayout from "@ui/PageLayout";
import { FeaturedEventSection } from "@ui/FeaturedEventCard";
import { randomS3Image } from "@utils/images";

export const metadata: Metadata = {
  title: 'SportHub - Events',
}

export const dynamic = 'force-dynamic'

const getFeaturedEvents = (allEvents: ContestData[]) => {
  const featuredEvents = allEvents
    .filter(event => {
        const hasProfileImage = !!event.thumbnailUrl;
        return hasProfileImage;
      });

  const randomIndex = () => Math.floor(Math.random() * featuredEvents.length);

  // Avoid selecting the same event
  let selectedEvents: ContestData[];
  let hasDuplicateEvent;
  do {
    selectedEvents = [
      featuredEvents[randomIndex()],
      featuredEvents[randomIndex()],
      featuredEvents[randomIndex()],
    ];
    hasDuplicateEvent = selectedEvents.some((comp, index) => {
      return selectedEvents.findIndex(c => c.eventId === comp.eventId) !== index;
    });
  } while (hasDuplicateEvent);

  return selectedEvents;
};

export default async function Page() {
  const contestsData = await getContestsData();
  const featuredEvents = getFeaturedEvents(contestsData);

  return (
    <PageLayout
      title="Competitions"
      description="View the latest events and competitions across all disciplines."
      heroImage={randomS3Image('EVENTS')}
    >
      <FeaturedEventSection events={featuredEvents} />

      <section className="p-4 sm:p-0">
        <ContestsTable initialData={contestsData} />
      </section>
    </PageLayout>
  );
}
