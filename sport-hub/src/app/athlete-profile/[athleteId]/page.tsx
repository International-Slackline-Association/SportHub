import { notFound } from 'next/navigation';
import { getAthleteProfile } from '@lib/data-services';
import { AthleteProfileCard } from '../components/AthleteProfileCard';
import AthleteDataTabs from '../components/AthleteDataTabs';

interface AthleteProfilePageProps {
  params: Promise<{ athleteId: string }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { athleteId } = await params;
  const decodedAthleteId = decodeURIComponent(athleteId);

  // Fetch only profile data server-side for immediate display
  const profile = await getAthleteProfile(decodedAthleteId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="stack gap-4">
      <AthleteProfileCard athlete={profile} />
      <section className="p-4 sm:p-0">
        <AthleteDataTabs athleteId={decodedAthleteId} />
      </section>
    </div>
  );
}