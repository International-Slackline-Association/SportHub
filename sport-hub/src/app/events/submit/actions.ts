'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireEventSubmitter } from '@lib/authorization';
import { auth } from '@lib/auth';
import { EventSubmissionFormValues, ContestFormValues, PendingUserData } from './types';
import { createUser } from '@ui/UserForm/actions';
import { invalidateContestsCache } from '@lib/data-services';
import {
  putEventItem,
  getAssembledEvent,
  deleteEventContestRecords,
  saveEventContestRecords,
  scanAllEventItems,
  deleteEvent as deleteEventFromService,
} from '@lib/event-contest-service';

// Generate unique event ID
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


/**
 * Save event to DynamoDB
 * PROTECTED: Requires admin role or organizer sub-type
 */
type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled';

// Returns true if the given date string (YYYY-MM-DD) is strictly in the past
function isDateInPast(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(new Date().toDateString());
}

// Validates judges+results are present when the event date is in the past
function validatePastEventRequirements(values: EventSubmissionFormValues): string | null {
  const { event, contests = [] } = values;
  if (!isDateInPast(event.startDate)) return null;
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

export async function saveEvent(values: EventSubmissionFormValues, status: EventStatus = 'draft') {
  await requireEventSubmitter();

  try {
    // Get current user for audit trail
    const session = await auth();

    const { event, contests } = values;

    // Past-event guard: judges and results required if event date is in the past
    const pastEventError = validatePastEventRequirements(values);
    if (pastEventError) {
      return { success: false, error: pastEventError };
    }

    // Transform form data to database format
    const eventId = generateEventId();
    const eventData = {
      ...event,
      eventId,
      sortKey: 'Metadata',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status,
      createdBy: session?.user?.id,
      createdByName: session?.user?.name,
      ...(status === 'pending' && { submittedForApprovalAt: new Date().toISOString() }),
    };

    // Save event metadata and contests as separate records
    console.log(`[saveEvent] saving event ${eventId} with status=${status} createdBy=${session?.user?.id}`);
    await putEventItem(eventData);
    await saveEventContestRecords(eventId, (contests || []) as unknown as Record<string, unknown>[]);
    console.log(`[saveEvent] saved successfully`);

    // Revalidate events pages
    revalidatePath('/events');
    revalidatePath('/events/my-events');

    return {
      eventId,
      success: true,
      message: 'Event saved successfully',
    };
  } catch (error) {
    console.error('Error saving event:', error);

    // Better error handling for auth failures
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'You do not have permission to create events',
      };
    }

    return {
      success: false,
      error: 'Failed to save event. Please try again.',
    };
  }
}

/**
 * Update only the judges and results for each contest of a published event.
 * PROTECTED: Requires admin role or organizer sub-type; must be event creator (unless admin)
 */
export async function updateEventScores(
  eventId: string,
  contests: ContestFormValues[],
): Promise<{ success: boolean; error?: string }> {
  await requireEventSubmitter();

  try {
    const session = await auth();

    const existing = await getAssembledEvent(eventId);
    if (!existing.success || !existing.event) {
      return { success: false, error: 'Event not found' };
    }

    const existingEvent = existing.event as Record<string, unknown>;

    if (session?.user?.role !== 'admin' && existingEvent.createdBy !== session?.user?.id) {
      return { success: false, error: 'You do not have permission to edit this event' };
    }

    // Merge updated judges/results into individual Contest records
    const existingContests = (existingEvent.contests as Record<string, unknown>[]) || [];
    await Promise.all(
      existingContests.map(async (ec, idx) => {
        const updated = {
          ...ec,
          judges: contests[idx]?.judges ?? ec.judges,
          results: contests[idx]?.results ?? ec.results,
        };
        await putEventItem(updated as Record<string, unknown>);
      })
    );

    revalidatePath('/events');
    revalidatePath('/events/my-events');

    return { success: true };
  } catch (error) {
    console.error('Error updating event scores:', error);
    return { success: false, error: 'Failed to save changes. Please try again.' };
  }
}

/**
 * Update an existing event (preserves eventId, sortKey, createdBy, createdAt, status)
 * PROTECTED: Requires admin role or organizer sub-type; must be event creator (unless admin)
 */
