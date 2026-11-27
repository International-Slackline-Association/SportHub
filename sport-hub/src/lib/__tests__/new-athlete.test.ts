/**
 * Unit tests for the shared new-athlete details (events and records & firsts).
 * Run with: pnpm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyPendingUser, pendingUserSchema } from '../../ui/NewAthlete/schema';

test('the typed name prefills first and last name', () => {
  const p = emptyPendingUser('  Ana  María Lopez ');
  assert.equal(p.name, 'Ana');
  assert.equal(p.surname, 'María Lopez');
  assert.equal(p.email, '');
});

test('first name, last name, a valid email and gender are required', () => {
  const complete = { ...emptyPendingUser('Ana Lopez'), email: 'ana@example.org', gender: 'female' };
  assert.equal(pendingUserSchema.isValidSync(complete), true);
  assert.equal(pendingUserSchema.isValidSync({ ...complete, email: 'not-an-email' }), false);
  assert.equal(pendingUserSchema.isValidSync({ ...complete, gender: '' }), false);
  assert.equal(pendingUserSchema.isValidSync({ ...complete, surname: ' ' }), false);
});
