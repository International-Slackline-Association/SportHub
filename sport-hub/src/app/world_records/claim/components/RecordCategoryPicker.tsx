'use client';

/**
 * Picks the record category of a claim from a searchable table (group, name,
 * status). Select on a row picks it. Once a category is chosen the table
 * collapses to the choice, with a button to pick another one.
 */

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useField } from 'formik';
import { createColumnHelper } from '@tanstack/react-table';
import { Button } from '@slacklineinternational/onsight/react';
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
  const helpersRef = useRef(helpers);
  helpersRef.current = helpers;
  const selected = recordCategories.find(c => c.categoryId === field.value);
  const [browsing, setBrowsing] = useState(!selected);
  const showTable = browsing || !selected;

  const statusOptions = useMemo(
    () => RECORD_STATUS_OPTIONS.filter(o => recordCategories.some(c => c.status === o.value)),
    [recordCategories],
  );

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'pick',
      header: 'Choose',
      cell: info => {
        const isSelected = info.row.original.categoryId === field.value;
        return (
          <Button
            type="button"
            size="small"
            variant={isSelected ? 'primary' : 'secondary'}
            onClick={() => {
              helpersRef.current.setValue(info.row.original.categoryId);
              setBrowsing(false);
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        );
      },
      size: 40,
    }),
    columnHelper.accessor('group', {
      header: 'Group',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: RECORD_CATEGORY_GROUPS.map(g => ({ value: g, label: g })) },
      sortingFn: (a, b) => RECORD_CATEGORY_GROUPS.indexOf(a.original.group) - RECORD_CATEGORY_GROUPS.indexOf(b.original.group),
      size: 60,
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      enableColumnFilter: true,
      meta: { filterVariant: 'text', filterPlaceholder: 'Search categories' },
      cell: info => (
        <div className="stack">
          <span className="font-medium">{info.getValue()}</span>
          {info.row.original.description && <span className="text-xs text-default">{info.row.original.description}</span>}
        </div>
      ),
      size: 220,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      enableColumnFilter: true,
      meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: statusOptions },
      cell: info => statusLabel(info.getValue()),
      size: 60,
    }),
  ], [field.value, statusOptions]);

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
            <span className="text-sm text-default">{selected.group} · </span>
            <strong>{selected.name}</strong>
            {selected.status !== 'active' && <span className="text-sm text-default"> ({statusLabel(selected.status).toLowerCase()})</span>}
          </p>
          {!showTable && (
            <Button type="button" size="small" variant="secondary" onClick={() => setBrowsing(true)}>
              Change category
            </Button>
          )}
        </div>
      )}
      {selected?.description && !showTable && <p className="text-sm text-default">{selected.description}</p>}
      {showTable && (
        <div onKeyDown={preventEnterSubmit}>
          <Table
            label="Record categories"
            options={{ columns, data: recordCategories }}
          />
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