export async function updateEvent(eventId: string, values: EventSubmissionFormValues) {
  await requireEventSubmitter();

  try {
    const session = await auth();

    const existing = await getAssembledEvent(eventId);
    let existingEvent: Record<string, unknown>;
    let isMigration = false;

    if (!existing.success || !existing.event) {
      // No Metadata record (old-format event) — only admins may migrate it to new format
      if (session?.user?.role !== 'admin') {
        return { success: false, error: 'Event not found' };
      }
      existingEvent = {
        eventId,
        sortKey: 'Metadata',
        createdBy: session?.user?.id ?? 'admin',
        createdByName: session?.user?.name || '',
        createdAt: new Date().toISOString(),
        status: 'published',
      };
      isMigration = true;
    } else {
      existingEvent = existing.event as Record<string, unknown>;
      if (session?.user?.role !== 'admin' && existingEvent.createdBy !== session?.user?.id) {
        return { success: false, error: 'You do not have permission to edit this event' };
      }
    }

    const { event, contests } = values;

    // Strip assembled contests field before writing Metadata record
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contests: _assembled, ...existingMetadata } = existingEvent as Record<string, unknown>;
    const updatedEvent = {
      ...existingMetadata,
      ...event,
      updatedAt: new Date().toISOString(),
    };

    console.log(`[updateEvent] updating event ${eventId}${isMigration ? ' (migration)' : ''}`);
    await putEventItem(updatedEvent);

    // Delete existing Contest records (handles both old-format and previous new-format)
    await deleteEventContestRecords(eventId);
    if (isMigration) {
      console.log(`[updateEvent] migrated old-format event`);
    }

    // Save contests as separate records
    await saveEventContestRecords(eventId, (contests || []) as unknown as Record<string, unknown>[]);

    invalidateContestsCache();
    revalidatePath('/events');
    revalidatePath('/events/my-events');

    return { success: true, message: 'Event updated successfully' };
  } catch (error) {
    console.error('Error updating event:', error);
    return { success: false, error: 'Failed to update event. Please try again.' };
  }
}

/**
 * Get event by ID
 * PUBLIC: No authentication required (read-only)
 */
export async function getEvent(eventId: string) {
  return getAssembledEvent(eventId);
}

/**
 * Get all events
 * PUBLIC: No authentication required (read-only)
 *
 * NOTE: Uses table scan because we need ALL events. Future optimization: implement pagination.
 */
export async function getAllEvents() {
  try {
    const events = await scanAllEventItems();
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') {
      return { success: true, events: [] };
    }
    return { success: false, error: 'Failed to fetch events', events: [] };
  }
}

/**
 * Delete event by ID
 * PROTECTED: Requires admin role
 */
export async function deleteEvent(eventId: string) {
  try {
    // Require admin authentication
    await requireAdmin();

    await deleteEventFromService(eventId);

    // Revalidate events page
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'You do not have permission to delete events',
      };
    }

    return {
      success: false,
      error: 'Failed to delete event',
    };
  }
}

/**
 * Update event status (draft, published, cancelled)
 * PROTECTED: Requires admin role
 */
export async function updateEventStatus(eventId: string, status: 'draft' | 'published' | 'cancelled') {
  try {
    // Require admin authentication
    await requireAdmin();

    // Get current user for audit trail
    const session = await auth();

    // First get the existing event
    const result = await getAssembledEvent(eventId);

    if (!result.success || !result.event) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    // Update with new status
    const updatedEvent = {
      ...result.event,
      status,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: session?.user?.id,
      lastModifiedByName: session?.user?.name,
    };

    await putEventItem(updatedEvent);

    // Bust in-memory cache and revalidate events page

    revalidatePath('/events');

    return {
      success: true,
      message: `Event status updated to ${status}`,
    };
  } catch (error) {
    console.error('Error updating event status:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'You do not have permission to update events',
      };
    }

    return {
      success: false,
      error: 'Failed to update event status',
    };
  }
}

/**
 * Get events submitted by the current user
 * PROTECTED: Requires admin role or organizer sub-type
 */
export async function getMyEvents() {
  await requireEventSubmitter();

  try {
    const session = await auth();
    const userId = session?.user?.id;

    console.log('[getMyEvents] userId:', userId);

    const result = await getAllEvents();
    if (!result.success) return result;

    console.log('[getMyEvents] total events:', result.events?.length);

    const myEvents = (result.events as Record<string, unknown>[])
      .filter(e => e.createdBy === userId)
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    console.log('[getMyEvents] my events:', myEvents.length);

    return { success: true, events: myEvents };
  } catch (error) {
    console.error('Error fetching my events:', error);
    return { success: false, error: 'Failed to fetch your events', events: [] };
  }
}

/**
 * Get all published events (for the public events listing page)
 * PUBLIC: No authentication required
 */
export async function getPublishedEvents(): Promise<Record<string, unknown>[]> {
  try {
    const result = await getAllEvents();
    if (!result.success) return [];
    return (result.events as Record<string, unknown>[])
      .filter(e => e.status === 'published')
      .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')));
  } catch {
    return [];
  }
}

/**
 * Get published events created by a specific organizer
 * PUBLIC: No authentication required (read-only)
 */
export async function getPublishedEventsByOrganizer(organizerId: string): Promise<Record<string, unknown>[]> {
  try {
    const result = await getAllEvents();
    if (!result.success) return [];
    return (result.events as Record<string, unknown>[])
      .filter(e => e.status === 'published' && e.createdBy === organizerId)
      .sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')));
  } catch {
    return [];
  }
}

/**
 * Get all events with pending status (awaiting admin approval)
 * PROTECTED: Requires admin role
 */
export async function getPendingEvents() {
  await requireAdmin();

  try {
    const result = await getAllEvents();
    if (!result.success) return result;

    const pending = (result.events as Record<string, unknown>[])
      .filter(e => e.status === 'pending')
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));

    return { success: true, events: pending };
  } catch (error) {
    console.error('Error fetching pending events:', error);
    return { success: false, error: 'Failed to fetch pending events', events: [] };
  }
}

