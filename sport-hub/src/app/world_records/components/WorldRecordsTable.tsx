"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import { CountryFlag } from '@ui/CountryFlag';

const columnHelper = createColumnHelper<WorldRecord>();

const GENDER_LABEL: Record<string, string> = {
  MEN: 'Men',
  WOMEN: 'Women',
  ALL: 'All / Mixed',
  OTHER: '—',
};

const desktopColumns = [
  columnHelper.accessor('date', {
    enableSorting: true,
    header: 'Date',
    size: 40,
  }),
  columnHelper.accessor('recordType', {
    header: 'Record Type',
    enableColumnFilter: true,
    meta: { filterVariant: 'select' },
    size: 160,
  }),
  columnHelper.accessor('specs', {
    header: 'Specs',
    size: 120,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
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
    cell: info => GENDER_LABEL[info.getValue()] ?? info.getValue(),
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
          <span className="text-xs text-gray-400">{date || '—'}</span>
          <div className="stack" style={{ gap: '0.1rem' }}>
            <span className="font-medium">{recordType || '—'}</span>
            <span className="text-sm text-gray-600">{specs || '—'}</span>
          </div>
          <div className="stack" style={{ gap: '0.1rem' }}>
            <span className="font-medium">{name || '—'}</span>
            <CountryFlag country={country} />
            <span className="text-xs text-gray-500">{GENDER_LABEL[gender] ?? gender}</span>
          </div>
        </div>
      );
    },
  }),
  // Hidden filter-only columns so recordType/country/gender filters still work on mobile
  columnHelper.accessor('recordType', {
    header: 'Record Type',
    enableColumnFilter: true,
    meta: { filterVariant: 'select' },
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

