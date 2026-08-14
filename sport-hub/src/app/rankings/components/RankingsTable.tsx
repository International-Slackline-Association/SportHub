"use client";

import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AthleteRanking } from '@lib/data-services';
import Table from '@ui/Table';
import { ageCategoryFilterFn } from '@ui/Table/TableFilterFields';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import { getIocCode } from '@utils/countries';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@ui/Spinner';
import { Alert } from '@ui/Alert';
import tableStyles from '@ui/Table/styles.module.css';
import { CountryFlag } from '@ui/CountryFlag';
import { DisciplineDropdown } from '@ui/Form';
import { DISCIPLINE_DATA } from '@utils/consts';
import { Tooltip } from '@ui/Tooltip';
import { cn } from '@utils/cn';
import { AthleteParticipationRecord } from '@lib/relational-types';

const linkClassName = 'text-blue-600 hover:text-blue-800 hover:underline font-medium';

const columnHelper = createColumnHelper<AthleteRanking>();

const NameCell = ({ athlete }: { athlete: AthleteRanking }) => {
  const displayName = athlete.fullName || athlete.name || `${athlete.name} ${athlete.surname || ''}`;
  return (
    <Link className={linkClassName} href={`/athlete/${athlete.userId}`}>
      {displayName}
    </Link>
  );
};

const ContestLink = ({ eventId, contestId, points }: AthleteParticipationRecord) => (
  <Link className={linkClassName} href={`/events/${eventId}?contest=${contestId}`}>
    {points}
  </Link>
);

const columns = [
  // Shared Columns
  columnHelper.accessor("rank", {
    header: 'Rank',
    enableSorting: false,
    size: 30,
  }),
  // Mobile: single stacked column
  columnHelper.display({
    id: 'athlete',
    header: 'Athlete',
    enableSorting: false,
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
    size: 180,
  }),
  // Desktop-only columns
  columnHelper.accessor('fullName', {
    enableColumnFilter: true,
    enableSorting: false,
    header: 'Name',
    cell: info => <NameCell athlete={info.row.original} />,
    meta: { filterVariant: 'text', filterPlaceholder: 'Enter athlete name' },
    size: 80,
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => info.getValue() ?? '—',
    enableColumnFilter: true,
    enableSorting: false,
    filterFn: ageCategoryFilterFn,
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'youth', label: 'Youth (< 18)' },
        { value: 'senior', label: 'Senior (35+)' },
      ],
    },
    size: 24,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    enableSorting: false,
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
    cell: info => info.getValue() === 'female' ? 'Women' : info.getValue() === 'male' ? 'Men' : '—',
    meta: {
      filterVariant: 'select',
      filterNoAll: true,
      filterOptions: [
        { value: 'female', label: 'Women' },
        { value: 'male', label: 'Men' },
      ],
    },
    size: 40,
  }),
  columnHelper.accessor((row: AthleteRanking) => getIocCode(row.country), {
    id: 'country',
    enableColumnFilter: true,
    enableSorting: false,
    header: 'Country',
    cell: info => <CountryFlag country={info.getValue()} />,
    meta: { filterVariant: 'country' },
    size: 40,
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

type RankingsTableProps = {
  discipline: Discipline;
  onChangeDiscipline: (enumValue: string) => void;
}

const RankingsTable = ({ discipline, onChangeDiscipline }: RankingsTableProps) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedYear, setSelectedYear] = useState('last3years');
  const disciplineEnumValue = DISCIPLINE_DATA[discipline].enumValue;

  const { data = [], error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['rankings', selectedYear, disciplineEnumValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear !== 'last3years') params.set('year', selectedYear);
      if (disciplineEnumValue) params.set('discipline', String(disciplineEnumValue));
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
              <DisciplineDropdown
                className={tableStyles.columnFilter}
                id="rankings-discipline"
                initialValue={String(disciplineEnumValue)}
                onChange={onChangeDiscipline}
              />
            </>
          }
          options={{
            columns: [
              ...columns,
              columnHelper.accessor('points', {
                header: () => (
                  <div className={cn("flex gap-2", isDesktop ? "flex-row" : "flex-col")}>
                    Points
                    <Tooltip
                      content={'Ranking is determined by adding the top two awarded points from the competitions athletes have participated in.'}
                      position="bottom"
                    />
                  </div>
                ),
                cell: info => {
                  const { points, topParticipations } = info.row.original;
                  return (
                    <div>
                      {points}
                      {!isDesktop && <br/>}
                      <span className={cn("opacity-75 italic", isDesktop ? "text-sm ml-2" : "text-xs")}>
                        {topParticipations[0] && (
                          <span>
                            (<ContestLink {...topParticipations[0]} />
                          </span>
                        )}
                        {topParticipations[1] && (
                          <span>
                            &nbsp;+ <ContestLink {...topParticipations[1]} />
                          </span>
                        )}
                        {topParticipations.length > 0 && (
                          <span>)</span>
                        )}
                      </span>
                    </div>
                  );
                },
                enableSorting: false,
              }),
            ],
            data,
            initialState: {
              columnFilters: [{ id: 'gender', value: 'female' }],
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
