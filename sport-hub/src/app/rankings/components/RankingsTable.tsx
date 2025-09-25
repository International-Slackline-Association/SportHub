"use client";

import { useState, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';

const columnHelper = createColumnHelper<AthleteRanking>();

const columns = [
  columnHelper.display({
    header: 'Rank',
    cell: info => info.row.index + 1,
  }),
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    header: 'Name',
    cell: info => {
      const athlete = info.row.original;
      const displayName = athlete.fullName || athlete.name || `${athlete.name} ${athlete.surname || ''}`;
      return (
        <a
          href={`/athlete-profile/${athlete.athleteId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {displayName}
        </a>
      );
    },
    meta: { filterVariant: 'text' },
  }),
  columnHelper.accessor('ageCategory', {
    enableColumnFilter: true,
    header: 'Age Category',
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor('country', {
    enableColumnFilter: true,
    header: 'Country',
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
];

const RankingsTable = () => {
  const [rankings, setRankings] = useState<AthleteRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadRankings() {
      try {
        const response = await fetch('/api/rankings');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setRankings(data);
      } catch (err) {
        console.error('Error loading rankings:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadRankings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center text-red-600">
          <p>Failed to load rankings data</p>
        </div>
      </div>
    );
  }

  return (
    <Table options={{ columns, data: rankings }} title="Rankings" />
  );
};

export default RankingsTable;
