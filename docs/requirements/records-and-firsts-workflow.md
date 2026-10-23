# Requirements: World Records & World Firsts Workflow

Status: **Draft v3** (for discussion, no implementation yet)
Branch: `workflow_records_firsts`

Source of the rules below: ISA Sport Commission, *Slackline World Records and World Firsts*,
October 2026 v2 (authors Thomas Buckingham and Jonas Umlauft; also published at
https://data.slacklineinternational.org/sport/records-and-firsts-how-to/). It replaces the April
2025 v1. Where this document and that framework differ, the framework wins, and the ISA Sport
Commission is the final deciding body on accepting a record or first.

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
- Male and female records and firsts, tracked separately. The framework says the inferior of the two carries
  the gender-specific title.

Out of scope:
- Continental and national records. The ISA does not record them; national governing bodies do.
- Unleashed highline length/height records ("free solo"). The ISA does not document or
  communicate them for risk reasons, so they cannot be claimed.
- Line "crossings" (walks with falls or catches). Only sends count (§7.4). The only exception is a
  highline "run" (speedline), where leash falls during the run are allowed.
- Combos as world firsts. Only singular tricks.
- The framework's "Rankings" record categories (most yearly wins, most competitions won). They are
  ignored; none exist in the current sheet.
- Guinness World Records submission. Guinness consults the ISA as an official body but is
  independent; its process stays with the athlete.
- Separate records per webbing material. The framework discontinued these.
- Evidence file uploads (planned after v1, see FR-14).
- Announcing record attempts in the app (later).
- Automated verification (GPS, sensors), public voting or commenting on claims.

## 4. Actors

| Actor | Description |
|---|---|
| Visitor | Anyone. Can browse published records and firsts. |
| Claimant (signed-in user with a SportHub account) | The athlete, or a person affiliated with the attempt, who claims it. The ISA never starts a claim on someone's behalf. |
| Athlete(s) | The person or people who set the record / landed the first. Each needs a SportHub account. May differ from the claimant, who also needs one. |
| Reviewer | ISA admins (`role: admin`) in v1, acting for the Sport Commission, which is the final deciding body. |
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
"Fastest 100 m speed highline"). There is no further hierarchy. The list is managed by admins on behalf of the ISA Sport
Commission.

#### Category status

Every record category has exactly one status:

| Status | Meaning | New claims? | Shown publicly? |
|---|---|---|---|
| **Active** | Established category that others compete in. | Yes | Yes, as a world record |
| **Unchallenged** | New category with a single record so far; nobody else has attempted it yet. This is the "on hold" state. | Yes | Yes, but clearly labelled "Unchallenged" and kept apart from the active world records |
| **Archived** | Discontinued category, e.g. the old records per webbing material (Polyester, Polyamide). | No | Yes, as history |

- FR-C2 Only admins change a category's status. Nothing changes it automatically, not even a second
  record being submitted to an Unchallenged category. When that happens, the reviewer is prompted
  to decide whether to set the category to Active.
- FR-C3 A category created from a new-category request (FR-4 path b) starts as **Unchallenged** when the
  admin approves it.
- FR-C4 Archived categories are not offered in the submission form, but their records stay
  visible on `/world_records` and athlete profiles.
- FR-C5 Admins can create, rename, and re-order categories, and change their status, in an admin
  page (e.g. `/admin/records-categories`). Every status change is logged.

The initial set of categories is loaded as seed data from the **April 2025 v1 framework list**
(the October 2026 framework no longer lists categories). Categories that v1 marks as historical or
discontinued, and the material-specific ones (Polyester, Polyamide), are loaded as Archived. The
"Rankings" categories from v1 are not loaded. Records imported from the Google Sheet (FR-33) are
matched to these categories; rows that match none are listed for an admin to resolve.

- FR-C1 Each category stores: name, superlative direction (higher-is-better or
  lower-is-better), value type (a number with a unit, or coordinates), leashed/unleashed, rule checklist (§7.4), and status
  (Active / Unchallenged / Archived).

### 6.2 World first categories

