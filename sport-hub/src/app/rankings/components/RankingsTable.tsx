"use client";

import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';
import { ageCategoryFilterFn } from '@ui/Table/TableFilterFields';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { getIocCode } from '@utils/countries';
import { DISCIPLINE_DATA } from '@utils/consts';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@ui/Spinner';
import { Alert } from '@ui/Alert';
import tableStyles from '@ui/Table/styles.module.css';
import { CountryFlag } from '@ui/CountryFlag';

const columnHelper = createColumnHelper<AthleteRanking>();

const NameCell = ({ athlete }: { athlete: AthleteRanking }) => {
  const displayName = athlete.fullName || athlete.name || `${athlete.name} ${athlete.surname || ''}`;
  return (
    <Link
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      href={`/athlete-profile/${athlete.userId}`}
    >
      {displayName}
    </Link>
  );
};

const columns = [
  // Shared Columns
  columnHelper.display({
    id: 'rank',
    header: 'Rank',
    cell: info => info.row.index + 1,
  }),
  columnHelper.accessor('points', {
    header: 'Points',
  }),
  // Mobile: single stacked column
  columnHelper.display({
    id: 'athlete',
    header: 'Athlete',
    cell: info => {
      const { age, gender, country } = info.row.original;
      const genderLabel = gender === 'female' ? 'Women' : gender === 'male' ? 'Men' : '—';
      return (
        <div className="stack gap-2">
          <div className="cluster gap-2 items-center">
            <NameCell athlete={info.row.original} />
            <span className="text-xs text-gray-400">{age ?? '—'}</span>
          </div>
          <div className="cluster gap-2 items-center">
            <CountryFlag country={country} defaultValue="" />
            <span className="text-xs text-gray-400" style={{ paddingTop: 2 }}>{genderLabel}</span>
          </div>
        </div>
      );
    },
  }),
  // Desktop-only columns
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    header: 'Name',
    cell: info => <NameCell athlete={info.row.original} />,
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
    cell: info => <CountryFlag country={info.getValue()} />,
    meta: { filterVariant: 'select' },
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

  // Adjust rank and points column width based on device
  columns[0].size = isDesktop ? 36 : 48;
  columns[1].size = isDesktop ? 36 : 60;

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
            columns,
            data,
            initialState: {
              columnOrder: isDesktop
                ? ['rank', 'fullName', 'age', 'gender', 'country', 'points']
                : ['rank', 'athlete', 'points'],
              columnVisibility: {
                athlete:  !isDesktop,
                fullName: !!isDesktop,
                age:      !!isDesktop,
                gender:   !!isDesktop,
                country:  !!isDesktop,
              },
            },
          }}
        />
      )}
    </div>
  );
};

export default RankingsTable;
