# Fixed: migrated events colliding on `eventId` (was date-only)

See issue [#77](https://github.com/International-Slackline-Association/SportHub/issues/77) for the original report.

## The problem
`eventId` for events migrated from ISA-Rankings was generated purely from
the event's date:

```ts
// Generate eventId from date (group contests by date)
const eventId = `Event:${date}`;
```

This is also the DynamoDB partition key for the event's `Metadata` record
and all of its `Contest:*` records. Two distinct, unrelated events that
happened to start on the same calendar date collided into the same
partition — their contests, and even their event metadata (name/city/
country), got merged into one `Event:{date}` record, since
`createEventMetadata()` only keeps the first contest's info per `eventId`.

A separate, purely defensive city-string filter was added at the query
layer (`getAssembledEvent`, landing via PR #76) to narrow down which
contests get shown for a given event page. That filter narrows the
*symptom* but doesn't fix the collision — it fails when both colliding
events have no city on record, or when city strings don't match exactly
due to free-text formatting, and it does nothing for two colliding events
in the *same* city on the same date.

## The fix
`sport-hub/src/lib/migrations/migrate-isa-rankings-to-sporthub.ts`:
`eventId` is now generated from date **+ a normalized city/country slug**,
reusing the existing `slugBase()` helper (already used for athlete slugs,
so diacritics/casing/whitespace are handled consistently):

```ts
const locationSlug = slugBase(city || '', country);
const eventId = locationSlug ? `Event:${date}:${locationSlug}` : `Event:${date}`;
```

Two events on the same date but different cities now get different
`eventId`s. Formatting differences in the *same* city ("Innsbruck" vs
"innsbruck " vs different casing) still collapse to one event, which is
the correct behavior — those are the same real event.

### What this does and doesn't cover
- **Covers**: the common case — two independent events opening on the
  same date, which is the scenario in the original bug report.
- **Does not cover**: two distinct events in the *same* city on the *same*
  date (rare — back-to-back local comps at one venue), and contests with
  no city on record at all (falls back to date-only, same as before).
  These are lower-probability residual cases; there's no more
  disambiguating signal available on the source ISA-Rankings contest
  record to resolve them further.
- **Does not retroactively fix already-migrated data.** This only changes
  what a *future or re-run* migration produces. Events already written to
  the production `SportHub-Events` table under the old `Event:{date}` keys
  are unaffected until the migration is re-run against them — see
  "Rollout" below. The city-match filter in `getAssembledEvent` (PR #76)
  should stay in place as a safety net for that already-migrated data
  until then; it isn't rendered obsolete by this PR alone.

## Rollout (not done in this PR)
This PR is a code-only fix to the ID generation logic. Before re-running
the migration against production data:
1. **Audit** how many existing `Event:{date}` partitions actually contain
   contests from more than one real-world event (multiple distinct
   `(city, name)` pairs) — this tells us the actual blast radius.
2. Decide how to handle the re-migration for affected events: `putItem`
   on the new keys will create fresh, correctly-split records, but the
   old colliding `Event:{date}` records and their `Contest:*` children
   will be orphaned in the table, not cleaned up automatically — this
   migration script has no delete/cleanup step for events (unlike the
   athlete path, it doesn't check for or reuse existing SportHub event
   records at all). A cleanup pass will be needed for whatever old
   records get superseded.

## Where this is referenced in code
- `sport-hub/src/lib/migrations/migrate-isa-rankings-to-sporthub.ts` —
  the fixed `eventId` generation, in `scanContests()`
- `sport-hub/src/lib/event-contest-service.ts`, `getAssembledEvent` (PR
  #76) — the pre-existing city-match filter, kept as a safety net for
  already-migrated legacy data