/**
 * Submit an event for admin approval (draft/pending → pending)
 * PROTECTED: Requires admin role or organizer sub-type; must be event creator (unless admin)
 */
export async function submitEventForApproval(eventId: string) {
  await requireEventSubmitter();

  try {
    const session = await auth();

    const result = await getAssembledEvent(eventId);
    if (!result.success || !result.event) {
      return { success: false, error: 'Event not found' };
    }

    const event = result.event as Record<string, unknown>;

    // Non-admins can only submit their own events
    if (session?.user?.role !== 'admin' && event.createdBy !== session?.user?.id) {
      return { success: false, error: 'You do not have permission to submit this event' };
    }

    // Past-event guard before allowing approval submission
    const formLike = { event: event as unknown, contests: (event.contests ?? []) as unknown } as EventSubmissionFormValues;
    const pastEventError = validatePastEventRequirements(formLike);
    if (pastEventError) {
      return { success: false, error: pastEventError };
    }

    const updated = {
      ...event,
      status: 'pending' as EventStatus,
      updatedAt: new Date().toISOString(),
      submittedForApprovalAt: new Date().toISOString(),
    };

    await putEventItem(updated);

    revalidatePath('/events/my-events');
    revalidatePath('/admin/event-approval');

    return { success: true, message: 'Event submitted for approval' };
  } catch (error) {
    console.error('Error submitting event for approval:', error);
    return { success: false, error: 'Failed to submit event for approval' };
  }
}

/**
 * Withdraw a pending event back to draft
 * PROTECTED: Requires admin role or organizer sub-type; must be event creator (unless admin)
 */
export async function withdrawEventFromApproval(eventId: string) {
  await requireEventSubmitter();

  try {
    const session = await auth();

    const result = await getAssembledEvent(eventId);
    if (!result.success || !result.event) {
      return { success: false, error: 'Event not found' };
    }

    const event = result.event as Record<string, unknown>;

    if (session?.user?.role !== 'admin' && event.createdBy !== session?.user?.id) {
      return { success: false, error: 'You do not have permission to withdraw this event' };
    }

    const updated = {
      ...event,
      status: 'draft' as EventStatus,
      updatedAt: new Date().toISOString(),
    };

    await putEventItem(updated);

    revalidatePath('/events/my-events');
    revalidatePath('/admin/event-approval');

    return { success: true, message: 'Event withdrawn' };
  } catch (error) {
    console.error('Error withdrawing event:', error);
    return { success: false, error: 'Failed to withdraw event' };
  }
}

/**
 * Create a pending user from event data and link them to their contest entry.
 * PROTECTED: Requires admin role.
 * Called from the admin event-approval page for each unregistered judge/athlete.
 */
export async function createPendingUserFromEvent(
  eventId: string,
  contestIdx: number,
  entryType: 'judge' | 'athlete',
  entryIdx: number,
): Promise<void> {
  await requireAdmin();

  try {
    const result = await getAssembledEvent(eventId);
    if (!result.success || !result.event) {
      throw new Error('Event not found');
    }

    const event = result.event as Record<string, unknown>;
    const contests = (event.contests as Record<string, unknown>[]) ?? [];
    const contest = contests[contestIdx] as Record<string, unknown> | undefined;
    if (!contest) throw new Error('Contest not found');

    const entries = (
      entryType === 'judge' ? contest.judges : contest.results
    ) as Record<string, unknown>[] | undefined;

    const entry = entries?.[entryIdx];
    if (!entry?.pendingUser) throw new Error('No pending user data');

    const pending = entry.pendingUser as PendingUserData;

    // Pre-generate userId so we can link it back to the event entry
    const userId = `athlete-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await createUser(
      {
        id: userId,
        name: pending.name,
        surname: pending.surname,
        email: pending.email,
        gender: pending.gender ?? '',
        country: pending.country,
        city: pending.city,
        birthdate: pending.birthdate,
        isaId: '',
      },
      '/admin/event-approval',
    );

    // Update the contest entry: replace pendingUser with real userId
    // Destructure to omit pendingUser key entirely (undefined values in nested arrays
    // are not handled by removeUndefinedValues in older AWS SDK versions)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pendingUser: _removed, ...entryWithoutPending } = entry as Record<string, unknown>;
    const updatedEntries = [...(entries ?? [])];
    updatedEntries[entryIdx] = {
      ...entryWithoutPending,
      id: userId,
      name: `${pending.name} ${pending.surname}`.trim(),
    };

    // Update only the specific Contest record (contest has eventId + sortKey from getAssembledEvent)
    await putEventItem({
      ...contest,
      [entryType === 'judge' ? 'judges' : 'results']: updatedEntries,
    } as Record<string, unknown>);

    revalidatePath('/admin/event-approval');
  } catch (error) {
    console.error('Error creating pending user:', error);
    throw error;
  }
}
