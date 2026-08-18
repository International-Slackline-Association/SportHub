import { Metadata } from "next";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import PageLayout from "@ui/PageLayout";
import { getMyEvents } from "../submit/actions";
import Button from "@ui/Button";
import { MyEventsTable } from "./components/MyEventsTable";
import { MyEventsList } from "./components/MyEventsList";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "SportHub - My Events",
};

export type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled';

export default async function MyEventsPage() {
  const { device } = userAgent({ headers: await headers() });
  const result = await getMyEvents();
  const events = (result.events ?? []) as Record<string, unknown>[];

  return (
    <PageLayout
      title="My Events"
      description="Events you have submitted. Submit drafts for admin approval when ready."
    >
      <section className="p-4 sm:p-0">
        {device?.type === "mobile"
          ? <MyEventsList events={events} />
          : <MyEventsTable events={events} />
        }
        <div className="flex justify-end mt-4">
          <Button as="link" href="/events/submit">
            New Event
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
