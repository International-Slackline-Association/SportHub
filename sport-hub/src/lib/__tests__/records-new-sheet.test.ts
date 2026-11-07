/**
 * Unit tests for reading the new World Records sheet.
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromSheetRow, parseSheetNumber, splitSheetList } from '../records-new-sheet';

const row = (over: Record<string, string> = {}) => ({
  'Record Name': 'Longest Polyamide highline sent',
  Unit: 'm',
  Improved: 'Increasing',
  Status: 'Archived',
  Group: 'Length',
  'If archieved, new category': 'Longest highline sent',
  ...over,
});

test('categoryFromSheetRow maps a Categories row', () => {
  assert.deepEqual(categoryFromSheetRow(row()), {
    categoryId: 'longest-polyamide-highline-sent',
    name: 'Longest Polyamide highline sent',
    group: 'Length',
    unit: 'm',
    direction: 'higher',
    status: 'archived',
    description: 'Replaced by "Longest highline sent".',
  });
});

test('categoryFromSheetRow converts units and direction', () => {
  const height = categoryFromSheetRow(row({ Unit: 'hm', Group: 'Altitude', Status: 'Active', 'If archieved, new category': '' }));
  assert.ok(!('error' in height));
  assert.equal(height.unit, 'm');
  assert.equal(height.description, undefined);
  const count = categoryFromSheetRow(row({ Unit: '#', Improved: 'Decreasing', Status: 'Unchallenged' }));
  assert.ok(!('error' in count));
  assert.equal(count.unit, 'count');
  assert.equal(count.direction, 'lower');
  assert.equal(count.status, 'unchallenged');
});

test('categoryFromSheetRow rejects unknown values', () => {
  assert.ok('error' in categoryFromSheetRow(row({ Group: 'Height' })));
  assert.ok('error' in categoryFromSheetRow(row({ Status: 'Retired' })));
  assert.ok('error' in categoryFromSheetRow(row({ Improved: '' })));
  assert.ok('error' in categoryFromSheetRow(row({ 'Record Name': ' ' })));
});

test('parseSheetNumber reads comma and dot decimals only', () => {
  assert.equal(parseSheetNumber('1318,54'), 1318.54);
  assert.equal(parseSheetNumber('23.05'), 23.05);
  assert.equal(parseSheetNumber('980'), 980);
  assert.equal(parseSheetNumber(''), undefined);
  assert.equal(parseSheetNumber('5 min'), undefined);
});

test('splitSheetList splits names and emails', () => {
  assert.deepEqual(splitSheetList('Sascha Grill, Mia Noblet'), ['Sascha Grill', 'Mia Noblet']);
  assert.deepEqual(splitSheetList('a@x.org; b@y.org'), ['a@x.org', 'b@y.org']);
  assert.deepEqual(splitSheetList(''), []);
});
