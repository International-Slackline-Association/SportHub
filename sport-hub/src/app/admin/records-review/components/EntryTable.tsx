'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClaimStatusBadge, CLAIM_STATUS_LABELS } from 'src/app/world_records/components/claimStatus';
import type { ClaimStatus, RecordList } from '@lib/relational-types';
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
  list: RecordList;
  claimant: string;
  newCategory: boolean;       // Record claim proposing a new category
}

type Props = {
  rows: EntryRow[];
  showStatus?: boolean;
  /** Search box and status filter, for the full lists. */
  filterable?: boolean;
  emptyText: string;
};

export default function EntryTable({ rows, showStatus = false, filterable = false, emptyText }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ClaimStatus | 'all'>('all');
  const statuses = useMemo(() => [...new Set(rows.map(r => r.status))], [rows]);

  const shown = rows.filter(r =>
    (status === 'all' || r.status === status) &&
    (!query || `${r.category} ${r.claim} ${r.athletes} ${r.claimant}`.toLowerCase().includes(query.toLowerCase())));

  const isFirst = rows[0]?.kind === 'first';
  return (
    <div className="stack gap-3">
      {filterable && (
        <div className="flex gap-3 flex-wrap">
          <input
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full sm:w-72"
            placeholder="Search category, athlete, claimant…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={status} onChange={e => setStatus(e.target.value as ClaimStatus | 'all')}>
            <option value="all">All statuses ({rows.length})</option>
            {statuses.map(s => <option key={s} value={s}>{CLAIM_STATUS_LABELS[s]} ({rows.filter(r => r.status === s).length})</option>)}
          </select>
        </div>
      )}
      {shown.length === 0 ? <p className="text-gray-600 text-sm">{emptyText}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">{isFirst ? 'Trick' : 'Record'}</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Athletes</th>
                <th className="py-2 pr-3">Gender</th>
                <th className="py-2 pr-3">Claimant</th>
                {showStatus && <th className="py-2 pr-3">Status</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map(r => {
                const href = `/admin/records-review/${r.kind}/${encodeURIComponent(r.entryId)}`;
                return (
                  <tr
                    key={r.entryId}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(href)}
                    onKeyDown={e => { if (e.key === 'Enter') router.push(href); }}
                    tabIndex={0}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">{r.submitted || '—'}</td>
                    <td className="py-2 pr-3">{r.category}</td>
                    <td className="py-2 pr-3 font-medium text-blue-700">{r.claim || '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                    <td className="py-2 pr-3">{r.athletes}</td>
                    <td className="py-2 pr-3">{GENDER_LABELS[r.list]}</td>
                    <td className="py-2 pr-3">{r.claimant || '—'}</td>
                    {showStatus && <td className="py-2 pr-3"><ClaimStatusBadge status={r.status} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
