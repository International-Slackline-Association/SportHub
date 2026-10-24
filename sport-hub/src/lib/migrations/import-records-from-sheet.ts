#!/usr/bin/env node
/**
 * One-time import of the ISA certificates sheet ("World Records" and
 * "World Firsts" tabs) into the sporthub-records table (requirements FR-33 to FR-37).
 *
 * - Seeds the record and first categories if they are missing.
 * - Maps each sheet row to a category; rows that don't map, or whose value can't
 *   be parsed, go to the import review list (ImportIssue items) instead of being guessed.
 * - One row per athlete in the sheet: rows with the same category, value and date are
 *   merged into one entry with multiple athletes only in joint categories (tandem,
 *   group rigging). Everything else is a separate (co-holder) entry.
 * - Published vs historical is derived per category and list from the values.
 * - Entry ids are derived from the sheet Cert IDs, so re-running overwrites entries instead of
 *   duplicating them. It does add another "imported" audit item per entry and re-opens review items.
 *
 * Usage:
 *   DYNAMODB_LOCAL=true tsx src/lib/migrations/import-records-from-sheet.ts --dry-run
 *   DYNAMODB_LOCAL=true tsx src/lib/migrations/import-records-from-sheet.ts --execute
 *   ... --file sheet.json   (read {"records": [[...]], "firsts": [[...]]} instead of the Google Sheet)
 *   ... --report report.md  (write the review report to a file)
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import type {
  EntryAthlete,
  FirstCategoryRecord,
  FirstEntryRecord,
  ImportIssueRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  RecordEvidence,
} from '../relational-types';
import { buildFirstCategoryRecords, buildRecordCategoryRecords } from '../records-categories';
import { deriveList, parseRecordValue, parseSheetDate, splitCurrentAndHistory, unitKind, RECORD_LISTS } from '../records-logic';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const args = process.argv.slice(2);
const argValue = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const execute = args.includes('--execute');
const filePath = argValue('--file');
const reportPath = argValue('--report');

if (!execute && !args.includes('--dry-run')) {
  console.error('Pass --dry-run or --execute');
  process.exit(1);
}

// ============================================================================
// SHEET → CATEGORY MAPPING
// ============================================================================

/** Record type (lowercased, whitespace collapsed) → category id. "|extra" keys win over the plain key. */
const RECORD_TYPE_MAP: Record<string, string> = {
  'deepest highline walk with harness': 'highline-depth-underground',
  'fastest 100m run': 'speed-highline-100m',
  'fastest 100m run (in competition)': 'speed-highline-100m',
  'fastest 100m run on a elevated slackline (blindfolded)': 'speed-highline-100m-blind',
  'fastest 14.5m run': 'speedline-14-5m',
  'fastest 200m run': 'speed-highline-200m',
  'fastest 300m run': 'speed-highline-300m',
  'fastest 400m run': 'speed-highline-400m',
  // The framework does not separate sitting and standing starts
  'fastest 60m run (in competition) - sitting start': 'speed-highline-60m',
  'fastest 60m run (in competition) - standing start': 'speed-highline-60m',
  'highest jump on a slackline (feet to feet)': 'trick-high-jump',
  'highest urban highline walked without falling': 'highline-height-urban',
  'highest altitude highline walk above sea level without falling': 'highline-height-altitude',
  'highest slackline walk above ground': 'highline-height',
  'longest highline ever rigged and walked by one individual': 'rigging-solo-rig-derig',
  'longest highline walk pulled with human force on both sides (humanline highline)': 'highline-length-humanline',
  'longest highline walk without falling': 'highline-length',
  'longest highline walk without falling|polyamide': 'highline-length-polyamide',
  'longest highline walk without falling|polyester': 'highline-length-polyester',
  'longest highline walked in tandem (2 people holding hands)': 'highline-length-tandem',
  'longest highline walked without falling': 'highline-length',
  'longest longline walk over ground': 'longline-length',
  'longest longline walk over ground|polyester': 'longline-length-polyester',
  'longest longline walked over ground': 'longline-length',
  'longest longline walked over ground|polyester': 'longline-length-polyester',
  'longest polyamid longline walk without falling': 'longline-length-polyamide',
  'longest polyamide highline walked with harness': 'highline-length-polyamide',
  'longest polyamide longline walked over ground': 'longline-length-polyamide',
  'longest polyamide waterline walk without falling': 'waterline-length-polyamide',
  'longest polyester highline walked with harness': 'highline-length-polyester',
  'longest polyester longline walked over ground': 'longline-length-polyester',
  'longest polyester waterline walk without falling': 'waterline-length-polyester',
  'longest slackline walk with 3 clubs': 'trick-juggling-3-clubs',
  'longest slackline rigged and walked between two cable cars': 'highline-length-cable-cars',
  'longest slackline walk pulled with human force on both sides (humanline longline)': 'longline-length-humanline',
  'longest unicycle ride on a highline': 'highline-length-unicycle',
  'longest urban highline walk without falling|urban': 'highline-length-urban',
  'longest urban highline walked without falling': 'highline-length-urban',
  'longest waterline walk without falling': 'waterline-length',
  'longest waterline walk without falling|polyester': 'waterline-length-polyester',
  'longest waterline walk without falling and without harness': 'waterline-length-unleashed',
  'longest blindfolded highline send without falling': 'highline-length-blind',
  'longest blindfolded highline walk without falling': 'endurance-highline-blind',
  'longest distance walk juggling five clubs': 'trick-juggling-5-clubs',
  'longest distance walked on a highline in 24 hours': 'endurance-highline-24h',
  'longest distance walked on a highline in 72 hours': 'endurance-highline-72h',
  'longest distance walked on a slackline in 24 hours': 'endurance-slackline-24h',
  'longest distance walked on a slackline in 31 days': 'endurance-slackline-31d',
  'longest duration handstand on a highline': 'trick-handstand-highline',
  'longest duration handstand on a slackline': 'trick-handstand-slackline',
  'longest duration controlling a football on an elevated slackline': 'trick-football',
  'longest duration juggling on an elevated slackline': 'trick-juggling-duration',
  'longest duration living on a highline': 'endurance-living-highline',
  'longest duration one arm elbow lever on a slackline': 'trick-elbow-lever',
  'longest duration standing and/or walking on a slackline': 'endurance-standing-walking',
  'longest duration surfing on a rodeoline': 'endurance-surfing',
  'longest line solo-rig and derig': 'rigging-solo-rig-derig',
  'longest line solo-rig and derig including send': 'rigging-solo-rig-derig',
  'longest polyester longline walked over ground|polyester': 'longline-length-polyester',
  'longest underground highline walk with harness': 'highline-length-underground',
  'most front flips feet to feet in a row on a trickline': 'trick-front-flips',
  'most lemur leaps in a row on a trickline/longline': 'longline-length-jumping',
  'most northern/southern highline rigged': 'rigging-northern-southern',
  'most consecutive skips on a slackline': 'trick-skips',
  'most different highlines rigged and sent in 24 hours': 'rigging-group-most-lines-24h',
  'most different highlines rigged and sent in 24 hours alone': 'rigging-solo-most-lines-24h',
  'most spins on four slacklines in one minute': 'trick-davinci-spins',
};

