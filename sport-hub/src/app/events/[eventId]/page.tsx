import { getContestsData } from '@lib/data-services';
import { PageLayout } from '@ui/PageLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EventDetailsCard } from '@ui/EventDetailsCard';
import { getEvent } from '../submit/actions';
import ContestDetails, { ContestTabData } from './components/ContestDetails';
import { auth } from '@lib/auth';
import { getFullUserProfile } from '../../dashboard/actions';
import { ContestJudge } from '@lib/relational-types';

interface EventPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ contest?: string }>;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { eventId } = await params;
  const { contest: contestIdParam } = await searchParams;
  const decodedEventId = decodeURIComponent(eventId);
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const { success, event } = await getEvent(decodedEventId);
  if (success && event) {

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
      const judges = ((contest.judges || []).map(
        (j: ContestJudge & { id?: string, pendingUser?: Record<string, unknown> }) => {
          const pendingUser = j.pendingUser;
          return {
            userId: pendingUser ? "" : j.id || "",
            name: pendingUser
              ? `${pendingUser.name} ${pendingUser.surname} (new)`
              : (j.name as string) || (j.id as string) || '—',
            role: j.role,
            isPending: Boolean(pendingUser),
          };
        }));

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
        ...contest,
        judges,
        results: rawResults,
      };
    });

    return (
      <PageLayout>
        <div className="space-y-6">
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
          <ContestDetails
            eventId={decodedEventId}
            eventName={event.eventName}
            contests={contestTabs}
            initialTab={contestIdParam ? eventContests.findIndex(c => c.contestId === contestIdParam) : 0}
            isAdmin={isAdmin}
          />
        </div>
      </PageLayout>
    );
  }

  console.log("No event record found with ID:", decodedEventId, ", scanning all contests (old format)...");
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
                href={`/events/my-events/${eventId}/edit`}
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
