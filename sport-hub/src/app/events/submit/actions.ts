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
import { EventMetadataRecord } from '@lib/relational-types';

export type PendingEntry = {
  contestIdx: number;
  contestLabel: string;
  entryType: 'judge' | 'athlete';
  entryIdx: number;
  pendingUser: PendingUserData;
};

/**
 * Find every judge/result entry across an event's contests that still holds
 * a pendingUser placeholder instead of a real linked account.
 *
 * Shared by the admin event-approval page (display + hasPendingUsers gate)
 * and createAllPendingUsersFromEvent/updateEventStatus (enumeration +
 * enforcement) so there's one definition of "pending" instead of two that
 * can drift apart.
 */
export function collectPendingUsers(event: Record<string, unknown>): PendingEntry[] {
  const contests = (event.contests as Record<string, unknown>[] | undefined) ?? [];
  const entries: PendingEntry[] = [];
  contests.forEach((contest, contestIdx) => {
    const label = `Contest ${contestIdx + 1}`;
    const judges = (contest.judges as Record<string, unknown>[] | undefined) ?? [];
    const results = (contest.results as Record<string, unknown>[] | undefined) ?? [];
    judges.forEach((j, jIdx) => {
      if (j.pendingUser) entries.push({ contestIdx, contestLabel: label, entryType: 'judge', entryIdx: jIdx, pendingUser: j.pendingUser as PendingUserData });
    });
    results.forEach((r, rIdx) => {
      if (r.pendingUser) entries.push({ contestIdx, contestLabel: label, entryType: 'athlete', entryIdx: rIdx, pendingUser: r.pendingUser as PendingUserData });
    });
  });
  return entries;
}

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
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      status,
      createdBy: session?.user?.id,
      createdByName: session?.user?.name,
      contestCount: contests.length,
      ...(status === 'pending' && { submittedForApprovalAt: new Date().getTime() }),
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

    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      return { success: false, error: 'Event not found' };
    }

    if (session?.user?.role !== 'admin' && event.createdBy !== session?.user?.id) {
      return { success: false, error: 'You do not have permission to edit this event' };
    }

    // Merge updated judges/results into individual Contest records.
    // For old-format events the embedded contest objects lack eventId/sortKey,
    // so we supply them here (effectively migrating to separate Contest:* records).
    await Promise.all(
      event.contests.map(async (ec, idx) => {
        const sortKey = (ec.sortKey as string) || `Contest:${ec.discipline ?? 'unknown'}:${idx}`;
        const updated = {
          ...ec,
          eventId,
          sortKey,
          contestIndex: ec.contestIndex ?? idx,
          judges: contests[idx]?.judges ?? ec.judges,
          results: contests[idx]?.results ?? ec.results,
        };
        await putEventItem(updated as Record<string, unknown>);
      })
    );

    invalidateContestsCache();
    revalidatePath('/events');
    revalidatePath('/events/my-events');
    revalidatePath('/rankings');

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
    let existingEvent: Partial<EventMetadataRecord>;
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
        createdAt: new Date().getTime(),
        status: 'published',
      };
      isMigration = true;
    } else {
      existingEvent = existing.event;
      if (session?.user?.role !== 'admin' && existingEvent.createdBy !== session?.user?.id) {
        return { success: false, error: 'You do not have permission to edit this event' };
      }
    }

    const { event, contests } = values;

    // Strip assembled contests field before writing Metadata record
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contests: _assembled, ...existingMetadata } = existingEvent;
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
 * Group Contest:* records by eventId from a full table scan, sorted by
 * contestIndex.
 *
 * getAllEvents()'s raw Metadata records never carry a populated `contests`
 * field (it's only ever written as an empty/stale snapshot by
 * updateEventStatus, never by saveEvent/updateEvent), even though multiple
 * callers (My Events list/table, admin event-approval's contest count and
 * pending-user detection) read `event.contests` expecting it. Derive the
 * real, current list from the Contest:* records already present in this
 * same scan instead.
 */
