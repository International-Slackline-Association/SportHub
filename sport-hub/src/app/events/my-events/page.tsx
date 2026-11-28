import Link from 'next/link';
import { Metadata } from "next";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import PageLayout from "@ui/PageLayout";
import { getMyEvents } from "../submit/actions";
import { Button } from '@slacklineinternational/onsight/react';
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
      <section>
        {device?.type === "mobile"
          ? <MyEventsList events={events} />
          : <MyEventsTable events={events} />
        }
        <div className="flex justify-end mt-4">
          <Button as={Link} href="/events/submit">
            New Event
          </Button>
        </div>
      </section>
    </PageLayout>
  );
}
