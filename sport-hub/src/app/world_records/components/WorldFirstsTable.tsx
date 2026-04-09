"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import { CountryFlag } from '@ui/CountryFlag';
import { textToTitleCase } from '@utils/strings';
import Link from 'next/link';

const columnHelper = createColumnHelper<WorldFirst>();

const sharedColumns = [
  columnHelper.accessor('typeOfFirst', {
    header: 'World First Type',
    enableColumnFilter: true,
    meta: { filterVariant: 'select' },
    size: 40,
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
    size: 80,
  }),
  columnHelper.accessor('country', {
    id: 'country',
    header: 'Country',
    enableColumnFilter: true,
    cell: info => <CountryFlag country={info.getValue()} defaultValue="" />,
    meta: { filterVariant: 'select' },
    size: 80,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
    cell: info => textToTitleCase(info.getValue()),
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'MEN',   label: 'Men' },
        { value: 'WOMEN', label: 'Women' },
      ],
    },
    size: 40,
  }),
];

const columns = [
  // Mobile: single stacked column
  columnHelper.display({
    id: 'worldFirst',
    header: 'World First',
    cell: info => {
      const { date, description, typeOfFirst, specs, name, country, gender } = info.row.original;
      return (
        <div className="stack">
          <div className="cluster items-center justify-between text-gray-400">
            <span className="text-xs">{date}</span>
            <div className="cluster gap-2 items-center text-sm">
              <span>{typeOfFirst}</span>
              <span>{specs}</span>
            </div>
          </div>
          <div className="cluster items-center justify-between">
            <span className="font-medium">
              {info.row.original.athleteUserId
                ? <Link href={`/athlete-profile/${info.row.original.athleteUserId}`} className="text-blue-600 hover:underline">{name}</Link>
                : name
              }
            </span>
            <span>{description}</span>
          </div>
          <div className="cluster gap-2 items-center">
            <CountryFlag country={country} defaultValue="" />
            <span className="text-xs text-gray-400" style={{ paddingTop: 2 }}>{textToTitleCase(gender)}</span>
          </div>
        </div>
      );
    },
  }),
  // Desktop-only columns
  columnHelper.accessor('date', { header: 'Date', size: 40 }),
  columnHelper.accessor('specs', { header: 'Specs', size: 80 }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => {
      const userId = info.row.original.athleteUserId;
      return userId
        ? <Link href={`/athlete-profile/${userId}`} className="text-blue-600 hover:underline">{info.getValue()}</Link>
        : <>{info.getValue()}</>;
    },
    size: 80,
  }),
  // Shared filterable columns
  ...sharedColumns,
];

type WorldFirstsTableProps = {
  data: WorldFirst[];
};

const WorldFirstsTable = ({ data }: WorldFirstsTableProps) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedLineType, setSelectedLineType] = useState('');

  const lineTypeOptions = useMemo(() => {
    const types = [...new Set(data.map(r => r.lineType).filter(Boolean))].sort();
    return types.map(t => ({ value: t, label: t }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedLineType) return data;
    return data.filter(row => row.lineType === selectedLineType);
  }, [data, selectedLineType]);

  return (
    <Table
      extraFilters={
        <div className={tableStyles.columnFilter}>
          <label htmlFor="wf-line-type">Type of Line</label>
          <select
            id="wf-line-type"
            value={selectedLineType}
            onChange={e => setSelectedLineType(e.target.value)}
          >
            <option value="">All</option>
            {lineTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      }
      options={{
        columns,
        data: filteredData,
        initialState: {
          columnOrder: isDesktop
            ? ['date', 'typeOfFirst', 'specs', 'description', 'name', 'country', 'gender']
            : ['worldFirst', 'typeOfFirst', 'description', 'country', 'gender'],
          columnVisibility: {
            worldFirst:  !isDesktop,
            date:        !!isDesktop,
            specs:       !!isDesktop,
            name:        !!isDesktop,
            typeOfFirst: !!isDesktop,
            description: !!isDesktop,
            country:     !!isDesktop,
            gender:      !!isDesktop,
          },
        },
      }}
    />
  );
};

export default WorldFirstsTable;
