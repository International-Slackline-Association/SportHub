'use server';

import { dynamodb, EVENTS_TABLE, USERS_TABLE } from '@lib/dynamodb';
import { getAthleteParticipations, getAthleteProfile } from '@lib/user-query-service';
import { deleteUser, saveUserProfile } from '@lib/user-service';
import type {
  AthleteParticipationRecord,
  ContestRecord,
  EventMetadataRecord,
  UserProfileRecord,
} from '@lib/relational-types';
import { getCountryByCode } from '@utils/countries';
import { getAllEventDataRaw } from '@lib/data-services';

export type UserProfileAndRecords = {
  profile: UserProfileRecord | null;
  eventRecords: EventMetadataRecord[];
  contestRecords: ContestRecord[];
  participationRecords: AthleteParticipationRecord[];
};

export async function fetchUserProfileAndRecords(userId: string): Promise<UserProfileAndRecords> {
  const [profile, participationRecords, eventItemsRaw] = await Promise.all([
    getAthleteProfile(userId),
    getAthleteParticipations(userId, 1000),
    getAllEventDataRaw(),
  ]);

  const contestRecordsWithUserResults = eventItemsRaw
    .filter((item) => item.sortKey.startsWith('Contest:'))
    .map((item) => item as unknown as ContestRecord)
    .filter((contest) => contest.results.some((result) => result.id === userId));

  const eventIdsFromParticipationRecords = new Set(participationRecords.participations.map((p) => p.eventId));
  const eventIdsFromContestRecords = new Set(contestRecordsWithUserResults.map((c) => c.eventId));

  const eventHasUserInEmbeddedContestResults = (event: EventMetadataRecord) =>
    event.contests?.some((contest) =>
      contest.results.some((result) => result.id === userId)
    );

  // Event metadata usually doesn't have embedded contests. We still want them to dervice the event
  // name and date for the results list
  const eventRecords = eventItemsRaw
    .filter((item) => item.sortKey === 'Metadata')
    .map((item) => item as unknown as EventMetadataRecord)
    .filter((event) =>
      eventHasUserInEmbeddedContestResults(event)
      || eventIdsFromParticipationRecords.has(event.eventId)
      || eventIdsFromContestRecords.has(event.eventId)
    );

  return {
    profile,
    participationRecords: participationRecords.participations,
    contestRecords: contestRecordsWithUserResults,
    eventRecords,
  }
}

function getUpdatedProfile(primaryProfile: UserProfileRecord | null, secondaryProfile: UserProfileRecord | null): UserProfileRecord | null {
  if (!primaryProfile || !secondaryProfile) {
    return null;
  }

  const updatedUserProfile = { ...primaryProfile } as UserProfileRecord;

  if (secondaryProfile?.email && !primaryProfile?.email) {
    updatedUserProfile.email = secondaryProfile.email;
  }
  if (secondaryProfile?.isaUsersId && !primaryProfile?.isaUsersId) {
    updatedUserProfile.isaUsersId = secondaryProfile.isaUsersId;
  }
  if (secondaryProfile?.profileUrl && !primaryProfile?.profileUrl) {
    updatedUserProfile.profileUrl = secondaryProfile.profileUrl;
  }
  if (secondaryProfile?.thumbnailUrl && !primaryProfile?.thumbnailUrl) {
    updatedUserProfile.thumbnailUrl = secondaryProfile.thumbnailUrl;
  }
  if (secondaryProfile?.birthdate && !primaryProfile?.birthdate) {
    updatedUserProfile.birthdate = secondaryProfile.birthdate;
  }

  const primaryCountryCode = getCountryByCode(primaryProfile?.country || '')?.code;
  const secondaryCountryCode = getCountryByCode(secondaryProfile?.country || '')?.code;
  if (secondaryCountryCode && !primaryCountryCode) {
    updatedUserProfile.country = secondaryCountryCode;
  }
  
  return updatedUserProfile;
};

function updateContestResults(
  contest: ContestRecord, 
  previousUser: UserProfileRecord | null, 
  updatedUser: UserProfileRecord | null
): { updatedResults: ContestRecord['results'], didUpdate: boolean } {
  const updatedResults = [...contest.results];

  if (!previousUser || !updatedUser) {
    return { updatedResults, didUpdate: false };
  }
  
  let didUpdate = false;
  const idxOfPreviousUser = contest.results.findIndex((r) => r .id === previousUser.userId);
  const idxOfUpdatedUser = contest.results.findIndex((r) => r .id === updatedUser.userId);
  const isPreviousUserInResults = idxOfPreviousUser !== -1;
  const isUpdatedUserInResults = idxOfUpdatedUser !== -1;

  if (isPreviousUserInResults && !isUpdatedUserInResults) {
    updatedResults[idxOfPreviousUser].id = updatedUser.userId;
    updatedResults[idxOfPreviousUser].name = updatedUser.name + '-' + updatedUser.surname;
    didUpdate = true;
  } else if (isPreviousUserInResults && isUpdatedUserInResults) {
    // If both the previous and updated user are in the results, we need to remove the previous user from the results
    updatedResults.splice(idxOfPreviousUser, 1);
    didUpdate = true;
  }

  return { updatedResults, didUpdate };
}

