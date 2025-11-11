'use server';

import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import { EventSubmissionFormValues, EventFormValues } from './components/types';

const EVENTS_TABLE = 'events';

// Generate unique event ID
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Transform form data to database format
function transformEventData(formValues: EventFormValues) {
  return {
    eventId: generateEventId(),
    name: formValues.eventName,
    city: formValues.city,
    country: formValues.country,
    startDate: formValues.startDate,
    endDate: formValues.endDate,
    website: formValues.website || null,
    youtubeVideo: formValues.youtubeVideo || null,
    avatarUrl: formValues.avatarUrl || null,
    disciplines: formValues.disciplines || [],
    socialMedia: {
      instagram: formValues.instagram || null,
      facebook: formValues.facebook || null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft', // draft, published, cancelled
  };
}

/**
 * Save event to DynamoDB
 */
export async function saveEvent(values: EventSubmissionFormValues) {
  try {
    const eventData = transformEventData(values.event);
    
    // Save to DynamoDB
    await dynamodb.putItem(EVENTS_TABLE, eventData);
    
    // Revalidate events page to show new data
    revalidatePath('/events');
    revalidatePath('/events/submit-event');
    
    return {
      success: true,
      eventId: eventData.eventId,
      message: 'Event saved successfully',
    };
  } catch (error) {
    console.error('Error saving event:', error);
    return {
      success: false,
      error: 'Failed to save event. Please try again.',
    };
  }
}

/**
 * Get event by ID
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
 */
export async function getAllEvents() {
  try {
    const events = await dynamodb.scanItems(EVENTS_TABLE);
    return {
      success: true,
      events: events || [],
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
 */
export async function deleteEvent(eventId: string) {
  try {
    await dynamodb.deleteItem(EVENTS_TABLE, { eventId });
    
    // Revalidate events page
    revalidatePath('/events');
    
    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      success: false,
      error: 'Failed to delete event',
    };
  }
}

/**
 * Update event status (draft, published, cancelled)
 */
export async function updateEventStatus(eventId: string, status: 'draft' | 'published' | 'cancelled') {
  try {
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
    return {
      success: false,
      error: 'Failed to update event status',
    };
  }
}
