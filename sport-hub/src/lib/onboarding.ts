/**
 * User Onboarding
 *
 * Creates a sporthub-users entry for Cognito users who don't have one yet, and back-fills
 * identity fields from isa-users. isa-users is read through its API (isa-users-api.ts), never
 * its table; the ISA id comes from the Cognito username, so no lookup by email is needed.
 */

import { createUser, generateSportHubId, generateUniqueAthleteSlug, updateUserData } from './user-service';
import { getIsaUser, isaIdFromCognitoUsername, type IsaUser } from './isa-users-api';
import type { UserProfileRecord } from './relational-types';

/** isa-users' profile, or undefined when the API is not set up or fails (sign-in goes on without it). */
async function fetchIsaUser(isaUsersId: string): Promise<IsaUser | null | undefined> {
  try {
    return await getIsaUser(isaUsersId);
  } catch (error) {
    console.warn(`[Onboarding] Could not read ${isaUsersId} from the isa-users API:`, error);
    return undefined;
  }
}

/**
 * Ensure a Cognito user has a sporthub-users record.
 *
 * Called during JWT callback when getUserByEmail returns null (no existing record).
 * Derives the user's ISA_xxx id from their Cognito username, reads their name from the
 * isa-users API, then creates a sporthub-users Profile.
 *
 * @param cognitoUsername - Cognito username (`cognito:username` claim) the ISA id is derived from
 * @param email - User email from Cognito token
 * @returns SportHubID:xxx — the new sporthub-users PK
 */
export async function ensureUserExists(cognitoUsername: string, email: string): Promise<string> {
  const isaUsersId = isaIdFromCognitoUsername(cognitoUsername);  // ISA_XXXXXXXX — reference link to isa-users
  const isaUser = await fetchIsaUser(isaUsersId);

  if (isaUser === null) {
    throw new Error(`[Onboarding] isa-users has no user ${isaUsersId} for Cognito user ${cognitoUsername} (${email}). All Cognito users must exist in isa-users.`);
  }

  // Generate a fresh SportHub ID as the sporthub-users PK (distinct from isaUsersId)
  // getUserByEmail in auth.ts already confirmed this user has no sporthub record
  const sportHubId = generateSportHubId();

  // Generate the canonical athleteSlug now so every athlete is slug-accessible immediately.
  // Without the API (isaUser undefined) the next sign-in fills it in via enrichUserFromIsaUsers.
  const athleteSlug = isaUser?.name
    ? await generateUniqueAthleteSlug(isaUser.name, isaUser.surname)
    : undefined;

  await createUser(sportHubId, { email, isaUsersId, athleteSlug });
  console.log(`[Onboarding] Created ${sportHubId} (isaUsersId: ${isaUsersId}) for ${email}`);

  return sportHubId;
}

/**
 * Back-fill missing isa-users fields on an existing sporthub-users Profile.
 *
 * Called during login when a user's Profile is missing isaUsersId or identity fields —
 * i.e. they were migrated from ISA-Rankings before the isa-users link was established,
 * or their record pre-dates the current onboarding flow.
 *
 * Only writes fields that are absent in the existing record (never overwrites).
 *
 * @param existingUser - Current sporthub-users Profile record
 * @param cognitoUsername - Cognito username of the signed-in user (gives the ISA id when the Profile has none)
 */
export async function enrichUserFromIsaUsers(
  existingUser: UserProfileRecord,
  cognitoUsername: string
): Promise<void> {
  const isaUsersId = existingUser.isaUsersId || isaIdFromCognitoUsername(cognitoUsername);
  const isaUser = await fetchIsaUser(isaUsersId);
  if (!isaUser) {
    if (isaUser === null) console.warn(`[Onboarding] enrichUserFromIsaUsers: isa-users has no user ${isaUsersId}`);
    return;
  }

  // Build update — only include fields not already set on the existing record
  const updates: Partial<UserProfileRecord> = {};

  if (!existingUser.isaUsersId)  updates.isaUsersId  = isaUser.isaId;
  if (!existingUser.name)        updates.name        = isaUser.name ?? undefined;
  if (!existingUser.surname)     updates.surname     = isaUser.surname ?? undefined;
  if (!existingUser.country)     updates.country     = isaUser.country ?? undefined;
  if (!existingUser.city)        updates.city        = isaUser.city    ?? undefined;
  if (!existingUser.gender)      updates.gender      = isaUser.gender  ?? undefined;
  if (!existingUser.birthdate)   updates.birthdate   = isaUser.birthDate ?? undefined;

  // Self-heal missing athleteSlug for profiles that predate this feature or
  // were never touched by ensureUserExists's slug generation.
  if (!existingUser.athleteSlug) {
    const name = existingUser.name ?? updates.name;
    const surname = existingUser.surname ?? updates.surname;
    if (name) {
      updates.athleteSlug = await generateUniqueAthleteSlug(name, surname);
    }
  }

  // isa-users may not have every field either: drop the ones it left empty
  for (const key of Object.keys(updates) as (keyof UserProfileRecord)[]) {
    if (updates[key] === undefined || updates[key] === '') delete updates[key];
  }
  if (Object.keys(updates).length === 0) return;

  await updateUserData(existingUser.userId, updates);
  console.log(`[Onboarding] Enriched ${existingUser.userId} from isa-users:`, Object.keys(updates));
}
