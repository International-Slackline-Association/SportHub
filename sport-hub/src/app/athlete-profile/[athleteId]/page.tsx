"use client";

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import {
  getAthleteProfile,
  getAthleteContests,
  getWorldRecords,
  getWorldFirsts,
  type AthleteProfile,
  type AthleteContest,
  type WorldRecord,
  type WorldFirst
} from '@lib/data-services';
import { ProfileCard } from '@ui/ProfileCard';
import { TabGroup } from '@ui/Tab';
import AthleteContestsTable from '../components/AthleteContestsTable';
import AthleteWorldRecordsTable from '../components/AthleteWorldRecordsTable';
import AthleteWorldFirstsTable from '../components/AthleteWorldFirstsTable';

const tabs = [
  { id: "contests", label: "Contests" },
  { id: "records", label: "World Records" },
  { id: "firsts", label: "World Firsts" },
];

interface AthleteData {
  profile: AthleteProfile;
  contests: AthleteContest[];
  worldRecords: WorldRecord[];
  worldFirsts: WorldFirst[];
}

export default function AthleteProfilePage() {
  const params = useParams();
  const athleteId = params.athleteId as string;
  const [activeTab, setActiveTab] = useState('contests');
  const [data, setData] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch data from DynamoDB
        const [profile, contests, worldRecords, worldFirsts] = await Promise.all([
          getAthleteProfile(athleteId),
          getAthleteContests(athleteId),
          getWorldRecords(),
          getWorldFirsts()
        ]);

        if (!profile) {
          setError(true);
          return;
        }

        setData({ profile, contests, worldRecords, worldFirsts });
      } catch (err) {
        console.error('Error loading athlete data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (athleteId) {
      loadData();
    }
  }, [athleteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading athlete profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    notFound();
  }

  const { profile, contests, worldRecords, worldFirsts } = data;

  return (
    <div className="stack gap-4">
      <ProfileCard profile={profile} />
      <section className="p-4 sm:p-0">
        <TabGroup
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          variant="secondary"
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