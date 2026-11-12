'use client';

/**
 * Picks the record category of a claim from a searchable table (group, name,
 * status). Once a category is chosen the table collapses to the choice, with
 * a button to pick another one.
 */

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useField } from 'formik';
import { createColumnHelper } from '@tanstack/react-table';
import Button from '@ui/Button';
import Table from '@ui/Table';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { RecordCategoryTableItem } from '@lib/relational-types';
import { RECORD_STATUS_OPTIONS } from 'src/app/admin/records-categories/components/statusOptions';

const columnHelper = createColumnHelper<RecordCategoryTableItem>();

const statusLabel = (status: string) => RECORD_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;

type Props = {
  recordCategories: RecordCategoryTableItem[];
  name?: string;
};

export default function RecordCategoryPicker({ recordCategories, name = 'categoryId' }: Props) {
  const [field, meta, helpers] = useField<string>(name);
  const selected = recordCategories.find(c => c.categoryId === field.value);
  const [browsing, setBrowsing] = useState(!selected);
  const showTable = browsing || !selected;

  const statusOptions = useMemo(
    () => RECORD_STATUS_OPTIONS.filter(o => recordCategories.some(c => c.status === o.value)),
    [recordCategories],
  );

  // Select comes first so it stays visible on phones, where the table scrolls sideways
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: '',
      cell: info => {
        const isSelected = info.row.original.categoryId === field.value;
        return (
          <Button
            type="button"
            size="small"
            variant={isSelected ? 'primary' : 'secondary'}
            onClick={() => {
              helpers.setValue(info.row.original.categoryId);
              setBrowsing(false);
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        );
      },
      size: 40,
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      enableColumnFilter: true,
      meta: { filterVariant: 'text', filterPlaceholder: 'Search categories' },
      cell: info => (
        <div className="stack">
          <span className="font-medium">{info.getValue()}</span>
          {info.row.original.description && <span className="text-xs text-gray-700">{info.row.original.description}</span>}
        </div>
      ),
      size: 220,
    }),
    columnHelper.accessor('group', {
      header: 'Group',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: RECORD_CATEGORY_GROUPS.map(g => ({ value: g, label: g })) },
      sortingFn: (a, b) => RECORD_CATEGORY_GROUPS.indexOf(a.original.group) - RECORD_CATEGORY_GROUPS.indexOf(b.original.group),
      size: 60,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: statusOptions },
      cell: info => statusLabel(info.getValue()),
      size: 60,
    }),
  // helpers is a new object on every render but its functions are stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [statusOptions, field.value]);

  // Enter in the search field filters the table; it must not submit the claim form
  const preventEnterSubmit = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
  };

  const error = meta.touched && typeof meta.error === 'string' ? meta.error : undefined;

  return (
    <div className="stack gap-2">
      {selected && (
        <div className="flex flex-wrap items-center gap-3">
          <p>
            <span className="text-sm text-gray-600">{selected.group} · </span>
            <strong>{selected.name}</strong>
            {selected.status !== 'active' && <span className="text-sm text-gray-600"> ({statusLabel(selected.status).toLowerCase()})</span>}
          </p>
          {!showTable && (
            <Button type="button" size="small" variant="secondary" onClick={() => setBrowsing(true)}>
              Change category
            </Button>
          )}
        </div>
      )}
      {selected?.description && !showTable && <p className="text-sm text-gray-600">{selected.description}</p>}
      {showTable && (
        <div onKeyDown={preventEnterSubmit}>
          <Table
            options={{ columns, data: recordCategories }}
            rowClassName={({ row }) => (row.original.categoryId === field.value ? 'bg-blue-50' : undefined)}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
