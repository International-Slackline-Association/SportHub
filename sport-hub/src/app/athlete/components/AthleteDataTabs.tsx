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
import Spinner from '@ui/Spinner';

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
  const [data, setData] = useState<AthleteTabData>({
    contests: [],
    worldRecords: [],
    worldFirsts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadTabData() {
      try {
        setLoading(true);

        // Fetch only the tab data (contests, records, firsts)
        const response = await fetch(`/api/athlete/${athleteId}`);

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

  const hasWorldRecords = data.worldRecords.length > 0;
  const hasWorldFirsts = data.worldFirsts.length > 0;

  const tabs = [
    { id: "contests", label: "Contests" }
  ];

  if (hasWorldRecords) {
    tabs.push({ id: "records", label: "World Records" });
  }

  if (hasWorldFirsts) {
    tabs.push({ id: "firsts", label: "World Firsts" });
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
            <Spinner />
            <p>Loading {activeTab === 'contests' ? 'contests' : activeTab === 'records' ? 'world records' : 'world firsts'}...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'contests' && data && (
            <AthleteContestsTable contests={data.contests} />
          )}

          {activeTab === 'records' && hasWorldRecords && (
            <AthleteWorldRecordsTable worldRecords={data.worldRecords} />
          )}

          {activeTab === 'firsts' && hasWorldFirsts && (
            <AthleteWorldFirstsTable worldFirsts={data.worldFirsts} />
          )}
        </>
      )}
    </>
  );
}