import { notFound, redirect } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { getEvent } from '../../../submit/actions';
import { requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import { EventSubmissionFormValues } from '../../../submit/types';
import EditScoresClient from './EditScoresClient';
import { MAP_DISCIPLINE_ENUM_TO_NAME } from '@utils/consts';

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
  const disciplines = [
    ...new Set(
      event.contests.flatMap(c =>
        MAP_DISCIPLINE_ENUM_TO_NAME[Number(c.discipline)]
      ).filter(Boolean)
    )
  ];
  const website = event.contests?.[0]?.infoUrl as string;

  const initialValues: EventSubmissionFormValues = {
    event: {
      eventName: event.eventName,
      city: (event.city as string) || '',
      country: (event.country as string) || '',
      startDate: (event.startDate as string) || '',
      endDate: (event.endDate as string) || '',
      website,
      disciplines,
      links: [],
    },
    contests: event.contests.map((c) => ({
      ...c,
      judgingSystem: "OTHER",
      discipline: c.discipline as Discipline,
      gender: c.gender as Gender,
      ageCategory: c.ageCategory as AgeCategory,
      contestSize: c.contestSize as ContestType,
      totalPrizeValue: c.prize,
      judges: [],
      results: [],
    })),
  };

  return (
    <PageLayout title="Edit Judges &amp; Scores">
      <EditScoresClient
        eventId={eventId}
        eventName={event.eventName || eventId}
        initialValues={initialValues}
      />
    </PageLayout>
  );
}
