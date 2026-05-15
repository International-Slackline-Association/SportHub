/**
 * User Onboarding
 *
 * Creates a sporthub-users entry for Cognito users who don't have one yet.
 * isa-users is read-only — all Cognito users are guaranteed to exist there already.
 */

import { createUser, generateSportHubId } from './user-service';
import { getReferenceUserByEmail } from './reference-db-service';

/**
 * Ensure a Cognito user has a sporthub-users record.
 *
 * Called during JWT callback when getUserByEmail returns null (no existing record).
 * Looks up the user's ISA_xxx ID from the read-only isa-users reference DB by email,
 * then creates a sporthub-users Profile if one doesn't exist.
 *
 * @param cognitoUserId - Cognito sub (used for error context only)
 * @param email - User email from Cognito token
 * @returns SportHubID:xxx — the new sporthub-users PK
 */
export async function ensureUserExists(
  cognitoUserId: string,
  email: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _name: string
): Promise<string> {
  // All Cognito users are guaranteed to exist in isa-users — look up their ISA ID by email
  const referenceUser = await getReferenceUserByEmail(email);

  if (!referenceUser) {
    throw new Error(`[Onboarding] No isa-users entry found for Cognito user ${cognitoUserId} (${email}). All Cognito users must exist in isa-users.`);
  }

  const isaUsersId = referenceUser.userId;  // ISA_XXXXXXXX — reference link to isa-users

  // Generate a fresh SportHub ID as the sporthub-users PK (distinct from isaUsersId)
  // getUserByEmail in auth.ts already confirmed this user has no sporthub record
  const sportHubId = generateSportHubId();

  await createUser(sportHubId, { email, isaUsersId });
  console.log(`[Onboarding] Created ${sportHubId} (isaUsersId: ${isaUsersId}) for ${email}`);

  return sportHubId;
}
