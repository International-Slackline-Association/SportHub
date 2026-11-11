#!/usr/bin/env node
/**
 * Moves user profiles from the old single `role` attribute ('user' | 'admin')
 * to the `roles` list: role 'admin' becomes roles ['admin'], anything else
 * becomes roles []. The `role` attribute is removed. Profiles that already
 * have `roles` only lose a leftover `role`.
 *
 * After this has run on every environment, delete the MIGRATION fallback in
 * rolesOf() (src/types/rbac.ts) and this script.
 *
 * Usage (local DynamoDB):
 *   pnpm roles:migrate:dry-run
 *   pnpm roles:migrate:execute
 * Against AWS, run the same file without DYNAMODB_LOCAL and with the
 * environment's AWS credentials, dry run first.
 */

const execute = process.argv.includes('--execute');

async function main() {
  console.log(execute ? 'Executing role → roles migration' : 'Dry run (pass --execute to write)');
  const { dynamodb, USERS_TABLE } = await import('../dynamodb');

  const profiles = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'sortKey = :sk AND attribute_exists(#role)',
    expressionAttributeNames: { '#role': 'role' },
    expressionAttributeValues: { ':sk': 'Profile' },
  });

  let admins = 0;
  for (const profile of profiles ?? []) {
    const { role, ...rest } = profile as Record<string, unknown>;
    const roles = Array.isArray(rest.roles) ? rest.roles : role === 'admin' ? ['admin'] : [];
    if (role === 'admin') {
      admins++;
      console.log(`  ${rest.userId}: admin → roles ${JSON.stringify(roles)}`);
    }
    if (execute) await dynamodb.putItem(USERS_TABLE, { ...rest, roles });
  }

  console.log(`${profiles?.length ?? 0} profiles with a role attribute, ${admins} of them admins. ${execute ? 'Migrated.' : 'Nothing written.'}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
