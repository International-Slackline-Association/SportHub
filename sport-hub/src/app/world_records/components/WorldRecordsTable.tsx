"use client";

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { WorldRecord } from '@lib/data-services';
import Table from '@ui/Table';
import tableStyles from '@ui/Table/styles.module.css';
import { useClientMediaQuery } from '@utils/useClientMediaQuery';
import Link from 'next/link';
import {
  AthleteNames,
  athletesCellFormatter,
  linkCellFormatter,
  linkClassName,
  LIST_FILTER_OPTIONS,
  listCellFormatter,
  TitleBadge,
  titleCellFormatter,
  dateSortingFn,
} from './cellFormatters';
import { AdminEditLink } from './AdminEditLink';

const columnHelper = createColumnHelper<WorldRecord>();

const sharedColumns = [
  columnHelper.accessor('categoryName', {
    header: 'Category',
    enableColumnFilter: true,
    meta: { filterVariant: 'autocomplete' },
    size: 160,
  }),
  columnHelper.accessor('list', {
    header: 'List',
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: string) => row.getValue<string>(columnId) === filterValue,
    cell: listCellFormatter,
    meta: { filterVariant: 'select', filterOptions: LIST_FILTER_OPTIONS },
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
            <AdminEditLink entry={info.row.original} />
          </div>
        </div>
      );
    },
  }),
  // Desktop-only columns
  columnHelper.accessor('title', { header: 'Title', cell: titleCellFormatter, size: 80 }),
  columnHelper.accessor('date', { header: 'Date', sortingFn: dateSortingFn, size: 40 }),
  columnHelper.accessor('value', { header: 'Record', size: 80 }),
  columnHelper.accessor('athletes', {
    header: 'Athletes',
    cell: athletesCellFormatter,
    size: 120,
  }),
  columnHelper.accessor('links', {
    header: "Links",
    cell: linkCellFormatter,
    size: 40,
  }),
  // Shared filterable columns
  ...sharedColumns,
];

type View = 'current' | 'unchallenged' | 'history';

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'current', label: 'Current world records' },
  { value: 'unchallenged', label: 'Unchallenged categories' },
  { value: 'history', label: 'Record history' },
];

/** Current: active categories only. Unchallenged: shown apart from the active records (§6.1). History: everything. */
const inView = (row: WorldRecord, view: View) => {
  switch (view) {
    case 'current': return row.isCurrent && row.categoryStatus === 'active';
    case 'unchallenged': return row.isCurrent && row.categoryStatus === 'unchallenged';
    case 'history': return true;
  }
};

type WorldRecordsTableProps = {
  data: WorldRecord[];
};

const WorldRecordsTable = ({ data }: WorldRecordsTableProps) => {
  const { isDesktop } = useClientMediaQuery();
  const [selectedLineType, setSelectedLineType] = useState('');
  const [view, setView] = useState<View>('current');

  const lineTypeOptions = useMemo(() => {
    const types = [...new Set(data.map(r => r.lineType).filter(Boolean))].sort();
    return types.map(t => ({ value: t, label: t }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (!inView(row, view)) return false;
      if (selectedLineType && row.lineType !== selectedLineType) return false;
      return true;
    });
  }, [data, selectedLineType, view]);

  return (
    <Table
      extraFilters={
        <>
          <div className={tableStyles.columnFilter}>
            <label htmlFor="wr-view">Show</label>
            <select id="wr-view" value={view} onChange={e => setView(e.target.value as View)}>
              {VIEW_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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
        </>
      }
      options={{
        columns,
        data: filteredData,
        initialState: {
          sorting: [{ id: 'date', desc: true }],
          columnOrder: isDesktop
            ? ['title', 'categoryName', 'value', 'athletes', 'list', 'date', 'links']
            : ['worldRecord', 'categoryName', 'list'],
          columnVisibility: {
            worldRecord:  !isDesktop,
            title:        !!isDesktop,
            date:         !!isDesktop,
            value:        !!isDesktop,
            athletes:     !!isDesktop,
            categoryName: !!isDesktop,
            list:         !!isDesktop,
            links:        !!isDesktop,
          },
        }
      }}
    />
  );
};

export default WorldRecordsTable;
