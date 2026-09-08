'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@lib/authorization';
import { invalidateContestsCache } from '@lib/data-services';
import {
  getContest,
  putEventItem,
  getPendingScoreEdit,
  deletePendingScoreEdit,
  listPendingScoreEdits,
} from '@lib/event-contest-service';
import { PendingScoreEditRecord } from '@lib/relational-types';

/**
 * Get all pending score edits across all events (admin review queue)
 * PROTECTED: Requires admin role
 */
export async function getPendingScoreEdits(): Promise<{
  success: boolean;
  edits: PendingScoreEditRecord[];
}> {
  await requireAdmin();

  try {
    const edits = await listPendingScoreEdits();
    return { success: true, edits };
  } catch (error) {
    console.error('Error fetching pending score edits:', error);
    return { success: false, edits: [] };
  }
}

/**
 * Approve a staged score edit — writes the proposed judges/results onto the
 * live Contest record and discards the pending edit.
 * PROTECTED: Requires admin role
 */
export async function approveScoreEdit(
  eventId: string,
  contestSortKey: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    const [edit, contest] = await Promise.all([
      getPendingScoreEdit(eventId, contestSortKey),
      getContest(eventId, contestSortKey),
    ]);
    if (!edit) {
      return { success: false, error: 'Pending edit not found' };
    }
    if (!contest) {
      return { success: false, error: 'Contest not found' };
    }

    await putEventItem({
      ...contest,
      judges: edit.proposedJudges,
      results: edit.proposedResults,
    });
    await deletePendingScoreEdit(eventId, contestSortKey);

    invalidateContestsCache();
    revalidatePath(`/events/${eventId}`);
    revalidatePath('/admin/score-review');
    revalidatePath('/rankings');

    return { success: true };
  } catch (error) {
    console.error('Error approving score edit:', error);
    return { success: false, error: 'Failed to approve edit. Please try again.' };
  }
}

/**
 * Reject a staged score edit — discards it, live contest untouched.
 * PROTECTED: Requires admin role
 */
export async function rejectScoreEdit(
  eventId: string,
  contestSortKey: string
): Promise<{ success: boolean }> {
  await requireAdmin();

  try {
    await deletePendingScoreEdit(eventId, contestSortKey);
    revalidatePath('/admin/score-review');
    return { success: true };
  } catch (error) {
    console.error('Error rejecting score edit:', error);
    return { success: false };
  }
}
