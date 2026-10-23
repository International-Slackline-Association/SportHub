"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldFirst } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import {
  AthleteNames,
  athletesCellFormatter,
  dateSortingFn,
  linkCellFormatter,
  linkClassName,
  LIST_FILTER_OPTIONS,
  listCellFormatter,
  TitleBadge,
  titleCellFormatter,
} from './cellFormatters';

const columnHelper = createColumnHelper<WorldFirst>();

const sharedColumns = [
  columnHelper.accessor('categoryName', {
    header: 'Category',
    enableColumnFilter: true,
    meta: { filterVariant: 'select' },
    size: 60,
  }),
  columnHelper.accessor('trickName', {
    header: 'Trick',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
    size: 100,
  }),
  columnHelper.accessor('list', {
    header: 'List',
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
    cell: listCellFormatter,
    meta: { filterVariant: 'select', filterOptions: LIST_FILTER_OPTIONS },
    size: 40,
  }),
];

const columns = [
  // Mobile: single stacked column
  columnHelper.display({
    id: 'worldFirst',
    header: 'World First',
    cell: info => {
      const { date, title, categoryName, trickName, lineDetails, athletes, links } = info.row.original;
      return (
        <div className="stack">
          <div className="cluster items-center justify-between text-gray-400">
            <span className="text-xs">{date}</span>
            <TitleBadge title={title} />
          </div>
          <div className="cluster items-center justify-between">
            <span className="font-medium">{trickName}</span>
            <span className="text-sm text-gray-500">{lineDetails || categoryName}</span>
          </div>
          <AthleteNames athletes={athletes} />
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
  columnHelper.accessor('title', { header: 'Title', cell: titleCellFormatter, size: 80 }),
  columnHelper.accessor('date', { header: 'Date', sortingFn: dateSortingFn, size: 40 }),
  columnHelper.accessor('athletes', {
    header: 'Athletes',
    cell: athletesCellFormatter,
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

type WorldFirstsTableProps = {
  data: WorldFirst[];
};

const WorldFirstsTable = ({ data }: WorldFirstsTableProps) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedCategory, setSelectedCategory] = useState('');

  const categoryOptions = useMemo(() => {
    const names = [...new Set(data.map(r => r.categoryName).filter(Boolean))].sort();
    return names.map(t => ({ value: t, label: t }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedCategory) return data;
    return data.filter(row => row.categoryName === selectedCategory);
  }, [data, selectedCategory]);

  return (
    <Table
      extraFilters={
        <div className={tableStyles.columnFilter}>
          <label htmlFor="wf-category">Category</label>
          <select
            id="wf-category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
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
            ? ['title', 'trickName', 'categoryName', 'athletes', 'list', 'date', 'links']
            : ['worldFirst', 'trickName', 'categoryName', 'list'],
          columnVisibility: {
            worldFirst:   !isDesktop,
            title:        !!isDesktop,
            date:         !!isDesktop,
            athletes:     !!isDesktop,
            trickName:    !!isDesktop,
            categoryName: !!isDesktop,
            list:         !!isDesktop,
            links:        !!isDesktop,
          },
        },
      }}
    />
  );
};

export default WorldFirstsTable;
