/**
 * Records Service - world records, world firsts and their categories
 *
 * Everything lives in the sporthub-records table. Lookups go through the
 * primary key or the statusKey-index / category-index GSIs, never a scan.
 * Athletes are existing sporthub-users profiles; each athlete gets a
 * "Record:{id}" / "First:{id}" pointer item under their profile.
 */

import { PutCommand, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
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
  WorldEntryRecord,
} from './relational-types';
import {
  firstTitle,
  formatEntryDate,
  formatRecordValue,
  recordTitle,
  RECORD_GENDERS,
  splitCurrentAndHistory,
} from './records-logic';
import { getCountryByCode } from '@utils/countries';

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

/** Random suffix so two audit items written in the same millisecond don't overwrite each other. */
const auditSuffix = () => Math.random().toString(36).slice(2, 8);

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export async function getRecordCategories(): Promise<RecordCategoryRecord[]> {
  const items = await queryAll<RecordCategoryRecord>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sortKey, :prefix)',
    ExpressionAttributeValues: { ':pk': 'RecordCategory', ':prefix': 'RecordCategory:' },
  });
  return items.sort(byOrder);
}

export async function getFirstCategories(): Promise<FirstCategoryRecord[]> {
  const items = await queryAll<FirstCategoryRecord>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sortKey, :prefix)',
    ExpressionAttributeValues: { ':pk': 'FirstCategory', ':prefix': 'FirstCategory:' },
  });
  return items.sort(byOrder);
}

export async function getRecordCategory(categoryId: string): Promise<RecordCategoryRecord | null> {
  const item = await dynamodb.getItem(RECORDS_TABLE, { pk: 'RecordCategory', sortKey: `RecordCategory:${categoryId}` });
  return (item as RecordCategoryRecord | undefined) ?? null;
}

export async function getFirstCategory(categoryId: string): Promise<FirstCategoryRecord | null> {
  const item = await dynamodb.getItem(RECORDS_TABLE, { pk: 'FirstCategory', sortKey: `FirstCategory:${categoryId}` });
  return (item as FirstCategoryRecord | undefined) ?? null;
}

export async function putCategory(category: RecordCategoryRecord | FirstCategoryRecord): Promise<void> {
  await dynamodb.putItem(RECORDS_TABLE, category as unknown as Record<string, unknown>);
}

/** Category changes are logged in the category partition (FR-C5): sortKey "Audit:{categoryId}:{iso}". */
export async function addCategoryAudit(
  category: Pick<RecordCategoryRecord | FirstCategoryRecord, 'pk' | 'categoryId'>,
  audit: Omit<EntryAuditRecord, 'pk' | 'sortKey' | 'at'>,
): Promise<void> {
  const at = Date.now();
  const record: EntryAuditRecord = {
    ...audit,
    pk: category.pk,
    sortKey: `Audit:${category.categoryId}:${new Date(at).toISOString()}:${auditSuffix()}`,
    at,
  };
  await dynamodb.putItem(RECORDS_TABLE, record as unknown as Record<string, unknown>);
}

export async function getCategoryAuditLog(pk: 'RecordCategory' | 'FirstCategory', categoryId: string): Promise<EntryAuditRecord[]> {
  return queryAll<EntryAuditRecord>({
    KeyConditionExpression: 'pk = :pk AND begins_with(sortKey, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': `Audit:${categoryId}:` },
  });
}

// ============================================================================
// ENTRIES (claims, published and historical records / firsts)
// ============================================================================

export async function getEntry(kind: 'record', entryId: string): Promise<RecordEntryRecord | null>;
export async function getEntry(kind: 'first', entryId: string): Promise<FirstEntryRecord | null>;
export async function getEntry(kind: EntryKind, entryId: string): Promise<WorldEntryRecord | null>;
export async function getEntry(kind: EntryKind, entryId: string): Promise<WorldEntryRecord | null> {
  const item = await dynamodb.getItem(RECORDS_TABLE, { pk: entryPk(kind, entryId), sortKey: 'Metadata' });
  return (item as WorldEntryRecord | undefined) ?? null;
}