function groupContestsByEventId(allItems: Record<string, unknown>[]): Map<string, Record<string, unknown>[]> {
  const contestsByEventId = new Map<string, Record<string, unknown>[]>();
  for (const item of allItems) {
    if (typeof item.sortKey === 'string' && item.sortKey.startsWith('Contest:')) {
      const eid = String(item.eventId ?? '');
      const list = contestsByEventId.get(eid) ?? [];
      list.push(item);
      contestsByEventId.set(eid, list);
    }
  }
  for (const list of contestsByEventId.values()) {
    list.sort((a, b) => Number(a.contestIndex ?? 0) - Number(b.contestIndex ?? 0));
  }
  return contestsByEventId;
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

    // The "Approve" button is only disabled client-side while pending users
    // remain — enforce it here too so publishing can't be triggered while
    // any contest still holds a pendingUser placeholder, regardless of entry point.
    if (status === 'published') {
      const pendingUsers = collectPendingUsers(result.event as unknown as Record<string, unknown>);
      if (pendingUsers.length > 0) {
        return {
          success: false,
          error: `Cannot publish: ${pendingUsers.length} pending user${pendingUsers.length === 1 ? '' : 's'} must be created first`,
        };
      }
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

    invalidateContestsCache();
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

    const allItems = result.events as Record<string, unknown>[];
    const contestsByEventId = groupContestsByEventId(allItems);

    const myEvents = allItems
      .filter(e => e.createdBy === userId)
      .map((e): Record<string, unknown> => {
        const contests = contestsByEventId.get(String(e.eventId ?? '')) ?? [];
        return { ...e, contests, contestCount: contests.length };
      })
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

    const allItems = result.events as Record<string, unknown>[];
    const contestsByEventId = groupContestsByEventId(allItems);

    const pending = allItems
      .filter(e => e.status === 'pending')
      .map((e): Record<string, unknown> => {
        const contests = contestsByEventId.get(String(e.eventId ?? '')) ?? [];
        return { ...e, contests, contestCount: contests.length };
      })
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

    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      return { success: false, error: 'Event not found' };
    }

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
      updatedAt: new Date().getTime(),
      submittedForApprovalAt: new Date().getTime(),
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

    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      return { success: false, error: 'Event not found' };
    }

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
    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      throw new Error('Event not found');
    }

    const contest = event.contests[contestIdx];
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

/**
 * Create every remaining pendingUser entry for an event in one action.
 * PROTECTED: Requires admin role.
 * Called from the admin event-approval page's "Create All" button.
 */
export async function createAllPendingUsersFromEvent(
  eventId: string
): Promise<{ success: boolean; created: number; error?: string }> {
  await requireAdmin();

  try {
    const { success, event } = await getAssembledEvent(eventId);
    if (!success || !event) {
      return { success: false, created: 0, error: 'Event not found' };
    }

    const entries = collectPendingUsers(event as unknown as Record<string, unknown>);
    let created = 0;
    const failures: string[] = [];

    // Sequential, not Promise.all: createPendingUserFromEvent does a fresh
    // getAssembledEvent() read + whole-contest-record putEventItem() write
    // per call. Two entries in the SAME contest running concurrently would
    // both read the same "before" state, and the second write would clobber
    // the first's update (lost update). Awaiting in sequence makes each call
    // see the previous one's write.
    for (const entry of entries) {
      try {
        await createPendingUserFromEvent(eventId, entry.contestIdx, entry.entryType, entry.entryIdx);
        created++;
      } catch {
        failures.push(`${entry.pendingUser.name} ${entry.pendingUser.surname}`.trim());
      }
    }

    revalidatePath('/admin/event-approval');
    return {
      success: failures.length === 0,
      created,
      error: failures.length ? `Failed to create: ${failures.join(', ')}` : undefined,
    };
  } catch (error) {
    console.error('Error creating all pending users:', error);
    return { success: false, created: 0, error: 'Failed to create pending users. Please try again.' };
  }
}
