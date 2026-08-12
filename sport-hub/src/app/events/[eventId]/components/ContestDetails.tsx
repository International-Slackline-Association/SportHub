'use client';

import { useState } from 'react';
import ResultsTable from './ResultsTable';
import { Alert } from '@ui/Alert';
import { ContestRecord } from '@lib/relational-types';
import { ContestTabGroup } from './ContestTabGroup';
import { ContestAbout } from './ContestAbout';

export type ContestJudge = {
  id?: string;
  name: string;
  isPending: boolean;
};

export type ContestResult = {
  rank: number;
  id?: string;
  name: string;
  isaPoints: number;
  isPending: boolean;
};

export type ContestTabData = ContestRecord & {
  results: ContestResult[];
};

export default function ContestDetails({ contests, initialTab = 0 }: { contests: ContestTabData[]; initialTab?: number }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const contest = contests[activeTab];

  if (!contests.length) {
    return <Alert variant="info">No contests available for this event.</Alert>;
  }

  return (
    <section>
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">Contests</h3>
        <ContestTabGroup
          activeTab={String(activeTab)}
          onTabChange={(tabId: string) => setActiveTab(Number(tabId))}
          contests={contests}
          variant="secondary"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">About</h3>
        <ContestAbout contest={contest} />
      </div>

      <h3 className="mb-2">Results</h3>
      {contest.results.length > 0 ? (
        <ResultsTable
          data={contest.results.map(result => ({
            userId: result.id ?? '',
            name: result.name,
            place: String(result.rank),
            points: result.isaPoints,
          }))}
        />
      ) : (
        <Alert variant="info">No results available at this time.</Alert>
      )}
    </section>
  );
}
