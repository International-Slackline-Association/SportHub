/**
 * Reading the "World Records" Google Sheet (tabs "Categories" and "Data", id WORLD_RECORDS_SPREADSHEET_ID),
 * which replaces the "World Records" tab of the ISA certificates sheet as import source.
 * Pure helpers, used by src/lib/migrations/import-records-from-sheet.ts --use-records-sheet.
 */

import type { RecordCategoryGroup, RecordCategoryStatus, RecordCategoryTableItem } from './relational-types';
import { RECORD_CATEGORY_GROUPS } from './relational-types';
import { slugify } from './records-logic';

type SheetRow = Record<string, string>;

const norm = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Sheet units → the units the app parses ("hm" = height in metres, "#" = count). */
const UNIT_MAP: Record<string, string> = { hm: 'm', '#': 'count' };

const STATUSES: Record<string, RecordCategoryStatus> = {
  active: 'active',
  unchallenged: 'unchallenged',
  archived: 'archived',
};

export type SheetCategory = Pick<RecordCategoryTableItem, 'categoryId' | 'name' | 'group' | 'unit' | 'direction' | 'status' | 'description'>;

/**
 * One "Categories" row → a category, or an error text when a required field is missing or unknown.
 * The id is the slug of the name; an "ID" column wins when filled.
 */
export const categoryFromSheetRow = (row: SheetRow): SheetCategory | { error: string } => {
  const name = (row['Record Name'] ?? '').trim();
  if (!name) return { error: 'Record Name is empty' };
  const group = RECORD_CATEGORY_GROUPS.find(g => norm(g) === norm(row['Group'])) as RecordCategoryGroup | undefined;
  if (!group) return { error: `"${name}": unknown group "${row['Group'] ?? ''}"` };
  const status = STATUSES[norm(row['Status'])];
  if (!status) return { error: `"${name}": unknown status "${row['Status'] ?? ''}"` };
  const improved = norm(row['Improved']);
  if (improved !== 'increasing' && improved !== 'decreasing') return { error: `"${name}": "Improved" must be Increasing or Decreasing` };
  const rawUnit = (row['Unit'] ?? '').trim();
  const successor = (row['If archieved, new category'] ?? row['If archived, new category'] ?? '').trim();
  return {
    categoryId: (row['ID'] ?? '').trim() || slugify(name),
    name,
    group,
    unit: UNIT_MAP[rawUnit.toLowerCase()] ?? rawUnit,
    direction: improved === 'increasing' ? 'higher' : 'lower',
    status,
    description: status === 'archived' && successor ? `Replaced by "${successor}".` : undefined,
  };
};

/** "a, b" or "a; b" → ["a", "b"] */
export const splitSheetList = (raw: string | undefined): string[] =>
  (raw ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean);

/** The "Value" column: a plain number with "," or "." as decimal mark. */
export const parseSheetNumber = (raw: string | undefined): number | undefined => {
  const s = (raw ?? '').trim().replace(/\s/g, '');
  if (!/^-?\d+([.,]\d+)?$/.test(s)) return undefined;
  return Number(s.replace(',', '.'));
};

/** Category lookup by name, ignoring case and extra spaces. */
export const categoryNameKey = norm;
