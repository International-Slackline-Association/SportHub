import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getAthleteProfile } from '@lib/data-services';
import { getUserIdByAthleteSlug } from '@lib/user-query-service';
import { AthleteProfileCard } from '../components/AthleteProfileCard';
import AthleteDataTabs from '../components/AthleteDataTabs';
import { getPublishedEventsByOrganizer } from '../../events/submit/actions';
import { COUNTRIES } from '@utils/countries';

interface AthleteProfilePageProps {
  params: Promise<{ identifier: string }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { identifier } = await params;
  const decoded = decodeURIComponent(identifier);

  // The identifier is either the internal sportHubUserId (SportHubID:xxx —
  // what every existing Link in the app builds) or a human-readable
  // athleteSlug (direct/shared navigation). Resolve to a userId either way.
  const userId = decoded.startsWith('SportHubID:')
    ? decoded
    : await getUserIdByAthleteSlug(decoded);

  if (!userId) {
    notFound();
  }

  // Fetch only profile data server-side for immediate display
  const profile = await getAthleteProfile(userId);

  if (!profile) {
    notFound();
  }

  // Canonicalize the URL bar to the athlete's slug. Every athlete gets one at
  // onboarding/enrichment/creation time, so this should always fire when
  // arriving via the raw ID; a profile can only lack a slug in the rare case
  // it has no name at all yet.
  if (profile.athleteSlug && decoded !== profile.athleteSlug) {
    permanentRedirect(`/athlete/${encodeURIComponent(profile.athleteSlug)}`);
  }

  const isOrganizer = profile.roles.includes('ORGANIZER');
  const organizedEvents = isOrganizer
    ? await getPublishedEventsByOrganizer(userId)
    : [];

  return (
    <div className="stack gap-4">
      <AthleteProfileCard athlete={profile} />
      <section className="p-4 sm:p-0">
        <AthleteDataTabs athleteId={userId} />
      </section>
      {isOrganizer && organizedEvents.length > 0 && (
        <section className="p-4 sm:p-0">
          <h3 className="text-xl font-bold mb-4">Organized Events</h3>
          <div className="space-y-3">
            {organizedEvents.map((event) => {
              const eventId = String(event.eventId ?? '');
              const startDate = event.startDate ? new Date(String(event.startDate)).toLocaleDateString() : null;
              const endDate = event.endDate ? new Date(String(event.endDate)).toLocaleDateString() : null;
              const dates = startDate && endDate && startDate !== endDate
                ? `${startDate} – ${endDate}`
                : startDate ?? '—';
              const countryCode = String(event.country ?? '');
              const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
              const location = [event.city, countryName].filter(Boolean).join(', ') || '—';
              const contestCount = Array.isArray(event.contests) ? event.contests.length : 0;

              return (
                <Link
                  key={eventId}
                  href={`/events/${encodeURIComponent(eventId)}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="stack gap-1">
                      <p className="font-semibold text-blue-700">{String(event.eventName ?? '—')}</p>
                      <p className="text-sm text-gray-500">{location}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500 shrink-0">
                      <p>{dates}</p>
                      {contestCount > 0 && (
                        <p>{contestCount} contest{contestCount !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}