/** A decision lock older than this is treated as abandoned (e.g. the server crashed mid-approval). */
const DECISION_LOCK_MS = 2 * 60 * 1000;

export interface PutEntryOptions {
  /**
   * Only write if the stored entry still has this status, so two people acting
   * on the same entry at once can't both succeed. The second gets
   * ConcurrentChangeError.
   */
  expectedStatus?: ClaimStatus;
  /** The caller holds the decision lock with this token (see lockForDecision). */
  lockToken?: string;
}

/** Someone else changed or is deciding the entry; the caller should reload. */
export class ConcurrentChangeError extends Error {
  constructor() {
    super('Someone else changed this claim in the meantime. Reload the page and try again.');
    this.name = 'ConcurrentChangeError';
  }
}

const isConditionFailure = (error: unknown) => (error as { name?: string }).name === 'ConditionalCheckFailedException';

/**
 * Writes an entry, keeping its GSI keys in sync with status and date. Any
 * decision lock is dropped, so the lock holder's final write releases it.
 */
export async function putEntry(entry: WorldEntryRecord, options: PutEntryOptions = {}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { decisionLockAt, decisionLockToken, ...rest } = entry as WorldEntryRecord & { decisionLockAt?: number; decisionLockToken?: string };
  const item: WorldEntryRecord = {
    ...rest,
    pk: entryPk(entry.kind, entry.entryId),
    sortKey: 'Metadata',
    statusKey: statusKeyFor(entry.kind, entry.status),
    dateSortKey: dateSortKeyFor(entry.date, entry.entryId),
  };
  if (!options.expectedStatus) {
    await dynamodb.putItem(RECORDS_TABLE, item as unknown as Record<string, unknown>);
    return;
  }
  const lockCondition = options.lockToken
    ? 'decisionLockToken = :token'
    : '(attribute_not_exists(decisionLockAt) OR decisionLockAt < :stale)';
  try {
    await ddbClient.send(new PutCommand({
      TableName: getTableName(RECORDS_TABLE),
      Item: item,
      ConditionExpression: `#status = :expected AND ${lockCondition}`,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':expected': options.expectedStatus,
        ...(options.lockToken ? { ':token': options.lockToken } : { ':stale': Date.now() - DECISION_LOCK_MS }),
      },
    }));
  } catch (error) {
    if (isConditionFailure(error)) throw new ConcurrentChangeError();
    throw error;
  }
}

export async function getEntriesByStatus(kind: 'record', status: ClaimStatus): Promise<RecordEntryRecord[]>;
export async function getEntriesByStatus(kind: 'first', status: ClaimStatus): Promise<FirstEntryRecord[]>;
export async function getEntriesByStatus(kind: EntryKind, status: ClaimStatus): Promise<WorldEntryRecord[]>;
export async function getEntriesByStatus(kind: EntryKind, status: ClaimStatus): Promise<WorldEntryRecord[]> {
  return queryAll<WorldEntryRecord>({
    IndexName: 'statusKey-index',
    KeyConditionExpression: 'statusKey = :sk',
    ExpressionAttributeValues: { ':sk': statusKeyFor(kind, status) },
    ScanIndexForward: false,
  });
}

/**
 * All entries of one category (any status), newest first. Record and first
 * category ids share the category-index, so entries are filtered by kind.
 */
export async function getEntriesByCategory(kind: 'record', categoryId: string): Promise<RecordEntryRecord[]>;
export async function getEntriesByCategory(kind: 'first', categoryId: string): Promise<FirstEntryRecord[]>;
export async function getEntriesByCategory(kind: EntryKind, categoryId: string): Promise<WorldEntryRecord[]> {
  const items = await queryAll<WorldEntryRecord>({
    IndexName: 'category-index',
    KeyConditionExpression: 'categoryId = :c',
    ExpressionAttributeValues: { ':c': categoryId },
    ScanIndexForward: false,
  });
  return items.filter(e => e.kind === kind);
}

const isPublicStatus = (status: ClaimStatus) => status === 'published' || status === 'historical';

/**
 * Re-derives published vs historical for one record category, per list:
 * the best value(s) are published (ties are co-holders), the rest historical.
 * Returns the entries whose status changed.
 */
