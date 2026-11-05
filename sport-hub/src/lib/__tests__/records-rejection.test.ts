/**
 * Unit tests for the rejection reasons reviewers pick.
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REJECTION_REASONS, rejectionCaseOf, rejectionText } from '../records-rules';

test('every case has 3 to 5 reasons with unique codes, none called "other"', () => {
  for (const reasons of Object.values(REJECTION_REASONS)) {
    assert.ok(reasons.length >= 3 && reasons.length <= 5);
    assert.equal(new Set(reasons.map(r => r.code)).size, reasons.length);
    assert.ok(!reasons.some(r => r.code === 'other'));
  }
});

test('the reason list follows the claim', () => {
  assert.equal(rejectionCaseOf({ kind: 'first', categoryId: 'trickline' }), 'first');
  assert.equal(rejectionCaseOf({ kind: 'record', categoryId: 'highline-length' }), 'record');
  assert.equal(rejectionCaseOf({ kind: 'record', categoryId: 'proposed-abc', newCategoryProposal: {} }), 'category');
  // Once the proposal was mapped to a real category it is an ordinary record
  assert.equal(rejectionCaseOf({ kind: 'record', categoryId: 'highline-length', newCategoryProposal: {} }), 'record');
});

test('a predefined reason gives its label, with the optional comment after it', () => {
  const label = REJECTION_REASONS.record[0].label;
  assert.deepEqual(rejectionText('record', { reason: 'insufficient_evidence' }), { text: label });
  assert.deepEqual(rejectionText('record', { reason: 'insufficient_evidence', comment: ' The video cuts before the anchor. ' }), { text: `${label}. The video cuts before the anchor.` });
});

test('"other" needs a description and uses it as the reason', () => {
  assert.ok('error' in rejectionText('first', { reason: 'other', otherReason: '  ' }));
  assert.deepEqual(rejectionText('first', { reason: 'other', otherReason: 'Landed in a competition run only.' }), { text: 'Landed in a competition run only' });
  assert.deepEqual(rejectionText('first', { reason: 'other', otherReason: 'Wrong discipline', comment: 'Please claim it as Rodeoline.' }), { text: 'Wrong discipline. Please claim it as Rodeoline.' });
});

test('an unknown or missing reason is refused', () => {
  assert.ok('error' in rejectionText('category', { reason: '' }));
  assert.ok('error' in rejectionText('category', { reason: 'below_record' }));
});
