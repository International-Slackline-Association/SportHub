# Requirements: World Records & World Firsts Workflow

Status: **Draft v0** (for discussion, no implementation yet)
Branch: `workflow_records_firsts`

## 1. Goal

Let athletes submit World Record and World First claims directly in SportHub, have them
reviewed and verified by ISA, and publish approved claims on `/world_records` and the
athlete's profile. This replaces the manual process of maintaining the "World Records"
and "World Firsts" tabs in the ISA certificates Google Sheet.

## 2. Current state (as of main `a11688b`)

- `/world_records` shows two tabs, **World Records** and **World Firsts**
  (`src/app/world_records/`).
- Data is read-only from a Google Sheet (`ISA_CERTIFICATES_SPREADSHEET_ID`) via
  `src/lib/google-sheets.ts`, cached for 1 day in `getWorldRecords()` / `getWorldFirsts()`
  (`src/lib/data-services.ts`).
- Athletes are linked to rows by the sheet's "ISA Email" column matched against user
  profile emails. Athlete profiles show their records/firsts via
  `getAthleteWorldRecords()` / `getAthleteWorldFirsts()`.
- Fields today:
  - Record: line type, record type, specs, name, country, category (gender), event name,
    date, ISA email, link 1, link 2.
  - First: description, type of first, line type, specs, name, country, category, date,
    ISA email, link 1, link 2.
- There is no submission, review, or edit flow in the app. Everything is edited by hand
  in the sheet.
- Related patterns that already exist and could be reused:
  - Event approval: `draft → pending → published` with `/admin/event-approval`.
  - Score edits on published events are staged as `PendingScoreEdit` records and
    approved in `/admin/score-review`.
  - RBAC: roles `user` / `admin`, permission strings like `events:create`
    (`src/types/rbac.ts`).

## 3. Actors

| Actor | Description |
|---|---|
| Visitor | Anyone. Can browse published records and firsts. |
| Athlete (signed-in user) | Submits claims for themselves (and possibly co-athletes). |
| Reviewer | Verifies claims. For v1 this is ISA admins (`role: admin`). A dedicated reviewer group may come later. |
| Admin | Full control, can create/edit/retire entries directly. |

## 4. Lifecycle

```
draft ──submit──▶ pending ──approve──▶ published ──superseded──▶ historical
  ▲                 │  │
  └──changes req.───┘  └──reject──▶ rejected
```

- **draft**: saved by submitter, only visible to them.
- **pending**: awaiting review, visible to submitter and reviewers.
- **changes requested**: reviewer sends back with comments; submitter edits and resubmits.
- **published**: shown publicly.
- **rejected**: closed with a reason; visible to submitter.
- **historical / superseded**: a newer record beat this one. Still viewable as record history.

## 5. Functional requirements

### 5.1 Submission
- FR-1 A signed-in user can start a World Record or World First claim from
  `/world_records` and from their profile.
- FR-2 The form collects the fields listed in §6, with category-specific fields.
- FR-3 Evidence: at least one video/photo link is required. **Open:** allow file uploads (S3), or links only?
- FR-4 The submitter can save a draft and submit later.
- FR-5 The submitter can claim on behalf of multiple athletes (e.g. a team first). Co-athletes are picked from SportHub users, or entered by name if not registered.
- FR-6 For records, the form shows the current record in the same category so the submitter can see what they need to beat.
- FR-7 The submitter can withdraw a pending claim.

### 5.2 Review
- FR-8 Reviewers see a queue at `/admin/records-review` (pattern like `/admin/event-approval`).
- FR-9 Reviewers can approve, reject (reason required), or request changes (comment required).
- FR-10 Reviewers can edit fields before approving (e.g. normalise specs).
- FR-11 On approving a record that beats an existing one, the old one becomes historical automatically.
- FR-12 Every status change is logged with who, when, and the comment (audit trail).
- FR-13 **Open:** does a claim need more than one reviewer to approve?

### 5.3 Publishing & display
- FR-14 Published entries appear on `/world_records` and on each linked athlete's profile.
- FR-15 Records page can show history per category (who held it before).
- FR-16 Approval invalidates the world-records cache so the entry appears right away.

### 5.4 Notifications
- FR-17 Submitter is notified on approve / reject / changes requested. **Open:** email, in-app only, or none for v1? (No email sending exists in the app today.)
- FR-18 Reviewers are notified of new pending claims.

### 5.5 Migration
- FR-19 Existing sheet rows are imported once into SportHub as published entries.
- FR-20 Once the workflow is live, SportHub is the only source of truth and the Google Sheet is retired.
- FR-21 The Google Sheets read path for records/firsts (`getWorldRecordsSheet`, `getWorldFirstsSheet`,
  the sheet join in `getWorldRecords` / `getWorldFirsts`) is removed after the import is verified.
- FR-22 The import maps each row's "ISA Email" to a SportHub user where possible. Rows without a match
  keep the athlete name as text and are listed for an admin to link manually.

## 6. Data captured

| Field | Record | First | Notes |
|---|---|---|---|
| Line type (highline, longline, waterline, …) | ✓ | ✓ | controlled list |
| Record type (longest, highest, fastest, …) | ✓ | | controlled list |
| Type of first | | ✓ | controlled list |
| Description | | ✓ | free text |
| Specs (length, height, time) | ✓ | ✓ | **Open:** structured numbers + units so records can be compared, or free text as today? |
| Athlete(s) | ✓ | ✓ | SportHub user ids |
| Category (men / women / mixed) | ✓ | ✓ | |
| Country | ✓ | ✓ | default from athlete profile |
| Date | ✓ | ✓ | |
| Location / spot | ✓ | ✓ | |
| Event name | ✓ | | optional; record may be set outside an event |
| Rigging / setup details (webbing, anchors, tension) | ✓ | ✓ | **Open:** required? |
| Witnesses | ✓ | ✓ | **Open:** required? |
| Evidence links / files | ✓ | ✓ | at least one |

Storage proposal (to confirm in design): a new DynamoDB table or record type
`Record:{id}` / `First:{id}` with a status field, following the `PendingScoreEdit`
pattern for audit entries.

## 7. Permissions

Proposed new permissions in `src/types/rbac.ts`:
- `records:submit` — any signed-in user (implicit, like own-profile edit)
- `records:review` — granted to `admin` only in v1
- `records:manage` — admins (direct create/edit/delete)

Keeping `records:review` as its own permission (even though only admins hold it for now)
lets a separate records committee be added later without code changes.

## 8. Non-goals (v1)

- Automated verification (e.g. GPS / sensor data).
- Public voting or commenting on claims.
- National records. **Open:** in or out of scope?

## 9. Open questions

1. Is this reading right: athletes submit, ISA reviews, approved entries get published?
2. ~~Who reviews?~~ Decided: ISA admins for v1.
3. Evidence: links only, or uploads too?
4. Structured specs (numbers + units) vs free text?
5. Notifications: email in v1, or in-app status only?
6. ~~Google Sheet future?~~ Decided: imported once, then retired.
7. Are there official ISA rules for what counts as a record / first that the form must enforce (e.g. minimum evidence, rigging standards, leash rules, walking style: full man, onsight, free solo)?
8. National / continental records: in scope?
