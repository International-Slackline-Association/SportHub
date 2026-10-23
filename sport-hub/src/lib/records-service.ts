/**
 * Records Service - world records, world firsts and their categories
 *
 * Everything lives in the sporthub-records table. Lookups go through the
 * primary key or the statusKey-index / category-index GSIs, never a scan.
 * Athletes are existing sporthub-users profiles; each athlete gets a
 * "Record:{id}" / "First:{id}" pointer item under their profile.
 */

import { BatchWriteCommand, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { ddbClient, dynamodb, getTableName, RECORDS_TABLE, USERS_TABLE } from './dynamodb';
import type {
  AthleteEntryLinkRecord,
  ClaimStatus,
  EntryAuditRecord,
  FirstCategoryRecord,
  FirstEntryRecord,
  ImportIssueRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  RecordList,
  WorldEntryRecord,
} from './relational-types';
import {
  computeFirstTitles,
  computeRecordTitles,
  formatEntryDate,
  formatRecordValue,
  RECORD_LISTS,
  splitCurrentAndHistory,
} from './records-logic';

export type EntryKind = 'record' | 'first';

export const entryPk = (kind: EntryKind, entryId: string) =>
  `${kind === 'record' ? 'Record' : 'First'}:${entryId}`;

export const statusKeyFor = (kind: EntryKind, status: ClaimStatus) => `${kind}#${status}`;

export const dateSortKeyFor = (date: string, entryId: string) => `${date || '0000-00-00'}#${entryId}`;

/** Query that follows LastEvaluatedKey until all pages are read. */
async function queryAll<T>(input: Omit<QueryCommandInput, 'TableName'>): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const response = await ddbClient.send(new QueryCommand({
      TableName: getTableName(RECORDS_TABLE),
      ExclusiveStartKey: exclusiveStartKey,
      ...input,
    }));
    items.push(...((response.Items ?? []) as T[]));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

// ============================================================================
// CATEGORIES
// ============================================================================

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export async function getRecordCategories(): Promise<RecordCategoryRecord[]> {
  const items = await queryAll<RecordCategoryRecord>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'RecordCategory' },
  });
  return items.sort(byOrder);
}

export async function getFirstCategories(): Promise<FirstCategoryRecord[]> {
  const items = await queryAll<FirstCategoryRecord>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'FirstCategory' },
  });
  return items.sort(byOrder);
}

export async function putCategory(category: RecordCategoryRecord | FirstCategoryRecord): Promise<void> {
  await dynamodb.putItem(RECORDS_TABLE, category as unknown as Record<string, unknown>);
}

// ============================================================================
// ENTRIES (claims, published and historical records / firsts)
// ============================================================================

export async function getEntry(kind: 'record', entryId: string): Promise<RecordEntryRecord | null>;
export async function getEntry(kind: 'first', entryId: string): Promise<FirstEntryRecord | null>;
export async function getEntry(kind: EntryKind, entryId: string): Promise<WorldEntryRecord | null> {
  const item = await dynamodb.getItem(RECORDS_TABLE, { pk: entryPk(kind, entryId), sortKey: 'Metadata' });
  return (item as WorldEntryRecord | undefined) ?? null;
}

/** Writes an entry, keeping its GSI keys in sync with status and date. */
export async function putEntry(entry: WorldEntryRecord): Promise<void> {
  const item: WorldEntryRecord = {
    ...entry,
    pk: entryPk(entry.kind, entry.entryId),
    sortKey: 'Metadata',
    statusKey: statusKeyFor(entry.kind, entry.status),
    dateSortKey: dateSortKeyFor(entry.date, entry.entryId),
  };
  await dynamodb.putItem(RECORDS_TABLE, item as unknown as Record<string, unknown>);
}

export async function getEntriesByStatus(kind: 'record', status: ClaimStatus): Promise<RecordEntryRecord[]>;
export async function getEntriesByStatus(kind: 'first', status: ClaimStatus): Promise<FirstEntryRecord[]>;
export async function getEntriesByStatus(kind: EntryKind, status: ClaimStatus): Promise<WorldEntryRecord[]> {
  return queryAll<WorldEntryRecord>({
    IndexName: 'statusKey-index',
    KeyConditionExpression: 'statusKey = :sk',
    ExpressionAttributeValues: { ':sk': statusKeyFor(kind, status) },
    ScanIndexForward: false,
  });
}

/** All entries of one category (any status), newest first. */
export async function getEntriesByCategory(categoryId: string): Promise<WorldEntryRecord[]> {
  return queryAll<WorldEntryRecord>({
    IndexName: 'category-index',
    KeyConditionExpression: 'categoryId = :c',
    ExpressionAttributeValues: { ':c': categoryId },
    ScanIndexForward: false,
  });
}

/**
 * Re-derives published vs historical for one record category, per list:
 * the best value(s) are published (ties are co-holders), the rest historical.
 * Returns the entries whose status changed.
 */
