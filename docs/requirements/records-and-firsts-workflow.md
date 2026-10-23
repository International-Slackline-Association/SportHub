# Requirements: World Records & World Firsts Workflow

Status: **v5** (updated on 2026-10-23 to match the implementation after Jonas's review of the running app)
Branch: `workflow_records_firsts` (requirements and implementation)

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
- Men's, women's and mixed records and firsts, tracked as separate lists (§7.2 FR-9b). The framework says the
  inferior carries the gender-specific title (FR-23a).

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
| Athlete(s) | The person or people who set the record / landed the first. Each is a SportHub profile, either an existing one or one entered on the claim (FR-9). May differ from the claimant, who needs a signed-in account. |
| Reviewer | ISA admins (`role: admin`) in v1, acting for the Sport Commission, which is the final deciding body. |
| Admin | Can edit, reclassify, archive and correct entries, manage categories, and resolve the import review list. Admins do not create new entries from scratch: the ISA never starts a claim on someone's behalf. |

## 5. Lifecycle

```
draft ──submit──▶ pending ──approve──▶ published ──beaten (records only)──▶ historical
  ▲   ◀─withdraw──  │  │  │
  │                 │  │  └──reject──▶ rejected (void)
  │                 ▼  │
  └─resubmit── changes_requested
```

- **draft**: saved by the claimant, only visible to them.
- **pending** ("under review" in the UI): awaiting review, visible to the claimant, athletes, and reviewers.
  The claimant can withdraw it, which puts it back to draft.
- **changes requested**: a status of its own. The reviewer sends the claim back with a comment; the claimant
  edits and resubmits, which puts it back to pending.
- **published**: shown publicly.
- **rejected / void**: closed with a reason (e.g. didn't meet ISA standards, not significant,
  fair-play violation). Visible to claimant and athletes, not public.
- **historical**: a newer record on the same list beat this one. Still shown as record
  history. Only records become historical; a first cannot be beaten and stays published.

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
- FR-C5 Admins create and edit categories at `/admin/records-categories` ("Modify Categories"): every field
  of FR-C1 plus the display order, and the status. Every change is logged with who, when and what changed.

The initial set of categories is loaded as seed data from the **April 2025 v1 framework list**
(the October 2026 framework no longer lists categories). Categories that v1 marks as historical or
discontinued, and the material-specific ones (Polyester, Polyamide), are loaded as Archived. The
"Rankings" categories from v1 are not loaded. Records imported from the Google Sheet (FR-33) are
matched to these categories; rows that match none are listed for an admin to resolve.

- FR-C1 Each category stores: **name**, **description**, **group** (Length, Endurance, Speed, Altitude,
  Other), **unit** (free text), superlative **direction** (higher-is-better or lower-is-better), and
  **status** (Active / Unchallenged / Archived). Nothing else: no line type, leashed flag or rule
  checklist. The units "m" (metres), "s" (a time, entered as e.g. "1:59 min") and "count" are read
  smartly, "°" means coordinates (FR-C6), and any other unit is a plain number. Altitude is highline
  height or depth. Changing a category's unit type re-reads the values of its entries. The witness minimum is the same for every record (2, FR-12), so it is not
  stored per category.
- FR-C6 **Geographic category:** "most northern / most southern highline" is **one** category. Its value is the
  spot's coordinates, and the record with the larger **absolute latitude** wins (north or south). Longitude is
  stored but not compared.

### 6.2 World first categories

Trickline, Highline Freestyle, Rodeoline, and Static (not yet recorded). Admins create and edit first
disciplines on the same admin page as record categories: name, **termination rule** (when a trick counts as
landed, for the reviewer), status and order. Changes are logged.
Firsts can't be beaten, so their categories only use **Active** and **Archived**. The framework says it does not matter whether a first was landed in training or in
competition, as long as evidence is sufficient, so the claim does not ask whether it was landed in a competition.

## 7. Functional requirements

### 7.1 Before the attempt (records)
- FR-1 Announcing an attempt in SportHub is **not part of v1**. Athletes keep emailing
  records@slacklineinternational.org before an attempt, as the ISA framework asks. The claim form
  reminds them of this, and the reviewer can ask the claimant whether ISA was contacted in
  advance (the framework asks for this because definitions are often ambiguous). A later version could add
  an in-app "announce attempt" step with an email to ISA and a reviewer warning on claims that skipped it.

### 7.2 Submission
- FR-3 A signed-in user starts a claim with **one** button, "Claim World Record or World First", on
  `/world_records` and on "My claims" (`/world_records/my-claims`), and from the dashboard. The form itself
  then asks what is claimed (FR-4).
- FR-4 The form starts by asking what the claimant wants to do, as three clearly separate paths:
  - **(a) New record in an existing category**: the claimant picks the category from the list of
    Active and Unchallenged categories. Nothing else about the category is entered; its unit
    and rules come from the category.
  - **(b) Record in a new category**: the claimant proposes a new category (name,
    what is measured and how, why it is a distinct superlative) together with the record itself.
    The reviewer decides on the category and the record in the same review. If the category is
    accepted, an admin creates it as Unchallenged (FR-C3).
  - **(c) World First**: the claimant picks a first category.
- FR-4a The rest of the form adapts to the chosen path and category (fields in §8).
- FR-4b A new-category request that the reviewer rejects can be turned into a claim for an
  existing category instead, if the reviewer finds a matching one.
- FR-5 For records, the form shows the current record on the claim's list (men's, women's or mixed, FR-9b) so
  the claimant sees the mark to beat. The claimed value must **beat or equal** it in the category's direction;
  the form blocks values below it. A claim that equals the current record makes the athlete(s) **co-holders**
  (FR-9c).
- FR-6 ~~The claimant confirms a checklist of the category's rules before submitting (§7.4).~~ Deferred, see open issue 1 (§11).
- FR-7 The claimant confirms the claim follows the ISA ethics guidelines and Code of Conduct.
- FR-8 The claimant can save a draft, withdraw a pending claim, and edit a claim when changes
  are requested.
- FR-9 A **signed-in SportHub account is required** to claim a record or first. Every athlete on a claim
  is a SportHub profile: the claimant picks existing profiles (signed in or not, e.g. athletes migrated from
  the rankings), or enters a new athlete (name, surname, email, gender, country), like the "pending user" step
  of event submission. A new athlete's profile is created when the claim is approved. The claimant does not
  have to be one of the athletes (e.g. a team member or an affiliated person can claim on their behalf).
- FR-9d **Gender required:** every athlete must have gender male or female on their profile (or on the new
  athlete entry). An athlete with no gender or "other" blocks submission for now, with a link to fix the
  profile.
- FR-9e **Consent:** athletes are not asked to confirm a claim; they are informed by the "submitted" email
  (FR-27). If the claimant is not the athlete, or several athletes are on the claim, the claimant must confirm
  that they have the consent of every athlete named on it.
- FR-9b **Records and firsts with multiple athletes:** a record or first can be **one joint performance by
  several people** (e.g. a tandem highline, a group rigging record, a first landed by two athletes together).
  The claimant selects **one or more athletes** on the claim, and all of them hold it equally. Consequences:
  - the entry is shown once on `/world_records`, listing every athlete, and appears on each
    athlete's profile;
  - each athlete gets the emails (FR-27) and their own certificate (FR-26);
  - the entry's **list** follows the athletes' gender: all men → **men's** list, all women → **women's** list,
    men and women together → **mixed** list. Single-athlete entries are always on the men's or women's list.
    This applies to records and firsts alike;
  - a record is tracked per list, so it is beaten, and becomes historical, separately on the men's, women's and
    mixed lists.
- FR-9c **Co-holders (shared records):** several athletes who reach the **same value separately** (e.g. six
  people each sending the same 1900 m highline) are **co-holders**. Each one is a separate claim with its own
  evidence, video and witnesses, and a separate entry. Equal current values on a list are all shown as the
  current record; only a strictly better value makes them historical.
- FR-9f **UI wording:** the claim form makes the difference between FR-9b and FR-9c explicit at the athlete
  step. Adding more than one athlete asks the claimant to confirm it was **one joint performance**, and says
  that athletes who did the same thing separately (co-holders) must each submit their own claim.
- FR-9a Each athlete's **gender category and country come from the athlete database** (the
  athlete's SportHub profile / ISA user record), not from the claim form. They are copied onto the
  claim when it is submitted, so the published entry keeps showing the values that applied at the
  time. Where a claim has several athletes, each athlete has their own values (e.g. a mixed team).
  The list a claim appears on (men's, women's or mixed) is derived from the athletes' gender (FR-9b).

### 7.3 Evidence
- FR-10 **Full video documentation is required** for every record, ideally from multiple angles.
  The evidence step starts with a checkbox "There is a full video of the attempt". When it is ticked, the
  form shows the video links field and requires at least one link (several allowed).
- FR-11 If full video is not possible, the claimant leaves the box unticked and must explain why. The video
  links field is then hidden and no links are stored. The claim is still submitted, and the reviewer sees the
  reason.
- FR-12 **Witnesses:** at least two named bystanders for every record (October 2026 framework; no category
  needs more), who have the knowledge and experience for the role and know what their role is. Name and
  contact for each, and their role during the attempt.
- FR-13 Firsts require at least one video of the trick being landed.
- FR-14 v1 accepts **links only** (YouTube, Vimeo, Instagram, Google Drive, …). File uploads to S3
  (for permanent archiving of evidence) are a planned later extension; the data model should allow
  evidence entries of type link or file.

### 7.4 Category rules
These are the ISA rules for sends and measurements. **Showing them as a per-category checklist on
the claim form is deferred** (open issue 1, §11): the right checkboxes are hard to define for every
kind of record. Only the world first rules are shown on the first claim form.

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

**World firsts** (checked by the reviewer, not shown as rules or a confirmation on the claim form):
- A single trick, not a combo.
- The athlete is in **full control at initiation and termination** of the trick.
- Trickline: the athlete keeps the final position until reaching nearly static control, with no
  saving by going to another position (e.g. chest or butt).
- Highline Freestyle: the athlete keeps the final position for a total of 3 bounces, with no
  "saving tricks" (e.g. Yoda, Rocket).

### 7.5 Review
- FR-15 Reviewers see a queue at `/admin/records-review` (pattern like `/admin/event-approval`) with
  **three separate tables**: world records, world records in a **new category** (path b), and world firsts.
  Each table shows the category, value or trick, athletes, **gender** (men / women / mixed), **claimant**,
  date and status, with a search field and a status filter. Clicking a row opens the claim with all its
  details, the history, and the actions **Approve**, **Request changes**, **Reject** and **Modify**.
- FR-15a The admin pages are linked by a row of buttons in the same order as the queue's tables:
  **Modify Records**, **Modify Categories**, **Modify Firsts** and **Import review**. A page does not link to
  itself; the Modify pages link back to the review queue.
- FR-15b **Modify Records** and **Modify Firsts** (`/admin/records-manage/records|firsts`) list every entry
  except drafts (pending, published, historical, rejected), with the same table and the same detail view as
  the queue. A published entry can also be voided there and restored.
- FR-16 Reviewers can approve, reject (reason required), or request changes (comment required).
- FR-17 **Modify** lets an admin edit **all details** of a record or first, before or after approval: category,
  value, athletes, date, location, witnesses, evidence and the other fields of §8. An optional reason is kept, the
  change is logged as "modified", athlete profile links are updated, and published / historical statuses are
  recomputed. On `/world_records`, admins see an **Edit** link on every row that opens Modify.
- FR-18 The review screen shows the previous record holder and value, and the difference to the
  claim, so the reviewer can judge whether the increase is **significant**. Significance is a
  reviewer judgment; the framework sets no fixed threshold. The Sport Commission is the final
  deciding body.
- FR-19 For a new-category claim (path b), the review screen shows the proposed category next to
  similar existing ones, so the reviewer can accept it, map the claim to an existing category,
  or reject it. A category created this way starts in group Other with the proposed unit and direction,
  which the admin can adjust (FR-C5). Only for new-category claims, the review screen lists the framework's
  criteria for a world record, which the reviewer checks: **measurable** (one quantitative, objective metric), **standardisable** (ISA
  definitions exist, e.g. what a send is), **breakable** (anyone can in principle break it),
  **significant and separable** (a minor variation such as sitting vs standing start, or 60 m vs
  65 m, is not a separate record), **challenged**, **verifiable**, and **claimed**. A category
  that is not yet challenged starts as Unchallenged (§6.1).
- FR-20 For firsts, the review screen shows the framework's criteria: innovative / iconic,
  distinct from existing tricks, requires advanced skill, significant leap forward, has a clear
  name, and full control at initiation and termination. These criteria are shown on every first review.
  Reviewers can link the claim to similar existing firsts for comparison.
- FR-21 On approving a record that beats the current one on the same list (men's, women's or mixed), the
  old one becomes **historical** on that list automatically (FR-9b). A record that equals the current one
  joins it as co-holder (FR-9c) and nothing becomes historical.
- FR-21a When approving a first, the reviewer links it to the same trick on the other lists, if it exists
  (needed for the titles in FR-23b).
- FR-22 Every status change is logged with who, when, and the comment (audit trail).

### 7.6 Publishing & display
- FR-23 Published entries appear on `/world_records` and on each linked athlete's profile.
- FR-23a **Record titles.** Within a category, the best of the current men's, women's and mixed records
  is titled **World Record**, and the others carry the list-specific title: **Men's World Record**,
  **Women's World Record** or **Mixed World Record**. "Best" follows the category's direction (higher or lower
  is better). The title is computed from the current values whenever a record is approved or archived, it is
  not stored by hand. If a category has a record on only one list, that record is simply **World Record**, and
  lists whose records are exactly equal to the best are all **World Record**.
- FR-23b **Firsts lists and titles.** World Firsts are separated into men's, women's and mixed lists in the
  same way as records. A first cannot be beaten, so the title follows the date instead: the **earliest**
  landing of a trick across the lists is **World First**, and the later landings of the same trick on the
  other lists are **Men's / Women's / Mixed World First**. This needs firsts of the same trick to be linked
  (FR-21a). The reviewer sees existing firsts of all lists when checking that a trick is distinct (FR-20).
- FR-24 The records page can show history per category (previous holders and values).
- FR-25 Approval invalidates the world-records cache so the entry appears right away.
- FR-26 **Certificates:** when a claim is approved, SportHub generates a personalised World Record /
  World First certificate (PDF) for each athlete on the claim. v1 uses a **placeholder layout**, to be
  replaced by the ISA certificate design once the template is available. Athletes download it from their profile and from "My claims". Admins can regenerate it
  (e.g. after correcting a name). This replaces the download at account.slacklineinternational.org.
  Certificates for imported (historical) entries are generated on demand.
  Implementation: every certificate is generated on demand from the current entry
  (`/api/certificates/{record|first}/{entryId}?athlete={n}`), so a correction is reflected right away and
  "regenerate" needs no separate step. Only published and historical entries have certificates.

### 7.7 Notifications
- FR-27 Athletes are emailed when their claim changes status:
  - **submitted**: confirmation that ISA received the claim;
  - **approved / published**: with a link to the public entry;
  - **changes requested**: with the reviewer's comment and a link to edit the claim;
  - **rejected**: with the reviewer's reason.
  Recipients are the claimant and every athlete on the claim who has an email.
  On submission the email holds all relevant claim data (category, value, date, location, athletes, setup,
  further specs, witnesses, evidence links or the reason for no full video). A separate email with the same data
  goes to every **witness** whose contact is an email address, asking them to write to ISA if anything is
  wrong. The current
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
- FR-31 A failed email send must not block or roll back the action; it is logged.
- FR-32 Emails are sent over **SMTP** from an existing ISA mailbox. Host, port, user, password and sender
  address are environment variables. Locally (and whenever SMTP is not configured) emails are only logged,
  never sent.
  Variables: `SMTP_HOST`, `SMTP_PORT` (default 587, 465 = TLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
  `RECORDS_REVIEW_EMAIL` (default records@…), `RECORDS_COMMUNICATION_EMAIL` (default communication@…),
  and `SITE_URL` for links in emails (falls back to `AUTH_URL`).

### 7.8 Migration
- FR-33 Existing sheet rows are imported once into SportHub as published entries, mapped to the
  categories in §6. Rows that don't map to a category (e.g. "Longest Highline Indoor sent") or don't parse
  cleanly go to an **import review list** in the admin area, where an admin creates a category or maps the row
  to an existing one. Nothing is guessed or dropped.
- FR-33a The sheet has one row per athlete. Rows with the same category, value and date are merged into one
  entry with multiple athletes (FR-9b) **only** in categories that are joint by nature (Tandem highline, most
  lines rigged and sent in 24 h in a group). All other rows become separate co-holder entries (FR-9c). The
  admin can merge or split entries afterwards. The old Cert IDs are kept per athlete.
- FR-33b Imported firsts of the same trick on different lists are linked by trick name and line type; unclear
  matches go to the import review list.
- FR-34 Once the workflow is live, SportHub is the only source of truth and the Google Sheet is
  retired.
- FR-35 The Google Sheets read path for records/firsts (`getWorldRecordsSheet`,
  `getWorldFirstsSheet`, the sheet join in `getWorldRecords` / `getWorldFirsts`) is removed
  after the import is verified.
- FR-36 The import maps each row's "ISA Email" to a SportHub user where possible. Rows without a
  match keep the athlete name, gender and country from the sheet as text and are listed for an admin to link
  manually. This is the only case where an athlete is stored without a profile (historical entries); new
  claims always have one (FR-9).
- FR-37 The free-text "specs" of imported rows are parsed into value + unit where possible; the
  original text is kept for reference.

## 8. Data captured

Records and firsts are different kinds of claim and are stored with different fields.

### 8.1 World record claim

| Field | Required | Notes |
|---|---|---|
| Category | yes (path a) | picked from Active and Unchallenged categories |
| New category proposal | yes (path b) | name, what is measured and how, unit (free text, with suggestions m, s, count, °), higher/lower is better, why it is a distinct superlative |
| Value | yes | structured so records can be compared. A number in the category's unit (a time such as "1:59 min" is read as seconds), or for geographic categories (unit °, e.g. most northern / southern highline) the coordinates themselves. The form shows the category's description under the category |
| Athlete(s) | yes | one or more SportHub profiles, existing or entered as new (FR-9). More than one only for a joint performance (FR-9b); co-holders claim separately (FR-9c). Gender and country are not entered; they come from each athlete's data (FR-9a). |
| Consent confirmation | conditional | required when the claimant is not the athlete or there are several athletes (FR-9e) |
| Date of attempt | yes | |
| Location / spot | yes | name and country. Coordinates are not a separate field: where a category's value is a location, the coordinates are the value |
| Event | no | optional link to a SportHub event |
| Setup | no | free text: webbing, anchors, leash and backup |
| Further specs | no | free text, e.g. line height on a length record |
| Witnesses | yes | name, contact and role; at least 2 |
| Full video | yes | checkbox "There is a full video of the attempt" (FR-10) |
| Evidence links | conditional | at least one video link when there is a full video; hidden otherwise (FR-10, FR-11, FR-14) |
| Reason if no full video | conditional | required when there is no full video (FR-11) |
| Ethics confirmation | yes | FR-7 |

### 8.2 World first claim

| Field | Required | Notes |
|---|---|---|
| First category | yes | Trickline, Highline Freestyle, Rodeoline, Static |
| Trick name | yes | a first needs a clear name |
| Description | yes | what the trick is and how it is performed |
| Why it is a first | yes | short justification against the framework's criteria (innovative, distinct, advanced skill, significant) |
| Similar existing tricks | no | tricks the claimant considers closest, and how this one differs |
| Athlete(s) | yes | one or more SportHub profiles, existing or entered as new (FR-9). More than one only for a joint performance (FR-9b). Gender and country are not entered; they come from each athlete's data (FR-9a). |
| Consent confirmation | conditional | required when the claimant is not the athlete or there are several athletes (FR-9e) |
| Date landed | yes | |
| Location / spot | no | name and country |
| Line details | no | line type and length or height where relevant |
| Evidence links | yes | at least one video link showing the trick being landed |
| Ethics confirmation | yes | FR-7 |

A first has no value, no witnesses, and no rule checklist: it is a single trick and is judged
against the criteria in FR-20.

### 8.3 Fields on every claim

Claimant (the signed-in user), claim type, status, submission and decision timestamps, review
comments, and the audit log (FR-22).

Storage (decided):
- A new DynamoDB table `sporthub-records` holds only what does not exist yet: record categories, first
  categories, record and first entries (claims) with their status, and the audit log.
- Athletes are **not** stored in a new table. Entries reference existing `sporthub-users` profiles by user ID
  and keep a snapshot of each athlete's name, gender and country at submission (FR-9a).
- To list an athlete's records and firsts without a scan, each athlete gets a `Record:{id}` / `First:{id}`
  item under their profile in `sporthub-users`, like the existing `Participation:*` items.
- The table is created locally by `pnpm db:setup`. In production, someone with AWS access creates it.

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
- Record categories have only: name, description, group (Length, Endurance, Speed, Altitude, Other), unit,
  direction and status (FR-C1). Line type, leashed and per-category rule checklists were dropped
  (checklists are open issue 1).
- Admin area: one review queue with separate tables for records, new categories and firsts; every entry can be
  modified in full by an admin (FR-15 to FR-17).
- The submission form separates "existing category" from "new category" claims.
- Ranking record categories are ignored.
- Specs: structured value + unit (needed to compare records).
- Evidence: full video and at least two witnesses for records (ISA framework); links only in v1, uploads later.
- Men's, women's and mixed lists: single athletes go on the men's or women's list; a record or first with multiple athletes goes on the mixed list when men and women are on it (FR-9b).
- Equal values: co-holders, each with a separate claim and evidence (FR-9c). A record or first with multiple athletes is one joint performance (FR-9b). The UI makes the difference explicit (FR-9f).
- Titles: the best current record across the three lists is "World Record", the others "Men's / Women's / Mixed World Record" (FR-23a). For firsts, the earliest landing of a trick is "World First", later ones on other lists get the list-specific title (FR-23b).
- Athletes: existing SportHub profiles, or new athletes entered on the claim and created on approval (FR-9). Male or female gender required (FR-9d). Claimant confirms consent when claiming for others (FR-9e).
- Witnesses: always at least 2 (October 2026 framework).
- Geographic record: one category, compared by absolute latitude (FR-C6).
- Emails over SMTP from an ISA mailbox (FR-32). Certificates with a placeholder layout for now (FR-26).
- Storage: new table `sporthub-records`; athletes reuse `sporthub-users` (§8.3).
- Initial categories are seeded from the April 2025 v1 list.
- Rules follow the ISA framework October 2026 v2 (checked against it in this version). Where the
  framework contradicted itself on firsts by gender, Jonas fixed the framework: firsts are tracked by gender.

## 11. Open questions

1. **Per-category rule checklists (FR-6).** Jonas likes the idea of the claimant confirming the
   category's rules (§7.4) on the claim form, but it is hard to get the right checkboxes for every
   kind of record. Removed from v1 on 2026-10-23. To decide: which rules apply to which categories,
   and whether the category stores its own checklist.
