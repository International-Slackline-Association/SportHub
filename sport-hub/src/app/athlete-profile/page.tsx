"use client"

import { useState } from 'react';
import { mockAthleteProfile } from '@mocks/athlete_profile';
import { ProfileCard } from '@ui/ProfileCard';
import AthleteContestsTable from './components/AthleteContestsTable';
import AthleteWorldRecordsTable from './components/AthleteWorldRecordsTable';
import AthleteWorldFirstsTable from './components/AthleteWorldFirstsTable';
import { TabGroup, TabItem } from '@ui/Tab';

const tabs: TabItem[] = [
  { id: "contests", label: "Contests" },
  { id: "records", label: "World Records" },
  { id: "firsts", label: "World Firsts" },
];

export default function AthleteProfilePage() {
  // TODO: Leverage routing instead of state to make this a SSR page
  const [activeTab, setActiveTab] = useState('contests');

  return (
    <>
      <ProfileCard profile={mockAthleteProfile} />
      <section className="p-5 sm:p-0">
        <TabGroup
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          variant="secondary"
        />
        {activeTab === 'contests' && (
          <AthleteContestsTable />
        )}

        {activeTab === 'records' && (
          <AthleteWorldRecordsTable />
        )}

        {activeTab === 'firsts' && (
          <AthleteWorldFirstsTable />
        )}
      </section>
    </>
  );
}