/** Categories that are joint by nature: sheet rows with the same value and date are one performance (FR-33a). */
const JOINT_CATEGORY_IDS = new Set(['highline-length-tandem', 'rigging-group-most-lines-24h']);

/** "Type of Line" on the World Firsts tab → first category id. */
const FIRST_LINE_TYPE_MAP: Record<string, string> = {
  'freestyle highline': 'highline-freestyle',
  'freestyle trickline': 'trickline',
  'trickline': 'trickline',
  'rodeoline': 'rodeoline',
  'static': 'static',
};

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const mapRecordCategory = (recordType: string, extra: string): string | undefined =>
  RECORD_TYPE_MAP[`${norm(recordType)}|${norm(extra)}`] ?? RECORD_TYPE_MAP[norm(recordType)];

/** Trick names differ in spelling between lists ("Obiwan" / "Obi-Wan"), so compare letters and digits only. */
const trickKey = (categoryId: string, trickName: string) =>
  `${categoryId}:${trickName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')}`;

const toGender = (raw: string): 'MEN' | 'WOMEN' | undefined => {
  switch (norm(raw)) {
    case 'male': case 'men': case 'm': return 'MEN';
    case 'female': case 'women': case 'f': case 'w': return 'WOMEN';
    default: return undefined;
  }
};

