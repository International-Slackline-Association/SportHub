'use server';

import { dynamodb, EVENTS_TABLE } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@lib/authorization';
import { auth } from '@lib/auth';
import { EventSubmissionFormValues } from './types';

// Simple in-memory cache for getAllEvents (5-minute TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let eventsCache: CacheEntry<unknown[]> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generate unique event ID
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


/**
 * Save event to DynamoDB
 * PROTECTED: Requires admin role
 */
export async function saveEvent({ event }: EventSubmissionFormValues) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Get current user for audit trail
    const session = await auth();

    // Transform form data to database format
    const eventId = generateEventId();
    const eventData = {
      ...event,
      eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft', // draft, published, cancelled
      createdBy: session?.user?.id,
      createdByName: session?.user?.name,
    };

    // Save to DynamoDB
    console.log("Saving event ", eventId);
    await dynamodb.putItem(EVENTS_TABLE, eventData);

    // Revalidate events page to show new data
    revalidatePath('/events');

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
 * Get event by ID
 * PUBLIC: No authentication required (read-only)
 */
export async function getEvent(eventId: string) {
  try {
    const event = await dynamodb.getItem(EVENTS_TABLE, { eventId });
    return {
      success: true,
      event,
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return {
      success: false,
      error: 'Failed to fetch event',
    };
  }
}

/**
 * Get all events
 * PUBLIC: No authentication required (read-only)
 * OPTIMIZED: 5-minute cache to prevent excessive table scans
 *
 * NOTE: Uses table scan because we need ALL events. Future optimization: implement pagination.
 */
export async function getAllEvents() {
  try {
    // Check cache first
    if (eventsCache && (Date.now() - eventsCache.timestamp) < CACHE_TTL) {
      return {
        success: true,
        events: eventsCache.data,
      };
    }

    // Cache miss - scan table
    const events = await dynamodb.scanItems(EVENTS_TABLE);
    const eventList = events || [];

    // Update cache
    eventsCache = {
      data: eventList,
      timestamp: Date.now(),
    };

    return {
      success: true,
      events: eventList,
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    // Handle table not existing gracefully
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') {
      console.log(`Table ${EVENTS_TABLE} does not exist. Returning empty array.`);
      return {
        success: true,
        events: [],
      };
    }
    return {
      success: false,
      error: 'Failed to fetch events',
      events: [],
    };
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

    await dynamodb.deleteItem(EVENTS_TABLE, { eventId });

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
    const result = await getEvent(eventId);

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

    await dynamodb.putItem(EVENTS_TABLE, updatedEvent);

    // Revalidate events page
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
