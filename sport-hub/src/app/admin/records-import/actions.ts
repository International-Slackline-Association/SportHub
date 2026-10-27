'use server';

import { revalidatePath } from 'next/cache';
import { invalidateWorldRecordsCache } from '@lib/data-services';
import { dynamodb, RECORDS_TABLE } from '@lib/dynamodb';
import { actorOf, requireRecordsPermission } from '@lib/records-auth';
import { comparableValue, deriveGender, parseRecordValue, parseSheetDate } from '@lib/records-logic';
import {
  addAuditEntry,
  getEntry,
  getFirstCategory,
  getImportIssues,
  getRecordCategory,
  putAthleteLink,
  putEntry,
  putImportIssue,
  recomputeRecordStatuses,
} from '@lib/records-service';
import { getUser } from '@lib/user-service';
import type { EntryAthlete, FirstEntryRecord, ImportIssueRecord, RecordEntryRecord, WorldEntryRecord } from '@lib/relational-types';

async function getIssue(sortKey: string): Promise<ImportIssueRecord | null> {
  const item = await dynamodb.getItem(RECORDS_TABLE, { pk: 'ImportIssue', sortKey });
  return (item as ImportIssueRecord | undefined) ?? null;
}

const revalidateImportPages = () => {
  invalidateWorldRecordsCache();
  revalidatePath('/admin/records-import');
  revalidatePath('/world_records');
};

export async function listImportIssues() {
  await requireRecordsPermission('records:manage');
  return (await getImportIssues()).sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.reason.localeCompare(b.reason));
}

/** Close an item without changing any entry (e.g. a possible duplicate that is fine). */
export async function dismissImportIssue(sortKey: string) {
  try {
    await requireRecordsPermission('records:manage');
    const issue = await getIssue(sortKey);
    if (!issue) return { success: false, error: 'Item not found' };
    await putImportIssue({ ...issue, resolved: true });
    revalidateImportPages();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export interface ImportRowInput {
  categoryId: string;
  valueText?: string;            // Records only
  trickName?: string;            // Firsts only
  gender: 'MEN' | 'WOMEN';
  date?: string;                 // yyyy-mm-dd, defaults to the sheet date
  userId?: string;
}

/**
 * Imports a row that could not be imported automatically (no category, value
 * not readable, invalid row) after the admin chose the category and value (FR-33).
 */
export async function importIssueRow(sortKey: string, input: ImportRowInput) {
  try {
    const session = await requireRecordsPermission('records:manage');
    const issue = await getIssue(sortKey);
    if (!issue) return { success: false, error: 'Item not found' };
    const row = issue.row;
    const entryId = `imp-${issue.certId}`;
    if (await getEntry(issue.kind, entryId)) return { success: false, error: `Entry ${entryId} already exists` };

    const profile = input.userId ? await getUser(input.userId) : null;
    if (input.userId && !profile) return { success: false, error: 'SportHub user not found' };
    const athlete: EntryAthlete = {
      userId: profile?.userId,
      name: profile ? [profile.name, profile.surname].filter(Boolean).join(' ') : (row['Name'] ?? '').replace(/,$/, ''),
      gender: input.gender,
      country: row['Country of Athlete'] || profile?.country || undefined,
      certId: issue.certId,
    };
    const now = Date.now();
    const base = {
      pk: '', sortKey: 'Metadata' as const, statusKey: '', dateSortKey: '',
      entryId,
      status: 'published' as const,
      gender: deriveGender([athlete]),
      athletes: [athlete],
      date: input.date || parseSheetDate(row['Date'] ?? ''),
      evidence: [row['Link 1'], row['Link 2']].filter(Boolean).map(url => ({ type: 'link' as const, url })),
      source: 'import' as const,
      createdAt: now,
      updatedAt: now,
    };

    let entry: WorldEntryRecord;
    if (issue.kind === 'record') {
      const category = await getRecordCategory(input.categoryId);
      if (!category) return { success: false, error: 'Category not found' };
      const value = { ...parseRecordValue(category, input.valueText || row['Specs'] || ''), original: row['Specs'] || input.valueText };
      if (comparableValue(category, value) === undefined) return { success: false, error: `Could not read the value "${input.valueText || row['Specs']}"` };
      entry = {
        ...base,
        kind: 'record',
        categoryId: category.categoryId,
        categoryName: category.name,
        value,
        witnesses: [],
        furtherSpecs: [row['Record type'], row['Extra']].filter(Boolean).join(' · ') || undefined,
      } satisfies RecordEntryRecord;
      await putEntry(entry);
      await recomputeRecordStatuses(category);
    } else {
      const category = await getFirstCategory(input.categoryId);
      if (!category) return { success: false, error: 'Category not found' };
      const trickName = (input.trickName || row['Description of World First'] || '').trim();
      if (!trickName) return { success: false, error: 'A trick name is required' };
      entry = {
        ...base,
        kind: 'first',
        categoryId: category.categoryId,
        categoryName: category.name,
        trickName,
        lineDetails: row['Specs'] || undefined,
      } satisfies FirstEntryRecord;
      await putEntry(entry);
    }
    if (athlete.userId) await putAthleteLink(athlete.userId, issue.kind, entryId);
    await addAuditEntry(issue.kind, entryId, { action: 'imported', toStatus: 'published', comment: `From the import review list (${issue.reason})`, ...actorOf(session) });
    await putImportIssue({ ...issue, resolved: true, entryId });
    revalidateImportPages();
    return { success: true, entryId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to import the row' };
  }
}

/** Links an imported athlete kept as name only to a SportHub profile (FR-36). */
export async function linkImportAthlete(sortKey: string, userId: string) {
  try {
    const session = await requireRecordsPermission('records:manage');
    const issue = await getIssue(sortKey);
    if (!issue?.entryId) return { success: false, error: 'Item not found' };
    const [entry, profile] = await Promise.all([getEntry(issue.kind, issue.entryId), getUser(userId)]);
    if (!entry) return { success: false, error: 'Entry not found' };
    if (!profile) return { success: false, error: 'SportHub user not found' };
    const index = entry.athletes.findIndex(a => a.certId === issue.certId && !a.userId);
    if (index < 0) return { success: false, error: 'This athlete is already linked' };
    const athletes = entry.athletes.map((a, i) => (i === index ? { ...a, userId: profile.userId } : a));
    await putEntry({ ...entry, athletes, updatedAt: Date.now() });
    await putAthleteLink(profile.userId, issue.kind, entry.entryId);
    await addAuditEntry(issue.kind, entry.entryId, { action: 'athlete_linked', comment: `${athletes[index].name} → ${profile.userId}`, ...actorOf(session) });
    await putImportIssue({ ...issue, resolved: true });
    revalidateImportPages();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to link the athlete' };
  }
}