// ============================================================================
// INPUT
// ============================================================================

type SheetRow = Record<string, string>;

const toObjects = (values: string[][]): SheetRow[] => {
  const [header = [], ...rows] = values;
  return rows
    .filter(row => row.some(cell => cell?.trim()))
    .map(row => Object.fromEntries(header.map((h, i) => [h.trim(), (row[i] ?? '').trim()])));
};

async function loadSheet(): Promise<{ records: SheetRow[]; firsts: SheetRow[] }> {
  if (filePath) {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as { records: string[][]; firsts: string[][] };
    return { records: toObjects(data.records), firsts: toObjects(data.firsts) };
  }
  const { getCertificatesSheetValues } = await import('../google-sheets');
  const [records, firsts] = await Promise.all([
    getCertificatesSheetValues('World Records'),
    getCertificatesSheetValues('World Firsts'),
  ]);
  return { records: toObjects(records), firsts: toObjects(firsts) };
}

// ============================================================================
// TRANSFORM
// ============================================================================

interface ImportResult {
  records: RecordEntryRecord[];
  firsts: FirstEntryRecord[];
  issues: ImportIssueRecord[];
}

const issue = (
  kind: ImportIssueRecord['kind'],
  row: SheetRow,
  reason: ImportIssueRecord['reason'],
  detail: string,
  entryId?: string,
): ImportIssueRecord => {
  const certId = row['Cert ID'] || `row-${Math.random().toString(36).slice(2, 8)}`;
  return {
    pk: 'ImportIssue',
    sortKey: `ImportIssue:${kind}:${certId}:${reason}`,
    kind, certId, reason, detail, row, entryId, resolved: false, createdAt: Date.now(),
  };
};

const evidenceFrom = (row: SheetRow): RecordEvidence[] =>
  [row['Link 1'], row['Link 2']].filter(Boolean).map(url => ({ type: 'link' as const, url }));

const athleteFrom = (row: SheetRow, userIdByEmail: Map<string, string>): EntryAthlete | undefined => {
  const gender = toGender(row['Category']);
  if (!gender) return undefined;
  return {
    userId: userIdByEmail.get(norm(row['ISA Email'])),
    name: row['Name'].replace(/,$/, ''),
    gender,
    country: row['Country of Athlete'] || undefined,
    certId: row['Cert ID'] || undefined,
  };
};

/**
 * Sheet "World Records" rows → record entries: map the category, read the value,
 * merge joint performances, flag likely duplicates, and derive published vs historical.
 */
