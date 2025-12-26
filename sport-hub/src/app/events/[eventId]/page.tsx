import { getContestsData } from '@lib/data-services';
import { PageLayout } from '@ui/PageLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EventDetailsCard } from '@ui/EventCard';

interface EventPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;

  // Fetch all contests and find the specific one
  const contests = await getContestsData();
  const event = contests.find(c => c.eventId === eventId);

  if (!event) {
    notFound();
  }

  // Sort participants by place
  const sortedParticipants = [...event.athletes].sort((a, b) => {
    const placeA = parseInt(a.place) || 999;
    const placeB = parseInt(b.place) || 999;
    return placeA - placeB;
  });

  return (
    <PageLayout
      title={event.name}
      description={`${event.discipline} - ${event.city}, ${event.country}`}
    >
      <div className="space-y-6">
        {/* Event Details Card */}
        <EventDetailsCard
          event={{
            name: event.name,
            date: event.date,
            city: event.city,
            country: event.country,
            discipline: event.discipline,
            prize: event.prize,
            athletes: event.athletes,
            verified: event.verified,
          }}
        />

        {/* Results Table */}
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
                      <td className="p-3 text-right">{participant.points}</td>
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
