"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { BREAKPOINT_LG, useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import {
  athleteCountriesAccessor,
  athleteNamesAccessor,
  athleteNamesCellFormatter,
  AthleteNames,
  countriesCellFormatter,
  countriesSortingFn,
  dateSortingFn,
  genderCellFormatter,
  genderFilterFn,
  linkCellFormatter,
  linkClassName,
  TitleBadge,
} from './cellFormatters';

const columnHelper = createColumnHelper<WorldRecord>();

const sharedColumns = [
  columnHelper.accessor('categoryName', {
    header: 'Category',
    enableColumnFilter: true,
    // The title sits under the category so the table stays narrow
    cell: info => (
      <div className="stack gap-1 items-start">
        <span>{info.getValue()}</span>
        <TitleBadge title={info.row.original.title} />
      </div>
    ),
    meta: { filterVariant: 'autocomplete' },
    size: 160,
  }),
  columnHelper.accessor(athleteCountriesAccessor, {
    id: 'country',
    header: 'Country',
    enableColumnFilter: true,
    cell: countriesCellFormatter,
    sortingFn: countriesSortingFn,
    filterFn: 'arrIncludes',
    meta: { filterVariant: 'select', filterIncludeAll: true },
    size: 80,
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    enableColumnFilter: true,
    filterFn: genderFilterFn,
    cell: genderCellFormatter,
    meta: { filterVariant: 'record-gender' },
    size: 40,
  }),
] as const;

const columns = [
  // Mobile: single stacked column
  columnHelper.display({
    id: 'worldRecord',
    header: 'World Record',
    cell: info => {
      const { date, title, categoryName, value, athletes, links } = info.row.original;
      return (
        <div className="stack">
          <div className="cluster justify-between items-center gap-2">
            <span className="text-xs text-gray-400">{date}</span>
            <TitleBadge title={title} />
          </div>
          <span className="font-medium pb-2">{categoryName}</span>
          <div className="cluster justify-between items-end gap-2">
            <AthleteNames athletes={athletes} />
            <span className="text-md">{value}</span>
          </div>
          <div className="cluster gap-2 text-xs">
            {links.map((link, idx) => (
              <Link className={linkClassName} href={link} key={`link_${idx}`} target="_newtab">
                Link {idx + 1}
              </Link>
            ))}
          </div>
        </div>
      );
    },
  }),
  // Desktop-only columns
  columnHelper.accessor('date', { header: 'Date', sortingFn: dateSortingFn, size: 40 }),
  columnHelper.accessor('value', { header: 'Record', size: 80 }),
  columnHelper.accessor(athleteNamesAccessor, {
    id: 'name',
    header: 'Name',
    cell: athleteNamesCellFormatter,
    size: 100,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: linkCellFormatter,
    size: 40,
  }),
  // Shared filterable columns
  ...sharedColumns,
];

type WorldRecordsTableProps = {
  data: WorldRecord[];
};

const WorldRecordsTable = ({ data }: WorldRecordsTableProps) => {
  const { isDesktop } = useClientMediaQuery(BREAKPOINT_LG);
  const [selectedGroup, setSelectedGroup] = useState('');

  const groupOptions = useMemo(
    () => [...new Set(data.map(r => r.categoryGroup).filter(Boolean))].sort(),
    [data],
  );

  const filteredData = useMemo(
    () => selectedGroup ? data.filter(row => row.categoryGroup === selectedGroup) : data,
    [data, selectedGroup],
  );

  return (
    <Table
      extraFilters={
        <div className={tableStyles.columnFilter}>
          <label htmlFor="wr-group">Group</label>
          <select
            id="wr-group"
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">All</option>
            {groupOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      }
      options={{
        columns,
        data: filteredData,
        initialState: {
          sorting: [{ id: 'date', desc: true }],
          columnOrder: isDesktop
            ? ['categoryName', 'value', 'name', 'country', 'gender', 'date', 'links']
            : ['worldRecord', 'categoryName', 'country', 'gender'],
          columnVisibility: {
            worldRecord:  !isDesktop,
            date:         !!isDesktop,
            value:        !!isDesktop,
            name:         !!isDesktop,
            country:      !!isDesktop,
            categoryName: !!isDesktop,
            gender:       !!isDesktop,
            links:        !!isDesktop,
          },
        }
      }}
    />
  );
};

export default WorldRecordsTable;
