/**
 * Pure world-record / world-first rules: lists, comparison, titles, value
 * parsing and formatting. No database access, so it is safe to import from
 * client components and migration scripts alike.
 */

import type {
  EntryAthlete,
  FirstEntryRecord,
  RecordCategoryRecord,
  RecordEntryRecord,
  RecordList,
  RecordUnit,
  RecordValue,
} from './relational-types';

export const RECORD_LISTS: RecordList[] = ['MEN', 'WOMEN', 'MIXED'];

/** The list as a gender, for admin tables. */
export const GENDER_LABELS: Record<RecordList, string> = { MEN: 'Men', WOMEN: 'Women', MIXED: 'Mixed' };

export const LIST_LABELS: Record<RecordList, string> = {
  MEN: "Men's",
  WOMEN: "Women's",
  MIXED: 'Mixed',
};

/**
 * The list an entry belongs on follows its athletes (FR-9b):
 * all men → men's, all women → women's, men and women together → mixed.
 */
export const deriveList = (athletes: Pick<EntryAthlete, 'gender'>[]): RecordList => {
  const genders = new Set(athletes.map(a => a.gender));
  if (genders.size === 1) return genders.has('MEN') ? 'MEN' : 'WOMEN';
  return 'MIXED';
};

/**
 * How a free-text unit is read: metres, time (stored in seconds), a count,
 * coordinates ("°", compared by absolute latitude) or a plain number.
 */
export type UnitKind = 'm' | 's' | 'count' | 'coordinates' | 'number';

export const unitKind = (unit: RecordUnit | undefined): UnitKind => {
  const u = (unit ?? '').trim().toLowerCase();
  if (['m', 'meter', 'meters', 'metre', 'metres'].includes(u)) return 'm';
  if (['s', 'sec', 'secs', 'second', 'seconds', 'time', 'duration'].includes(u)) return 's';
  if (['', 'count', 'times', 'x', '#'].includes(u)) return 'count';
  if (['°', 'deg', 'degree', 'degrees', 'latitude', 'coordinates'].includes(u)) return 'coordinates';
  return 'number';
};

/** Units offered as suggestions; any other text works too. */
export const UNIT_SUGGESTIONS: { value: string; label: string }[] = [
  { value: 'm', label: 'm (metres, e.g. "1,038.5" or "2 km")' },
  { value: 's', label: 's (time, entered as e.g. "1:59 min" or "12 min 18 sec")' },
  { value: 'count', label: 'count (e.g. 25)' },
  { value: '°', label: '° (coordinates, compared by absolute latitude)' },
];

type CategoryRule = Pick<RecordCategoryRecord, 'direction' | 'unit'>;

/** The single number two values are compared on. Coordinates compare on absolute latitude (FR-C6). */
export const comparableValue = (category: CategoryRule, value: RecordValue): number | undefined => {
  if (unitKind(category.unit) === 'coordinates') {
    return value.latitude === undefined ? undefined : Math.abs(value.latitude);
  }
  return value.amount;
};

/** > 0 when a is better than b, 0 when equal, < 0 when worse. Missing values sort last. */
export const compareRecordValues = (category: CategoryRule, a: RecordValue, b: RecordValue): number => {
  const va = comparableValue(category, a);
  const vb = comparableValue(category, b);
  if (va === undefined && vb === undefined) return 0;
  if (va === undefined) return -1;
  if (vb === undefined) return 1;
  const diff = va - vb;
  return category.direction === 'higher' ? diff : -diff;
};

/**
 * Splits the published and historical entries of one category and list into
 * the current record holders (best value; ties are co-holders, FR-9c) and history.
 */
export const splitCurrentAndHistory = <T extends Pick<RecordEntryRecord, 'value'>>(
  category: CategoryRule,
  entries: T[],
): { current: T[]; history: T[] } => {
  const valued = entries.filter(e => comparableValue(category, e.value) !== undefined);
  if (valued.length === 0) return { current: [], history: entries };
  const best = valued.reduce((top, e) => (compareRecordValues(category, e.value, top.value) > 0 ? e : top));
  const current = valued.filter(e => compareRecordValues(category, e.value, best.value) === 0);
  return { current, history: entries.filter(e => !current.includes(e)) };
};

/**
 * Record titles within a category (FR-23a): the best current record across the
 * lists is "World Record", the others carry the list title. Equal bests share it.
 */
