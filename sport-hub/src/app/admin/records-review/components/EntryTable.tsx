'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import Table from '@ui/Table';
import { ClaimStatusBadge, CLAIM_STATUS_LABELS } from 'src/app/world_records/components/claimStatus';
import type { ClaimStatus } from '@lib/relational-types';
import { GENDER_LABELS } from '@lib/records-logic';

export interface EntryRow {
  kind: 'record' | 'first';
  entryId: string;
  status: ClaimStatus;
  submitted: string;
  date: string;
  category: string;
  claim: string;             // Value or trick name
  athletes: string;
  gender: ContestGender;
  claimant: string;
  newCategory: boolean;       // Record claim proposing a new category
  voided: boolean;            // Rejected after being published (can be restored)
}

const KIND_OPTIONS = [{ value: 'record', label: 'Record' }, { value: 'first', label: 'First' }];
const KIND_LABELS: Record<EntryRow['kind'], string> = { record: 'Record', first: 'First' };

/** Status shown in the table: voided entries are stored as rejected but listed on their own. */
type DisplayStatus = ClaimStatus | 'voided';
const displayStatus = (r: EntryRow): DisplayStatus => (r.voided ? 'voided' : r.status);
const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = { ...CLAIM_STATUS_LABELS, voided: 'Voided' };
const STATUS_ORDER: DisplayStatus[] = ['draft', 'pending', 'changes_requested', 'published', 'historical', 'rejected', 'voided'];

const detailHref = (r: EntryRow) => `/admin/records-review/${r.kind}/${encodeURIComponent(r.entryId)}`;

type Props = {
  rows: EntryRow[];
  showStatus?: boolean;
  /** Record/First column, for lists that mix both kinds. */
  showKind?: boolean;
  /** Search box and Kind/Status filters, for the full lists. */
  filterable?: boolean;
  emptyText: string;
};

const columnHelper = createColumnHelper<EntryRow>();

export default function EntryTable({ rows, showStatus = false, showKind = false, filterable = false, emptyText }: Props) {
  const columns = useMemo(() => {
    const statusOptions = STATUS_ORDER
      .filter(s => rows.some(r => displayStatus(r) === s))
      .map(s => ({ value: s, label: DISPLAY_STATUS_LABELS[s] }));
    const claimHeader = showKind ? 'Record / Trick' : rows[0]?.kind === 'first' ? 'Trick' : 'Record';

    return [
      // Filter-only column (size 0 hides it): one search box over the text columns
      ...(filterable ? [columnHelper.accessor(r => `${r.category} ${r.claim} ${r.athletes} ${r.claimant}`, {
        id: 'search',
        header: 'Search',
        enableColumnFilter: true,
        meta: { filterVariant: 'text', filterPlaceholder: 'Category, athlete, claimant…' },
        size: 0,
      })] : []),
      ...(showKind ? [columnHelper.accessor('kind', {
        header: 'Kind',
        enableColumnFilter: filterable,
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: KIND_OPTIONS },
        cell: info => KIND_LABELS[info.getValue()],
      })] : []),
      columnHelper.accessor('submitted', {
        header: 'Submitted',
        cell: info => <span className="whitespace-nowrap">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('category', { header: 'Category' }),
      columnHelper.accessor('claim', {
        header: claimHeader,
        cell: info => (
          <Link href={detailHref(info.row.original)} className="font-medium text-blue-700 hover:underline">
            {info.getValue() || '—'}
          </Link>
        ),
      }),
      columnHelper.accessor('date', {
        header: 'Date',
        cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>,
      }),
      columnHelper.accessor('athletes', { header: 'Athletes' }),
      columnHelper.accessor('gender', {
        header: 'Gender',
        cell: info => GENDER_LABELS[info.getValue()],
      }),
      columnHelper.accessor('claimant', {
        header: 'Claimant',
        cell: info => info.getValue() || '—',
      }),
      ...(showStatus ? [columnHelper.accessor(displayStatus, {
        id: 'status',
        header: 'Status',
        enableColumnFilter: filterable,
        filterFn: 'equalsString',
        meta: { filterVariant: 'select', filterIncludeAll: true, filterOptions: statusOptions },
        sortingFn: (a, b) => STATUS_ORDER.indexOf(displayStatus(a.original)) - STATUS_ORDER.indexOf(displayStatus(b.original)),
        cell: info => (
          <span className="whitespace-nowrap">
            <ClaimStatusBadge status={info.row.original.status} />
            {info.row.original.voided && <span className="ml-1 text-xs text-red-700">(voided)</span>}
          </span>
        ),
      })] : []),
    ];
  }, [rows, showKind, showStatus, filterable]);

  if (rows.length === 0) return <p className="text-gray-600 text-sm">{emptyText}</p>;

  return (
    <Table
      options={{
        columns,
        data: rows,
        getRowId: r => `${r.kind}:${r.entryId}`,
        initialState: { pagination: { pageIndex: 0, pageSize: 100 } },
      }}
    />
  );
}
