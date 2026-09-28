"use client";

import { useState } from 'react';
import type {
  AthleteContest,
  WorldRecord,
  WorldFirst
} from '@lib/data-services';
import { TabGroup } from '@ui/Tab';
import AthleteContestsTable from './AthleteContestsTable';
import AthleteWorldRecordsTable from './AthleteWorldRecordsTable';
import AthleteWorldFirstsTable from './AthleteWorldFirstsTable';

const tabs = [
  { id: "contests", label: "Contests" },
  { id: "records", label: "World Records" },
  { id: "firsts", label: "World Firsts" },
];

interface AthleteDataTabsProps {
  contests?: AthleteContest[];
  worldRecords?: WorldRecord[];
  worldFirsts?: WorldFirst[];
}

export default function AthleteDataTabs({ contests, worldRecords, worldFirsts }: AthleteDataTabsProps) {
  const [activeTab, setActiveTab] = useState('contests');

  return (
    <>
      <div className="mb-6">
        <TabGroup
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          variant="secondary"
        />
      </div>
      {activeTab === 'contests' && (
        <AthleteContestsTable contests={contests || []} />
      )}
      {activeTab === 'records' && (
        <AthleteWorldRecordsTable worldRecords={worldRecords || []} />
      )}
      {activeTab === 'firsts' && (
        <AthleteWorldFirstsTable worldFirsts={worldFirsts || []} />
      )}
    </>
  );
}