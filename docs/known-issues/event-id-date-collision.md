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
falling back to a slug of the contest name when neither city nor country is
on record. Reuses the existing `slugBase()` helper (already used for
athlete slugs, so diacritics/casing/whitespace are handled consistently):

```ts
const locationSlug = slugBase(city || '', country) || slugBase(contestName);
const eventId = locationSlug ? `Event:${date}:${locationSlug}` : `Event:${date}`;
```

Two events on the same date but different cities now get different
`eventId`s. Formatting differences in the *same* city ("Innsbruck" vs
"innsbruck " vs different casing) still collapse to one event, which is
the correct behavior — those are the same real event. `eventId` only falls
back to date-only when a contest record has no city, country, *or* name at
all — a narrower and more degenerate case than the original bug.

Separately, `createEventMetadata()` now tracks every distinct contest name
seen under an `eventId` (previously it only kept the first contest's name,
so the "find common prefix" the code comment described was never actually
implemented) and:
- derives the event's display name from the *real* longest common prefix
  across those names, instead of just the first contest's name, and
- **warns during migration** (`--dry-run` or `--execute`) when a group's
  contest names share no meaningful common prefix — a signal that
  date + city/country wasn't enough to keep two real events apart. This is
  the audit step called out below, built into the tool itself rather than
  a separate manual pass.

### What this does and doesn't cover
- **Covers**: the common case — two independent events opening on the
  same date — and now also the narrower "missing city, but has a country
  or contest name" case, which previously still fell back to date-only.
- **Does not cover, and cannot be resolved automatically**: two distinct
  events in the *same* city on the *same* date (rare — back-to-back local
  comps at one venue). By definition every signal this migration has
  access to (date, city, country) is identical between them; there's
  nothing left in the source ISA-Rankings contest record to split on
  automatically without risking incorrectly fragmenting genuinely
  multi-discipline single events (which have differing per-discipline
  contest names on purpose). This case is instead **surfaced as a
  warning** (see above) for a human to resolve manually rather than
  guessed at automatically.
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
1. **Audit**: run the migration in `--dry-run` mode and check the console
   output for the "Possible merged events" warnings described above — that
   is the audit, already built into the tool rather than a separate
   manual pass. It tells you exactly which `eventId`s to look at and why.
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
