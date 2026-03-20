'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContestSize from '@ui/Badge/ContestSize';

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
  const [active, setActive] = useState(
    initialTab > 0 && initialTab < contests.length ? initialTab : 0
  );
  const contest = contests[active];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {contests.map((c, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              active === idx
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Place</th>
                  <th className="text-left p-3">Athlete</th>
                  <th className="text-right p-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {contest.results.map((r, ri) => (
                  <tr key={ri} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{r.rank}</td>
                    <td className="p-3">
                      {!r.isPending && r.id ? (
                        <Link href={`/athlete-profile/${r.id}`} className="text-blue-600 hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <span className={r.isPending ? 'italic text-amber-700' : ''}>{r.name}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{r.isaPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No results available</p>
        )}
      </div>
    </div>
  );
}