Trickline, Highline Freestyle, Rodeoline, and Static (not yet recorded). Admins can extend the list.
Firsts can't be beaten, so their categories only use **Active** and **Archived**. The framework says it does not matter whether a first was landed in training or in
competition, as long as evidence is sufficient, so "in competition" is only an optional field.

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
- FR-9b **Shared records and firsts:** a record or first can be shared by several people (e.g. a tandem
  highline, a team rigging record, a first landed by two athletes). The claimant selects
  **one or more athletes** on the claim, and all of them hold the record equally. Consequences:
  - the entry is shown once on `/world_records`, listing every athlete, and appears on each
    athlete's profile;
  - each athlete gets the emails (FR-27) and their own certificate (FR-26);
  - there is **no mixed list**, for records and for firsts alike. Each athlete's record or first
    goes on the list for their gender: women on the women's list, men on the men's list. A shared
    entry with both men and women appears on both lists, each time listing the athletes of that gender (and the full team as context);
  - a record is tracked per list, so it is beaten, and becomes historical, separately on the
    men's and on the women's list.
- FR-9a Each athlete's **gender category and country come from the athlete database** (the
  athlete's SportHub profile / ISA user record), not from the claim form. They are copied onto the
  claim when it is submitted, so the published entry keeps showing the values that applied at the
  time. Where a claim has several athletes, each athlete has their own values (e.g. a mixed team).
  The lists a claim appears on (men's, women's) are derived from the athletes' gender.

### 7.3 Evidence
- FR-10 **Full video documentation is required** for every record, ideally from multiple angles.
  The form requires at least one video link and allows several.
- FR-11 If full video is not possible, the claimant must explain why. The claim is still
  submitted, flagged for the reviewer.
- FR-12 **Witnesses:** at least two named bystanders, who have the knowledge and experience for the
  role and know what their role is. Name and contact for each, and their role during the attempt.
- FR-13 Firsts require at least one video of the trick being landed.
- FR-14 v1 accepts **links only** (YouTube, Vimeo, Instagram, Google Drive, …). File uploads to S3
  (for permanent archiving of evidence) are a planned later extension; the data model should allow
  evidence entries of type link or file.

### 7.4 Category rules shown as checklist items
The form shows the rules relevant to the chosen category, and the claimant ticks each one.
The reviewer sees the same checklist.

**Highline send** (all highline length and height records):
- The entire length of the line is walked, except for the no-fall zones, in any direction,
  continuously, without falling, sitting, or touching the line with anything but the feet.
- **No-fall zones** at the start and end of the line (where a leash fall is dangerous, e.g. due to
  insufficient clearance to the ground) may be skipped, but if they are unnecessarily long the line
  was rigged incorrectly and the attempt may be voided.
- **Controlled finish:** the athlete ends by sitting down or with a controlled catch. A leash fall
  voids the attempt, even a deliberate one.

**Longline send:** like a highline send, but with no no-fall zones. The athlete walks from end to
end (weblock to sewn loop).

**Waterline:** at least **80 %** of the line's length over a body of water. The line is not rigged
unnecessarily high (a leash fall mid-line should potentially touch the water). The athlete is
leashed and the line has a backup.

**Urban highline:** at least **80 %** of the line's length over urban landscape.

**Highline run (speedline):**
- The distance is marked on the line with tape. The athlete's full body is behind the starting
  tape at the start; the time stops when the athlete touches the finish tape.
- The athlete may leash-fall during the run.
- The line length must match the running distance (a 100 m run on a 1 km line does not count).

**Measurements:**
- **Line length** = straight anchor-to-anchor distance, without adding sag and without subtracting
  the no-fall zones. It does not depend on the distance actually walked.
- **Line height** = from the lower of the two anchors to the lowest point of ground or water below
  the straight line between the anchors.

**World firsts:**
- A single trick, not a combo.
- The athlete is in **full control at initiation and termination** of the trick.
- Trickline: the athlete keeps the final position until reaching nearly static control, with no
  saving by going to another position (e.g. chest or butt).
- Highline Freestyle: the athlete keeps the final position for a total of 3 bounces, with no
  "saving tricks" (e.g. Yoda, Rocket).

### 7.5 Review
- FR-15 Reviewers see a queue at `/admin/records-review` (pattern like `/admin/event-approval`),
  with pending claims.
- FR-16 Reviewers can approve, reject (reason required), or request changes (comment required).
- FR-17 Reviewers can edit fields before approving (e.g. correct measurements, fix category).
- FR-18 The review screen shows the previous record holder and value, and the difference to the
  claim, so the reviewer can judge whether the increase is **significant**. Significance is a
  reviewer judgment; the framework sets no fixed threshold. The Sport Commission is the final
  deciding body.
