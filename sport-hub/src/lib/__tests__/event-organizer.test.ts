/**
 * Unit tests for changing the organizer of an event (issue #104).
 * Run with: pnpm test:records
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOrganizerChange } from '../event-organizer';

const existing = { createdBy: 'user-1', createdByName: 'Alice Original', status: 'pending' };

test('an admin can change the organizer of an event waiting for approval', () => {
  const result = applyOrganizerChange(existing, { id: 'user-2', name: 'Bob New' }, true);
  assert.equal(result.createdBy, 'user-2');
  assert.equal(result.createdByName, 'Bob New');
  assert.equal(result.status, 'pending');
});

test('an admin can change the organizer of a published event', () => {
  const result = applyOrganizerChange({ ...existing, status: 'published' }, { id: 'user-2', name: 'Bob New' }, true);
  assert.equal(result.createdBy, 'user-2');
});

test('a non-admin cannot change the organizer', () => {
  const result = applyOrganizerChange(existing, { id: 'user-2', name: 'Bob New' }, false);
  assert.equal(result.createdBy, 'user-1');
  assert.equal(result.createdByName, 'Alice Original');
});

test('without a requested organizer nothing changes, even for an admin', () => {
  assert.equal(applyOrganizerChange(existing, undefined, true).createdBy, 'user-1');
  assert.equal(applyOrganizerChange(existing, { id: '', name: 'Typed but unselected' }, true).createdBy, 'user-1');
});