export const computeRecordTitles = (
  category: CategoryRule,
  currentByList: Partial<Record<RecordList, RecordValue>>,
): Partial<Record<RecordList, string>> => {
  const lists = RECORD_LISTS.filter(list => currentByList[list] !== undefined);
  if (lists.length === 0) return {};
  const bestList = lists.reduce((top, list) =>
    compareRecordValues(category, currentByList[list]!, currentByList[top]!) > 0 ? list : top);
  return Object.fromEntries(lists.map(list => [
    list,
    compareRecordValues(category, currentByList[list]!, currentByList[bestList]!) === 0
      ? 'World Record'
      : `${LIST_LABELS[list]} World Record`,
  ]));
};

/**
 * First titles (FR-23b): within a group of the same trick, the earliest landing
 * across the lists is "World First", later ones carry the list title.
 * Returns a title per entryId.
 */
export const computeFirstTitles = (
  firsts: Pick<FirstEntryRecord, 'entryId' | 'trickGroupId' | 'date' | 'list'>[],
): Record<string, string> => {
  const groups = new Map<string, typeof firsts>();
  for (const first of firsts) {
    const key = first.trickGroupId || first.entryId;
    groups.set(key, [...(groups.get(key) ?? []), first]);
  }

  const titles: Record<string, string> = {};
  for (const group of groups.values()) {
    const dated = group.filter(f => f.date);
    const earliest = dated.length > 0 ? dated.reduce((min, f) => (f.date < min ? f.date : min), dated[0].date) : '';
    for (const first of group) {
      const isEarliest = group.length === 1 || !first.date || first.date === earliest;
      titles[first.entryId] = isEarliest ? 'World First' : `${LIST_LABELS[first.list]} World First`;
    }
  }
  return titles;
};

// ============================================================================
// VALUE FORMATTING
// ============================================================================

const formatNumber = (n: number, maxFractionDigits = 2) =>
  n.toLocaleString('en-GB', { maximumFractionDigits: maxFractionDigits });

const formatDuration = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return Number.isInteger(hours) ? `${hours} h` : `${Math.floor(hours)} h ${Math.round((seconds % 3600) / 60)} min`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds - minutes * 60;
    return `${minutes} min ${rest.toFixed(2).replace(/\.00$/, '')} s`;
  }
  return `${seconds.toFixed(2).replace(/\.00$/, '')} s`;
};

const formatCoordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;

export const formatRecordValue = (
  category: Pick<RecordCategoryRecord, 'unit'>,
  value: RecordValue,
): string => {
  const kind = unitKind(category.unit);
  if (kind === 'coordinates') {
    if (value.latitude === undefined) return value.original ?? '';
    const lat = formatCoordinate(value.latitude, 'N', 'S');
    return value.longitude === undefined ? lat : `${lat}, ${formatCoordinate(value.longitude, 'E', 'W')}`;
  }
  if (value.amount === undefined) return value.original ?? '';
  switch (kind) {
    case 'm': return `${formatNumber(value.amount)} m`;
    case 's': return formatDuration(value.amount);
    case 'count': return formatNumber(value.amount, 1);
    case 'number': return `${formatNumber(value.amount)} ${category.unit.trim()}`;
  }
};

/** Hint for the value field of the claim form. */
export const valueHint = (unit: RecordUnit | undefined): string => {
  switch (unitKind(unit)) {
    case 'm': return 'In metres, e.g. 2710 or 1,038.5';
    case 's': return 'A time, e.g. 1:59 min, 12 min 18 sec or 48.67';
    case 'count': return 'A number, e.g. 25';
    case 'coordinates': return 'Coordinates of the line, e.g. 78°13′N 15°38′E or -77.85, 166.67';
    case 'number': return `A number in ${unit}`;
  }
};

// ============================================================================
// VALUE PARSING (free-text "specs" from the ISA sheet, FR-37)
// ============================================================================

/**
 * Parses a number that may use "," or "." as decimal separator and "," / "'" as
 * thousands separator ("1,038" → 1038, "48,67" → 48.67, "3'254" → 3254).
 */
