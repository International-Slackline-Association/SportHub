/**
 * Rules of the event submission flow (submit, edit, edit scores), kept free
 * of database and auth access so they can be unit tested. The server actions
 * in app/events/submit/actions.ts apply them.
 */

import { calculatePointsForRank } from '@utils/points';
import type { ContestFormValues, EventSubmissionFormValues } from 'src/app/events/submit/types';

/** True if the given day (YYYY-MM-DD) is strictly before `today`. */
export function isDateInPast(dateStr: string | undefined, today: Date = new Date()): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(today.toDateString());
}

/** Past events need judges and results in every contest. Returns the error, or null. */
export function pastEventRequirementsError(values: EventSubmissionFormValues, today: Date = new Date()): string | null {
  const { event, contests = [] } = values;
  if (!isDateInPast(event.startDate, today)) return null;
  for (const contest of contests) {
    if (!contest.judges?.length) {
      return 'Judges are required for past events. Please add judges to all contests.';
    }
    if (!contest.results?.length) {
      return 'Results are required for past events. Please add results to all contests.';
    }
  }
  return null;
}

/**
 * Organizers can't set points themselves: recalculate every ranked result's
 * points from rank, contest size and field size (tied ranks get equal points).
 * Admins may override.
 */
export function withServerPoints(contests: ContestFormValues[], isAdmin: boolean): ContestFormValues[] {
  if (isAdmin) return contests;
  return contests.map((c) => {
    const { results, contestSize } = c;
    if (!results || !contestSize) return c;
    return {
      ...c,
      results: results.map((result) => {
        const rank = Number(result.rank);
        return rank > 0
          ? { ...result, isaPoints: calculatePointsForRank(rank, contestSize, results.length) }
          : result;
      }),
    };
  });
}

/** "Edit event": who may change an existing event. Returns the error, or null. */
export function editEventPermissionError(
  { isAdmin, isCreator, status }: { isAdmin: boolean; isCreator: boolean; status?: string },
): string | null {
  if (isAdmin) return null;
  if (!isCreator) return 'You do not have permission to edit this event';
  // Organizers edit only draft/pending events. Published results change
  // through "Edit scores", which stages them for review.
  if (status !== 'draft' && status !== 'pending') {
    return 'Approved events can no longer be edited. Use "Edit scores" to change judges and results.';
  }
  return null;
}

/**
 * "Edit scores": a contest's first judges/results, or any admin change, are
 * applied directly; an organizer's change to existing data is staged for review.
 */
export function scoreEditMode(
  existing: { judges?: unknown[]; results?: unknown[] },
  isAdmin: boolean,
): 'apply' | 'stage' {
  const hasExistingData = (existing.results?.length ?? 0) > 0 || (existing.judges?.length ?? 0) > 0;
  return !hasExistingData || isAdmin ? 'apply' : 'stage';
}

/** Message shown after "Edit scores" is saved. */
export function scoreEditMessage(appliedCount: number, stagedCount: number): string {
  if (stagedCount === 0) return 'Judges and scores saved.';
  if (appliedCount === 0) return 'Your changes were submitted for admin review and will go live once approved.';
  return `Judges and scores saved for ${appliedCount} contest${appliedCount === 1 ? '' : 's'}; `
    + `${stagedCount} contest${stagedCount === 1 ? '' : 's'} submitted for admin review.`;
}