export async function recomputeRecordStatuses(category: RecordCategoryRecord): Promise<RecordEntryRecord[]> {
  const entries = (await getEntriesByCategory('record', category.categoryId)).filter(e => isPublicStatus(e.status));

  const changed: RecordEntryRecord[] = [];
  for (const list of RECORD_GENDERS) {
    const { current, history } = splitCurrentAndHistory(category, entries.filter(e => e.gender === list));
    for (const [group, status] of [[current, 'published'], [history, 'historical']] as const) {
      for (const entry of group) {
        if (entry.status !== status) changed.push({ ...entry, status, updatedAt: Date.now() });
      }
    }
  }
  await Promise.all(changed.map(entry => putEntry(entry)));
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
    sortKey: `Audit:${new Date(at).toISOString()}:${auditSuffix()}`,
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

/** Pointer item on the athlete's profile (sortKey = "Record:{entryId}" | "First:{entryId}"). */
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
  title: string;                 // "Men's World Record", "Women's World Record", "Mixed World Record" ("" for history)
  isCurrent: boolean;
  categoryId: string;
  categoryName: string;
  categoryGroup: string;
  categoryStatus: RecordCategoryRecord['status'];
  value: string;                 // Formatted, e.g. "1,900 m"
  specs: string;                 // Further details (original sheet text, setup)
  gender: ContestGender;
  athletes: DisplayAthlete[];
  date: string;                  // DD/MM/YYYY
  location: string;
  links: string[];
}

export interface WorldFirst {
  entryId: string;
  title: string;                 // "Men's World First", "Women's World First", "Mixed World First"
  categoryId: string;
  categoryName: string;
  trickName: string;
  description: string;
  lineDetails: string;
  gender: ContestGender;
  athletes: DisplayAthlete[];
  date: string;
  links: string[];
}

const toDisplayAthletes = (entry: WorldEntryRecord): DisplayAthlete[] =>
  entry.athletes.map(({ userId, name, country, gender }) => ({ userId, name, country, gender }));

/** Claims store ISO codes, imported rows country names. */
const countryName = (country?: string) => (country && getCountryByCode(country)?.name) || country;

const links = (entry: WorldEntryRecord) => entry.evidence.map(e => e.url).filter(Boolean);

const toWorldRecords = (
  categories: RecordCategoryRecord[],
  entries: RecordEntryRecord[],
): WorldRecord[] => {
  const rows: WorldRecord[] = [];

  for (const category of categories) {
    const inCategory = entries.filter(e => e.categoryId === category.categoryId);
    if (inCategory.length === 0) continue;

    for (const entry of inCategory) {
      // Archived categories are history only: their records carry no current title
      const isCurrent = entry.status === 'published' && category.status !== 'archived';
      rows.push({
        entryId: entry.entryId,
        title: isCurrent ? recordTitle(entry.gender) : '',
        isCurrent,
        categoryId: category.categoryId,
        categoryName: category.name,
        categoryGroup: category.group,
        categoryStatus: category.status,
        value: formatRecordValue(category, entry.value),
        specs: [entry.value.original, entry.furtherSpecs, entry.setup].filter(Boolean).join(' · '),
        gender: entry.gender,
        athletes: toDisplayAthletes(entry),
        date: formatEntryDate(entry.date),
        location: [entry.locationName, countryName(entry.locationCountry)].filter(Boolean).join(', '),
        links: links(entry),
      });
    }
  }
  return rows;
};

const toWorldFirsts = (categories: FirstCategoryRecord[], entries: FirstEntryRecord[]): WorldFirst[] => {
  const categoryById = new Map(categories.map(c => [c.categoryId, c]));
  return entries.map(entry => ({
    entryId: entry.entryId,
    title: firstTitle(entry.gender),
    categoryId: entry.categoryId,
    categoryName: categoryById.get(entry.categoryId)?.name ?? entry.categoryName,
    trickName: entry.trickName,
    description: entry.description ?? '',
    lineDetails: entry.lineDetails ?? '',
    gender: entry.gender,
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