export async function recomputeRecordStatuses(category: RecordCategoryRecord): Promise<RecordEntryRecord[]> {
  const entries = (await getEntriesByCategory(category.categoryId))
    .filter((e): e is RecordEntryRecord => e.kind === 'record' && (e.status === 'published' || e.status === 'historical'));

  const changed: RecordEntryRecord[] = [];
  for (const list of RECORD_LISTS) {
    const { current, history } = splitCurrentAndHistory(category, entries.filter(e => e.list === list));
    for (const [group, status] of [[current, 'published'], [history, 'historical']] as const) {
      for (const entry of group) {
        if (entry.status !== status) changed.push({ ...entry, status, updatedAt: Date.now() });
      }
    }
  }
  await Promise.all(changed.map(putEntry));
  return changed;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function addAuditEntry(
  kind: EntryKind,
  entryId: string,
  audit: Omit<EntryAuditRecord, 'pk' | 'sortKey' | 'at'> & { at?: number },
): Promise<void> {
  const at = audit.at ?? Date.now();
  const record: EntryAuditRecord = {
    ...audit,
    pk: entryPk(kind, entryId),
    sortKey: `Audit:${new Date(at).toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    at,
  };
  await dynamodb.putItem(RECORDS_TABLE, record as unknown as Record<string, unknown>);
}

export async function getAuditLog(kind: EntryKind, entryId: string): Promise<EntryAuditRecord[]> {
  return queryAll<EntryAuditRecord>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sortKey, :prefix)',
    ExpressionAttributeValues: { ':pk': entryPk(kind, entryId), ':prefix': 'Audit:' },
  });
}

// ============================================================================
// IMPORT REVIEW LIST
// ============================================================================

export async function putImportIssue(issue: ImportIssueRecord): Promise<void> {
  await dynamodb.putItem(RECORDS_TABLE, issue as unknown as Record<string, unknown>);
}

export async function getImportIssues(): Promise<ImportIssueRecord[]> {
  return queryAll<ImportIssueRecord>({
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'ImportIssue' },
  });
}

// ============================================================================
// ATHLETE POINTERS (users table)
// ============================================================================

export async function putAthleteLink(userId: string, kind: EntryKind, entryId: string): Promise<void> {
  const link: AthleteEntryLinkRecord = {
    userId,
    sortKey: entryPk(kind, entryId),
    entryId,
    kind,
    createdAt: Date.now(),
  };
  await dynamodb.putItem(USERS_TABLE, link as unknown as Record<string, unknown>);
}

export async function getAthleteEntryIds(userId: string, kind: EntryKind): Promise<string[]> {
  const items = await dynamodb.queryItems(
    USERS_TABLE,
    'userId = :uid AND begins_with(sortKey, :prefix)',
    { ':uid': userId, ':prefix': `${kind === 'record' ? 'Record' : 'First'}:` },
  );
  return items.map(item => (item as AthleteEntryLinkRecord).entryId);
}

/** Batch-loads entry metadata (BatchGet takes at most 100 keys per call). */
async function getEntriesBatch(kind: EntryKind, entryIds: string[]): Promise<WorldEntryRecord[]> {
  const results: WorldEntryRecord[] = [];
  for (let i = 0; i < entryIds.length; i += 100) {
    const keys = entryIds.slice(i, i + 100).map(id => ({ pk: entryPk(kind, id), sortKey: 'Metadata' }));
    results.push(...((await dynamodb.batchGetItems(RECORDS_TABLE, keys)) as WorldEntryRecord[]));
  }
  return results;
}

/** Deletes items in chunks of 25 (BatchWrite limit). Used by the local import reset. */
export async function deleteItems(tableName: string, keys: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 25) {
    await ddbClient.send(new BatchWriteCommand({
      RequestItems: {
        [getTableName(tableName)]: keys.slice(i, i + 25).map(Key => ({ DeleteRequest: { Key } })),
      },
    }));
  }
}

// ============================================================================
// PUBLIC DISPLAY
// ============================================================================

export interface DisplayAthlete {
  userId?: string;
  name: string;
  country?: string;
  gender: 'MEN' | 'WOMEN';
}

/** One row on /world_records or an athlete profile. */
export interface WorldRecord {
  entryId: string;
  title: string;                 // "World Record", "Women's World Record", ... ("" for history)
  isCurrent: boolean;
  categoryId: string;
  categoryName: string;
  categoryGroup: string;
  categoryStatus: RecordCategoryRecord['status'];
  lineType: string;
  value: string;                 // Formatted, e.g. "1,900 m"
  specs: string;                 // Further details (original sheet text, setup)
  list: RecordList;
  athletes: DisplayAthlete[];
  date: string;                  // DD/MM/YYYY
  location: string;
  links: string[];
}

export interface WorldFirst {
  entryId: string;
  title: string;                 // "World First", "Women's World First", ...
  categoryId: string;
  categoryName: string;
  trickName: string;
  description: string;
  lineDetails: string;
  list: RecordList;
  athletes: DisplayAthlete[];
  date: string;
  links: string[];
}

const toDisplayAthletes = (entry: WorldEntryRecord): DisplayAthlete[] =>
  entry.athletes.map(({ userId, name, country, gender }) => ({ userId, name, country, gender }));

const links = (entry: WorldEntryRecord) => entry.evidence.map(e => e.url).filter(Boolean);

const toWorldRecords = (
  categories: RecordCategoryRecord[],
  entries: RecordEntryRecord[],
): WorldRecord[] => {
  const categoryById = new Map(categories.map(c => [c.categoryId, c]));
  const rows: WorldRecord[] = [];

  for (const category of categories) {
    const inCategory = entries.filter(e => e.categoryId === category.categoryId);
    if (inCategory.length === 0) continue;

    const current = inCategory.filter(e => e.status === 'published');
    const currentByList: Partial<Record<RecordList, RecordEntryRecord['value']>> = {};
    for (const entry of current) currentByList[entry.list] ??= entry.value;
    // Archived categories are history only: their records carry no current title
    const titles = category.status === 'archived' ? {} : computeRecordTitles(category, currentByList);

    for (const entry of inCategory) {
      const isCurrent = entry.status === 'published' && category.status !== 'archived';
      rows.push({
        entryId: entry.entryId,
        title: isCurrent ? titles[entry.list] ?? 'World Record' : '',
        isCurrent,
        categoryId: category.categoryId,
        categoryName: category.name,
        categoryGroup: category.group,
        categoryStatus: category.status,
        lineType: category.lineType,
        value: formatRecordValue(categoryById.get(entry.categoryId) ?? category, entry.value),
        specs: [entry.value.original, entry.furtherSpecs, entry.setup].filter(Boolean).join(' · '),
        list: entry.list,
        athletes: toDisplayAthletes(entry),
        date: formatEntryDate(entry.date),
        location: [entry.locationName, entry.locationCountry].filter(Boolean).join(', '),
        links: links(entry),
      });
    }
  }
  return rows;
};

const toWorldFirsts = (categories: FirstCategoryRecord[], entries: FirstEntryRecord[]): WorldFirst[] => {
  const categoryById = new Map(categories.map(c => [c.categoryId, c]));
  const titles = computeFirstTitles(entries);
  return entries.map(entry => ({
    entryId: entry.entryId,
    title: titles[entry.entryId],
    categoryId: entry.categoryId,
    categoryName: categoryById.get(entry.categoryId)?.name ?? entry.categoryName,
    trickName: entry.trickName,
    description: entry.description ?? '',
    lineDetails: entry.lineDetails ?? '',
    list: entry.list,
    athletes: toDisplayAthletes(entry),
    date: formatEntryDate(entry.date),
    links: links(entry),
  }));
};

/** True once categories have been seeded, i.e. the records table is in use. */
export async function hasRecordsData(): Promise<boolean> {
  try {
    const items = await dynamodb.queryItems(RECORDS_TABLE, 'pk = :pk', { ':pk': 'RecordCategory' }, { limit: 1 });
    return items.length > 0;
  } catch {
    // Table not created yet in this environment
    return false;
  }
}

/** Published and historical records with computed titles (FR-23a). */
export async function getPublicWorldRecords(): Promise<WorldRecord[]> {
  const [categories, published, historical] = await Promise.all([
    getRecordCategories(),
    getEntriesByStatus('record', 'published'),
    getEntriesByStatus('record', 'historical'),
  ]);
  return toWorldRecords(categories, [...published, ...historical]);
}

/** Published firsts with computed titles (FR-23b). */
export async function getPublicWorldFirsts(): Promise<WorldFirst[]> {
  const [categories, published] = await Promise.all([
    getFirstCategories(),
    getEntriesByStatus('first', 'published'),
  ]);
  return toWorldFirsts(categories, published);
}

/**
 * Records of one athlete, titled in the context of their whole category so the
 * profile shows the same title as /world_records.
 */
export async function getAthletePublicWorldRecords(userId: string): Promise<WorldRecord[]> {
  const entryIds = new Set(await getAthleteEntryIds(userId, 'record'));
  if (entryIds.size === 0) return [];
  const own = (await getEntriesBatch('record', [...entryIds])) as RecordEntryRecord[];
  const categoryIds = new Set(own.map(e => e.categoryId));

  const [categories, ...perCategory] = await Promise.all([
    getRecordCategories(),
    ...[...categoryIds].map(getEntriesByCategory),
  ]);
  const visible = (perCategory.flat() as RecordEntryRecord[])
    .filter(e => e.status === 'published' || e.status === 'historical');
  return toWorldRecords(categories.filter(c => categoryIds.has(c.categoryId)), visible)
    .filter(row => entryIds.has(row.entryId));
}

export async function getAthletePublicWorldFirsts(userId: string): Promise<WorldFirst[]> {
  const entryIds = await getAthleteEntryIds(userId, 'first');
  if (entryIds.length === 0) return [];
  // Titles depend on the same trick on other lists, so title against all published firsts
  const all = await getPublicWorldFirsts();
  const own = new Set(entryIds);
  return all.filter(first => own.has(first.entryId));
}
