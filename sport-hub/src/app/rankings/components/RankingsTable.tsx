"use client";

import { useState, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { CircleFlag } from 'react-circle-flags';

const columnHelper = createColumnHelper<AthleteRanking>();

const CountryFlagWithName = ({ countryCode, defaultValue="N/A" }: { countryCode: string, defaultValue?: string }) => {
  if (countryCode === 'N/A' || !countryCode) {
    return <span className="text-gray-500">{defaultValue}</span>;
  }

  // Convert country code to flag
  const countryName = countryCode.toUpperCase(); // You could add a country name lookup here

  return (
    <div className="flex items-center gap-2" title={countryName}>
      <CircleFlag countryCode={"es"} height={22} width={22} />
      <span className="text-sm text-gray-600">{countryName}</span>
    </div>
  );
};

const NameCell = ({ athlete, showCountry=false }: { athlete: AthleteRanking, showCountry?: boolean }) => {
  const displayName = athlete.fullName || athlete.name || `${athlete.name} ${athlete.surname || ''}`;

  if (showCountry) {
    return (
      <div className="stack">
        <Link
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          href={`/athlete-profile/${athlete.userId}`}
        >
          {displayName}
        </Link>
        <CountryFlagWithName countryCode={athlete.country} defaultValue="" />
    </div>
    );
  }

  return (
    <Link href={`/athlete-profile/${athlete.userId}`}>
      {displayName}
    </Link>
  );
};

const desktopColumns = [
  columnHelper.display({
    header: 'Rank',
    cell: info => info.row.index + 1,
  }),
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    header: 'Name',
    cell: info => (
      <NameCell athlete={info.row.original} />
    ),
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
    cell: info => (
      <CountryFlagWithName countryCode={info.getValue()} />
    ),
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
];

const mobileColumns = [
  columnHelper.display({
    cell: info => info.row.index + 1,
    header: '',
    id: "rank",
    size: 36,
  }),
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    header: 'Name',
    cell: info => (
      <NameCell athlete={info.row.original} showCountry />
    ),
    meta: { filterVariant: 'text' },
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
  columnHelper.accessor('ageCategory', {
    enableColumnFilter: true,
    header: 'Age Category',
    meta: { filterVariant: 'select' },
  }),
  // Workaround to include country filter for mobile view but 
  columnHelper.accessor('country', {
    enableColumnFilter: true,
    header: '',
    id: "Country",
    cell: () => <></>,
    meta: { filterVariant: 'select' },
    size: 0
  }),
];

const RankingsTable = () => {
  const { isDesktop } = useClientMediaQuery();
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
    <Table options={{ columns: isDesktop ? desktopColumns : mobileColumns, data: rankings }} title="Rankings" />
  );
};

export default RankingsTable;
