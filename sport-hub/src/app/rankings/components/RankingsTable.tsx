"use client";

import { useState, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';
import { ageCategoryFilterFn } from '@ui/Table/TableFilterFields';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { CircleFlag } from 'react-circle-flags';
import { getIocCode, getIso2FromIoc } from '@utils/countries';
import { DISCIPLINE_DATA } from '@utils/consts';

const columnHelper = createColumnHelper<AthleteRanking>();

const CountryFlagWithName = ({ iocCode, defaultValue="N/A" }: { iocCode: string, defaultValue?: string }) => {
  if (iocCode === 'N/A' || !iocCode) {
    return <span className="text-gray-500">{defaultValue}</span>;
  }

  const iso2 = getIso2FromIoc(iocCode);

  return (
    <div className="flex items-center gap-2" title={iocCode}>
      <CircleFlag countryCode={iso2} height={22} width={22} />
      <span className="text-sm text-gray-600">{iocCode}</span>
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
        <CountryFlagWithName iocCode={getIocCode(athlete.country)} defaultValue="" />
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
    cell: info => info.table.getRowModel().rows.indexOf(info.row) + 1,
  }),
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    header: 'Name',
    cell: info => (
      <NameCell athlete={info.row.original} />
    ),
    meta: { filterVariant: 'text', filterPlaceholder: 'Enter athlete name' },
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => info.getValue() ?? '—',
    enableColumnFilter: true,
    filterFn: ageCategoryFilterFn,
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'youth', label: 'Youth (< 18)' },
        { value: 'senior', label: 'Senior (35+)' },
      ],
    },
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    cell: info => info.getValue() === 'female' ? 'Women' : info.getValue() === 'male' ? 'Men' : '—',
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'male', label: 'Men' },
        { value: 'female', label: 'Women' },
      ],
    },
  }),
  columnHelper.accessor((row: AthleteRanking) => getIocCode(row.country), {
    id: 'country',
    enableColumnFilter: true,
    header: 'Country',
    cell: info => (
      <CountryFlagWithName iocCode={info.getValue()} />
    ),
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
];

const mobileColumns = [
  columnHelper.display({
    cell: info => info.table.getRowModel().rows.indexOf(info.row) + 1,
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
    meta: { filterVariant: 'text', filterPlaceholder: 'Enter athlete name' },
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => info.getValue() ?? '—',
    enableColumnFilter: true,
    filterFn: ageCategoryFilterFn,
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'youth', label: 'Youth (< 18)' },
        { value: 'senior', label: 'Senior (35+)' },
      ],
    },
  }),
  // Temporary workaround to include country filter for mobile view
  columnHelper.accessor((row: AthleteRanking) => getIocCode(row.country), {
    id: 'country',
    enableColumnFilter: true,
    header: 'Country',
    cell: () => <></>,
    meta: { filterVariant: 'select' },
    size: 0
  }),
  columnHelper.accessor('gender', {
    id: 'gender',
    enableColumnFilter: true,
    header: 'Gender',
    cell: () => <></>,
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'male', label: 'Men' },
        { value: 'female', label: 'Women' },
      ],
    },
    size: 0,
  }),
];

const FIRST_COMP_YEAR = 2017;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: 'last3years', label: 'Last 3 Years' },
  ...Array.from({ length: CURRENT_YEAR - FIRST_COMP_YEAR + 1 }, (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
  }),
];

const DISCIPLINE_OPTIONS = [
  { value: '', label: 'All Disciplines' },
  ...Object.values(DISCIPLINE_DATA)
    .filter(d => d.enumValue !== 0)
    .map(d => ({ value: String(d.enumValue), label: d.name })),
];

const RankingsTable = ({ initialData = [], initialDiscipline = '' }: { initialData?: AthleteRanking[]; initialDiscipline?: string }) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedYear, setSelectedYear] = useState('last3years');
  const [selectedDiscipline, setSelectedDiscipline] = useState(initialDiscipline);
  const [rankings, setRankings] = useState<AthleteRanking[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRankings() {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (selectedYear !== 'last3years') params.set('year', selectedYear);
        if (selectedDiscipline) params.set('discipline', selectedDiscipline);
        const url = `/api/rankings${params.size ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!cancelled) setRankings(data);
      } catch (err) {
        console.error('Error loading rankings:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRankings();
    return () => { cancelled = true; };
  }, [selectedYear, selectedDiscipline]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 sm:p-0">
        <div className="flex items-center gap-2">
          <label htmlFor="rankings-year" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Season
          </label>
          <select
            id="rankings-year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {YEAR_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="rankings-discipline" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Discipline
          </label>
          <select
            id="rankings-discipline"
            value={selectedDiscipline}
            onChange={e => setSelectedDiscipline(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {DISCIPLINE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading rankings...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center text-red-600">
            <p>Failed to load rankings data</p>
          </div>
        </div>
      ) : (
        <Table options={{ columns: isDesktop ? desktopColumns : mobileColumns, data: rankings }} title="Rankings" />
      )}
    </div>
  );
};

export default RankingsTable;
