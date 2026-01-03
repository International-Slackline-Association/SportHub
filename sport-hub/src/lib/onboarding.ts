/**
 * User Onboarding
 *
 * Ensures users exist in both reference DB and app DB after Cognito authentication
 */

import { createUser, userExists } from './user-service';
import { getReferenceUserByCognitoSub, createReferenceUser } from './reference-db-service';

/**
 * Ensure user exists in both reference DB and app DB after Cognito authentication
 *
 * Called during JWT callback to create user records if they don't exist
 *
 * @param cognitoUserId - Cognito user ID (sub claim)
 * @param email - User email from Cognito
 * @param name - User name from Cognito (may be email if name not available)
 * @returns Custom user ID from reference DB
 */
export async function ensureUserExists(
  cognitoUserId: string,
  email: string,
  name: string
): Promise<string> {
  try {
    // Step 1: Check if user exists in reference DB
    let referenceUser = await getReferenceUserByCognitoSub(cognitoUserId);

    if (!referenceUser) {
      // Create user in reference DB with generated custom ID
      console.log(`Creating new reference user for Cognito sub: ${cognitoUserId}`);
      referenceUser = await createReferenceUser(cognitoUserId, email, name);
    }

    // Step 2: Check if user exists in app DB using custom ID
    const customUserId = referenceUser.userId;
    const appUserExists = await userExists(customUserId);

    if (!appUserExists) {
      // Create user in app DB with custom ID from reference DB
      console.log(`Creating new app user record for ${customUserId}`);
      await createUser(customUserId);
    }

    return customUserId;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // Don't throw - allow authentication to continue even if DB write fails
    // User will be created on next login attempt
    throw error;
  }
}