function transformRecords(
  rows: SheetRow[],
  recordCategories: RecordCategoryRecord[],
  userIdByEmail: Map<string, string>,
  issues: ImportIssueRecord[],
  now: number,
): RecordEntryRecord[] {
  const categoryById = new Map(recordCategories.map(c => [c.categoryId, c]));
  const pending: { category: RecordCategoryRecord; row: SheetRow; athlete: EntryAthlete; entry: RecordEntryRecord }[] = [];
  for (const row of rows) {
    const categoryId = mapRecordCategory(row['Record type'], row['Extra']);
    const category = categoryId ? categoryById.get(categoryId) : undefined;
    if (!category) {
      issues.push(issue('record', row, 'no_category', `No category for "${row['Record type'] || '(empty)'}"${row['Extra'] ? ` / ${row['Extra']}` : ''}`));
      continue;
    }
    const athlete = athleteFrom(row, userIdByEmail);
    if (!athlete) {
      issues.push(issue('record', row, 'invalid_row', `Unknown gender "${row['Category']}"`));
      continue;
    }
    const value = parseRecordValue(category, row['Specs']);
    const isCoordinates = unitKind(category.unit) === 'coordinates';
    const hasValue = isCoordinates ? value.latitude !== undefined : value.amount !== undefined;
    if (!hasValue) {
      issues.push(issue('record', row, 'value_unparsed', `Could not read a ${isCoordinates ? 'location' : category.unit} value from "${row['Specs']}"`));
      continue;
    }
    const entryId = `imp-${row['Cert ID']}`;
    if (!athlete.userId) {
      issues.push(issue('record', row, 'no_user_match', `No SportHub user for "${athlete.name}"${row['ISA Email'] ? ` (${row['ISA Email']})` : ' (no email in sheet)'}`, entryId));
    }
    pending.push({
      category, row, athlete,
      entry: {
        pk: '', sortKey: 'Metadata', statusKey: '', dateSortKey: '',
        kind: 'record',
        entryId,
        status: 'published',
        categoryId: category.categoryId,
        categoryName: category.name,
        list: athlete.gender,
        athletes: [athlete],
        date: parseSheetDate(row['Date']),
        value,
        evidence: evidenceFrom(row),
        witnesses: [],
        furtherSpecs: row['Extra'] && !category.name.toLowerCase().includes(row['Extra'].toLowerCase()) ? row['Extra'] : undefined,
        source: 'import',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  // Merge rows of one joint performance (FR-33a)
  const records: RecordEntryRecord[] = [];
  const jointGroups = new Map<string, RecordEntryRecord>();
  for (const { category, entry, athlete } of pending) {
    if (!JOINT_CATEGORY_IDS.has(category.categoryId)) { records.push(entry); continue; }
    const key = `${category.categoryId}|${entry.value.amount}|${entry.date}`;
    const existing = jointGroups.get(key);
    if (!existing) { jointGroups.set(key, entry); records.push(entry); continue; }
    existing.athletes.push(athlete);
    existing.evidence = [...existing.evidence, ...entry.evidence.filter(e => !existing.evidence.some(x => x.url === e.url))];
    existing.list = deriveList(existing.athletes);
  }

  // Same athlete with the same value twice in a category is most likely one record entered twice
  const seen = new Map<string, RecordEntryRecord>();
  for (const entry of records) {
    const key = `${entry.categoryId}|${entry.value.amount ?? entry.value.latitude}|${entry.athletes.map(a => a.name.toLowerCase()).sort().join('+')}`;
    const first = seen.get(key);
    if (!first) { seen.set(key, entry); continue; }
    const row = pending.find(p => p.entry === entry)!.row;
    issues.push(issue('record', row, 'possible_duplicate', `Same athlete and value as ${first.athletes[0].certId} (${first.date || 'no date'} vs ${entry.date || 'no date'})`, entry.entryId));
  }

  // Published vs historical per category and list
  for (const category of recordCategories) {
    for (const list of RECORD_LISTS) {
      const group = records.filter(r => r.categoryId === category.categoryId && r.list === list);
      const { history } = splitCurrentAndHistory(category, group);
      for (const entry of history) entry.status = 'historical';
    }
  }
  return records;
}

/**
 * Sheet "World Firsts" rows → first entries, with the same trick on different
 * lists linked by a shared trickGroupId (FR-33b).
 */
function transformFirsts(
  rows: SheetRow[],
  firstCategories: FirstCategoryRecord[],
  userIdByEmail: Map<string, string>,
  issues: ImportIssueRecord[],
  now: number,
): FirstEntryRecord[] {
  const rowOf = (first: FirstEntryRecord) => rows.find(r => `imp-${r['Cert ID']}` === first.entryId)!;
  const firstCategoryIds = new Set(firstCategories.map(c => c.categoryId));
  const firsts: FirstEntryRecord[] = [];
  for (const row of rows) {
    const categoryId = FIRST_LINE_TYPE_MAP[norm(row['Type of Line'])];
    if (!categoryId || !firstCategoryIds.has(categoryId)) {
      issues.push(issue('first', row, 'no_category', `No first category for type of line "${row['Type of Line'] || '(empty)'}"`));
      continue;
    }
    const athlete = athleteFrom(row, userIdByEmail);
    if (!athlete) {
      issues.push(issue('first', row, 'invalid_row', `Unknown gender "${row['Category']}"`));
      continue;
    }
    const trickName = row['Description of World First'];
    if (!trickName) {
      issues.push(issue('first', row, 'invalid_row', 'Trick name (description) is empty'));
      continue;
    }
    const entryId = `imp-${row['Cert ID']}`;
    if (!athlete.userId) {
      issues.push(issue('first', row, 'no_user_match', `No SportHub user for "${athlete.name}"${row['ISA Email'] ? ` (${row['ISA Email']})` : ' (no email in sheet)'}`, entryId));
    }
    firsts.push({
      pk: '', sortKey: 'Metadata', statusKey: '', dateSortKey: '',
      kind: 'first',
      entryId,
      status: 'published',
      categoryId,
      categoryName: firstCategories.find(c => c.categoryId === categoryId)!.name,
      list: athlete.gender,
      athletes: [athlete],
      date: parseSheetDate(row['Date']),
      trickName,
      lineDetails: row['Specs'] || undefined,
      evidence: evidenceFrom(row),
      source: 'import',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Link the same trick across lists (FR-33b); same trick twice on one list is unclear
  const byTrick = new Map<string, FirstEntryRecord[]>();
  for (const first of firsts) {
    const key = trickKey(first.categoryId, first.trickName);
    byTrick.set(key, [...(byTrick.get(key) ?? []), first]);
  }
  for (const [key, group] of byTrick) {
    if (group.length < 2) continue;
    const lists = group.map(f => f.list);
    if (new Set(lists).size !== lists.length) {
      for (const first of group) {
        issues.push(issue('first', rowOf(first), 'first_link_unclear', `"${first.trickName}" appears more than once on the same list`, first.entryId));
      }
      continue;
    }
    for (const first of group) first.trickGroupId = `trick-${key.replace(/[^a-z0-9]+/g, '-')}`;
    const missingDate = group.filter(f => !f.date);
    for (const first of missingDate) {
      issues.push(issue('first', rowOf(first), 'first_link_unclear', `"${first.trickName}" has no date, so its title (World First or list title) can't be decided`, first.entryId));
    }
  }

  return firsts;
}

function transform(
  sheet: { records: SheetRow[]; firsts: SheetRow[] },
  recordCategories: RecordCategoryRecord[],
  firstCategories: FirstCategoryRecord[],
  userIdByEmail: Map<string, string>,
): ImportResult {
  const now = Date.now();
  const issues: ImportIssueRecord[] = [];
  const records = transformRecords(sheet.records, recordCategories, userIdByEmail, issues, now);
  const firsts = transformFirsts(sheet.firsts, firstCategories, userIdByEmail, issues, now);
  return { records, firsts, issues };
}

// ============================================================================
// REPORT
// ============================================================================

function report(result: ImportResult, sheet: { records: SheetRow[]; firsts: SheetRow[] }): string {
  const count = <T>(items: T[], pred: (i: T) => boolean) => items.filter(pred).length;
  const lines = [
    '# Records & firsts import report',
    '',
    `Sheet rows: ${sheet.records.length} records, ${sheet.firsts.length} firsts.`,
    '',
    `- Record entries: ${result.records.length} (${count(result.records, r => r.status === 'published')} current, ${count(result.records, r => r.status === 'historical')} historical, ${count(result.records, r => r.athletes.length > 1)} with multiple athletes)`,
    `- First entries: ${result.firsts.length} (${count(result.firsts, f => !!f.trickGroupId)} linked to the same trick on another list)`,
    `- Review list: ${result.issues.length} items`,
    '',
  ];
  const reasons: ImportIssueRecord['reason'][] = ['no_category', 'value_unparsed', 'invalid_row', 'possible_duplicate', 'first_link_unclear', 'no_user_match'];
  const titles: Record<ImportIssueRecord['reason'], string> = {
    no_category: 'No matching category (not imported)',
    value_unparsed: 'Value could not be read (not imported)',
    invalid_row: 'Invalid row (not imported)',
    first_link_unclear: 'First: link to the same trick unclear (imported)',
    possible_duplicate: 'Possible duplicate row (imported, check and archive one)',
    no_user_match: 'No SportHub user found, athlete kept as name only (imported)',
  };
  for (const reason of reasons) {
    const items = result.issues.filter(i => i.reason === reason);
    if (items.length === 0) continue;
    lines.push(`## ${titles[reason]}: ${items.length}`, '');
    for (const item of items) lines.push(`- ${item.certId}: ${item.detail}`);
    lines.push('');
  }
  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { dynamodb, RECORDS_TABLE } = await import('../dynamodb');
  const { getAllUserProfiles } = await import('../user-query-service');
  const service = await import('../records-service');

  // Categories: seed the ones that don't exist yet, keep admin edits to existing ones
  const [existingRecordCats, existingFirstCats] = await Promise.all([service.getRecordCategories(), service.getFirstCategories()]);
  const recordCategories = [...existingRecordCats];
  const firstCategories = [...existingFirstCats];
  const newRecordCats = buildRecordCategoryRecords().filter(c => !existingRecordCats.some(e => e.categoryId === c.categoryId));
  const newFirstCats = buildFirstCategoryRecords().filter(c => !existingFirstCats.some(e => e.categoryId === c.categoryId));
  recordCategories.push(...newRecordCats);
  firstCategories.push(...newFirstCats);

  const sheet = await loadSheet();
  const profiles = await getAllUserProfiles();
  const userIdByEmail = new Map(profiles.filter(p => p.email).map(p => [norm(p.email), p.userId]));

  const result = transform(sheet, recordCategories, firstCategories, userIdByEmail);
  const text = report(result, sheet);
  console.log(text);
  if (reportPath) writeFileSync(reportPath, text);

  if (!execute) {
    console.log(`\nDry run: nothing written. ${newRecordCats.length + newFirstCats.length} categories would be seeded.`);
    return;
  }

  for (const category of [...newRecordCats, ...newFirstCats]) await service.putCategory(category);
  for (const entry of [...result.records, ...result.firsts]) {
    await service.putEntry(entry);
    await service.addAuditEntry(entry.kind, entry.entryId, { action: 'imported', toStatus: entry.status, comment: 'Imported from the ISA certificates sheet' });
    for (const athlete of entry.athletes) {
      if (athlete.userId) await service.putAthleteLink(athlete.userId, entry.kind, entry.entryId);
    }
  }
  for (const item of result.issues) await dynamodb.putItem(RECORDS_TABLE, item as unknown as Record<string, unknown>);

  console.log(`\n✅ Wrote ${newRecordCats.length + newFirstCats.length} categories, ${result.records.length} records, ${result.firsts.length} firsts, ${result.issues.length} review items.`);
}

main().then(() => process.exit(0)).catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
