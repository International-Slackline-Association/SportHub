"use client";

import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';
import { ageCategoryFilterFn } from '@ui/Table/TableFilterFields';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { CircleFlag } from 'react-circle-flags';
import { getIocCode, getIso2FromIoc } from '@utils/countries';
import { DISCIPLINE_DATA } from '@utils/consts';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@ui/Spinner';
import { Alert } from '@ui/Alert';
import tableStyles from '@ui/Table/styles.module.css';

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
    cell: info => info.row.index + 1,
    size: 36,
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
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
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
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
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

const RankingsTable = ({ initialDiscipline }: { initialDiscipline?: string }) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedYear, setSelectedYear] = useState('last3years');
  const [selectedDiscipline, setSelectedDiscipline] = useState(initialDiscipline);

  const { data = [], error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['rankings', selectedYear, selectedDiscipline],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear !== 'last3years') params.set('year', selectedYear);
      if (selectedDiscipline) params.set('discipline', selectedDiscipline);
      const url = `/api/rankings${params.size ? '?' + params.toString() : ''}`;
      return (await fetch(url)).json();
    },
  });

  return (
    <div className="flex items-center justify-center min-h-64">
      {isLoading && (
        <div className="text-center">
          <Spinner/>
          <p>Loading rankings...</p>
        </div>
      )}
      {isError && (
        <Alert>Failed to load rankings data: {error?.message}</Alert>
      )}
      {isSuccess && (
        <Table
          extraFilters={
            <>
              <div className={tableStyles.columnFilter}>
                <label htmlFor="rankings-year">Season</label>
                <select
                  id="rankings-year"
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                >
                  {YEAR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className={tableStyles.columnFilter}>
                <label htmlFor="rankings-discipline">Discipline</label>
                <select
                  id="rankings-discipline"
                  value={selectedDiscipline}
                  onChange={e => setSelectedDiscipline(e.target.value)}
                >
                  {DISCIPLINE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </>
          }
          options={{
            columns: isDesktop ? desktopColumns : mobileColumns,
            data,
          }}
        />
      )}
    </div>
  );
};

export default RankingsTable;
