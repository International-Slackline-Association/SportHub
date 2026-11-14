export type OrganizerValue = { id?: string; name?: string };

type WithOrganizer = { createdBy?: string; createdByName?: string };

/**
 * Applies a requested organizer change to an event's metadata.
 * Only admins may change the organizer; for anyone else, or when no existing
 * user was selected, the stored organizer is kept.
 */
export function applyOrganizerChange<T extends WithOrganizer>(
  existing: T,
  requested: OrganizerValue | undefined,
  isAdmin: boolean,
): T {
  const isOrganizerChange = isAdmin && !!requested?.id;
  if (!isOrganizerChange) return existing;
  return { ...existing, createdBy: requested.id, createdByName: requested.name || requested.id };
}
