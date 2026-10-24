import { getEntriesByStatus, getRecordCategories } from '@lib/records-service';
import { formatEntryDate, formatRecordValue } from '@lib/records-logic';
import { requireRecordsPermission } from '@lib/records-auth';
import type { ClaimStatus, WorldEntryRecord } from '@lib/relational-types';
import type { EntryRow } from './EntryTable';

/** Table rows for the admin lists; records are formatted with their category's unit. */
export async function toEntryRows(entries: WorldEntryRecord[]): Promise<EntryRow[]> {
  const categories = new Map((await getRecordCategories()).map(c => [c.categoryId, c]));
  return entries.map(e => {
    const category = e.kind === 'record' ? categories.get(e.categoryId) : undefined;
    return {
      kind: e.kind,
      entryId: e.entryId,
      status: e.status,
      submitted: e.submittedAt ? new Date(e.submittedAt).toISOString().slice(0, 10) : '',
      date: e.date ? formatEntryDate(e.date) : '',
      category: e.categoryName,
      claim: e.kind === 'first' ? e.trickName : category ? formatRecordValue(category, e.value) : e.value.original ?? '',
      athletes: e.athletes.map(a => a.name).join(', '),
      list: e.list,
      claimant: e.claimantName ?? (e.source === 'import' ? 'Imported' : ''),
      newCategory: e.kind === 'record' && !!e.newCategoryProposal && !category,
    };
  });
}

/** Every entry of one kind except private drafts, newest first. */
export async function getAllEntries(kind: 'record' | 'first'): Promise<WorldEntryRecord[]> {
  await requireRecordsPermission('records:manage');
  const statuses: ClaimStatus[] = kind === 'record'
    ? ['pending', 'changes_requested', 'published', 'historical', 'rejected']
    : ['pending', 'changes_requested', 'published', 'rejected'];
  const lists = await Promise.all(statuses.map(s => getEntriesByStatus(kind, s)));
  return lists.flat().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
