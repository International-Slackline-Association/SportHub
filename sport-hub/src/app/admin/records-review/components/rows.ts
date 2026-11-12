import { formatISODay } from '@utils/dates';
import { getEntriesByStatus, getRecordCategories } from '@lib/records-service';
import { formatRecordValue } from '@lib/records-logic';
import { requireRecordsPermission } from '@lib/records-auth';
import type { ClaimStatus, WorldRecordOrFirstTableItem } from '@lib/relational-types';
import type { EntryRow } from './EntryTable';

/** Table rows for the admin lists; records are formatted with their category's unit. */
export async function toEntryRows(entries: WorldRecordOrFirstTableItem[]): Promise<EntryRow[]> {
  const categories = new Map((await getRecordCategories()).map(c => [c.categoryId, c]));
  return entries.map(e => {
    const category = e.kind === 'record' ? categories.get(e.categoryId) : undefined;
    return {
      kind: e.kind,
      entryId: e.entryId,
      status: e.status,
      submitted: e.submittedAt ? new Date(e.submittedAt).toISOString().slice(0, 10) : '',
      date: e.date ? formatISODay(e.date) : '',
      category: e.categoryName,
      claim: e.kind === 'first' ? e.trickName : category ? formatRecordValue(category, e.value) : e.value.original ?? '',
      athletes: e.athletes.map(a => a.name).join(', '),
      gender: e.gender,
      claimant: e.claimantName ?? (e.source === 'import' ? 'Imported' : ''),
      newCategory: e.kind === 'record' && !!e.newCategoryProposal && !category,
      voided: e.voidedAt !== undefined,
    };
  });
}

const STATUSES_BY_KIND: Record<'record' | 'first', ClaimStatus[]> = {
  record: ['pending', 'changes_requested', 'published', 'historical', 'rejected'],
  first: ['pending', 'changes_requested', 'published', 'rejected'],
};

const newestFirst = (a: WorldRecordOrFirstTableItem, b: WorldRecordOrFirstTableItem) => (b.date || '').localeCompare(a.date || '');

/** Every entry of one kind except private drafts, newest first. */
export async function getAllEntries(kind: 'record' | 'first'): Promise<WorldRecordOrFirstTableItem[]> {
  await requireRecordsPermission('records:manage');
  const lists = await Promise.all(STATUSES_BY_KIND[kind].map(s => getEntriesByStatus(kind, s)));
  return lists.flat().sort(newestFirst);
}

/** Every record and first in the workflow, drafts included, newest first. */
export async function getEveryEntry(): Promise<WorldRecordOrFirstTableItem[]> {
  await requireRecordsPermission('records:manage');
  const queries = (['record', 'first'] as const).flatMap(kind =>
    (['draft', ...STATUSES_BY_KIND[kind]] as ClaimStatus[]).map(s => getEntriesByStatus(kind, s)));
  return (await Promise.all(queries)).flat().sort(newestFirst);
}
