"use client"

import { useState } from 'react';
import { mockAthleteProfile } from '@mocks/athlete_profile';
import { ProfileCard } from '@ui/ProfileCard';
import TabNavigation, { Tab } from '@ui/TabNavigation';
import AthleteContestsTable from './components/AthleteContestsTable';
import AthleteWorldRecordsTable from './components/AthleteWorldRecordsTable';
import AthleteWorldFirstsTable from './components/AthleteWorldFirstsTable';

const tabs: Tab[] = [
  { id: "contests", label: "Contests", path: "contests" },
  { id: "records", label: "World Records", path: "records" },
  { id: "firsts", label: "World Firsts", path: "firsts" },
];

export default function AthleteProfilePage() {
  // TODO: Leverage routing instead of state to make this a SSR page
  const [activeTab, setActiveTab] = useState('contests');
  
  return (
    <>
      <ProfileCard profile={mockAthleteProfile} />
      <section className="p-5 sm:p-0">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
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
