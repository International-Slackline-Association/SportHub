'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { FirstCategoryStatus, FirstCategoryTableItem, RecordCategoryStatus, RecordCategoryTableItem } from '@lib/relational-types';
import { updateFirstCategory, updateRecordCategory } from '../actions';
import { FIRST_STATUS_OPTIONS, RECORD_STATUS_OPTIONS } from './statusOptions';

const selectClass = 'border border-gray-300 rounded px-2 py-1 text-sm';
const linkButtonClass = 'text-blue-600 hover:underline text-sm';

type RowActions<T> = {
  onEdit: (category: T) => void;
  onHistory: (category: T) => void;
  onError: (error: string | null) => void;
};

/** Status select in a row. Status changes are logged with an optional reason. */
function StatusSelect<S extends string>({ name, status, options, onChange }: {
  name: string;
  status: S;
  options: Option[];
  onChange: (status: S, comment: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <select
      className={selectClass}
      value={status}
      disabled={busy}
      onChange={async e => {
        const next = e.target.value as S;
        const comment = prompt(`Set "${name}" to ${next}? Optional reason:`);
        if (comment === null) return;
        setBusy(true);
        await onChange(next, comment);
        setBusy(false);
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const RowButtons = ({ onEdit, onHistory }: { onEdit: () => void; onHistory: () => void }) => (
  <div className="flex gap-3">
    <button type="button" className={linkButtonClass} onClick={onEdit}>Edit</button>
    <button type="button" className={linkButtonClass} onClick={onHistory}>History</button>
  </div>
);

const recordColumnHelper = createColumnHelper<RecordCategoryTableItem>();

export function RecordCategoriesTable({ categories, onEdit, onHistory, onError }: { categories: RecordCategoryTableItem[] } & RowActions<RecordCategoryTableItem>) {
  const router = useRouter();
  const columns = useMemo(() => {
    const setStatus = async (category: RecordCategoryTableItem, status: RecordCategoryStatus, comment: string) => {
      const result = await updateRecordCategory(category.categoryId, { status, comment });
      onError(result.success ? null : result.error ?? 'Failed');
      if (result.success) router.refresh();
    };
    return [
      recordColumnHelper.accessor('order', { header: '#', size: 20 }),
      recordColumnHelper.accessor('name', {
        header: 'Category',
        enableColumnFilter: true,
        meta: { filterVariant: 'text', filterPlaceholder: 'Search categories' },
        cell: info => (
          <div className="stack">
            <span className="font-medium">{info.getValue()}</span>
            {info.row.original.description && <span className="text-xs text-gray-700">{info.row.original.description}</span>}
            <span className="text-xs text-gray-500">{info.row.original.categoryId}</span>
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
        cell: info => (
          <StatusSelect
            name={info.row.original.name}
            status={info.getValue()}
            options={RECORD_STATUS_OPTIONS}
            onChange={(status, comment) => setStatus(info.row.original, status, comment)}
          />
        ),
        size: 60,
      }),
      recordColumnHelper.display({
        id: 'actions',
        header: '',
        cell: info => <RowButtons onEdit={() => onEdit(info.row.original)} onHistory={() => onHistory(info.row.original)} />,
        size: 60,
      }),
    ];
  }, [onEdit, onHistory, onError, router]);

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

export function FirstCategoriesTable({ categories, onEdit, onHistory, onError }: { categories: FirstCategoryTableItem[] } & RowActions<FirstCategoryTableItem>) {
  const router = useRouter();
  const columns = useMemo(() => {
    const setStatus = async (category: FirstCategoryTableItem, status: FirstCategoryStatus, comment: string) => {
      const result = await updateFirstCategory(category.categoryId, { status, comment });
      onError(result.success ? null : result.error ?? 'Failed');
      if (result.success) router.refresh();
    };
    return [
      firstColumnHelper.accessor('order', { header: '#', size: 20 }),
      firstColumnHelper.accessor('name', {
        header: 'Discipline',
        cell: info => (
          <div className="stack">
            <span className="font-medium">{info.getValue()}</span>
            <span className="text-xs text-gray-500">{info.row.original.terminationRule || 'no termination rule'} · {info.row.original.categoryId}</span>
          </div>
        ),
        size: 220,
      }),
      firstColumnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <StatusSelect
            name={info.row.original.name}
            status={info.getValue()}
            options={FIRST_STATUS_OPTIONS}
            onChange={(status, comment) => setStatus(info.row.original, status, comment)}
          />
        ),
        size: 60,
      }),
      firstColumnHelper.display({
        id: 'actions',
        header: '',
        cell: info => <RowButtons onEdit={() => onEdit(info.row.original)} onHistory={() => onHistory(info.row.original)} />,
        size: 60,
      }),
    ];
  }, [onEdit, onHistory, onError, router]);

  return (
    <Table
      options={{
        columns,
        data: categories,
      }}
    />
  );
}
