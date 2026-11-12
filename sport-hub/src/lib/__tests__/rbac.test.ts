import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleHasPermission, isRole, permissionsOf, parseRoles, rolesLabel, rolesOf, ROLE_PERMISSIONS, type Role } from '../../types/rbac';

const can = (roles: Role[], permission: Parameters<typeof roleHasPermission>[1]) => roleHasPermission(roles, permission);

test('General Admin has every permission', () => {
  for (const p of ROLE_PERMISSIONS.admin) assert.equal(can(['admin'], p), true);
});

test('Event Manager gets events but not records or users', () => {
  assert.equal(can(['event_manager'], 'events:edit'), true);
  assert.equal(can(['event_manager'], 'admin:access'), true);
  assert.equal(can(['event_manager'], 'records:manage'), false);
  assert.equal(can(['event_manager'], 'users:manage'), false);
});

test('Record Manager gets records but not events or users', () => {
  assert.equal(can(['record_manager'], 'records:manage'), true);
  assert.equal(can(['record_manager'], 'records:review'), true);
  assert.equal(can(['record_manager'], 'events:edit'), false);
  assert.equal(can(['record_manager'], 'users:manage'), false);
});

test('User Manager gets users but not events or records', () => {
  assert.equal(can(['user_manager'], 'users:manage'), true);
  assert.equal(can(['user_manager'], 'events:edit'), false);
  assert.equal(can(['user_manager'], 'records:manage'), false);
});

test('no roles means no permissions', () => {
  assert.equal(can([], 'admin:access'), false);
  assert.equal(roleHasPermission(undefined, 'admin:access'), false);
  assert.equal(rolesLabel([]), 'User');
  assert.equal(isRole('user'), false);
  assert.equal(isRole('record_manager'), true);
});

test('multiple roles combine their permissions', () => {
  const roles: Role[] = ['event_manager', 'record_manager'];
  assert.equal(can(roles, 'events:edit'), true);
  assert.equal(can(roles, 'records:manage'), true);
  assert.equal(can(roles, 'users:manage'), false);
  assert.deepEqual(new Set(permissionsOf(roles)), new Set([...ROLE_PERMISSIONS.event_manager, ...ROLE_PERMISSIONS.record_manager]));
  assert.equal(rolesLabel(roles), 'Event Manager, Record Manager');
});

test('rolesOf and parseRoles clean up role lists', () => {
  assert.deepEqual(rolesOf({ roles: ['record_manager', 'event_manager'] }), ['event_manager', 'record_manager']);
  assert.deepEqual(rolesOf({ roles: ['bogus', 'user_manager'] }), ['user_manager']);
  assert.deepEqual(rolesOf(null), []);
  assert.equal(parseRoles(['user']), null);
  assert.equal(parseRoles('admin'), null);
  assert.deepEqual(parseRoles(['user_manager', 'event_manager']), ['event_manager', 'user_manager']);
});

test('TRANSITION: unconverted profiles with the old admin value still count as General Admin', () => {
  assert.deepEqual(rolesOf({ role: 'admin' } as { roles?: unknown }), ['admin']);
  assert.deepEqual(rolesOf({ role: 'user' } as { roles?: unknown }), []);
});
