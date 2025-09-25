import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAthleteProfile, getAthleteContests, getWorldRecords, getWorldFirsts } from '@lib/data-services';
import { ProfileCard } from '@ui/ProfileCard';
import TabNavigation, { Tab } from '@ui/TabNavigation';
import AthleteContestsTable from '../components/AthleteContestsTable';
import AthleteWorldRecordsTable from '../components/AthleteWorldRecordsTable';
import AthleteWorldFirstsTable from '../components/AthleteWorldFirstsTable';

const tabs: Tab[] = [
  { id: "contests", label: "Contests", path: "contests" },
  { id: "records", label: "World Records", path: "records" },
  { id: "firsts", label: "World Firsts", path: "firsts" },
];

interface Props {
  params: { athleteId: string };
  searchParams: { tab?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { athleteId } = await params;
  const profile = await getAthleteProfile(athleteId);

  if (!profile) {
    return { title: 'Athlete Not Found' };
  }

  return {
    title: `SportHub - ${profile.name}`,
    description: `View ${profile.name}'s athlete profile, contests, world records, and achievements.`,
  };
}

export default async function AthleteProfilePage({ params, searchParams }: Props) {
  const { athleteId } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = resolvedSearchParams.tab || 'contests';

  // Fetch data from DynamoDB
  const [profile, contests, worldRecords, worldFirsts] = await Promise.all([
    getAthleteProfile(athleteId),
    getAthleteContests(athleteId),
    getWorldRecords(),
    getWorldFirsts()
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <div className="stack gap-4">
      <ProfileCard profile={profile} />
      <section className="p-4 sm:p-0">
        <TabNavigation
          activeTab={activeTab}
          tabs={tabs}
          // For SSR, we use URL navigation instead of state
          basePath={`/athlete-profile/${athleteId}`}
        />

        {activeTab === 'contests' && (
          <AthleteContestsTable contests={contests} />
        )}

        {activeTab === 'records' && (
          <AthleteWorldRecordsTable worldRecords={worldRecords} />
        )}

        {activeTab === 'firsts' && (
          <AthleteWorldFirstsTable worldFirsts={worldFirsts} />
        )}
      </section>
    </div>
  );
}