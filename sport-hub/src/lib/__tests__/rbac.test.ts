import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleHasPermission, isRole, permissionsOf, primaryRole, parseAdminRoles, rolesOf, ROLE_PERMISSIONS } from '../../types/rbac';

test('General admin has every permission', () => {
  for (const p of ROLE_PERMISSIONS.admin) assert.equal(roleHasPermission('admin', p), true);
});

test('Event Manager gets events but not records or users', () => {
  assert.equal(roleHasPermission('event_manager', 'events:edit'), true);
  assert.equal(roleHasPermission('event_manager', 'admin:access'), true);
  assert.equal(roleHasPermission('event_manager', 'records:manage'), false);
  assert.equal(roleHasPermission('event_manager', 'records:review'), false);
  assert.equal(roleHasPermission('event_manager', 'users:manage'), false);
});

test('Record Manager gets records but not events or users', () => {
  assert.equal(roleHasPermission('record_manager', 'records:manage'), true);
  assert.equal(roleHasPermission('record_manager', 'records:review'), true);
  assert.equal(roleHasPermission('record_manager', 'admin:access'), true);
  assert.equal(roleHasPermission('record_manager', 'events:edit'), false);
  assert.equal(roleHasPermission('record_manager', 'users:manage'), false);
});

test('User Manager gets users but not events or records', () => {
  assert.equal(roleHasPermission('user_manager', 'users:manage'), true);
  assert.equal(roleHasPermission('user_manager', 'admin:access'), true);
  assert.equal(roleHasPermission('user_manager', 'events:edit'), false);
  assert.equal(roleHasPermission('user_manager', 'records:manage'), false);
});

test('users and unknown roles get nothing', () => {
  assert.equal(roleHasPermission('user', 'admin:access'), false);
  assert.equal(roleHasPermission(undefined, 'admin:access'), false);
  assert.equal(roleHasPermission('superuser', 'admin:access'), false);
  assert.equal(isRole('superuser'), false);
  assert.equal(isRole('record_manager'), true);
});

test('multiple roles combine their permissions', () => {
  const roles = ['event_manager', 'record_manager'] as const;
  assert.equal(roleHasPermission(roles, 'events:edit'), true);
  assert.equal(roleHasPermission(roles, 'records:manage'), true);
  assert.equal(roleHasPermission(roles, 'users:manage'), false);
  assert.deepEqual(new Set(permissionsOf(roles)), new Set([...ROLE_PERMISSIONS.event_manager, ...ROLE_PERMISSIONS.record_manager]));
  assert.equal(roleHasPermission([], 'admin:access'), false);
});

test('rolesOf reads the roles list and falls back to the old single role', () => {
  assert.deepEqual(rolesOf({ role: 'admin' }), ['admin']);
  assert.deepEqual(rolesOf({ role: 'user' }), []);
  assert.deepEqual(rolesOf({ role: 'admin', roles: ['record_manager', 'event_manager'] }), ['event_manager', 'record_manager']);
  assert.deepEqual(rolesOf({ roles: ['bogus', 'user_manager'] }), ['user_manager']);
  assert.equal(primaryRole(['record_manager', 'admin']), 'admin');
  assert.equal(primaryRole([]), 'user');
  assert.equal(parseAdminRoles(['user']), null);
  assert.deepEqual(parseAdminRoles(['user_manager', 'event_manager']), ['event_manager', 'user_manager']);
});
