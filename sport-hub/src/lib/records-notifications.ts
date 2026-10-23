/**
 * Emails for record and first claims (requirements §7.7). Filled in with the
 * SMTP mailer in a later step; until then events are only logged.
 */

import type { RecordEntryRecord, WorldEntryRecord } from './relational-types';

export type ClaimEvent = 'submitted' | 'approved' | 'changes_requested' | 'rejected';

export interface ClaimEventContext {
  comment?: string;
  supersedes?: RecordEntryRecord[];   // Records this approval made historical
}

/** Never throws: a failed email must not block or roll back the action (FR-31). */
export async function notifyClaimEvent(event: ClaimEvent, entry: WorldEntryRecord, context: ClaimEventContext = {}): Promise<void> {
  try {
    console.log(`[records] ${event}: ${entry.kind} ${entry.entryId}`, context.comment ?? '');
  } catch (error) {
    console.error('[records] Failed to send notification:', error);
  }
}
