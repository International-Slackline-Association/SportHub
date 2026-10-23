# Requirements: World Records & World Firsts Workflow

Status: **Draft v1** (for discussion, no implementation yet)
Branch: `workflow_records_firsts`

Source of the rules below: ISA Sport Commission, *Verification of Slackline World Records and
Slackline World Firsts*, April 2025 v1 (published at
https://data.slacklineinternational.org/sport/records-and-firsts-how-to/). Where this document
and that framework differ, the framework wins.

## 1. Goal

Let athletes (or people affiliated with them) claim World Records and World Firsts directly in
SportHub, have ISA admins verify them, and publish approved entries on `/world_records` and the
athletes' profiles. SportHub becomes the single source of truth and replaces the "World Records"
and "World Firsts" tabs of the ISA certificates Google Sheet.

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
  - Record: line type, record type, specs (free text), name, country, category (gender), event
    name, date, ISA email, link 1, link 2.
  - First: description, type of first, line type, specs, name, country, category, date,
    ISA email, link 1, link 2.
- There is no submission, review, or edit flow in the app, and no email sending.
- Related patterns that already exist and could be reused:
  - Event approval: `draft → pending → published` with `/admin/event-approval`.
  - Score edits on published events are staged as `PendingScoreEdit` records and
    approved in `/admin/score-review`.
  - RBAC: roles `user` / `admin`, permission strings like `events:create`
    (`src/types/rbac.ts`).

## 3. Scope

In scope:
- **World** records and **world** firsts only.
- Record categories and firsts categories as defined by the ISA framework (§6).
- Male and female categories (the framework keeps records "for male and female athletes").

Out of scope:
- Continental and national records. The ISA does not record them; national governing bodies do.
- Unleashed highline length/height records ("free solo"). The ISA does not document or
  communicate them for risk reasons, so they cannot be claimed.
- Line "crossings" (walks with falls or catches). Only sends count.
- Combos as world firsts. Only singular tricks.
- The framework's "Rankings" record categories (most yearly wins, most competitions won). They are
  ignored; none exist in the current sheet.
- Guinness World Records submission. ISA approval is a prerequisite for Guinness, but the Guinness
  process (and its fee) stays with the athlete.
- Evidence file uploads (planned after v1, see FR-14).
- Automated verification (GPS, sensors), public voting or commenting on claims.

## 4. Actors

| Actor | Description |
|---|---|
| Visitor | Anyone. Can browse published records and firsts. |
| Claimant (signed-in user) | The athlete, or a person affiliated with the attempt, who claims it. The ISA never starts a claim on someone's behalf. |
| Athlete(s) | The person or people who set the record / landed the first. May differ from the claimant. |
| Reviewer | ISA admins (`role: admin`) in v1, acting for the records working group of the Sport Commission. |
| Admin | Full control: can create, edit, retire, or reclassify entries directly. |

## 5. Lifecycle

```
            (optional, records only)
            announced ──▶ draft ──submit──▶ pending ──approve──▶ published ──superseded──▶ historical
                            ▲                 │  │
                            └──changes req.───┘  └──reject──▶ rejected (void)
```

- **announced** (records only): the athlete registers an upcoming attempt so ISA can confirm the
  minimum criteria and prepare communication (see FR-1). Optional, but strongly encouraged.
- **draft**: saved by the claimant, only visible to them.
- **pending**: awaiting review, visible to the claimant, athletes, and reviewers.
- **changes requested**: reviewer sends back with comments; claimant edits and resubmits.
- **published**: shown publicly.
- **rejected / void**: closed with a reason (e.g. didn't meet ISA standards, not significant,
  fair-play violation). Visible to claimant and athletes, not public.
- **historical**: a newer record in the same category beat this one. Still shown as record
  history.

Claim status is separate from **category status** (§6.1): a claim can be approved into a
category that is still *Unchallenged*.

## 6. Categories

### 6.1 Record categories

A record is defined by exactly **one superlative + one modality + one sub-category**
(e.g. "Highline length – Urban"). Categories are a controlled list managed by admins
("New subcategories can be added by the ISA Sport Commission").

#### Category status

Every record category has exactly one status:

| Status | Meaning | New claims? | Shown publicly? |
|---|---|---|---|
| **Active** | Established category that others compete in. | Yes | Yes, as a world record |
| **Unchallenged** | New category with a single record so far; nobody else has attempted it yet. This is the "on hold" state. | Yes | Yes, but clearly labelled "Unchallenged" and kept apart from the active world records |
| **Archived** | Discontinued category (e.g. Polyester / Polyamide splits). | No | Yes, as history |

- FR-C2 Only admins change a category's status. Nothing changes it automatically, not even a second
  record being submitted to an Unchallenged category. When that happens, the reviewer is prompted
  to decide whether to set the category to Active.
- FR-C3 A category created from a new-category request (FR-4 path b) starts as **Unchallenged** when the
  admin approves it.
- FR-C4 Archived categories are not offered in the submission form, but their records stay
  visible on `/world_records` and athlete profiles.
- FR-C5 Admins can create, rename, and re-order categories, and change their status, in an admin
  page (e.g. `/admin/records-categories`). Every status change is logged.

Initial list (from the framework, all Active unless marked; ✝ = Archived):

| Group | Leash | Measured | Sub-categories |
|---|---|---|---|
| Longline length over ground | unleashed | length (m) | Overall, Polyester ✝, Polyamide ✝, Humanline, Jumping |
| Water-midline length | leashed | length (m) | Overall, Polyester ✝, Polyamide ✝ |
| Mid-waterline length ✝ | unleashed | length (m) | Overall ✝ |
| Highline length | leashed | length (m) | Overall, Polyester ✝, Polyamide ✝, Urban, Unicycle, Tandem, Blind, Humanline, Underground (cave), Between cable cars |
| Highline height/depth | leashed | height (m) | Overall above ground/water, Urban above ground/water, Overall above sea level, Overall below sea level (underground) |
| Speed highline | leashed | time (s) | 60 m, 100 m, 200 m, 300 m, 400 m, 100 m blindfolded |
| Speedline over ground | unleashed | time (s) | 14.5 m, 29 m |
| Endurance | – | distance or duration | Slackline distance in 1 h, Highline distance in 24 h, Slackline distance in 24 h, Highline distance in 72 h, Highline distance blind without falling, Slackline distance in 31 days, Longest standing/walking duration, Longest surfing duration, Longest living on a highline |
| Trick | – | count, height, duration or distance | High jump over pole, Most front flips in a row, Longest handstand (slackline), Longest handstand (highline), Longest juggling walk 3 clubs, Longest juggling walk 5 clubs, Longest juggling duration, Longest football control, Most consecutive skips, Longest one-arm elbow lever, Most spins on Davinci slackline in 1 min |
| Rigging | – | length, count or latitude | Longest solo rig & derig, Most lines solo rigged & sent in 24 h, Most lines rigged & sent in 24 h (group), Most northern/southern highline |

- FR-C1 Each category stores: group, sub-category, superlative direction (higher-is-better or
  lower-is-better), measurement unit, leashed/unleashed, rule checklist (§7.4), witness minimum,
  and status (Active / Unchallenged / Archived).

### 6.2 World first categories

Freestyle Trickline, Freestyle Highline, Rodeoline, Static (not yet recorded). Male and female.
Admins can extend the list. Firsts can't be beaten, so their categories only use **Active** and
**Archived**. In future the framework may split "in competition" vs "in training",
so the data model should allow a context field.

## 7. Functional requirements

### 7.1 Before the attempt (records)
- FR-1 Athletes can **announce an upcoming record attempt** in SportHub: category, planned
  date and spot, athletes, planned setup. This emails ISA so they can confirm the minimum
  criteria before the attempt. This replaces "contact records@slacklineinternational.org before
  you attempt the record".
- FR-2 When a claim is submitted without a prior announcement, the reviewer sees a warning.
  The framework says such records "may be disqualified", so this is a reviewer decision, not a
  hard block.

### 7.2 Submission
- FR-3 A signed-in user can start a World Record or World First claim from `/world_records` and
  from their profile.
- FR-4 The form starts by asking what the claimant wants to do, as three clearly separate paths:
  - **(a) New record in an existing category**: the claimant picks the category from the list of
    Active and Unchallenged categories. Nothing else about the category is entered; its unit,
    rules and witness minimum come from the category.
  - **(b) Record in a new category**: the claimant proposes a new category (group, sub-category,
    what is measured and how, why it is a distinct superlative) together with the record itself.
    The reviewer decides on the category and the record in the same review. If the category is
    accepted, an admin creates it as Unchallenged (FR-C3).
  - **(c) World First**: the claimant picks a first category.
- FR-4a The rest of the form adapts to the chosen path and category (fields in §8).
- FR-4b A new-category request that the reviewer rejects can be turned into a claim for an
  existing category instead, if the reviewer finds a matching one.
- FR-5 For records, the form shows the current record in the chosen category so the claimant
  sees the mark to beat. The claimed value must beat it in the category's direction; the form
  blocks values that don't.
- FR-6 The claimant confirms a checklist of the category's rules before submitting (§7.4).
- FR-7 The claimant confirms the claim follows the ISA ethics guidelines and Code of Conduct.
- FR-8 The claimant can save a draft, withdraw a pending claim, and edit a claim when changes
  are requested.
- FR-9 Athletes are picked from SportHub users, or entered by name and email if not registered.
  The claimant does not have to be one of the athletes.

### 7.3 Evidence
- FR-10 **Full video documentation is required** for every record, ideally from multiple angles.
  The form requires at least one video link and allows several.
- FR-11 If full video is not possible, the claimant must explain why. The claim is still
  submitted, flagged for the reviewer.
- FR-12 **Witnesses:** at least two named bystanders (three for some categories, configurable
  per category). Name and contact for each, and their role during the attempt.
- FR-13 Firsts require at least one video of the trick being landed.
- FR-14 v1 accepts **links only** (YouTube, Vimeo, Instagram, Google Drive, …). File uploads to S3
  (for permanent archiving of evidence) are a planned later extension; the data model should allow
  evidence entries of type link or file.

### 7.4 Category rules shown as checklist items
The form shows the rules relevant to the chosen category, and the claimant ticks each one.
The reviewer sees the same checklist.

All records:
- Must be a **send**: entire walk continuous, no falling, sitting, or touching the line with
  anything but the feet.
- **One way** is enough; direction does not matter.
- **Controlled finish**: after the end mark, finish by sitting down or a controlled catch. A
  leash fall, even deliberate, voids the attempt.

Highline and water-midline:
- Start and end of the walk are **marked** on the line; the walk starts before the first mark
  and ends past the second.
- **No-fall zones** at the ends may be skipped, but must not be unnecessarily long.

Longline:
- **Anchor to anchor** (from weblock to sewn loop).

Urban highline: at least **80 %** of the line's length over urban landscape.

Waterline: at least **80 %** of the length over water; the line should not be rigged
unnecessarily high (a leash fall mid-line should roughly reach the water).

Measurements:
- **Length** = straight anchor-to-anchor distance, not including sag, not the walked distance.
- **Height** = height of the unloaded line, from the lower anchor to the lowest point of ground
  or water below the line.

### 7.5 Review
- FR-15 Reviewers see a queue at `/admin/records-review` (pattern like `/admin/event-approval`),
  with announced attempts and pending claims.
- FR-16 Reviewers can approve, reject (reason required), or request changes (comment required).
- FR-17 Reviewers can edit fields before approving (e.g. correct measurements, fix category).
- FR-18 The review screen shows the previous record holder and value, and the difference to the
  claim, so the reviewer can judge whether the increase is **significant**. Significance is a
  reviewer judgment; the framework sets no fixed threshold.
- FR-19 For a new-category claim (path b), the review screen shows the proposed category next to
  similar existing ones, so the reviewer can accept it, map the claim to an existing category,
  or reject it. The framework requires one superlative, one modality and one sub-category, and
  says a record must be **challenged** to be relevant; new categories therefore start as
  Unchallenged (§6.1).
- FR-20 For firsts, the review screen shows the framework's criteria: innovative / iconic,
  distinct from existing tricks, requires advanced skill, significant leap forward, has a clear
  name. Reviewers can link the claim to similar existing firsts for comparison.
- FR-21 On approving a record that beats an existing one, the old one becomes **historical**
  automatically.
- FR-22 Every status change is logged with who, when, and the comment (audit trail).

### 7.6 Publishing & display
- FR-23 Published entries appear on `/world_records` and on each linked athlete's profile.
- FR-24 The records page can show history per category (previous holders and values).
- FR-25 Approval invalidates the world-records cache so the entry appears right away.
- FR-26 **Certificates:** athletes can download a personalised World Record / World First
  certificate today at account.slacklineinternational.org. **Open:** should SportHub generate the
  certificate (PDF) on approval, or keep linking to the existing service?

### 7.7 Notifications
- FR-27 Athletes are emailed when their claim changes status:
  - **submitted**: confirmation that ISA received the claim;
  - **approved / published**: with a link to the public entry;
  - **changes requested**: with the reviewer's comment and a link to edit the claim;
  - **rejected**: with the reviewer's reason.
  Recipients are the claimant and every athlete on the claim who has an email. The current
  status is always visible in the app too (a "My claims" list).
- FR-28 When a claim is submitted (draft → pending, including resubmission after changes
  requested), or an attempt is announced, an email goes to **records@slacklineinternational.org**.
  It contains the claim type, athlete name(s), summary (category, value, date, location),
  evidence links, and a link to the claim in `/admin/records-review`.
- FR-29 When a claim is approved and published, an email goes to
  **communication@slacklineinternational.org** so the team can announce it. It contains the
  athlete name(s) and country, claim type, category, value, date, location, evidence links, and
  the link to the public entry. If it supersedes an existing record, the previous holder and
  value are included. Communication is resource-intensive for a volunteer organisation, so the
  email should go out as soon as the claim is approved.
- FR-30 All ISA recipient addresses are configurable (environment variables), not hard-coded.
- FR-31 A failed email send must not block or roll back the action; it is logged. (Needs a mail
  provider, e.g. AWS SES.)

### 7.8 Migration
- FR-33 Existing sheet rows are imported once into SportHub as published entries, mapped to the
  categories in §6. Rows that don't map cleanly are listed for an admin to fix.
- FR-34 Once the workflow is live, SportHub is the only source of truth and the Google Sheet is
  retired.
- FR-35 The Google Sheets read path for records/firsts (`getWorldRecordsSheet`,
  `getWorldFirstsSheet`, the sheet join in `getWorldRecords` / `getWorldFirsts`) is removed
  after the import is verified.
- FR-36 The import maps each row's "ISA Email" to a SportHub user where possible. Rows without a
  match keep the athlete name as text and are listed for an admin to link manually.
- FR-37 The free-text "specs" of imported rows are parsed into value + unit where possible; the
  original text is kept for reference.

## 8. Data captured

| Field | Record | First | Notes |
|---|---|---|---|
| Category (group + sub-category) | ✓ | | from §6.1 |
| First category | | ✓ | from §6.2 |
| Trick name | | ✓ | required; a first needs a clear name |
| Description | (✓) | ✓ | |
| Value + unit | ✓ | | structured, so records can be compared; unit from category |
| Specs text | ✓ | ✓ | optional extra detail (e.g. line height on a length record) |
| Athlete(s) | ✓ | ✓ | SportHub user ids or name + email |
| Gender category | ✓ | ✓ | male / female |
| Country | ✓ | ✓ | default from athlete profile |
| Date of attempt | ✓ | ✓ | |
| Location / spot (name, country, coordinates) | ✓ | ✓ | coordinates needed for "most northern/southern" and height above sea level |
| Event | ✓ | ✓ | optional link to a SportHub event; "in competition" vs "in training" for firsts |
| Setup (webbing, anchors, leash/backup) | ✓ | | free text |
| Witnesses (name, contact, role) | ✓ | | min. 2, or 3 per category |
| Evidence links | ✓ | ✓ | at least one video |
| Rule checklist confirmations | ✓ | | per §7.4 |
| Announced attempt reference | ✓ | | optional |
| Claimant | ✓ | ✓ | the signed-in user |
| Status, review comments, audit log | ✓ | ✓ | |

Storage proposal (to confirm in design): a new DynamoDB table or record types
`Record:{id}` / `First:{id}` with a status field, and `RecordCategory:{id}` for the controlled
lists, following the `PendingScoreEdit` pattern for audit entries.

## 9. Permissions

Proposed new permissions in `src/types/rbac.ts`:
- `records:submit`: any signed-in user (implicit, like own-profile edit)
- `records:review`: granted to `admin` only in v1
- `records:manage`: admins (direct create/edit/delete, manage categories)

Keeping `records:review` as its own permission (even though only admins hold it for now)
lets the records working group get access later without code changes.

## 10. Decisions so far

- Reading confirmed: athletes claim, ISA reviews, approved entries are published.
- Reviewers: ISA admins in v1.
- Google Sheet: imported once, then retired.
- Emails: records@ on submission and announcement, communication@ on approval, athletes on every status change.
- National/continental records: out of scope (ISA framework).
- Free solo highline records: not accepted (ISA framework).
- Record categories have a status: Active, Unchallenged, Archived. Only admins change it.
- The submission form separates "existing category" from "new category" claims.
- Ranking record categories are ignored.
- Specs: structured value + unit (needed to compare records).
- Evidence: full video and at least two witnesses for records (ISA framework); links only in v1, uploads later.

## 11. Open questions

1. Certificates: generate in SportHub, or keep the existing account.slacklineinternational.org
   download? (FR-26)
2. Is the "announce attempt" step (FR-1) wanted in v1, or later?