- FR-19 For a new-category claim (path b), the review screen shows the proposed category next to
  similar existing ones, so the reviewer can accept it, map the claim to an existing category,
  or reject it. The review screen lists the framework's criteria for a world record, which the
  reviewer checks: **measurable** (one quantitative, objective metric), **standardisable** (ISA
  definitions exist, e.g. what a send is), **breakable** (anyone can in principle break it),
  **significant and separable** (a minor variation such as sitting vs standing start, or 60 m vs
  65 m, is not a separate record), **challenged**, **verifiable**, and **claimed**. A category
  that is not yet challenged starts as Unchallenged (§6.1).
- FR-20 For firsts, the review screen shows the framework's criteria: innovative / iconic,
  distinct from existing tricks, requires advanced skill, significant leap forward, has a clear
  name, and full control at initiation and termination. Reviewers can link the claim to similar
  existing firsts for comparison.
- FR-21 On approving a record that beats an existing one on the same men's or women's list, the
  old one becomes **historical** on that list automatically (FR-9b).
- FR-22 Every status change is logged with who, when, and the comment (audit trail).

### 7.6 Publishing & display
- FR-23 Published entries appear on `/world_records` and on each linked athlete's profile.
- FR-23a **Record titles.** Within a category, the better of the current men's and women's records
  is titled **World Record**, and the other one carries the gender-specific title:
  - if the men's record is better, the women's record is titled **Women's World Record** and the
    men's record **World Record**;
  - if the women's record is better, the men's record is titled **Men's World Record** and the
    women's record **World Record**.
  "Better" follows the category's direction (higher or lower is better). The title is computed from
  the current values whenever a record is approved or archived, it is not stored by hand. If a
  category has a record on only one list, that record is simply **World Record**, and if both are
  exactly equal both are **World Record**.
- FR-23b **Firsts lists.** World Firsts are separated by gender in the same way as records: a first
  by a woman is on the women's list, a first by a man on the men's list. Because a first cannot be
  beaten, there is no "better" comparison and no gender-specific title; each entry is just a
  **World First** on its list. The same trick can therefore be a first on each list (the first
  woman and the first man to land it), and the reviewer sees existing firsts of both lists when
  checking that a trick is distinct (FR-20).
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
| Value | yes | structured so records can be compared. A number with a unit (the unit comes from the category), or for geographic categories (e.g. most northern / southern highline) the coordinates themselves |
| Athlete(s) | yes | one or more SportHub users (shared records, FR-9b). Gender category and country are not entered; they come from each athlete's data (FR-9a). |
| Date of attempt | yes | |
| Location / spot | yes | name and country. Coordinates are not a separate field: where a category's value is a location, the coordinates are the value |
| Event | no | optional link to a SportHub event |
| Setup | no | free text: webbing, anchors, leash and backup |
| Further specs | no | free text, e.g. line height on a length record |
| Witnesses | yes | name, contact and role; at least 2 |
| Evidence links | yes | at least one video link (FR-10 to FR-14) |
| Reason if no full video | conditional | required when full video is missing (FR-11) |
| Rule checklist confirmations | yes | per the category (§7.4) |
| Ethics confirmation | yes | FR-7 |

### 8.2 World first claim

| Field | Required | Notes |
|---|---|---|
| First category | yes | Trickline, Highline Freestyle, Rodeoline, Static |
| Trick name | yes | a first needs a clear name |
| Description | yes | what the trick is and how it is performed |
| Why it is a first | yes | short justification against the framework's criteria (innovative, distinct, advanced skill, significant) |
| Similar existing tricks | no | tricks the claimant considers closest, and how this one differs |
| Athlete(s) | yes | one or more SportHub users (shared records, FR-9b). Gender category and country are not entered; they come from each athlete's data (FR-9a). |
| Date landed | yes | |
| Location / spot | no | name and country |
| In competition? | no | optional: in competition (with an optional link to a SportHub event) or not. Not required because the framework does not yet separate competition and training firsts |
| Line details | no | line type and length or height where relevant |
| Evidence links | yes | at least one video link showing the trick being landed |
| Control confirmation | yes | full control at initiation and termination, per the category's termination rule (§7.4) |
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
lets the Sport Commission's records group get access later without code changes.

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
- No mixed list: records go on the men's or women's list by the athlete's gender; shared records appear on both when the team is mixed.
- World firsts are separated by gender the same way as records, without gendered titles (FR-23b).
- Record titles: the better of men's / women's record is "World Record", the other is "Women's" / "Men's World Record" (FR-23a).
- Initial categories are seeded from the April 2025 v1 list.
- Rules follow the ISA framework October 2026 v2 (checked against it in this version).

## 11. Open questions

None at the moment.
