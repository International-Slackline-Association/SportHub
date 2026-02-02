import { notFound } from 'next/navigation';
import { getAthleteProfile } from '@lib/data-services';
import { AthleteProfileCard } from '../components/AthleteProfileCard';
import AthleteDataTabs from '../components/AthleteDataTabs';

interface AthleteProfilePageProps {
  params: Promise<{ athleteId: string }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { athleteId } = await params;

  // Fetch only athlete data server-side for immediate display
  const athlete = await getAthleteProfile(athleteId);

  if (!athlete) {
    notFound();
  }

  return (
    <div className="stack gap-4">
      <AthleteProfileCard athlete={athlete} />
      <section className="p-4 sm:p-0">
        <AthleteDataTabs athleteId={athleteId} />
      </section>
    </div>
  );
}