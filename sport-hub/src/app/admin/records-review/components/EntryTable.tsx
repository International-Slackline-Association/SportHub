'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const KIND_LABELS = { record: 'Record', first: 'First' } as const;

/** Status shown in the table: voided entries are stored as rejected but listed on their own. */
type DisplayStatus = ClaimStatus | 'voided';
const displayStatus = (r: EntryRow): DisplayStatus => (r.voided ? 'voided' : r.status);
const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = { ...CLAIM_STATUS_LABELS, voided: 'Voided' };
const STATUS_ORDER: DisplayStatus[] = ['draft', 'pending', 'changes_requested', 'published', 'historical', 'rejected', 'voided'];

type Props = {
  rows: EntryRow[];
  showStatus?: boolean;
  /** Record/First column and filter, for lists that mix both kinds. */
  showKind?: boolean;
  /** Search box and status filter, for the full lists. */
  filterable?: boolean;
  emptyText: string;
};

export default function EntryTable({ rows, showStatus = false, showKind = false, filterable = false, emptyText }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DisplayStatus | 'all'>('all');
  const [kind, setKind] = useState<EntryRow['kind'] | 'all'>('all');
  const statuses = useMemo(() => {
    const present = new Set(rows.map(displayStatus));
    return STATUS_ORDER.filter(s => present.has(s));
  }, [rows]);

  const ofKind = rows.filter(r => kind === 'all' || r.kind === kind);
  const shown = ofKind.filter(r =>
    (status === 'all' || displayStatus(r) === status) &&
    (!query || `${r.category} ${r.claim} ${r.athletes} ${r.claimant}`.toLowerCase().includes(query.toLowerCase())));

  const isFirst = !showKind && rows[0]?.kind === 'first';
  const claimHeading = showKind ? 'Record / Trick' : isFirst ? 'Trick' : 'Record';
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
          {showKind && (
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={kind} onChange={e => setKind(e.target.value as EntryRow['kind'] | 'all')}>
              <option value="all">Records and firsts ({rows.length})</option>
              <option value="record">Records ({rows.filter(r => r.kind === 'record').length})</option>
              <option value="first">Firsts ({rows.filter(r => r.kind === 'first').length})</option>
            </select>
          )}
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={status} onChange={e => setStatus(e.target.value as DisplayStatus | 'all')}>
            <option value="all">All statuses ({ofKind.length})</option>
            {statuses.map(s => <option key={s} value={s}>{DISPLAY_STATUS_LABELS[s]} ({ofKind.filter(r => displayStatus(r) === s).length})</option>)}
          </select>
        </div>
      )}
      {shown.length === 0 ? <p className="text-gray-600 text-sm">{emptyText}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                {showKind && <th className="py-2 pr-3">Kind</th>}
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">{claimHeading}</th>
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
                    key={`${r.kind}:${r.entryId}`}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(href)}
                    onKeyDown={e => { if (e.key === 'Enter') router.push(href); }}
                    tabIndex={0}
                  >
                    {showKind && <td className="py-2 pr-3">{KIND_LABELS[r.kind]}</td>}
                    <td className="py-2 pr-3 whitespace-nowrap">{r.submitted || '—'}</td>
                    <td className="py-2 pr-3">{r.category}</td>
                    <td className="py-2 pr-3 font-medium text-blue-700">{r.claim || '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                    <td className="py-2 pr-3">{r.athletes}</td>
                    <td className="py-2 pr-3">{GENDER_LABELS[r.gender]}</td>
                    <td className="py-2 pr-3">{r.claimant || '—'}</td>
                    {showStatus && <td className="py-2 pr-3"><ClaimStatusBadge status={r.status} />{r.voided && <span className="ml-1 text-xs text-red-700">(voided)</span>}</td>}
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
