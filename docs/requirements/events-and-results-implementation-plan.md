# Implementation plan: Events and Results Workflow

Based on [events-and-results-workflow.md](events-and-results-workflow.md) (v1, 2026-10-28) and the code on `main`
(8005034). Each PR branches off `main`, is reviewable on its own (target: under ~400 changed lines), and leaves the
site working. Sizes are rough estimates: S < 150 lines, M 150–400, L > 400 (L means split further if it grows).

## Core idea for the data

- **No competition object.** A competition = the contests of one discipline in an event (`disciplines` on the
  event metadata already lists them).
- **Per contest:** new `resultsStatus` on `ContestRecord`: `none | pending | changes_requested | approved |
  rejected`, plus `reviewComment`. Existing contests without the field count as `approved` when their event is
  published, so no data migration is needed.
- **Per competition:** new `competitions` map on `EventMetadataRecord`, keyed by discipline: `proposedLevel`,
  `membershipStatus`, `licenceStatus` (`pending | confirmed | refused`, World Cup/Championship only),
  `confirmedLevel`, `finalLevel`, `feeReceived`, deadline confirmations.
- **Participation records** (what rankings and profiles read) are only written for `approved` contests of
  published events. That one rule fixes the ranking bug, and every later PR just changes when a contest becomes
  `approved`.

## Phase 1: fixes to today's workflow (no new features, valuable on their own)

| # | PR | Size | Content |
|---|---|---|---|
| 1 | Docs | S | Add the requirements doc and this plan under `docs/requirements/`. |
| 2 | Unapproved results don't count | M | Write participation records only when the event is published (on approval in `updateEventStatus`); delete them on reject/draft. Public event page `/events/[id]` only for organizer and admins until published. One-off script to remove participation records of currently unpublished events. Unit test for the rule. |
| 3 | Close the "Edit event" loophole | S | `updateEvent` on a published event keeps existing contests' judges and results for non-admins (only metadata and new contests change). Edit form shows judges/results read-only with a link to "Edit scores". |
| 4 | Points read-only for organizers | S | Points field disabled for non-admins, always recalculated server-side on save from rank, level and field size (ties: equal points, next place skipped; already supported). |

## Phase 2: results review per contest

| # | PR | Size | Content |
|---|---|---|---|
| 5 | `resultsStatus` per contest | M | Add the field. First results (in the submission form or "Edit scores") set `pending` instead of going live; participation written only on `approved`. Public event page hides unapproved contests' results; organizer sees "awaiting review". Closes the review gap. |
| 6 | Score Review for first submissions | M | Score Review lists `pending` contests ("new results") next to staged edits; Approve sets `approved` and syncs participation. Event Approval no longer approves results. |
| 7 | Request changes and reject with reason | M | Score Review actions: request changes (comment), reject (reason; no points). Status and comment visible in "My events". Same for staged edits. |
| 8 | New users in Score Review | M | Move the "create pending user" step (today on Event Approval) to Score Review; Approve disabled until done. "Similar profile exists" warning in `UserAutocomplete` / `PendingUserForm` while typing. |
| 9 | Admin edit log | S | Log every admin edit of contests/results (who, when, before/after) as `AuditLog:*` items on the event. Email to organizer comes in PR 12. |

## Phase 3: levels, licences and fees

| # | PR | Size | Content |
|---|---|---|---|
| 10 | Level per competition | M | Rename Grand Slam → National (display only, keep stored value). Form forces one level per discipline; membership status field with "?" tooltip; fee shown from the v6.0 table (new `utils/levels.ts` with points, minimums, deadlines, fees; unit tests). Writes `competitions` map. |
| 11 | Event Approval: levels and licences | M | Admin confirms level and membership per competition; World Cup/Championship "licence pending" → confirm or counter-propose a level; reject with reason. Level icon on public pages only shown when confirmed (licence) or final (others). |
| 12 | Final level and fee at results approval | M | On the first approved contest of a competition: admin sets final level (recalculates points of all its contests); field size vs minimum shown; "licensing fee received" checkbox when fee > €0. |

## Phase 4: emails, deadlines, scheduler

Depends on the SMTP mailer from PR #113 (records and firsts). If #113 isn't merged by then, PR 13 extracts the
mailer into its own small PR first.

| # | PR | Size | Content |
|---|---|---|---|
| 13 | Event emails | M | Templates and sending for: event submitted/approved/rejected/admin edit or removal, licence decision, results approved/changes requested/rejected/admin edit, results published (all athletes), new profile created. `SPORT_ADMIN_EMAIL` = sport@. |
| 14 | Deadline calculation and display | M | Pure function: deadlines per competition from earliest contest start / latest contest end (unit tests). Shown on "My events" and Event Approval. Immediate sport@ email on late registration or a date change past a deadline. |
| 15 | Deadline confirmation links | S | Signed one-click "confirm done" links per deadline; confirmation stored in the `competitions` map. |
| 16 | Daily scheduler | M | Protected `/api/cron/daily` route (secret header) that sends due reminders (1 week before, deadline day, 48 h → sport@), results-due, World Cup/Championship fee (30 days before) and overdue event approvals. AWS EventBridge schedule documented in the PR (setup needs someone with AWS access). |
| 17 | Event cancellation | S | Organizer "Cancel event": off the calendar, record kept, sport@ notified, no further deadline emails. |

## Phase 5: evaluation (World Cup and World Championship)

| # | PR | Size | Content |
|---|---|---|---|
| 18 | Evaluation data and admin assignment | M | `Evaluation:*` items on the event; admin picks evaluators (any user) once a World Cup/Championship competition is published; email with link. |
| 19 | Evaluation form | M | Logged-in form: 10 statements (5-point scale), comment, overall rating; reminder via the daily job after 1 week, closes after 2 weeks. |
| 20 | Consolidation | S | Admin view of all answers (averages per statement), consolidated text, "send to organizer" (private). |

## Order and dependencies

```
1 ─ 2 ─ 3 ─ 4                (fixes, any order after 2)
        └─ 5 ─ 6 ─ 7 ─ 8 ─ 9
              └─ 10 ─ 11 ─ 12
#113 ─ 13 ─ 14 ─ 15 ─ 16 ─ 17
        └─ 18 ─ 19 ─ 20      (19's reminder uses the daily job from 16)
```

Phase 1 can ship immediately and fixes the ranking bug. Phases 2 and 3 can run in parallel after PR 5. Emails in
PRs 2–12 are added later in PR 13, so those PRs don't wait for #113.

## Not in this plan

Co-organizers and ownership transfer, fee payments, migration of existing events (status, level per contest).
