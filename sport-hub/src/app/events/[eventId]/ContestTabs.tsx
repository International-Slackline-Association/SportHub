'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContestSize from '@ui/Badge/ContestSize';
import ResultsTable from './ResultsTable';
import { TabGroup } from '@ui/Tab';
import Card from '@ui/Card';

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

export type ContestTabData = {
  label: string;
  gender?: string;
  contestSize?: string;
  prize?: number;
  judges: ContestJudge[];
  results: ContestResult[];
};

const CONTEST_GENDER_LABEL: Record<string, string> = {
  MEN_ONLY: 'Men', WOMEN_ONLY: 'Women', MIXED: 'Mixed',
};

export default function ContestTabs({ contests, initialTab = 0 }: { contests: ContestTabData[]; initialTab?: number }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const contest = contests[activeTab];

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Contests</h3>

      <TabGroup
        activeTab={String(activeTab)}
        onTabChange={(tabId: string) => setActiveTab(Number(tabId))}
        tabs={contests.map((c, idx) => ({
          id: String(idx),
          label: c.label,
        }))}
        variant="secondary"
      />

      {/* Tab content */}
      <div className="p-6">
        {(contest.contestSize || contest.gender || contest.prize) && (
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            {contest.contestSize && (
              <ContestSize variant={contest.contestSize as ContestType} />
            )}
            {contest.gender && (
              <span className="text-sm font-medium text-gray-600">
                {CONTEST_GENDER_LABEL[contest.gender] ?? contest.gender}
              </span>
            )}
            {contest.prize != null && contest.prize > 0 && (
              <span className="text-sm font-medium text-gray-600">
                Prize pool: {contest.prize.toLocaleString()} pts
              </span>
            )}
          </div>
        )}

        {contest.judges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Judges</h3>
            <div className="flex flex-wrap gap-2">
              {contest.judges.map((j, ji) => {
                if (j.isPending) {
                  return (
                    <span key={ji} className="text-sm px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 italic">
                      {j.name}
                    </span>
                  );
                }
                if (j.id) {
                  return (
                    <Link key={ji} href={`/athlete-profile/${j.id}`} className="text-sm px-2 py-0.5 rounded border border-gray-200 bg-white text-blue-600 hover:underline">
                      {j.name}
                    </Link>
                  );
                }
                return (
                  <span key={ji} className="text-sm px-2 py-0.5 rounded border border-gray-200 bg-white text-gray-700">
                    {j.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Results</h3>
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
          <p className="text-gray-500">No results available</p>
        )}
      </div>
    </Card>
  );
}
