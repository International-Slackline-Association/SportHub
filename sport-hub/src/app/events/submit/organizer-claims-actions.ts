'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import {
  getAssembledEvent,
  getOrganizerClaim,
  putOrganizerClaim,
  deleteOrganizerClaim,
  listPendingOrganizerClaims,
} from '@lib/event-contest-service';
import { addOrganizerToEvent } from '@lib/contest-participation-service';
import { OrganizerClaimRecord } from '@lib/relational-types';

/**
 * Request to be credited as organizer on an event that currently has none.
 * Admin-reviewed — grants organizer *credit* only (adds to
 * EventMetadataRecord.organizers), never sets createdBy, so it grants no
 * edit rights over the event.
 *
 * PROTECTED: Requires admin role or organizer sub-type
 */
export async function requestOrganizerClaim(
  eventId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  await requireEventSubmitter();

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userName = session?.user?.name;
    if (!userId) {
      return { success: false, error: 'You must be signed in to claim an event' };
    }

    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      return { success: false, error: 'Event not found' };
    }

    if (event.createdBy || event.organizers?.length) {
      return { success: false, error: 'This event already has an organizer' };
    }

    // Admins bypass review entirely — same trust tier as everywhere else in this app
    if (session?.user?.role === 'admin') {
      await addOrganizerToEvent({ userId, eventId });
      revalidatePath(`/events/${eventId}`);
      return { success: true, message: 'You have been added as organizer' };
    }

    const existingClaim = await getOrganizerClaim(eventId, userId);
    if (existingClaim?.status === 'pending') {
      return { success: false, error: 'You already have a pending claim for this event' };
    }

    const claim: OrganizerClaimRecord = {
      eventId,
      sortKey: `OrganizerClaim:${userId}`,
      userId,
      userName: userName || userId,
      status: 'pending',
      requestedAt: Date.now(),
      eventName: event.eventName,
      startDate: event.startDate,
      city: event.city,
      country: event.country,
    };
    await putOrganizerClaim(claim);

    revalidatePath(`/events/${eventId}`);
    return { success: true, message: 'Claim submitted for admin review' };
  } catch (error) {
    console.error('Error requesting organizer claim:', error);
    return { success: false, error: 'Failed to submit claim. Please try again.' };
  }
}

/**
 * Get the current user's claim status for an event (used to render the
 * claim CTA vs. "pending review" state).
 */
export async function getMyOrganizerClaim(eventId: string): Promise<OrganizerClaimRecord | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return getOrganizerClaim(eventId, userId);
}

/**
 * Get all pending organizer claims across all events (admin review queue)
 * PROTECTED: Requires admin role
 */
export async function getPendingOrganizerClaims(): Promise<{
  success: boolean;
  claims: OrganizerClaimRecord[];
}> {
  await requireAdmin();

  try {
    const claims = await listPendingOrganizerClaims();
    return { success: true, claims };
  } catch (error) {
    console.error('Error fetching pending organizer claims:', error);
    return { success: false, claims: [] };
  }
}

/**
 * Approve an organizer claim — grants organizer credit and removes the claim.
 * PROTECTED: Requires admin role
 */
export async function approveOrganizerClaim(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    const claim = await getOrganizerClaim(eventId, userId);
    if (!claim) {
      return { success: false, error: 'Claim not found' };
    }

    // Only delete the claim once the grant succeeds, so a failure (e.g. the
    // user was deleted in the meantime) doesn't silently lose the request.
    await addOrganizerToEvent({ userId, eventId, role: claim.role });
    await deleteOrganizerClaim(eventId, userId);

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/admin/organizer-claims');
    return { success: true };
  } catch (error) {
    console.error('Error approving organizer claim:', error);
    return { success: false, error: 'Failed to approve claim. Please try again.' };
  }
}

/**
 * Reject an organizer claim — deletes the request, no grant.
 * PROTECTED: Requires admin role
 */
export async function rejectOrganizerClaim(
  eventId: string,
  userId: string
): Promise<{ success: boolean }> {
  await requireAdmin();

  try {
    await deleteOrganizerClaim(eventId, userId);
    revalidatePath('/admin/organizer-claims');
    return { success: true };
  } catch (error) {
    console.error('Error rejecting organizer claim:', error);
    return { success: false };
  }
}
