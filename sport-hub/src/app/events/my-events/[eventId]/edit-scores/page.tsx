import { notFound, redirect } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { getEvent } from '../../../submit/actions';
import { requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import { EventSubmissionFormValues, EventFormValues, ContestFormValues } from '../../../submit/types';
import EditScoresClient from './EditScoresClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export default async function EditScoresPage({ params }: Props) {
  await requireEventSubmitter();

  const { eventId } = await params;
  const result = await getEvent(eventId);

  if (!result.success || !result.event) {
    notFound();
  }

  const event = result.event as Record<string, unknown>;

  const session = await auth();
  if (session?.user?.role !== 'admin' && event.createdBy !== session?.user?.id) {
    redirect('/events/my-events');
  }

  // Only published events use this page
  if (event.status !== 'published') {
    redirect(`/events/my-events/${eventId}/edit`);
  }

  const initialValues: EventSubmissionFormValues = {
    event: {
      name: (event.name as string) || '',
      city: (event.city as string) || '',
      country: (event.country as string) || '',
      startDate: (event.startDate as string) || '',
      endDate: (event.endDate as string) || '',
      website: (event.website as string) || '',
      disciplines: (event.disciplines as EventFormValues['disciplines']) || [],
      socialMedia: (event.socialMedia as EventFormValues['socialMedia']) || {},
    },
    contests: (event.contests as ContestFormValues[]) || [],
  };

  return (
    <PageLayout title="Edit Judges &amp; Scores">
      <EditScoresClient
        eventId={eventId}
        eventName={(event.name as string) || eventId}
        initialValues={initialValues}
      />
    </PageLayout>
  );
}
