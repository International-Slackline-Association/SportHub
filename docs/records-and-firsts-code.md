# Records & Firsts: code map

How the World Records & World Firsts workflow is built, for reviewers. Requirements:
[`requirements/records-and-firsts-workflow.md`](requirements/records-and-firsts-workflow.md). All paths are under
`sport-hub/src/`.

## Layers

| Layer | File | What it does |
|---|---|---|
| Rules (pure) | `lib/records-logic.ts` | Lists (men/women/mixed), value parsing and formatting, comparison, co-holders, titles. No I/O; unit tested. |
| Texts | `lib/records-rules.ts` | Framework criteria, ethics statement, witness minimum, records team address. |
| Data access | `lib/records-service.ts` | DynamoDB reads/writes for categories, entries, audit log, import items, profile pointers; public display rows with titles. |
| Claim helpers | `lib/records-claims.ts` | Form → entry fields, submit validation, athlete snapshot, creating new athletes. Shared by both action files. |
| Claimant actions | `app/world_records/actions.ts` | Save draft, submit, withdraw, delete draft, "My claims". Signed-in user; only the claimant can change a claim. |
| Reviewer actions | `app/admin/records-review/actions.ts` | Queue, review detail, approve / request changes / reject, void / restore, Modify. `records:review`, and `records:manage` for public entries. |
| Category actions | `app/admin/records-categories/actions.ts` | Create and edit record and first categories (`records:manage`). |
| Import actions | `app/admin/records-import/actions.ts` | Resolve the import review list (`records:manage`). |
| Emails | `lib/records-notifications.ts`, `lib/mailer.ts` | One function per claim event; SMTP or log only. Never throws. |
| Certificates | `lib/records-certificates.ts`, `app/api/certificates/[kind]/[id]/route.ts` | Placeholder PDF, generated on demand for public entries. |
| Auth | `lib/records-auth.ts` | `requireSession`, `requireRecordsPermission`, `actorOf` for audit items. |

Pages: `app/world_records/` (public lists, `claim/`, `my-claims/`) and `app/admin/records-*` (review queue and detail,
Modify pages, categories, import). The admin pages check `requireAdmin()`; the actions check permissions again,
since server actions can be called directly.

## Data model (`sporthub-records`)

| pk | sortKey | Item |
|---|---|---|
| `RecordCategory` / `FirstCategory` | `RecordCategory:{id}` / `FirstCategory:{id}` | Category |
| same | `Audit:{categoryId}:{iso}:{rand}` | Category change log |
| `Record:{id}` / `First:{id}` | `Metadata` | Entry (claim, published or historical record / first) |
| same | `Audit:{iso}:{rand}` | Entry audit log |
| `ImportIssue` | `ImportIssue:{kind}:{certId}:{reason}` | Import review item |
| `RateLimit` | `Submit:{userId}:{yyyy-mm-dd}` | Submissions per user per day |

GSIs: `statusKey-index` (`{kind}#{status}`, sorted by `{date}#{id}`) for the public lists and the queue;
`category-index` (`categoryId`) for everything in one category. Record and first category ids share this index,
so `getEntriesByCategory(kind, id)` filters by kind. `putEntry` keeps both GSI keys in sync.

In `sporthub-users`, under the user's partition: `Record:{id}` / `First:{id}` for each athlete on a submitted entry
(kept in sync by `syncAthleteLinks`), and `Claim:{kind}:{id}` for the claimant. Profiles and "My claims" read these
instead of scanning.

## Main flows

1. **Submit** (`saveClaim`): snapshot athletes from their profiles → validate → parse the value with the category
   unit → check it beats or equals the current mark on its list → write entry, pointers, audit → email.
2. **Approve** (`approveClaim`): for a new-category claim create the category or map to an existing one (value must
   be readable there) → create profiles for new athletes → publish → `recomputeRecordStatuses` makes beaten records
   historical → email. Firsts can be linked to the same trick on another list (`trickGroupId`).
3. **Titles** are computed at read time in `toWorldRecords` / `toWorldFirsts`, never stored.
4. **Void / restore** (`setPublicEntryStatus`): voiding sets `voidedAt`; only voided entries can be restored.
5. **Concurrency:** status changes use `putEntry(entry, { expectedStatus })`, a conditional write, so the second of two
   simultaneous decisions fails with `ConcurrentChangeError`. Approval first takes a decision lock
   (`lockForDecision`, stale after 2 minutes) because it creates profiles and categories before its final write.
6. **Email rate limit:** `countSubmission` counts submissions per user per UTC day (`RateLimit` items); limits are in
   `records-rules.ts` (5 submissions a day, 10 athletes, 10 witnesses).

## Commands

| Command | What |
|---|---|
| `pnpm db:setup` | Creates the local tables, including `sporthub-records`. |
| `pnpm records:import:dry-run` / `:execute` | One-time import of the certificates sheet into the local table, with a report. `--file` reads a JSON export instead of the sheet. |
| `pnpm records:categories:migrate` | Local migration to the simplified category fields. |
| `pnpm test:records` | Unit tests for `records-logic.ts` (node:test via tsx). |

Email settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RECORDS_REVIEW_EMAIL`,
`RECORDS_COMMUNICATION_EMAIL`, `SITE_URL`. Without `SMTP_HOST`, or with `DYNAMODB_LOCAL=true`, emails are logged only.
