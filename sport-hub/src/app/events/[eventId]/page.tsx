import { getContestsData } from '@lib/data-services';
import { PageLayout } from '@ui/PageLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EventDetailsCard } from '@ui/EventDetailsCard';
import { getEvent } from '../submit/actions';
import { getEventContests } from '@lib/event-contest-service';
import { eventGenderOptions, ageCategoryOptions } from '@ui/Form/commonOptions';
import { DISCIPLINE_DATA } from '@utils/consts';
import ContestTabs, { ContestTabData } from './ContestTabs';
import { auth } from '@lib/auth';
import { getFullUserProfile } from '../../dashboard/actions';

interface EventPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

const labelOf = (opts: { value: string; label: string }[], val: string | undefined) =>
  opts.find(o => o.value === val)?.label ?? val ?? '—';

const disciplineLabel = (val: string | undefined): string => {
  if (!val) return '—';
  const byKey = DISCIPLINE_DATA[val as keyof typeof DISCIPLINE_DATA];
  if (byKey) return byKey.name;
  return Object.values(DISCIPLINE_DATA).find(e => e.enumValue === Number(val))?.name ?? val;
};


export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const decodedEventId = decodeURIComponent(eventId);
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  // Try new-format events first (Metadata record with embedded contests array)
  const newFormatResult = await getEvent(decodedEventId);
  if (newFormatResult.success && newFormatResult.event) {
    const eventRecord = newFormatResult.event as Record<string, unknown>;
    if (Array.isArray(eventRecord.contests)) {
      const event = eventRecord;

      const organizerId = event.createdBy ? String(event.createdBy) : null;
      const organizerProfile = organizerId ? await getFullUserProfile(organizerId) : null;
      const organizerName = organizerProfile
        ? [organizerProfile.name, organizerProfile.surname].filter(Boolean).join(' ') || null
        : null;
      const eventContests = (event.contests as Record<string, unknown>[]);
      const totalPrize = eventContests.reduce((sum, c) => sum + Number(c.totalPrizeValue ?? 0), 0);

      // Build an EventLike-compatible object for EventDetailsCard
      const eventLike = {
        name: String(event.name ?? (event as Record<string, unknown>).eventName ?? ''),
        date: event.startDate as string | undefined,
        city: String(event.city ?? eventContests[0]?.city ?? ''),
        country: String(event.country ?? ''),
        discipline: (event.disciplines as string[] | undefined) ?? [],
        prize: totalPrize || undefined,
        profileUrl: (event.profileUrl as string | undefined) || (eventContests[0]?.profileUrl as string | undefined),
        thumbnailUrl: (event.thumbnailUrl as string | undefined) || (eventContests[0]?.thumbnailUrl as string | undefined),
        verified: false,
      };

      // Process contests into clean tab data on the server.
      const contestTabs: ContestTabData[] = eventContests.map((contest, idx) => {
        const label = [
          disciplineLabel(contest.discipline as string),
          labelOf(eventGenderOptions, contest.gender as string),
          labelOf(ageCategoryOptions, contest.ageCategory as string),
        ].filter(Boolean).join('-') || `Contest ${idx + 1}`;

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

        const rawResults = ((contest.results as Record<string, unknown>[] | undefined) ?? [])
          .slice()
          .sort((a, b) => Number(a.rank ?? 999) - Number(b.rank ?? 999))
          .map(r => {
            const pending = r.pendingUser as Record<string, unknown> | undefined;
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

        return { label, judges, results: rawResults };
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
                  href={`/athlete-profile/${encodeURIComponent(organizerId)}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {organizerName ?? String(event.createdByName ?? organizerId)}
                </Link>
              </p>
            )}
            <ContestTabs contests={contestTabs} />
          </div>
        </PageLayout>
      );
    }
  }

  // Mid-path: event has Metadata + separate Contest:* records (migrated/seeded events)
  if (newFormatResult.success && newFormatResult.event) {
    const metaRecord = newFormatResult.event as Record<string, unknown>;
    const separateContests = await getEventContests(decodedEventId);
    if (separateContests.length > 0) {
      const eventLike = {
        name: String(metaRecord.eventName ?? ''),
        date: metaRecord.startDate as string | undefined,
        city: String(metaRecord.city ?? ''),
        country: String(metaRecord.country ?? ''),
        discipline: [] as string[],
        prize: undefined as number | undefined,
        profileUrl: metaRecord.profileUrl as string | undefined,
        thumbnailUrl: metaRecord.thumbnailUrl as string | undefined,
        verified: true,
      };

      const contestTabs: ContestTabData[] = separateContests.map((contest, idx) => {
        const label = [
          disciplineLabel(contest.discipline),
          labelOf(eventGenderOptions, contest.gender),
          labelOf(ageCategoryOptions, contest.ageCategory),
        ].filter(Boolean).join('-') || `Contest ${idx + 1}`;

        const rawResults = [...contest.results]
          .sort((a, b) => a.rank - b.rank)
          .map(r => ({
            rank: r.rank,
            id: r.id,
            name: r.name,
            isaPoints: r.isaPoints,
            isPending: r.isPending,
          }));

        return { label, judges: [], results: rawResults };
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
            <ContestTabs contests={contestTabs} />
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
          <EventDetailsCard event={oldEvent} />
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
                            href={`/athlete-profile/${participant.userId}`}
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
