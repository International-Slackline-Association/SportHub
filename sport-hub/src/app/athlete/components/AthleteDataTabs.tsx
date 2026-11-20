"use client";

import { useState } from 'react';
import type {
  AthleteContest,
  WorldRecord,
  WorldFirst
} from '@lib/data-services';
import { Tabs } from '@slacklineinternational/onsight/react';
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
        <Tabs
          aria-label="Athlete results"
          onChange={setActiveTab}
          tabs={tabs}
          value={activeTab}
          variant="pill"
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