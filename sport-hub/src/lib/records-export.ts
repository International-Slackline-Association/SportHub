/**
 * CSV exports of the records and firsts data for admins
 * (/admin/records-export, served by /api/admin/records-export/{dataset}).
 * Every entry except private drafts is exported; witnesses and new-athlete
 * emails are included, so the files are for ISA admins only.
 */

import {
  getEntriesByStatus,
  getFirstCategories,
  getPublicWorldFirsts,
  getPublicWorldRecords,
  getRecordCategories,
} from './records-service';
import { formatRecordValue } from './records-logic';
import type {
  ClaimStatus,
  FirstEntryRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  WorldEntryRecord,
} from './relational-types';

export const EXPORT_DATASETS = {
  records: 'World records: one row per record or record claim',
  firsts: 'World firsts: one row per first or first claim',
  athletes: 'Athletes: one row per athlete on a record or first',
  categories: 'Categories: record categories and first disciplines',
} as const;

export type ExportDataset = keyof typeof EXPORT_DATASETS;

export const isExportDataset = (value: string): value is ExportDataset => value in EXPORT_DATASETS;

type Cell = string | number | boolean | undefined | null;
type Row = Record<string, Cell>;

/**
 * Quotes a CSV cell. Text starting with = + - @ is prefixed with ' so
 * spreadsheet apps don't run claimant input as a formula (CSV injection).
 */
