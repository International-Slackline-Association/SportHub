'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Form, Formik } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikSelectField, FormikTextField } from '@ui/Form';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import UserAutocomplete from '@ui/UserAutocomplete';
import type { RecordsImportIssueTableItem } from '@lib/relational-types';
import { dismissImportIssue, importIssueRow, linkImportAthlete } from './actions';

type CategoryOption = { categoryId: string; label: string };

const REASON_LABELS: Record<RecordsImportIssueTableItem['reason'], string> = {
  no_category: 'No matching category',
  value_unparsed: 'Value could not be read',
  invalid_row: 'Invalid row',
  possible_duplicate: 'Possible duplicate',
  first_link_unclear: 'Link to the same trick unclear',
  no_user_match: 'No SportHub user',
};

const NOT_IMPORTED: RecordsImportIssueTableItem['reason'][] = ['no_category', 'value_unparsed', 'invalid_row'];
const inputClass = 'border border-gray-300 rounded px-2 py-1 text-sm';

const GENDER_OPTIONS: Option[] = [
  { value: 'MEN', label: 'Male' },
  { value: 'WOMEN', label: 'Female' },
];

interface IssueFormValues {
  categoryId: string;
  valueText: string;
  trickName: string;
  gender: 'MEN' | 'WOMEN' | '';
  athlete: { id: string; name: string };
}

type ActionResult = { success: boolean; error?: string };

function IssueCard({ issue, recordCategories, firstCategories }: { issue: RecordsImportIssueTableItem; recordCategories: CategoryOption[]; firstCategories: CategoryOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const row = issue.row;
  const notImported = NOT_IMPORTED.includes(issue.reason);
  const sheetGender = /^f|^w/i.test(row['Category'] ?? '') ? 'WOMEN' : /^m/i.test(row['Category'] ?? '') ? 'MEN' : '';
  const initialValues: IssueFormValues = {
    categoryId: '',
    valueText: row['Specs'] ?? '',
    trickName: row['Description of World First'] ?? '',
    gender: sheetGender,
    athlete: { id: '', name: '' },
  };
  const categoryOptions = (issue.kind === 'record' ? recordCategories : firstCategories)
    .map(c => ({ value: c.categoryId, label: c.label }));

  const run = async (action: () => Promise<ActionResult>) => {
    const result = await action();
    setError(result.success ? null : result.error ?? 'Failed');
    if (result.success) router.refresh();
  };

  const submit = (values: IssueFormValues) => run(() => notImported
    ? importIssueRow(issue.sortKey, {
      categoryId: values.categoryId,
      valueText: values.valueText,
      trickName: values.trickName,
      gender: values.gender as 'MEN' | 'WOMEN',
      userId: values.athlete.id || undefined,
    })
    : linkImportAthlete(issue.sortKey, values.athlete.id));

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

      {!issue.resolved && (
        <Formik initialValues={initialValues} onSubmit={submit}>
          {({ values, isSubmitting }) => (
            <Form className="stack gap-2">
              {notImported && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormikAutocomplete id={`${issue.sortKey}-category`} name="categoryId" label="Category" placeholder="Type to search categories" options={categoryOptions} required />
                  {issue.kind === 'record'
                    ? <FormikTextField id={`${issue.sortKey}-value`} name="valueText" label="Value" />
                    : <FormikTextField id={`${issue.sortKey}-trick`} name="trickName" label="Trick name" />}
                  <FormikSelectField id={`${issue.sortKey}-gender`} name="gender" label="Gender" placeholder="Gender" options={GENDER_OPTIONS} required />
                </div>
              )}
              {(notImported || issue.reason === 'no_user_match') && (
                <div className="sm:w-1/2">
                  <UserAutocomplete formKey="athlete" label="SportHub athlete" required={!notImported} />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {notImported && (
                  <Button type="submit" size="small" variant="primary" disabled={isSubmitting || !categoryOptions.some(o => o.value === values.categoryId) || !values.gender}>
                    Import with this category
                  </Button>
                )}
                {issue.reason === 'no_user_match' && (
                  <Button type="submit" size="small" variant="primary" disabled={isSubmitting || !values.athlete.id}>
                    Link athlete
                  </Button>
                )}
                <Button type="button" size="small" variant="secondary" disabled={isSubmitting} onClick={() => run(() => dismissImportIssue(issue.sortKey))}>
                  {notImported ? 'Skip, do not import' : 'Mark as checked'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
}

export default function ImportIssueList({ issues, recordCategories, firstCategories }: { issues: RecordsImportIssueTableItem[]; recordCategories: CategoryOption[]; firstCategories: CategoryOption[] }) {
  const [reason, setReason] = useState<RecordsImportIssueTableItem['reason'] | 'all'>('all');
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
          {(Object.keys(REASON_LABELS) as RecordsImportIssueTableItem['reason'][]).map(r => (
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