const parseLooseNumber = (raw: string): number => {
  let s = raw.replace(/'/g, '');
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  return Number(s);
};

const NUMBER = String.raw`\d[\d',.]*`;

const parseMetres = (text: string, preferHeight: boolean): number | undefined => {
  const t = text.toLowerCase();
  if (preferHeight) {
    const height = t.match(new RegExp(String.raw`(${NUMBER})\s*(?:m|meters?|metres?)?\s*(?:high|altitude|below|above|in high)`));
    if (height) return parseLooseNumber(height[1]);
  }
  const km = t.match(new RegExp(String.raw`(${NUMBER})\s*km\b`));
  if (km) return parseLooseNumber(km[1]) * 1000;
  const metres = t.match(new RegExp(String.raw`(${NUMBER})\s*(?:m\b|meters?\b|metres?\b|length\b|long\b)`));
  if (metres) return parseLooseNumber(metres[1]);
  // A bare number ("220", "1600m" handled above) is taken as metres
  const bare = t.trim().match(new RegExp(String.raw`^(${NUMBER})$`));
  return bare ? parseLooseNumber(bare[1]) : undefined;
};

/**
 * Parses durations such as "12 min 18 sec", "1:59 min", "48,67 seconds",
 * "25:25 sec" (sheet uses ":" as decimal mark for seconds), "10 hours", "60 min".
 */
const parseSeconds = (text: string): number | undefined => {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();

  const hours = t.match(new RegExp(String.raw`^(${NUMBER})\s*(?:h|hours?)$`));
  if (hours) return parseLooseNumber(hours[1]) * 3600;

  // "1:59 min" → 1 min 59 s
  const minColon = t.match(/^(\d+):(\d{1,2}(?:[.,]\d+)?)\s*min/);
  if (minColon) return Number(minColon[1]) * 60 + parseLooseNumber(minColon[2]);

  const minSec = t.match(/^(\d+)\s*min\s*(\d+(?:[.,:]\d+)?)\s*(?:s|sec|secs|seconds)?\b/);
  if (minSec) return Number(minSec[1]) * 60 + parseLooseNumber(minSec[2].replace(':', '.'));

  const minOnly = t.match(/^(\d+(?:[.,]\d+)?)\s*min(?:utes?)?$/);
  if (minOnly) return parseLooseNumber(minOnly[1]) * 60;

  const sec = t.match(/^(\d+(?:[.,:]\d+)?)\s*(?:s|sec|secs|seconds)$/);
  if (sec) return parseLooseNumber(sec[1].replace(':', '.'));

  // Claim form input without unit: "12:18.5" (min:sec) or plain seconds "44.05"
  const clock = t.match(/^(\d+):(\d{2}(?:[.,]\d+)?)$/);
  if (clock) return Number(clock[1]) * 60 + parseLooseNumber(clock[2]);
  const bare = t.match(/^(\d+(?:[.,]\d+)?)$/);
  if (bare) return parseLooseNumber(bare[1]);

  return undefined;
};

const parseCount = (text: string): number | undefined => {
  const m = text.trim().match(/^(\d+(?:[.,]\d+)?)$/);
  return m ? parseLooseNumber(m[1]) : undefined;
};

/** Parses degrees-minutes-seconds like 70°57'39.0"N 28°18'07.5"W, or decimal "70.96, -28.30". */
export const parseCoordinates = (text: string): { latitude: number; longitude?: number } | undefined => {
  const dms = /(\d+(?:\.\d+)?)°\s*(?:(\d+(?:\.\d+)?)['′]\s*)?(?:(\d+(?:\.\d+)?)["″]\s*)?([NSEW])/gi;
  const parts = [...text.matchAll(dms)].map(m => {
    const deg = Number(m[1]) + Number(m[2] ?? 0) / 60 + Number(m[3] ?? 0) / 3600;
    const dir = m[4].toUpperCase();
    return { dir, value: dir === 'S' || dir === 'W' ? -deg : deg };
  });
  const lat = parts.find(p => p.dir === 'N' || p.dir === 'S');
  if (lat) return { latitude: lat.value, longitude: parts.find(p => p.dir === 'E' || p.dir === 'W')?.value };

  const decimal = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (decimal) return { latitude: Number(decimal[1]), longitude: Number(decimal[2]) };
  return undefined;
};

/** Parses free text into a structured value for the category. `amount` stays undefined if it can't. */
export const parseRecordValue = (
  category: Pick<RecordCategoryRecord, 'unit'> & { group?: string },
  text: string,
): RecordValue => {
  const original = text.trim();
  const kind = unitKind(category.unit);
  if (kind === 'coordinates') {
    return { ...parseCoordinates(original), original };
  }
  let amount: number | undefined;
  switch (kind) {
    case 'm': amount = parseMetres(original, category.group === 'Altitude'); break;
    case 's': amount = parseSeconds(original); break;
    case 'count': amount = parseCount(original); break;
    case 'number': {
      const m = original.match(new RegExp(String.raw`^(${NUMBER})`));
      amount = m ? parseLooseNumber(m[1]) : undefined;
      break;
    }
  }
  return { amount: amount !== undefined && Number.isFinite(amount) ? amount : undefined, original };
};

/** URL-safe id from a name, e.g. for new categories ("Highline – Urban" → "highline-urban"). */
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Sheet dates are DD.MM.YYYY or DD/MM/YYYY; returns ISO yyyy-mm-dd, or "" if unparseable. */
export const parseSheetDate = (raw: string): string => {
  const m = raw?.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

/** ISO yyyy-mm-dd → DD/MM/YYYY, the format the rest of the app displays. */
export const formatEntryDate = (iso: string): string => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
