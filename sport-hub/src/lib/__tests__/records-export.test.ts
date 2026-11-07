/**
 * Unit tests for the CSV helpers of the records export.
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../records-export';

test('csvCell quotes commas, quotes and line breaks', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a, b'), '"a, b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('two\nlines'), '"two\nlines"');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(1900.5), '1900.5');
});

test('csvCell neutralises spreadsheet formulas (CSV injection)', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+41 79 000'), "'+41 79 000");
  assert.equal(csvCell(-5), '-5');
});

test('toCsv writes a header and one line per row', () => {
  assert.equal(toCsv([{ a: 1, b: 'x' }, { a: 2, b: undefined }]), 'a,b\r\n1,x\r\n2,\r\n');
});
