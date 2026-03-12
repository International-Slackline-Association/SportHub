import { notFound, redirect } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { getEvent } from '../../../submit/actions';
import { getContestsData, ContestData } from '@lib/data-services';
import { requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import {
  EventSubmissionFormValues,
  EventFormValues,
  ContestFormValues,
} from '../../../submit/types';
import {
  MAP_DISCIPLINE_ENUM_TO_NAME,
  MAP_CONTEST_GENDER_ENUM_TO_NAME,
  MAP_CONTEST_TYPE_ENUM_TO_NAME,
} from '@utils/consts';
import EditEventClient from './EditEventClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

function oldContestToFormValues(c: ContestData): ContestFormValues {
  const disciplineKey = MAP_DISCIPLINE_ENUM_TO_NAME[Number(c.discipline)];
  return {
    discipline: (disciplineKey as ContestFormValues['discipline']) || '' as ContestFormValues['discipline'],
    gender: (MAP_CONTEST_GENDER_ENUM_TO_NAME[c.gender] as ContestFormValues['gender']) || '' as ContestFormValues['gender'],
    ageCategory: 'SENIOR' as ContestFormValues['ageCategory'],
    judgingSystem: '' as ContestFormValues['judgingSystem'],
    contestSize: (MAP_CONTEST_TYPE_ENUM_TO_NAME[c.category] as ContestFormValues['contestSize']) || '' as ContestFormValues['contestSize'],
    totalPrizeValue: c.prize || undefined,
    startDate: c.date,
    endDate: c.date,
    judges: [],
    results: c.athletes
      .sort((a, b) => (parseInt(a.place) || 999) - (parseInt(b.place) || 999))
      .map((athlete) => ({
        rank: parseInt(athlete.place) || 0,
        id: athlete.userId,
        name: [athlete.name, athlete.surname].filter(Boolean).join(' '),
        isaPoints: athlete.points || 0,
        stats: '',
      })),
  };
}

export default async function EditEventPage({ params }: Props) {
  await requireEventSubmitter();

  const { eventId: rawEventId } = await params;
  const eventId = decodeURIComponent(rawEventId);
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const result = await getEvent(eventId);

  let initialValues: EventSubmissionFormValues;

  if (result.success && result.event) {
    // New-format event: reconstruct form values from Metadata record
    const event = result.event as Record<string, unknown>;

    // Only the creator (or admins) may edit
    if (!isAdmin && event.createdBy !== session?.user?.id) {
      redirect('/events/my-events');
    }

    // Only draft/pending events are editable (admins can edit any status)
    const status = event.status as string;
    if (!isAdmin && status !== 'draft' && status !== 'pending') {
      redirect('/events/my-events');
    }

    initialValues = {
      event: {
        name: (event.name as string) || '',
        city: (event.city as string) || '',
        country: (event.country as string) || '',
        startDate: (event.startDate as string) || '',
        endDate: (event.endDate as string) || '',
        website: (event.website as string) || '',
        disciplines: (event.disciplines as EventFormValues['disciplines']) || [],
        socialMedia: (event.socialMedia as EventFormValues['socialMedia']) || {},
        profileUrl: event.profileUrl as string | undefined,
        thumbnailUrl: event.thumbnailUrl as string | undefined,
      },
      contests: (event.contests as ContestFormValues[]) || [],
    };
  } else {
    // Old-format event (no Metadata record) — admins only
    if (!isAdmin) {
      redirect('/events/my-events');
    }

    const allContests = await getContestsData();
    const eventContests = allContests.filter((c) => c.eventId === eventId);

    if (eventContests.length === 0) {
      notFound();
    }

    const first = eventContests[0];
    const uniqueDisciplines = [...new Set(
      eventContests
        .map((c) => MAP_DISCIPLINE_ENUM_TO_NAME[Number(c.discipline)])
        .filter(Boolean)
    )] as EventFormValues['disciplines'];

    initialValues = {
      event: {
        name: first.name,
        city: first.city || '',
        country: first.country,
        startDate: first.date,
        endDate: first.date,
        website: '',
        disciplines: uniqueDisciplines,
        socialMedia: {},
        profileUrl: first.profileUrl,
        thumbnailUrl: first.thumbnailUrl,
      },
      contests: eventContests.map(oldContestToFormValues),
    };
  }

  return (
    <PageLayout title="Edit Event">
      <EditEventClient eventId={eventId} initialValues={initialValues} />
    </PageLayout>
  );
}
