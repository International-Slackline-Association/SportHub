/**
 * Unit tests for the pure world-record / world-first rules.
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  challengesCategory,
  entryHasCertificate,
  hasCertificate,
  recordStanding,
  standingTitle,
  compareRecordValues,
  deriveGender,
  firstTitle,
  formatRecordValue,
  parseCoordinates,
  parseRecordValue,
  parseSheetDate,
  recordTitle,
  slugify,
  splitCurrentAndHistory,
  unitKind,
} from '../records-logic';

const length = { unit: 'm', direction: 'higher' as const };
const speed = { unit: 's', direction: 'lower' as const };
const geo = { unit: '°', direction: 'higher' as const };

test('deriveGender follows the athletes (FR-9b)', () => {
  assert.equal(deriveGender([{ gender: 'MEN' }]), 'MEN_ONLY');
  assert.equal(deriveGender([{ gender: 'WOMEN' }, { gender: 'WOMEN' }]), 'WOMEN_ONLY');
  assert.equal(deriveGender([{ gender: 'MEN' }, { gender: 'WOMEN' }]), 'MIXED');
});

test('unitKind reads free-text units', () => {
  assert.equal(unitKind('metres'), 'm');
  assert.equal(unitKind('Seconds'), 's');
  assert.equal(unitKind('count'), 'count');
  assert.equal(unitKind('°'), 'coordinates');
  assert.equal(unitKind('kg'), 'number');
});

test('compareRecordValues respects the direction', () => {
  assert.ok(compareRecordValues(length, { amount: 2000 }, { amount: 1900 }) > 0);
  assert.ok(compareRecordValues(speed, { amount: 40 }, { amount: 44 }) > 0);
  assert.equal(compareRecordValues(length, { amount: 1900 }, { amount: 1900 }), 0);
  // Missing values sort last
  assert.ok(compareRecordValues(length, {}, { amount: 1 }) < 0);
});

test('coordinates compare on absolute latitude (FR-C6)', () => {
  assert.ok(compareRecordValues(geo, { latitude: -78 }, { latitude: 70 }) > 0);
});

test('splitCurrentAndHistory keeps equal bests as co-holders (FR-9c)', () => {
  const a = { id: 'a', value: { amount: 1900 } };
  const b = { id: 'b', value: { amount: 1900 } };
  const c = { id: 'c', value: { amount: 1500 } };
  const { current, history } = splitCurrentAndHistory(length, [a, b, c]);
  assert.deepEqual(current.map(e => e.id), ['a', 'b']);
  assert.deepEqual(history.map(e => e.id), ['c']);
});

test('titles follow the gender only (FR-23a/b)', () => {
  assert.equal(recordTitle('MEN_ONLY'), "Men's World Record");
  assert.equal(recordTitle('WOMEN_ONLY'), "Women's World Record");
  assert.equal(recordTitle('MIXED'), 'Mixed World Record');
  assert.equal(firstTitle('WOMEN_ONLY'), "Women's World First");
});

test('parseRecordValue reads sheet and form values', () => {
  assert.equal(parseRecordValue(length, '1,038.5 m').amount, 1038.5);
  assert.equal(parseRecordValue(length, '2 km').amount, 2000);
  assert.equal(parseRecordValue(speed, '1:59 min').amount, 119);
  assert.equal(parseRecordValue(speed, '12 min 18 sec').amount, 738);
  assert.equal(parseRecordValue(speed, '48,67 seconds').amount, 48.67);
  assert.equal(parseRecordValue({ unit: 'count' }, '25').amount, 25);
  assert.equal(parseRecordValue(length, 'about a lot').amount, undefined);
  // Altitude categories prefer the height in mixed specs
  assert.equal(parseRecordValue({ unit: 'm', group: 'Altitude' }, '100m long, 1000 m high').amount, 1000);
});

test('parseCoordinates reads DMS and decimal coordinates', () => {
  const dms = parseCoordinates(`70°57'39.0"N 28°18'07.5"W`);
  assert.ok(dms && Math.abs(dms.latitude - 70.9608) < 0.001 && dms.longitude! < 0);
  assert.deepEqual(parseCoordinates('-77.85, 166.67'), { latitude: -77.85, longitude: 166.67 });
});

test('formatRecordValue shows the unit', () => {
  assert.equal(formatRecordValue({ unit: 'm' }, { amount: 1900 }), '1,900 m');
  assert.equal(formatRecordValue({ unit: 's' }, { amount: 119 }), '1 min 59 s');
  assert.equal(formatRecordValue({ unit: '°' }, { latitude: -77.85 }), '77.8500° S');
});

test('parseSheetDate and slugify', () => {
  assert.equal(parseSheetDate('3.7.2021'), '2021-07-03');
  assert.equal(parseSheetDate('nonsense'), '');
  assert.equal(slugify('Highline length – Urban'), 'highline-length-urban');
});

test('record titles follow the category status (§4)', () => {
  assert.equal(standingTitle(recordStanding('published', 'active'), 'MEN_ONLY'), "Men's World Record");
  assert.equal(standingTitle(recordStanding('published', 'archived'), 'WOMEN_ONLY'), "Women's Historical World Record");
  assert.equal(standingTitle(recordStanding('historical', 'active'), 'MIXED'), 'Mixed Former World Record');
  assert.equal(standingTitle(recordStanding('historical', 'archived'), 'MEN_ONLY'), "Men's Former World Record");
  assert.equal(recordStanding('published', 'unchallenged'), 'unchallenged');
  assert.equal(standingTitle('unchallenged', 'MEN_ONLY'), '');
  assert.equal(hasCertificate('unchallenged'), false);
  assert.equal(entryHasCertificate({ kind: 'record', status: 'published' }, 'unchallenged'), false);
  assert.equal(entryHasCertificate({ kind: 'record', status: 'historical' }, 'unchallenged'), true);
  assert.equal(entryHasCertificate({ kind: 'first', status: 'published' }), true);
});

test('equalling or beating on any list challenges an Unchallenged category', () => {
  const category = { unit: 'm', direction: 'higher' as const, status: 'unchallenged' as const };
  const v = (n: number) => ({ amount: n, original: `${n} m` });
  const first: { entryId: string; gender: 'MEN_ONLY' | 'WOMEN_ONLY' | 'MIXED'; value: { amount: number; original: string } } = { entryId: 'a', gender: 'MEN_ONLY', value: v(100) };
  assert.equal(challengesCategory(category, { entryId: 'b', gender: 'MEN_ONLY', value: v(100) }, [first]), true);
  assert.equal(challengesCategory(category, { entryId: 'b', gender: 'MEN_ONLY', value: v(120) }, [first]), true);
  assert.equal(challengesCategory(category, { entryId: 'b', gender: 'MEN_ONLY', value: v(90) }, [first]), false);
  // A first entry on another list is not a challenge
  assert.equal(challengesCategory(category, { entryId: 'b', gender: 'WOMEN_ONLY', value: v(50) }, [first]), false);
  assert.equal(challengesCategory({ ...category, status: 'active' }, { entryId: 'b', gender: 'MEN_ONLY', value: v(120) }, [first]), false);
});
