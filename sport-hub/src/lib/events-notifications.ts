/**
 * Emails to Event Managers when an organizer sends something for review:
 * a new or revised event awaiting approval, or edits to published results.
 * General admins are not emailed. When nobody has the Event Manager role the
 * mail goes to EVENTS_REVIEW_EMAIL, if set.
 */

import { sendMail, siteUrl } from './mailer';
import { getEmailsByRole } from './user-query-service';

export type EventReviewReason = 'new' | 'revised' | 'results';

export interface EventReviewContext {
  eventId: string;
  eventName?: string;
  startDate?: string;
  byName?: string;
  contestCount?: number;   // For 'results': how many contests have edits waiting
}

async function reviewerEmails(): Promise<string[]> {
  const managers = await getEmailsByRole(['event_manager']).catch(error => {
    console.error('[events] Could not look up Event Managers:', error);
    return [];
  });
  if (managers.length > 0) return managers;
  return process.env.EVENTS_REVIEW_EMAIL ? [process.env.EVENTS_REVIEW_EMAIL] : [];
}

const SUBJECTS: Record<EventReviewReason, string> = {
  new: 'New event to review',
  revised: 'Revised event to review',
  results: 'Results changes to review',
};

/** Never throws: a failed email must not block the organizer's action. */
export async function notifyEventManagers(reason: EventReviewReason, context: EventReviewContext): Promise<void> {
  try {
    const name = context.eventName || context.eventId;
    const who = context.byName || 'An organizer';
    const what = reason === 'results'
      ? `${who} edited published results${context.contestCount ? ` in ${context.contestCount} contest${context.contestCount === 1 ? '' : 's'}` : ''}. The changes go live once approved.`
      : `${who} ${reason === 'revised' ? 'revised and resubmitted' : 'submitted'} this event for approval.`;
    const link = siteUrl(reason === 'results' ? '/admin/score-review' : '/admin/event-approval');
    const lines = [what, '', `Event: ${name}`, ...(context.startDate ? [`Start: ${context.startDate}`] : []), '', `Review it: ${link}`];
    await sendMail({ to: await reviewerEmails(), subject: `${SUBJECTS[reason]}: ${name}`, text: lines.join('\n') });
  } catch (error) {
    console.error('[events] Failed to send review notification:', error);
  }
}