export async function mergeDuplicateAccounts(options: { 
  primaryUserProfileAndRecords: UserProfileAndRecords; 
  secondaryUserProfileAndRecords: UserProfileAndRecords; 
  deleteSecondaryAccount?: boolean; 
  mergeUserProfile?: boolean; 
  dryRun?: boolean 
  verbose?: boolean 
}): Promise<{ participationRecordsMoved: number; contestRecordsUpdated: number; metadataRecordsUpdated: number; profileUpdated: boolean }> {
  const { dryRun = true, verbose = true } = options;
  const {
    profile: primaryProfile,
    participationRecords: primaryParticipations,
  } = options.primaryUserProfileAndRecords;
  const {
    profile: secondaryProfile,
    participationRecords: secondaryParticipations,
    contestRecords: secondaryContests,
    eventRecords: secondaryEvents,
  } = options.secondaryUserProfileAndRecords;

  const primaryUserId = primaryProfile?.userId;
  const secondaryUserId = secondaryProfile?.userId;

  const primaryContestIds = new Set(
    primaryParticipations.map(({ contestId }) => contestId)
  );

  if (dryRun) {
    console.log("##########################################################");
    console.log("#     Dry run mode enabled. No changes will be made.     #");
    console.log("##########################################################");
  }

  console.log( {primaryContestIds, secondaryContestIds: secondaryParticipations.map(({ contestId }) => contestId)});

  // Move all secondary participations to the primary account, if the primary account doesn't already have a participation for that contest
  let participationRecordsMoved = 0;
  for (const secondaryParticipation of secondaryParticipations) {
    const isPrimaryAccountMissingParticipation = !primaryContestIds.has(secondaryParticipation.contestId);

    if (isPrimaryAccountMissingParticipation) {
      console.log("Updating participation record for contest", secondaryParticipation.contestId, "to primary account", primaryUserId);
      if (!dryRun) {
        await dynamodb.putItem(USERS_TABLE, {
          ...secondaryParticipation,
          userId: primaryUserId,
        });
      }
    }

    console.log("Deleting participation record for contest", secondaryParticipation.contestId, "for secondary account", secondaryUserId);
    if (!dryRun) {
      await dynamodb.deleteItem(USERS_TABLE, { userId: secondaryUserId, sortKey: secondaryParticipation.sortKey });
    }
    participationRecordsMoved += 1;
  }

  // Update contest records to replace secondaryUserId with primaryUserId in results
  let contestRecordsUpdated = 0;
  for (const contest of secondaryContests) {
    const { updatedResults, didUpdate } = updateContestResults(contest, secondaryProfile, primaryProfile);
    if (didUpdate) {
      console.log("Updating contest record for contest", contest.contestId, "for event", contest.eventId, "with new results", verbose ? updatedResults : '');
      if (!dryRun) {
        await dynamodb.putItem(EVENTS_TABLE, {
          ...contest,
          results: updatedResults,
        });
      }
      contestRecordsUpdated += 1;
    }
  }

  // Update embedded contest results in event metadata records to replace secondaryUserId with primaryUserId
  let metadataRecordsUpdated = 0;
  for (const eventMetadata of secondaryEvents) {
      let contestRowsChanged = false;
      const updatedMetadataContests = (eventMetadata?.contests || []).map((contest) => { 
        const { updatedResults, didUpdate } = updateContestResults(contest, secondaryProfile, primaryProfile);        
        if (didUpdate) {
          contestRowsChanged = true;
        }
        return {
          ...contest,
          results: updatedResults,
        };
      });

      if (contestRowsChanged) {
        console.log("Updating metadata record for event", eventMetadata.eventId, "with new contest results", verbose ? updatedMetadataContests : '');
        if (!dryRun) {
          await dynamodb.putItem(EVENTS_TABLE, {
            ...eventMetadata,
            contests: updatedMetadataContests,
          });
        }
        metadataRecordsUpdated += 1;
      }
  }

  // Update primary user profile with missing details from secondary profile, if mergeUserProfile option is true
  const updatedProfile = getUpdatedProfile(primaryProfile, secondaryProfile);
  if (primaryProfile?.userId && updatedProfile) {
    console.log("Updating user profile with updates", updatedProfile);
    if (!dryRun) {
      await saveUserProfile(updatedProfile);
    }
  }

  // Delete secondary user account if deleteSecondaryAccount option is true
  if (options.deleteSecondaryAccount && secondaryProfile?.userId) {
    console.log("Deleting secondary user account", secondaryUserId);
    if (!dryRun) {
      await deleteUser(secondaryProfile?.userId);
    }
  }


  if (dryRun) {
    console.log("##########################################################");
    console.log("#     Dry run mode enabled. No changes were made.        #");
    console.log("##########################################################");
  }

  return {
    participationRecordsMoved,
    contestRecordsUpdated,
    metadataRecordsUpdated,
    profileUpdated: !!updatedProfile,
  };
}
