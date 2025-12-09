/**
 * User Onboarding
 *
 * Ensures users exist in database after Cognito authentication
 */

import { createUser, userExists } from './user-service';

/**
 * Ensure user exists in database after Cognito authentication
 *
 * Called during JWT callback to create user record if it doesn't exist
 *
 * @param cognitoUserId - Cognito user ID (sub claim)
 * @param email - User email from Cognito
 * @param name - User name from Cognito
 */
export async function ensureUserExists(
  cognitoUserId: string,
  email: string,
  name: string
): Promise<void> {
  try {
    // Check if user already exists
    const exists = await userExists(cognitoUserId);

    if (!exists) {
      console.log(`Creating new user record for ${cognitoUserId}`);
      await createUser(cognitoUserId, email, name);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // Don't throw - allow authentication to continue even if DB write fails
    // User will be created on next login attempt
  }
}
