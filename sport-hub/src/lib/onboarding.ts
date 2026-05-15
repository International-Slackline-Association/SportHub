/**
 * User Onboarding
 *
 * Creates a sporthub-users entry for Cognito users who don't have one yet.
 * isa-users is read-only — all Cognito users are guaranteed to exist there already.
 */

import { createUser, generateSportHubId, updateUserData } from './user-service';
import { getReferenceUserByEmail } from './reference-db-service';
import type { UserProfileRecord } from './relational-types';

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

/**
 * Back-fill missing reference DB fields on an existing sporthub-users Profile.
 *
 * Called non-blocking during login when a user's Profile is missing isaUsersId —
 * i.e. they were migrated from ISA-Rankings before the isa-users link was established,
 * or their record pre-dates the current onboarding flow.
 *
 * Only writes fields that are absent in the existing record (never overwrites).
 *
 * @param existingUser - Current sporthub-users Profile record
 * @param email - User email from Cognito token (used to look up isa-users)
 */
export async function enrichUserFromReferenceDb(
  existingUser: UserProfileRecord,
  email: string
): Promise<void> {
  const referenceUser = await getReferenceUserByEmail(email);
  if (!referenceUser) {
    console.warn(`[Onboarding] enrichUserFromReferenceDb: no isa-users entry for ${email}`);
    return;
  }

  // Build update — only include fields not already set on the existing record
  const updates: Partial<UserProfileRecord> = {};

  if (!existingUser.isaUsersId)  updates.isaUsersId  = referenceUser.userId;
  if (!existingUser.name)        updates.name        = referenceUser.name;
  if (!existingUser.surname)     updates.surname     = referenceUser.surname ?? undefined;
  if (!existingUser.country)     updates.country     = referenceUser.country ?? undefined;
  if (!existingUser.city)        updates.city        = referenceUser.city    ?? undefined;
  if (!existingUser.gender)      updates.gender      = referenceUser.gender  ?? undefined;
  if (!existingUser.birthdate)   updates.birthdate   = referenceUser.birthDate ?? undefined;

  if (Object.keys(updates).length === 0) return;

  await updateUserData(existingUser.userId, updates);
  console.log(`[Onboarding] Enriched ${existingUser.userId} from isa-users:`, Object.keys(updates));
}
