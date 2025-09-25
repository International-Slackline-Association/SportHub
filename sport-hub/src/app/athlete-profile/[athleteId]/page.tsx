import { notFound } from 'next/navigation';
import { getAthleteProfile } from '@lib/data-services';
import { ProfileCard } from '@ui/ProfileCard';
import AthleteDataTabs from '../components/AthleteDataTabs';

interface AthleteProfilePageProps {
  params: Promise<{ athleteId: string }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { athleteId } = await params;

  // Fetch only profile data server-side for immediate display
  const profile = await getAthleteProfile(athleteId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="stack gap-4">
      <ProfileCard profile={profile} />
      <section className="p-4 sm:p-0">
        <AthleteDataTabs athleteId={athleteId} />
      </section>
    </div>
  );
}