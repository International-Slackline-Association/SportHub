# Requirements: World Records & World Firsts Workflow

Status: **Draft v2** (for discussion, no implementation yet)
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
- Announcing record attempts in the app (later).
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
            draft ──submit──▶ pending ──approve──▶ published ──superseded──▶ historical
                            ▲                 │  │
                            └──changes req.───┘  └──reject──▶ rejected (void)
```

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

A record category is a single named entry in a flat list (e.g. "Highline length – Urban",
"Fastest 100 m speed highline"). There is no further hierarchy. Each category has one
superlative and one modality, as the ISA framework requires. The list is managed by admins
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

The initial categories are taken from the ISA framework, which lists them in its section "World record
categories". They are loaded as seed data, with the framework's discontinued ones set to Archived.

- FR-C1 Each category stores: name, superlative direction (higher-is-better or
  lower-is-better), measurement unit, leashed/unleashed, rule checklist (§7.4), witness minimum,
  and status (Active / Unchallenged / Archived).

### 6.2 World first categories

Freestyle Trickline, Freestyle Highline, Rodeoline, Static (not yet recorded). Male and female.
Admins can extend the list. Firsts can't be beaten, so their categories only use **Active** and
**Archived**. In future the framework may split "in competition" vs "in training",
so the data model keeps this as an optional field.

## 7. Functional requirements

### 7.1 Before the attempt (records)
- FR-1 Announcing an attempt in SportHub is **not part of v1**. Athletes keep emailing
  records@slacklineinternational.org before an attempt, as the ISA framework asks. The claim form
  reminds them of this, and the reviewer can ask the claimant whether ISA was contacted in
  advance (the framework says records without this "may be disqualified"). A later version could add
  an in-app "announce attempt" step with an email to ISA and a reviewer warning on claims that skipped it.

### 7.2 Submission
- FR-3 A signed-in user can start a World Record or World First claim from `/world_records` and
  from their profile.
- FR-4 The form starts by asking what the claimant wants to do, as three clearly separate paths:
  - **(a) New record in an existing category**: the claimant picks the category from the list of
    Active and Unchallenged categories. Nothing else about the category is entered; its unit,
    rules and witness minimum come from the category.
  - **(b) Record in a new category**: the claimant proposes a new category (name,
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
- FR-9 A **SportHub account is required** to claim a record or first, and every athlete on a claim
  must have a SportHub account too. Athletes are picked from existing SportHub users; free-text
  athletes are not allowed. An athlete who has no account yet has to register before the claim can
  be submitted. The claimant does not have to be one of the athletes (e.g. a team member or an
  affiliated person can claim on their behalf).
- FR-9a Each athlete's **gender category and country come from the athlete database** (the
  athlete's SportHub profile / ISA user record), not from the claim form. They are copied onto the
  claim when it is submitted, so the published entry keeps showing the values that applied at the
  time. Where a claim has several athletes, each athlete has their own values (e.g. a mixed team).
  The claim's men / women classification is derived from the athletes' gender.

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
  with pending claims.
- FR-16 Reviewers can approve, reject (reason required), or request changes (comment required).
- FR-17 Reviewers can edit fields before approving (e.g. correct measurements, fix category).
- FR-18 The review screen shows the previous record holder and value, and the difference to the
  claim, so the reviewer can judge whether the increase is **significant**. Significance is a
  reviewer judgment; the framework sets no fixed threshold.
- FR-19 For a new-category claim (path b), the review screen shows the proposed category next to
  similar existing ones, so the reviewer can accept it, map the claim to an existing category,
  or reject it. The framework requires one superlative and one modality per category, and
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
- FR-26 **Certificates:** when a claim is approved, SportHub generates a personalised World Record /
  World First certificate (PDF) for each athlete on the claim, using the existing ISA certificate
  design. Athletes download it from their profile and from "My claims". Admins can regenerate it
  (e.g. after correcting a name). This replaces the download at account.slacklineinternational.org.
  Certificates for imported (historical) entries are generated on demand.

### 7.7 Notifications
- FR-27 Athletes are emailed when their claim changes status:
  - **submitted**: confirmation that ISA received the claim;
  - **approved / published**: with a link to the public entry;
  - **changes requested**: with the reviewer's comment and a link to edit the claim;
  - **rejected**: with the reviewer's reason.
  Recipients are the claimant and every athlete on the claim who has an email. The current
  status is always visible in the app too (a "My claims" list).
- FR-28 When a claim is submitted (draft → pending, including resubmission after changes
  requested), an email goes to **records@slacklineinternational.org**.
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
  This is the only case where an athlete is stored without an account (historical entries); new
  claims always need one (FR-9).
- FR-37 The free-text "specs" of imported rows are parsed into value + unit where possible; the
  original text is kept for reference.

## 8. Data captured

Records and firsts are different kinds of claim and are stored with different fields.

### 8.1 World record claim

| Field | Required | Notes |
|---|---|---|
| Category | yes (path a) | picked from Active and Unchallenged categories |
| New category proposal | yes (path b) | name, what is measured and how, unit, higher/lower is better, why it is a distinct superlative |
| Value + unit | yes | structured so records can be compared; the unit comes from the category |
| Athlete(s) | yes | SportHub users. Gender category and country are not entered; they come from each athlete's data (FR-9a). |
| Date of attempt | yes | |
| Location / spot | yes | name, country, coordinates (needed for height above sea level and "most northern/southern") |
| Event | no | optional link to a SportHub event |
| Setup | no | free text: webbing, anchors, leash and backup |
| Further specs | no | free text, e.g. line height on a length record |
| Witnesses | yes | name, contact and role; at least 2, or 3 where the category says so |
| Evidence links | yes | at least one video link (FR-10 to FR-14) |
| Reason if no full video | conditional | required when full video is missing (FR-11) |
| Rule checklist confirmations | yes | per the category (§7.4) |
| Ethics confirmation | yes | FR-7 |

### 8.2 World first claim

| Field | Required | Notes |
|---|---|---|
| First category | yes | Freestyle Trickline, Freestyle Highline, Rodeoline, Static |
| Trick name | yes | a first needs a clear name |
| Description | yes | what the trick is and how it is performed |
| Why it is a first | yes | short justification against the framework's criteria (innovative, distinct, advanced skill, significant) |
| Similar existing tricks | no | tricks the claimant considers closest, and how this one differs |
| Athlete(s) | yes | SportHub users. Gender category and country are not entered; they come from each athlete's data (FR-9a). |
| Date landed | yes | |
| Location / spot | no | name and country |
| In competition? | no | optional: in competition (with an optional link to a SportHub event) or not. Not required because the framework does not yet separate competition and training firsts |
| Line details | no | line type and length or height where relevant |
| Evidence links | yes | at least one video link showing the trick being landed |
| Ethics confirmation | yes | FR-7 |

A first has no value, no witnesses, and no rule checklist: it is a single trick and is judged
against the criteria in FR-20.

### 8.3 Fields on every claim

Claimant (the signed-in user), claim type, status, submission and decision timestamps, review
comments, and the audit log (FR-22).

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
- Emails: records@ on submission, communication@ on approval, athletes on every status change.
- National/continental records: out of scope (ISA framework).
- Free solo highline records: not accepted (ISA framework).
- Certificates are generated by SportHub (replacing account.slacklineinternational.org).
- Record categories have a status: Active, Unchallenged, Archived. Only admins change it.
- The submission form separates "existing category" from "new category" claims.
- Ranking record categories are ignored.
- Specs: structured value + unit (needed to compare records).
- Evidence: full video and at least two witnesses for records (ISA framework); links only in v1, uploads later.

## 11. Open questions

None at the moment.
