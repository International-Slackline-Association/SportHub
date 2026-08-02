import { getContestsData } from '@lib/data-services';
import { PageLayout } from '@ui/PageLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EventDetailsCard } from '@ui/EventDetailsCard';
import { getEvent } from '../submit/actions';
import { getEventContests } from '@lib/event-contest-service';
import { eventGenderOptions, contestSizeOptions } from '@ui/Form/commonOptions';
import { DISCIPLINE_DATA, MAP_DISCIPLINE_ENUM_TO_NAME } from '@utils/consts';
import ContestTabs, { ContestTabData } from './ContestTabs';
import { auth } from '@lib/auth';
import { getFullUserProfile } from '../../dashboard/actions';
import { ContestRecord } from '@lib/relational-types';

interface EventPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ contest?: string }>;
}

const labelOf = (opts: { value: string; label: string }[], val: string | undefined) =>
  opts.find(o => o.value === val)?.label ?? val ?? '—';

const disciplineLabel = (val: string | undefined): string => {
  const name = MAP_DISCIPLINE_ENUM_TO_NAME[Number(val)];
  const data = DISCIPLINE_DATA[name];
  if (!data) return '—';
  return data.name;
};

// Should match TabbedContestForms.getContestNameFromForm
const getContestNameFromObj = (contest: ContestRecord) => {
  const displayDiscipline = disciplineLabel(contest.discipline);
  const displayContestSize = labelOf(contestSizeOptions, contest.contestSize);
  const displayGender = labelOf(eventGenderOptions, contest.gender);
  return `${displayGender} ${displayDiscipline} ${displayContestSize}`.trim();
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { eventId } = await params;
  const { contest: contestIdParam } = await searchParams;
  const decodedEventId = decodeURIComponent(eventId);
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  // Try new-format events first (Metadata record with embedded contests array)
  const newFormatResult = await getEvent(decodedEventId);
  if (newFormatResult.success && newFormatResult.event) {
    const eventRecord = newFormatResult.event;
    if (Array.isArray(eventRecord.contests)) {
      const event = eventRecord;

      const organizerId = event.createdBy ? String(event.createdBy) : null;
      const organizerProfile = organizerId ? await getFullUserProfile(organizerId) : null;
      const organizerName = organizerProfile
        ? [organizerProfile.name, organizerProfile.surname].filter(Boolean).join(' ') || null
        : null;
      const eventContests = event.contests;
      const totalPrize = eventContests.reduce((sum, c) => sum + (c.prize ?? 0), 0);

      // Build an EventLike-compatible object for EventDetailsCard
      const eventLike = {
        name: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate,
        city: String(event.city ?? eventContests[0]?.city ?? ''),
        country: String(event.country ?? ''),
        discipline: [... new Set(eventContests.flatMap(c => c.discipline || []))],
        prize: totalPrize || undefined,
        profileUrl: (event.profileUrl as string | undefined) || (eventContests[0]?.profileUrl as string | undefined),
        thumbnailUrl: (event.thumbnailUrl as string | undefined) || (eventContests[0]?.thumbnailUrl as string | undefined),
        verified: false,
        website: event.contests?.[0]?.infoUrl as string,
      };
      
      // Process contests into clean tab data on the server.
      const contestTabs: ContestTabData[] = eventContests.map(contest => {
        const judges = ((contest.judges as Record<string, unknown>[] | undefined) ?? []).map(j => {
          const pending = j.pendingUser as Record<string, unknown> | undefined;
          return {
            id: pending ? undefined : (j.id as string | undefined),
            name: pending
              ? `${pending.name} ${pending.surname} (new)`
              : (j.name as string) || (j.id as string) || '—',
            isPending: Boolean(pending),
          };
        });

        const rawResults = (contest.results ?? [])
          .slice()
          .sort((a, b) => Number(a.rank ?? 999) - Number(b.rank ?? 999))
          .map(r => {
            const pending = r.pendingUser;
            return {
              rank: Number(r.rank ?? 0),
              id: pending ? undefined : (r.id as string | undefined),
              name: pending
                ? `${pending.name} ${pending.surname} (new)`
                : (r.name as string) || (r.id as string) || '—',
              isaPoints: Number(r.isaPoints ?? 0),
              isPending: Boolean(pending),
            };
          });

        return {
          label: getContestNameFromObj(contest),
          gender: contest.gender as string | undefined,
          contestSize: contest.contestSize as string | undefined,
          prize: contest.prize ?? 0,
          judges,
          results: rawResults,
        };
      });

      return (
        <PageLayout>
          <div className="space-y-6">
            {isAdmin && (
              <div className="flex justify-end">
                <Link
                  href={`/events/my-events/${encodeURIComponent(decodedEventId)}/edit`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Edit Event
                </Link>
              </div>
            )}
            <EventDetailsCard event={eventLike} />
            {organizerId && (
              <p className="text-sm text-gray-500">
                Organized by{' '}
                <Link
                  href={`/athlete/${encodeURIComponent(organizerId)}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {organizerName ?? String(event.createdByName ?? organizerId)}
                </Link>
              </p>
            )}
            <ContestTabs
              contests={contestTabs}
              initialTab={contestIdParam ? eventContests.findIndex(c => c.contestId === contestIdParam) : 0}
            />
          </div>
        </PageLayout>
      );
    }
  }

  // Mid-path: event has Metadata + separate Contest:* records (migrated/seeded events)
  if (newFormatResult.success && newFormatResult.event) {
    const metaRecord = newFormatResult.event;
    const separateContests = await getEventContests(decodedEventId);
    if (separateContests.length > 0) {
      const totalPrize = separateContests.reduce((sum, c) => sum + (c.prize ?? 0), 0);
      const eventLike = {
        name: String(metaRecord.eventName ?? ''),
        startDate: metaRecord.startDate,
        endDate: metaRecord.endDate,
        city: String(metaRecord.city ?? ''),
        country: String(metaRecord.country ?? ''),
        discipline: [] as string[],
        prize: totalPrize || undefined,
        profileUrl: metaRecord.profileUrl as string | undefined,
        thumbnailUrl: metaRecord.thumbnailUrl as string | undefined,
        verified: true,
      };

      const contestTabs: ContestTabData[] = separateContests.map(contest => {
        const rawResults = [...contest.results]
          .sort((a, b) => a.rank - b.rank)
          .map(r => ({
            rank: r.rank,
            id: r.id,
            name: r.name,
            isaPoints: r.isaPoints,
            isPending: r.isPending,
          }));

        return {
          label: getContestNameFromObj(contest),
          gender: contest.gender,
          contestSize: contest.contestSize,
          prize: contest.prize,
          judges: [],
          results: rawResults,
        };
      });

      return (
        <PageLayout>
          <div className="space-y-6">
            {isAdmin && (
              <div className="flex justify-end">
                <Link
                  href={`/events/my-events/${encodeURIComponent(decodedEventId)}/edit`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Edit Event
                </Link>
              </div>
            )}
            <EventDetailsCard event={eventLike} />
            <ContestTabs
              contests={contestTabs}
              initialTab={contestIdParam ? separateContests.findIndex(c => c.contestId === contestIdParam) : 0}
            />
          </div>
        </PageLayout>
      );
    }
  }

  // Fall through to old-format events (flat ContestData list — pre-migration records)
  const contests = await getContestsData();
  const oldEvent = contests.find(c => c.eventId === decodedEventId);

  if (oldEvent) {
    const sortedParticipants = [...oldEvent.athletes].sort((a, b) => {
      const placeA = parseInt(a.place) || 999;
      const placeB = parseInt(b.place) || 999;
      return placeA - placeB;
    });

    return (
      <PageLayout>
        <div className="space-y-6">
          {isAdmin && (
            <div className="flex justify-end">
              <Link
                href={`/events/my-events/${encodeURIComponent(decodedEventId)}/edit`}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Edit Event
              </Link>
            </div>
          )}
          <EventDetailsCard event={{
            ...oldEvent,
            startDate: oldEvent.startDate,
            endDate: oldEvent.endDate || "",
            gender: String(oldEvent.gender),
          }} />
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Results</h2>
            {sortedParticipants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Place</th>
                      <th className="text-left p-3">Athlete</th>
                      <th className="text-right p-3">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((participant, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-semibold">{participant.place}</td>
                        <td className="p-3">
                          <Link
                            href={`/athlete/${participant.userId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {participant.name}
                          </Link>
                        </td>
                        <td className="p-3 text-right">
                          {isNaN(participant.points) || participant.points === undefined
                            ? '-'
                            : participant.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No results available</p>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  notFound();
}
