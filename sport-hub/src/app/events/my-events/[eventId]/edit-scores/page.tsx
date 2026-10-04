import { notFound, redirect } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { getEvent } from '../../../submit/actions';
import { requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import { EventSubmissionFormValues } from '../../../submit/types';
import EditScoresClient from './EditScoresClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export default async function EditScoresPage({ params }: Props) {
  await requireEventSubmitter();

  const { eventId } = await params;
  const { success, event } = await getEvent(eventId);

  if (!success || !event) {
    notFound();
  }

  const session = await auth();
  if (session?.user?.role !== 'admin' && event.createdBy !== session?.user?.id) {
    redirect('/events/my-events');
  }

  // Only published events use this page
  if (event.status !== 'published') {
    redirect(`/events/my-events/${eventId}/edit`);

  }

  const website = event.contests?.[0]?.infoUrl as string;

  const initialValues: EventSubmissionFormValues = {
    event: {
      eventName: event.eventName,
      city: event?.city || '',
      country: event.country,
      startDate: event.startDate,
      endDate: event.endDate,
      website,
      links: event.links,
    },
    contests: event.contests.map((c) => ({
      ...c,
      judgingSystem: "OTHER",
      discipline: c.discipline,
      gender: c.gender as Gender,
      ageCategory: c.ageCategory as AgeCategory,
      contestSize: c.contestSize as ContestType,
      totalPrizeValue: c.prize,
      judges: c.judges || [],
      results: c.results || [],
    })),
  };

  return (
    <PageLayout
      description={
        <>
          Editing judges and scores for <strong>{event.eventName}</strong>.
          Contest settings cannot be changed here.
        </>
      }
      title="Edit Judges &amp; Scores"
    >
      <EditScoresClient eventId={eventId} initialValues={initialValues} />
    </PageLayout>
  );
}