export function csvCell(value: Cell): string {
  if (value === undefined || value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to CSV with a header row; the columns are the keys of the first row. */
export function toCsv(rows: Row[], columns: string[] = Object.keys(rows[0] ?? {})): string {
  const lines = [columns.map(csvCell).join(','), ...rows.map(row => columns.map(c => csvCell(row[c])).join(','))];
  return lines.join('\r\n') + '\r\n';
}

const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : '');
const list = (values: (string | undefined)[]) => values.filter(Boolean).join('; ');

const RECORD_STATUSES: ClaimStatus[] = ['pending', 'changes_requested', 'published', 'historical', 'rejected'];
const FIRST_STATUSES: ClaimStatus[] = ['pending', 'changes_requested', 'published', 'rejected'];

async function nonDraftEntries(kind: 'record', statuses: ClaimStatus[]): Promise<RecordEntryRecord[]>;
async function nonDraftEntries(kind: 'first', statuses: ClaimStatus[]): Promise<FirstEntryRecord[]>;
async function nonDraftEntries(kind: 'record' | 'first', statuses: ClaimStatus[]): Promise<WorldEntryRecord[]> {
  const lists = await Promise.all(statuses.map(status => getEntriesByStatus(kind, status)));
  return lists.flat().sort((a, b) => a.categoryName.localeCompare(b.categoryName) || (a.date || '').localeCompare(b.date || ''));
}

/** Columns every entry has, in export order. */
const entryColumns = (entry: WorldEntryRecord, title: string | undefined): Row => ({
  entry_id: entry.entryId,
  kind: entry.kind,
  status: entry.status,
  title: title ?? '',
  category_id: entry.categoryId,
  category: entry.categoryName,
  gender: entry.gender,
  athletes: list(entry.athletes.map(a => a.name)),
  athlete_user_ids: list(entry.athletes.map(a => a.userId)),
  athlete_countries: list(entry.athletes.map(a => a.country)),
  date: entry.date,
  location: entry.locationName,
  location_country: entry.locationCountry,
  event_id: entry.eventId,
  evidence_links: list(entry.evidence.map(e => e.url)),
});

const trailingColumns = (entry: WorldEntryRecord): Row => ({
  claimant: entry.claimantName,
  claimant_user_id: entry.claimantUserId,
  source: entry.source,
  cert_ids: list(entry.athletes.map(a => a.certId)),
  review_comment: entry.reviewComment,
  submitted_at: iso(entry.submittedAt),
  decided_at: iso(entry.decidedAt),
  decided_by: entry.decidedBy,
  voided_at: iso(entry.voidedAt),
  created_at: iso(entry.createdAt),
  updated_at: iso(entry.updatedAt),
});

async function recordRows(): Promise<Row[]> {
  const [entries, categories, publicRecords] = await Promise.all([
    nonDraftEntries('record', RECORD_STATUSES),
    getRecordCategories(),
    getPublicWorldRecords(),
  ]);
  const categoryById = new Map<string, RecordCategoryRecord>(categories.map(c => [c.categoryId, c]));
  const titleById = new Map(publicRecords.map(r => [r.entryId, r.title]));
  return entries.map(entry => {
    const category = categoryById.get(entry.categoryId);
    const proposal = entry.newCategoryProposal;
    return {
      ...entryColumns(entry, titleById.get(entry.entryId)),
      value: category ? formatRecordValue(category, entry.value) : entry.value.original,
      value_amount: entry.value.amount,
      unit: category?.unit ?? proposal?.unit,
      latitude: entry.value.latitude,
      longitude: entry.value.longitude,
      value_as_entered: entry.value.original,
      setup: entry.setup,
      further_specs: entry.furtherSpecs,
      witnesses: list(entry.witnesses.map(w => [w.name, w.email, w.phone ?? w.contact].filter(Boolean).join(' / '))),
      full_video: !entry.noFullVideoReason,
      no_full_video_reason: entry.noFullVideoReason,
      proposed_category: proposal ? `${proposal.name} (${proposal.unit}, ${proposal.direction} is better): ${proposal.measurement}` : '',
      ...trailingColumns(entry),
    };
  });
}

async function firstRows(): Promise<Row[]> {
  const [entries, publicFirsts] = await Promise.all([
    nonDraftEntries('first', FIRST_STATUSES),
    getPublicWorldFirsts(),
  ]);
  const titleById = new Map(publicFirsts.map(f => [f.entryId, f.title]));
  return entries.map(entry => ({
    ...entryColumns(entry, titleById.get(entry.entryId)),
    trick_name: entry.trickName,
    description: entry.description,
    why_first: entry.whyFirst,
    similar_tricks: entry.similarTricks,
    line_details: entry.lineDetails,
    trick_group_id: entry.trickGroupId,
    ...trailingColumns(entry),
  }));
}

async function athleteRows(): Promise<Row[]> {
  const [records, firsts, categories] = await Promise.all([
    nonDraftEntries('record', RECORD_STATUSES),
    nonDraftEntries('first', FIRST_STATUSES),
    getRecordCategories(),
  ]);
  const categoryById = new Map(categories.map(c => [c.categoryId, c]));
  const entries: WorldEntryRecord[] = [...records, ...firsts];
  return entries.flatMap(entry => entry.athletes.map(athlete => {
    const category = entry.kind === 'record' ? categoryById.get(entry.categoryId) : undefined;
    return {
      kind: entry.kind,
      entry_id: entry.entryId,
      status: entry.status,
      category: entry.categoryName,
      gender: entry.gender,
      record_or_trick: entry.kind === 'first'
        ? entry.trickName
        : category ? formatRecordValue(category, entry.value) : entry.value.original,
      date: entry.date,
      athlete: athlete.name,
      user_id: athlete.userId,
      athlete_gender: athlete.gender,
      country: athlete.country,
      cert_id: athlete.certId,
      new_athlete_email: athlete.pendingUser?.email,
      joint_performance: entry.athletes.length > 1,
    };
  }));
}

async function categoryRows(): Promise<Row[]> {
  const [records, firsts] = await Promise.all([getRecordCategories(), getFirstCategories()]);
  return [
    ...records.map(c => ({
      kind: 'record', category_id: c.categoryId, name: c.name, group: c.group, unit: c.unit, direction: c.direction,
      status: c.status, order: c.order, description: c.description, termination_rule: '',
      created_at: iso(c.createdAt), updated_at: iso(c.updatedAt),
    })),
    ...firsts.map(c => ({
      kind: 'first', category_id: c.categoryId, name: c.name, group: '', unit: '', direction: '',
      status: c.status, order: c.order, description: '', termination_rule: c.terminationRule,
      created_at: iso(c.createdAt), updated_at: iso(c.updatedAt),
    })),
  ];
}

const BUILDERS: Record<ExportDataset, () => Promise<Row[]>> = {
  records: recordRows,
  firsts: firstRows,
  athletes: athleteRows,
  categories: categoryRows,
};

/** The CSV for one dataset. No permission check here; the route does that. */
export async function buildExportCsv(dataset: ExportDataset): Promise<string> {
  return toCsv(await BUILDERS[dataset]());
}
