'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { FirstCategoryTableItem, RecordCategoryTableItem } from '@lib/relational-types';
import { categoryHref, statusLabel, RECORD_STATUS_OPTIONS } from './statusOptions';

const nameLinkClass = 'font-medium text-blue-700 hover:underline';

const recordColumnHelper = createColumnHelper<RecordCategoryTableItem>();

/** World record categories. Click a name to see, modify or delete the category. */
export function RecordCategoriesTable({ categories }: { categories: RecordCategoryTableItem[] }) {
  const columns = useMemo(() => [
    recordColumnHelper.accessor('order', { header: '#', size: 20 }),
    recordColumnHelper.accessor('name', {
      header: 'Category',
      enableColumnFilter: true,
      meta: { filterVariant: 'text', filterPlaceholder: 'Search categories' },
      cell: info => (
        <div className="stack">
          <Link href={categoryHref('record', info.row.original.categoryId)} className={nameLinkClass}>{info.getValue()}</Link>
          {info.row.original.description && <span className="text-xs text-gray-700">{info.row.original.description}</span>}
        </div>
      ),
      size: 220,
    }),
    recordColumnHelper.accessor('group', {
      header: 'Group',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: RECORD_CATEGORY_GROUPS.map(g => ({ value: g, label: g })) },
      sortingFn: (a, b) => RECORD_CATEGORY_GROUPS.indexOf(a.original.group) - RECORD_CATEGORY_GROUPS.indexOf(b.original.group),
      size: 60,
    }),
    recordColumnHelper.accessor('unit', {
      header: 'Unit',
      cell: info => <span className="whitespace-nowrap">{info.getValue()} · {info.row.original.direction} is better</span>,
      size: 80,
    }),
    recordColumnHelper.accessor('status', {
      header: 'Status',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: RECORD_STATUS_OPTIONS },
      cell: info => statusLabel(info.getValue()),
      size: 60,
    }),
  ], []);

  return (
    <Table
      options={{
        columns,
        data: categories,
        initialState: { pagination: { pageIndex: 0, pageSize: 100 } },
      }}
    />
  );
}

const firstColumnHelper = createColumnHelper<FirstCategoryTableItem>();

/** World first disciplines. Click a name to see, modify or delete the discipline. */
export function FirstCategoriesTable({ categories }: { categories: FirstCategoryTableItem[] }) {
  const columns = useMemo(() => [
    firstColumnHelper.accessor('order', { header: '#', size: 20 }),
    firstColumnHelper.accessor('name', {
      header: 'Discipline',
      cell: info => (
        <div className="stack">
          <Link href={categoryHref('first', info.row.original.categoryId)} className={nameLinkClass}>{info.getValue()}</Link>
          {info.row.original.terminationRule && <span className="text-xs text-gray-700">{info.row.original.terminationRule}</span>}
        </div>
      ),
      size: 220,
    }),
    firstColumnHelper.accessor('status', {
      header: 'Status',
      cell: info => statusLabel(info.getValue()),
      size: 60,
    }),
  ], []);

  return <Table options={{ columns, data: categories }} />;
}
