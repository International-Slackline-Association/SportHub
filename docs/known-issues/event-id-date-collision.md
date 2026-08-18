# Bug: migrated events collide on `eventId` when they share a start date

## Summary
`eventId` for events migrated from ISA-Rankings is generated purely from the
event's date, with no other disambiguating information. Two distinct,
unrelated events that start on the same calendar date are assigned the same
`eventId`, which is also the DynamoDB partition key for both the event's
`Metadata` record and all of its `Contest:*` records. As a result, their
contests live in the same partition and can be served under the wrong
event.

## Root cause
`sport-hub/src/lib/migrations/migrate-isa-rankings-to-sporthub.ts:770`:

```ts
// Generate eventId from date (group contests by date)
const eventId = `Event:${date}`;
```

Every contest scanned from ISA-Rankings is grouped into an event keyed
solely by `date` (see the "Group contests by eventId (which is based on
date)" comment further down the same file, around line 973). If the ISA
calendar ever has two independent competitions opening on the same day —
plausible for a global federation with regional/national comps running in
parallel — both get folded into a single `Event:{date}` record, and all of
their contests end up under that one partition key.

## Current mitigation and why it isn't a real fix
`getAssembledEvent` (`sport-hub/src/lib/event-contest-service.ts`) queries
all `Contest:*` records for a given `eventId` and, when there's no embedded
`contests` array, filters the result by matching contest city against the
event's city:

```ts
contests = (await getEventContests(eventId)).filter((c) =>
  c.city?.toLowerCase() === metadata.city?.toLowerCase()
);
```

This was added as a workaround (introduced alongside PR #76) but only
narrows the symptom, it doesn't fix the collision:

- **Both events undefined city**: `undefined === undefined` is `true`, so
  the filter matches everything — zero disambiguation for the exact case
  it exists to handle.
- **Free-text mismatch**: legacy `city` values are unnormalized strings
  ("Innsbruck" vs "Innsbruck, Austria" vs a typo or different casing/
  accents). A valid contest can be silently dropped from its own event
  page if the string doesn't match exactly.
- **Same city, same day**: two different events in the same city on the
  same date (recurring venue, back-to-back local comps) still collide with
  no way to tell them apart.

Failure mode in all three cases is silent: the event page renders with
missing contests, or with contests belonging to a different event, and
nothing errors or logs a warning.

## Impact
- Athlete/event pages for any pair of colliding legacy events can show
  incomplete or incorrect contest listings.
- Because `eventId` is also the sort key prefix for contest records, this
  affects data at the DynamoDB level, not just a display bug — a fix will
  likely require a data migration, not just a query-layer change.
- Scope is currently unknown: nobody has audited how many `Event:{date}`
  partitions from the ISA-Rankings migration actually contain contests
  from more than one real-world event. That audit is the first step to
  sizing this properly (see below).

## Suggested next steps
1. **Audit**: scan the migrated events table for `Event:{date}` partitions
   whose `Contest:*` records have more than one distinct `(city, name)`
   pairing — this quantifies how many events are actually affected today.
2. **Fix the root cause, not the symptom**: give migrated events a
   collision-safe `eventId` (e.g. incorporate a slug of the event/venue
   name, not just the date) and re-key the affected `Contest:*` records to
   match. This is a one-time data migration on top of
   `migrate-isa-rankings-to-sporthub.ts`.
3. Once IDs are unique, the city-string filter in `getAssembledEvent` can
   be removed entirely rather than made more clever.

## Where this is referenced in code
- `sport-hub/src/lib/migrations/migrate-isa-rankings-to-sporthub.ts:770`
  (root cause: `eventId` generation)
- `sport-hub/src/lib/event-contest-service.ts`, `getAssembledEvent`
  (current partial mitigation, flagged with a comment pointing at this doc)
