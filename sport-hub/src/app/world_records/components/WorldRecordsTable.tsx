"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import { CountryFlag } from '@ui/CountryFlag';
import { textToTitleCase } from '@utils/strings';
import Link from 'next/link';

const columnHelper = createColumnHelper<WorldRecord>();

const desktopColumns = [
  columnHelper.accessor('date', {
    header: 'Date',
    size: 40,
  }),
  columnHelper.accessor('recordType', {
    header: 'Record Type',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
    size: 160,
  }),
  columnHelper.accessor('specs', {
    header: 'Specs',
    size: 120,
  }),
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
  columnHelper.accessor('country', {
    id: 'country',
    header: 'Country',
    enableColumnFilter: true,
    cell: info => <CountryFlag country={info.getValue()} />,
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

const mobileColumns = [
  // Single stacked column: date / record type + specs / name + flag + gender
  columnHelper.display({
    id: 'worldRecord',
    header: 'World Record',
    cell: info => {
      const { date, recordType, specs, name, country, gender } = info.row.original;
      return (
        <div className="stack">
          <span className="text-xs text-gray-400">{date}</span>
          <span className="font-medium pb-2">{recordType}</span>
          <div className="cluster justify-between items-end gap-2">
            <div className="stack">
              <span className="font-medium">
                {info.row.original.athleteUserId
                  ? <Link href={`/athlete-profile/${info.row.original.athleteUserId}`} className="text-blue-600 hover:underline">{name || '—'}</Link>
                  : name || '—'
                }
              </span>
              <div className="cluster gap-2 items-center">
                <CountryFlag country={country} />
                <span className="text-xs text-gray-400" style={{ paddingTop: 2 }}>{textToTitleCase(gender)}</span>
              </div>
            </div>
            <span className="text-md">{specs}</span>
          </div>
        </div>
      );
    },
  }),
  // Hidden filter-only columns so recordType/country/gender filters still work on mobile
  columnHelper.accessor('recordType', {
    header: 'Record Type',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
  }),
  columnHelper.accessor('country', {
    header: 'Country',
    enableColumnFilter: true,
    meta: { filterVariant: 'select' },
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    meta: {
      filterVariant: 'select',
      filterOptions: [
        { value: 'MEN',   label: 'Men' },
        { value: 'WOMEN', label: 'Women' },
      ],
    },
  }),
];

type WorldRecordsTableProps = {
  data: WorldRecord[];
};

const WorldRecordsTable = ({ data }: WorldRecordsTableProps) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedLineType, setSelectedLineType] = useState('');

  const lineTypeOptions = useMemo(() => {
    const types = [...new Set(data.map(r => r.lineType).filter(Boolean))].sort();
    return types.map(t => ({ value: t, label: t }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (selectedLineType && row.lineType !== selectedLineType) return false;
      return true;
    });
  }, [data, selectedLineType]);

  return (
    <Table
      extraFilters={
        <div className={tableStyles.columnFilter}>
          <label htmlFor="wr-line-type">Type of Line</label>
          <select
            id="wr-line-type"
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
        columns: isDesktop ? desktopColumns : mobileColumns,
        data: filteredData,
        initialState: {
          sorting: [{ id: 'date', desc: true }],
          columnVisibility: {
            country: !!isDesktop,
            recordType: !!isDesktop,
            gender: !!isDesktop,
          }
        }
      }}
    />
  );
};

export default WorldRecordsTable;

