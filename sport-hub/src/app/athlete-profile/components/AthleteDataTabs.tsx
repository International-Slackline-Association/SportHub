"use client";

import { useState, useEffect } from 'react';
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
  athleteId: string;
}

interface AthleteTabData {
  contests: AthleteContest[];
  worldRecords: WorldRecord[];
  worldFirsts: WorldFirst[];
}

export default function AthleteDataTabs({ athleteId }: AthleteDataTabsProps) {
  const [activeTab, setActiveTab] = useState('contests');
  const [data, setData] = useState<AthleteTabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadTabData() {
      try {
        setLoading(true);

        // Fetch only the tab data (contests, records, firsts)
        const response = await fetch(`/api/athlete/${athleteId}/tabs`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const tabData = await response.json();
        setData(tabData);
      } catch (err) {
        console.error('Error loading athlete tab data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (athleteId) {
      loadTabData();
    }
  }, [athleteId]);

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Failed to load athlete data</p>
      </div>
    );
  }

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

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading {activeTab === 'contests' ? 'contests' : activeTab === 'records' ? 'world records' : 'world firsts'}...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'contests' && data && (
            <AthleteContestsTable contests={data.contests} />
          )}

          {activeTab === 'records' && data && (
            <AthleteWorldRecordsTable worldRecords={data.worldRecords} />
          )}

          {activeTab === 'firsts' && data && (
            <AthleteWorldFirstsTable worldFirsts={data.worldFirsts} />
          )}
        </>
      )}
    </>
  );
}