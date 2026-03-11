import { getContestsData } from '@lib/data-services';
import { PageLayout } from '@ui/PageLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EventDetailsCard } from '@ui/EventDetailsCard';
import { getEvent } from '../submit/actions';
import { disciplineOptions, eventGenderOptions, ageCategoryOptions } from '@ui/Form/commonOptions';
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
        name: String(event.name ?? ''),
        date: event.startDate as string | undefined,
        city: String(event.city ?? ''),
        country: String(event.country ?? ''),
        discipline: (event.disciplines as string[] | undefined) ?? [],
        prize: totalPrize || undefined,
        profileUrl: event.profileUrl as string | undefined,
        thumbnailUrl: event.thumbnailUrl as string | undefined,
        verified: false,
      };

      // Process contests into clean tab data on the server.
      // Handles both new-format (results/judges) and old-format (athletes/contestName) records.
      const contestTabs: ContestTabData[] = eventContests.map((contest, idx) => {
        const isOldFormat = Array.isArray(contest.athletes) && !('results' in contest);

        const label = isOldFormat
          ? String(contest.contestName ?? `Contest ${idx + 1}`)
          : [
              labelOf(disciplineOptions, contest.discipline as string),
              labelOf(eventGenderOptions, contest.gender as string),
              labelOf(ageCategoryOptions, contest.ageCategory as string),
            ].filter(Boolean).join(' · ') || `Contest ${idx + 1}`;

        const judges = isOldFormat ? [] : ((contest.judges as Record<string, unknown>[] | undefined) ?? []).map(j => {
          const pending = j.pendingUser as Record<string, unknown> | undefined;
          return {
            id: pending ? undefined : (j.id as string | undefined),
            name: pending
              ? `${pending.name} ${pending.surname} (new)`
              : (j.name as string) || (j.id as string) || '—',
            isPending: Boolean(pending),
          };
        });

        // Normalize old-format athletes → results shape
        const rawResults = isOldFormat
          ? ((contest.athletes as Record<string, unknown>[]).map(a => ({
              rank: Number(a.place ?? 999),
              id: String(a.userId ?? ''),
              name: String(a.name ?? ''),
              isaPoints: Number(a.points ?? 0),
              isPending: false,
            })))
          : ((contest.results as Record<string, unknown>[] | undefined) ?? [])
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
        <PageLayout title="">
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

  // Fall through to old-format events (Contest:* sort key records, no embedded contests array)
  const contests = await getContestsData();
  const oldEvent = contests.find(c => c.eventId === decodedEventId);

  if (oldEvent) {
    const sortedParticipants = [...oldEvent.athletes].sort((a, b) => {
      const placeA = parseInt(a.place) || 999;
      const placeB = parseInt(b.place) || 999;
      return placeA - placeB;
    });

    return (
      <PageLayout title="">
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
