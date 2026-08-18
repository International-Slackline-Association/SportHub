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
  warning** (see above), naming the exact `contestId`s per group, for a
  human to resolve via `EVENT_ID_OVERRIDES` — see "Splitting a flagged
  event" below.
- **Does not retroactively fix already-migrated data.** This only changes
  what a *future or re-run* migration produces. Events already written to
  the production `SportHub-Events` table under the old `Event:{date}` keys
  are unaffected until the migration is re-run against them — see
  "Rollout" below. The city-match filter in `getAssembledEvent` (PR #76)
  should stay in place as a safety net for that already-migrated data
  until then; it isn't rendered obsolete by this PR alone.

## Splitting a flagged event
When the "Possible merged events" warning fires, it names the exact
`contestId`s under each distinct contest name — each followed by
`(discipline|contestSize)` to help tell the groups apart at a glance
(`contestSize` shows as `-` when the source record didn't have one):

```
⚠️  Possible merged events under Event:2024-03-15:innsbruck-austria (5 contests):
"Innsbruck Spring Cup" [c1(TRICKLINE|OPEN), c3(HIGHLINE|OPEN), c4(SPEED|CHALLENGE)],
"City Regional Slackline Meet" [c2(TRICKLINE|CHALLENGE), c5(HIGHLINE|CHALLENGE)]
share no common prefix — these may be two different events that collided
on date + city/country. Add the contestIds for the outlier group(s) to
EVENT_ID_OVERRIDES to split them out, or review manually.
```

The JSON report from `pnpm migrate:audit` breaks these out into structured
fields (`contestId`, `discipline`, `contestSize`) per contest instead of
the packed text form above.

To split it: decide which group is the "outlier" relative to the rest
(usually the smaller one, but check the actual contest data if unsure),
then add its `contestId`s to `EVENT_ID_OVERRIDES` in
`migrate-isa-rankings-to-sporthub.ts`:

```ts
const EVENT_ID_OVERRIDES: Record<string, string> = {
  'c2': 'city-regional-meet',
  'c5': 'city-regional-meet',
};
```

Re-run `--dry-run` (or `pnpm migrate:audit`) and confirm the warning is
gone before running `--execute` for real. This resolves the collision
*before* any data is written — see "Rollout" for why that matters more
than fixing it after the fact.

### Not every warning is a real collision — check first
The heuristic behind this warning (no shared prefix between contest
names) has a real false-positive mode, confirmed against actual
`--dry-run` output: a single legitimate event where one contest is named
after the event itself and another is named only for its discipline.

```
⚠️  Possible merged events under Event:2021-08-27:bern-ch (2 contests):
"Bern City Slack #12" [e02e49(RIGGING|OPEN)], "Rigging Masters" [0bacaf(RIGGING|CHALLENGE)]
share no common prefix — ...
```

"Bern City Slack #12" is the event; "Rigging Masters" is one of its
disciplines, not a second event. Same date, same city, one real event —
correctly grouped already. **Nothing to add to `EVENT_ID_OVERRIDES`
here; the right action is to do nothing.**

Before adding contestIds to the override for a flagged group, sanity
check: does it actually look like two independent competitions (e.g.
each with its own full slate of disciplines, different-looking
prize/participant data), or does it look like one event where some
contests just happen to be named after the event and others only after
their discipline? The latter is expected to be common — treat the
warning as "worth a 30-second look," not "assume it's a real collision."

## Rollout (not done in this PR)
This PR is a code-only fix to the ID generation logic. Before re-running
the migration against production data:
1. **Audit**: run `pnpm migrate:audit` (local source) or
   `pnpm migrate:audit:aws` (production source, read-only scan) —
   `scripts/audit-event-collisions.sh` runs the dry-run and pulls out just
   the "Possible merged events" warnings into a standalone report, so
   they're not lost in the rest of the migration's console output.
2. For each flagged group, follow "Splitting a flagged event" above, then
   re-run the audit to confirm it's clean.
3. Decide how to handle the re-migration for affected events: `putItem`
   on the new keys will create fresh, correctly-split records, but the
   old colliding `Event:{date}` records and their `Contest:*` children
   will be orphaned in the table, not cleaned up automatically — this
   migration script has no delete/cleanup step for events (unlike the
   athlete path, it doesn't check for or reuse existing SportHub event
   records at all). A cleanup pass will be needed for whatever old
   records get superseded.

## Where this is referenced in code
- `sport-hub/src/lib/migrations/migrate-isa-rankings-to-sporthub.ts` —
  the fixed `eventId` generation and `EVENT_ID_OVERRIDES`, in
  `scanContests()`; the false-merge warning, in `createEventMetadata()`
- `sport-hub/scripts/audit-event-collisions.sh` (`pnpm migrate:audit` /
  `migrate:audit:aws`) — runs `--dry-run` and extracts just the collision
  warnings into a standalone report
- `sport-hub/src/lib/event-contest-service.ts`, `getAssembledEvent` (PR
  #76) — the pre-existing city-match filter, kept as a safety net for
  already-migrated legacy data
