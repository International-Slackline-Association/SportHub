'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import type { ImportIssueRecord } from '@lib/relational-types';
import { dismissImportIssue, importIssueRow, linkImportAthlete } from './actions';

type CategoryOption = { categoryId: string; label: string };
type UserOption = { userId: string; name: string; surname: string };

const REASON_LABELS: Record<ImportIssueRecord['reason'], string> = {
  no_category: 'No matching category',
  value_unparsed: 'Value could not be read',
  invalid_row: 'Invalid row',
  possible_duplicate: 'Possible duplicate',
  first_link_unclear: 'Link to the same trick unclear',
  no_user_match: 'No SportHub user',
};

const NOT_IMPORTED: ImportIssueRecord['reason'][] = ['no_category', 'value_unparsed', 'invalid_row'];
const inputClass = 'border border-gray-300 rounded px-2 py-1 text-sm';

function UserSelect({ value, onChange, listId }: { value: string; onChange: (v: string) => void; listId: string }) {
  const { data: users } = useQuery<UserOption[]>({
    queryKey: ['users', 'import-review'],
    queryFn: async () => (await fetch('/api/users')).json(),
    staleTime: 10 * 60 * 1000,
  });
  return (
    <>
      <input className={inputClass} list={listId} placeholder="SportHub user id (type a name)" value={value} onChange={e => onChange(e.target.value.split(' | ').pop() ?? '')} />
      <datalist id={listId}>
        {Array.isArray(users) && users.map(u => <option key={u.userId} value={`${[u.name, u.surname].filter(Boolean).join(' ')} | ${u.userId}`} />)}
      </datalist>
    </>
  );
}

function IssueCard({ issue, recordCategories, firstCategories }: { issue: ImportIssueRecord; recordCategories: CategoryOption[]; firstCategories: CategoryOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = issue.row;
  const sheetGender = /^f|^w/i.test(row['Category'] ?? '') ? 'WOMEN' : /^m/i.test(row['Category'] ?? '') ? 'MEN' : '';
  const [form, setForm] = useState({
    categoryId: '',
    valueText: row['Specs'] ?? '',
    trickName: row['Description of World First'] ?? '',
    gender: sheetGender as 'MEN' | 'WOMEN' | '',
    userId: '',
  });

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    setError(result.success ? null : result.error ?? 'Failed');
    if (result.success) router.refresh();
  };

  const summary = issue.kind === 'record'
    ? [row['Name'], row['Record type'], row['Extra'], row['Specs'], row['Date']]
    : [row['Name'], row['Type of Line'], row['Description of World First'], row['Date']];

  return (
    <div className={`border rounded-lg p-3 stack gap-2 text-sm ${issue.resolved ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
      <div className="flex justify-between gap-2 flex-wrap">
        <span className="font-medium">{REASON_LABELS[issue.reason]} · {issue.kind} · Cert {issue.certId}</span>
        {issue.resolved && <span className="text-xs text-green-700">Resolved</span>}
      </div>
      <span className="text-gray-700">{issue.detail}</span>
      <span className="text-gray-500">{summary.filter(Boolean).join(' · ')}</span>
      {issue.entryId && !NOT_IMPORTED.includes(issue.reason) && (
        <Link href={`/admin/records-review/${issue.kind}/${issue.entryId}`} className="text-blue-600 hover:underline">Open the entry</Link>
      )}
      {error && <Alert size="SM">{error}</Alert>}

      {!issue.resolved && NOT_IMPORTED.includes(issue.reason) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select className={inputClass} value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Choose a category</option>
            {(issue.kind === 'record' ? recordCategories : firstCategories).map(c => <option key={c.categoryId} value={c.categoryId}>{c.label}</option>)}
          </select>
          {issue.kind === 'record' ? (
            <input className={inputClass} placeholder="Value" value={form.valueText} onChange={e => setForm({ ...form, valueText: e.target.value })} />
          ) : (
            <input className={inputClass} placeholder="Trick name" value={form.trickName} onChange={e => setForm({ ...form, trickName: e.target.value })} />
          )}
          <select className={inputClass} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as 'MEN' | 'WOMEN' })}>
            <option value="">Gender</option>
            <option value="MEN">Male</option>
            <option value="WOMEN">Female</option>
          </select>
          <UserSelect listId={`users-${issue.sortKey}`} value={form.userId} onChange={userId => setForm({ ...form, userId })} />
        </div>
      )}
      {!issue.resolved && issue.reason === 'no_user_match' && (
        <UserSelect listId={`users-${issue.sortKey}`} value={form.userId} onChange={userId => setForm({ ...form, userId })} />
      )}

      {!issue.resolved && (
        <div className="flex gap-2 flex-wrap">
          {NOT_IMPORTED.includes(issue.reason) && (
            <Button
              size="small"
              variant="primary"
              disabled={busy || !form.categoryId || !form.gender}
              onClick={() => run(() => importIssueRow(issue.sortKey, {
                categoryId: form.categoryId,
                valueText: form.valueText,
                trickName: form.trickName,
                gender: form.gender as 'MEN' | 'WOMEN',
                userId: form.userId || undefined,
              }))}
            >
              Import with this category
            </Button>
          )}
          {issue.reason === 'no_user_match' && (
            <Button size="small" variant="primary" disabled={busy || !form.userId} onClick={() => run(() => linkImportAthlete(issue.sortKey, form.userId))}>
              Link athlete
            </Button>
          )}
          <Button size="small" variant="secondary" disabled={busy} onClick={() => run(() => dismissImportIssue(issue.sortKey))}>
            {NOT_IMPORTED.includes(issue.reason) ? 'Skip, do not import' : 'Mark as checked'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ImportIssueList({ issues, recordCategories, firstCategories }: { issues: ImportIssueRecord[]; recordCategories: CategoryOption[]; firstCategories: CategoryOption[] }) {
  const [reason, setReason] = useState<ImportIssueRecord['reason'] | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);
  const shown = useMemo(
    () => issues.filter(i => (reason === 'all' || i.reason === reason) && (showResolved || !i.resolved)),
    [issues, reason, showResolved],
  );
  const open = issues.filter(i => !i.resolved);

  return (
    <div className="stack gap-3">
      <div className="flex gap-3 flex-wrap items-center text-sm">
        <select className={inputClass} value={reason} onChange={e => setReason(e.target.value as typeof reason)}>
          <option value="all">All open items ({open.length})</option>
          {(Object.keys(REASON_LABELS) as ImportIssueRecord['reason'][]).map(r => (
            <option key={r} value={r}>{REASON_LABELS[r]} ({open.filter(i => i.reason === r).length})</option>
          ))}
        </select>
        <label className="flex gap-1 items-center"><input type="checkbox" checked={showResolved} onChange={() => setShowResolved(!showResolved)} /> Show resolved</label>
      </div>
      {shown.length === 0 ? <p className="text-gray-600">Nothing to review.</p> : shown.map(issue => (
        <IssueCard key={issue.sortKey} issue={issue} recordCategories={recordCategories} firstCategories={firstCategories} />
      ))}
    </div>
  );
}
