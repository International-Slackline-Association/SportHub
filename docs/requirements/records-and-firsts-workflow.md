# Requirements: World Records & World Firsts Workflow

Status: **v13**, 2026-11-13. Describes what runs on `main` and on slacklinesport.org.
Rules source: ISA Sport Commission, *Slackline World Records and World Firsts*, October 2026 v2. Where this
document and the framework differ, the framework wins; the Sport Commission decides on every record and first.
Every section states the decisions taken; §9 lists what is still open. Code map for reviewers:
[`docs/records-and-firsts-code.md`](../records-and-firsts-code.md); roles: [`docs/RBAC.md`](../RBAC.md).

**Changelog.** v13 (2026-11-13): roles instead of `role: admin` (§2), category admin pages with delete (§4),
searchable category picker, claim revision keeps its kind, Delete draft on My claims (§5), Show and Athlete filters,
countries from profiles (§6.2), void / restore / permanent delete (§6), official ISA certificate templates, no
certificates on public profiles (§6.3), "Rejected:" subject and Record Manager emails (§7), production import done
(§8), open issues updated (§9). v12 (2026-11-08): optional witnesses, Drive evidence uploads, proposed group.
v11: rejection reasons. v9–10: category status.

## 1. Goal and scope

Athletes (or people affiliated with them) claim World Records and World Firsts in SportHub, Record Managers verify
them, and approved entries are published on `/world_records` and the athletes' profiles. SportHub replaces the
"World Records" and "World Firsts" tabs of the ISA Google Sheets as the source of truth.

**Out of scope:** national/continental records; unleashed ("free solo") highline records; crossings (only sends
count, except falls during a speedline run); combos as firsts; the framework's ranking records; Guinness
submissions; records per webbing material; announcing attempts in the app (later); automated verification, public
voting or comments.

## 2. Actors and permissions

- **Visitor**: browses published records and firsts.
- **Claimant** (signed in): claims for themselves or others, saves and deletes drafts, withdraws, resubmits. The
  ISA never claims on someone's behalf.
- **Athlete**: a SportHub profile on the claim (existing, or new and created on approval); sees claims made for them
  on "My claims" once submitted.
- **Record Manager** (role `record_manager`, permissions `records:review` and `records:manage`): reviews claims,
  modifies, voids, restores and deletes entries, manages categories, resolves the import list, exports CSV. Never
  creates entries from scratch. **General Admin** (`admin`) can do everything. Roles combine; a User Manager or
  General Admin grants them under Admin → Users (see `docs/RBAC.md`). Every records admin page and action checks the
  permission, so Sport Commission members only need the Record Manager role.

## 3. Lifecycle

```
draft ──submit──▶ pending ──approve──▶ published ──beaten (records only)──▶ historical
  ▲   ◀─withdraw──  │  │  │                │
  │                 │  │  └──reject──▶ rejected ◀──void (admin)──┘
  │                 ▼  │                  └──restore (voided only)──▶ published
  └─resubmit── changes_requested
```

- **draft**: only the claimant sees it and can delete it (Delete draft on "My claims" and in the form). Withdrawing
  a pending claim makes it a draft again.
- **pending** ("Under review"): visible to claimant, athletes and reviewers. **changes_requested**: sent back with a
  comment; the claimant edits and resubmits. A revised claim keeps what it claims: the existing / new category /
  first choice is hidden and the server refuses a switch.
- **published** / **historical**: public. A record becomes historical (shown as **Former World Record**) when a
  strictly better one on the same list is published; equal values are co-holders and all stay published. Firsts are
  never historical. What a published record is called depends on its category's status (§4).
- **rejected**: closed with a reason (§6.1), visible to claimant and athletes. **Void** takes a published entry off
  the public lists (rejected with `voidedAt`); only voided entries can be restored. **Delete permanently** removes
  entries that should never have existed (§6).
- "My claims" shows this workflow as a diagram with a count of the user's claims per step.

## 4. Categories

**Record categories** are one flat list: name, description, group (Length, Endurance, Speed, Altitude, Trick, Other),
free-text unit, direction (higher or lower is better) and status. Units "m", "s" (times such as "1:59 min") and
"count" are parsed, "°" means coordinates, anything else is a plain number. Changing the unit kind re-reads the
values of the category's entries.

| Status | Meaning | New claims | Best performance | Beaten performances |
|---|---|---|---|---|
| **Active** | An established world record category | yes | **World Record** | **Former World Record** |
| **Unchallenged** | A new category, typically one person's achievement. It does not meet criterion 5 ("Challenged") yet, so it is **not a world record yet**; published to invite challenges. | yes | No title, an "Unchallenged" badge; no certificate | — |
| **Archived** | Tracked in the past but no longer relevant (e.g. longlines per webbing), or no longer breakable | no | **Historical World Record** | **Former World Record** |

- **Unchallenged → Active** happens automatically once the initial achievement is **beaten or equalled** and the
  claim approved (equal = co-holders of the World Record). The status is per category, not per gender list: a
  challenge on one list makes the best entry on every list a World Record.
- Titles keep the gender list: "Men's / Women's / Mixed World Record", "… Former World Record", "… Historical World
  Record". The geographic record ("most northern / southern highline") is one category; the larger absolute
  latitude wins.
- **First categories** (disciplines: Trickline, Highline Freestyle, Rodeoline, Static) have a name, a termination
  rule shown to reviewers, and status Active or Archived. Training or competition does not matter for a first.
- **Admin** (`/admin/records-categories`, "Modify Categories"): read-only tables of record categories and first
  disciplines with filters; the name opens `/admin/records-categories/{record|first}/{id}` with the edit form (status
  included, with an optional reason), the change history and **Delete permanently**. Delete needs a reason (kept in
  the history) and typing DELETE, and is offered only when no entry uses the category (drafts and rejected claims
  count); otherwise the page says how many do and suggests Archived. "Add" opens the same form at `…/new`.
- Production categories come from the Categories tab of the World Records sheet (§8).

## 5. Claim

One button, "Claim World Record or World First" (on `/world_records`, "My claims" and the dashboard; hidden when
signed out), opens a form with three paths: **(a)** record in an existing category, picked from a searchable table
(group, name, status; search by name, filter by group and status; a row click picks it and the table collapses to
the choice with "Change category"); **(b)** record in a new category (proposal: name, group from a dropdown, what is
measured and how, unit, direction, why it is distinct); **(c)** world first. The record form reminds claimants to
email records@slacklineinternational.org before an attempt.

**Athletes.** Each athlete is an existing profile or a new athlete (name, surname, email, gender, country) whose
profile is created on approval. Every athlete needs gender male or female. Gender and country are copied from the
profile at submission. More than one athlete means **one joint performance** (tandem, group rigging): one entry,
all athletes hold it equally. People who reached the same value **separately** are **co-holders** and each submit
their own claim. If the claimant is not the only athlete, they confirm every athlete's consent. Athletes are not
asked to confirm; they get the "submitted" email.

**Lists.** All men → men's list, all women → women's, men and women together → mixed. The form shows the list and
the current mark; a record must **beat or equal** it.

| Record (paths a, b) | First (path c) |
|---|---|
| Category or proposal; value (a coordinate for "°") | Discipline; trick name; description; why it is a first |
| Date, location name and country | Date; location and similar tricks (optional) |
| Setup, further specs (optional); event (optional) | Line details (optional) |
| Optional witnesses (0 to 10): name and email each, optional phone | Same, witnesses who saw the landing |
| Evidence (§5.1): "There is a full video" ticked → at least one item; unticked → reason required | Evidence (§5.1): at least one item showing the landing |
| Ethics and Code of Conduct confirmation | Ethics and Code of Conduct confirmation |

Each form has one Yup schema, so errors show while filling in; drafts save without validation. Links get
`https://` added if missing; dates cannot be in the future. If two people act on the same claim at once, only the
first succeeds; the second is asked to reload. Imported entries keep whatever the sheet had.

### 5.1 Evidence

- Up to 20 items, each a **link** or an **uploaded file** (photos, videos, GPX/KML/FIT/TCX, PDF, CSV, TXT,
  spreadsheets; up to 2 GB), each with a **description** entered before uploading.
- Every claim gets a **Google Drive folder named after its ID** inside the ISA evidence folder
  (`RECORDS_EVIDENCE_FOLDER_ID`), created with the first item (a new claim is saved as a draft first). Uploads go
  from the browser straight to Drive and are named after their description; links become `<description>.url`
  files; `_Evidence overview.txt` is rewritten on every save. Removing an item or deleting a draft moves the file or
  folder to the Drive trash; files ISA staff add by hand are left alone.
- Evidence files are **internal**: public pages show links only, and the folder link goes only to Record Managers.
- **Setup:** the service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) needs the Drive API and Content manager access to
  a folder on a **Shared Drive** (or `GOOGLE_DRIVE_IMPERSONATE_USER` with domain-wide delegation). Without it,
  local development keeps files in the temp directory and production accepts links only.

## 6. Review and administration

- **Review queue** (`/admin/records-review`): three tables, records, records in a new category, firsts (oldest
  first). The admin pages share a button bar: Review queue, Modify Records, Modify Categories, Modify Firsts, Import
  review, Export CSV. **Modify Records / Modify Firsts** (`/admin/records-manage/{records|firsts}`) list every
  non-draft entry with search and status filter.
- **Detail page**: all fields with the history, the current record per list, and the decision buttons grouped with
  the fields they need: **Approve**, **Request changes** (comment required), **Reject** (reason, §6.1) and
  **Modify**. New-category claims show similar categories and the framework's record criteria; the reviewer creates
  the category (Unchallenged, in the group the claimant chose) or maps the claim to an existing one. Firsts show the
  first criteria and the discipline's existing firsts, and can be linked to the same trick on another list.
- **Modify** edits every field before or after approval (logged, optional reason); published/historical is
  recomputed. Record Managers and General Admins see an **Edit** button in an "Admin" column on every public row.
- **Void / Restore / Delete permanently** on the detail page of public entries. Void hides an entry and keeps it;
  Restore republishes a voided one. Delete permanently (test entries, duplicates, import mistakes) needs a reason
  and typing DELETE; it removes the entry, its audit log, profile pointers and import review items, logs the
  deletion in the category history and recomputes the category's record statuses.
- **Titles** follow the gender only: "Men's / Women's / Mixed World Record" side by side, whichever value is better;
  the same for World Firsts, whichever landing came first. No overall "World Record" or "World First". The category
  status decides the word (§4). Computed at read time, never stored.
- **Export** (`/admin/records-export`): records, firsts, athletes and categories as CSV (all but drafts, including
  witness contacts and the rejection reason code).
- Every status change is in the audit log (who, when, comment); decisions clear the world-records cache.

### 6.1 Rejection reasons

The reviewer picks a reason from the list for the kind of claim, or **Other** with their own text; a comment is
optional. The claimant sees "reason. comment" on "My claims" and in the email; the entry stores the code
(`rejectionReason`) and the text (`reviewComment`). Lists in `REJECTION_REASONS` (`lib/records-rules.ts`):

| New record category | Record in an existing category | World first |
|---|---|---|
| Not clearly separable from an existing category | Insufficient documentation or proof | Insufficient novelty |
| Cannot be measured objectively | Below the current record (an equal value is shared, not rejected) | Already landed earlier by someone else |
| Cannot be standardised | Not a valid attempt under the category rules | Insufficient control at the start or end |
| Not breakable by others | Witness requirements not met, or not confirmed | Not an advanced enough skill level |
| Out of scope (free solo, crossing, material-specific) | Breach of the ethics guidelines or Code of Conduct | Insufficient documentation of the landing |

"Challenged" is no reason, since new categories start as Unchallenged; a claim in the wrong category is moved with
Modify instead of rejected.

### 6.2 Public pages

- `/world_records` has a Records and a Firsts table with Category, Gender, Athlete and Country filters. The **Show**
  filter is a multi-select of World Record, Unchallenged, Former World Record and Historical World Record (default
  and Reset: World Record only). The Athlete filter lists every athlete on its own, so joint entries match each.
- Countries come from each linked athlete's SportHub profile; athletes without a profile keep the country stored
  on the entry.
- Athlete profiles have World Records and World Firsts tabs (cached lists, same filters).

### 6.3 Certificates

PDFs generated on demand per athlete for published and historical entries at
`/api/certificates/{record|first}/{id}?athlete={n}`, so corrections show immediately. They fill the official ISA
templates from isa-tools (frame, logo, seal, signatures) with name, category or trick, specs, date and a "Scan to
verify" QR code that today links back to the live certificate. No certificate while the category is Unchallenged.
Linked from "My claims" and the admin detail page only, **not** from public pages or athlete profiles.

## 7. Notifications

Sent over SMTP (`SMTP_*`, links use `SITE_URL`); without SMTP, or locally, mails are only logged. A failed email
never blocks the action. Each account can submit at most 5 claims per day, with at most 10 athletes and 10
witnesses per claim.

| Event | To | Content |
|---|---|---|
| Submitted / resubmitted | claimant and athletes; each witness; every **Record Manager** ("New / Revised claim to review"; falls back to `RECORDS_REVIEW_EMAIL`, records@, when nobody has the role; General Admins are not emailed) | all claim data with evidence; witnesses asked to report errors; Record Managers get the review link and the Drive folder link |
| Approved | claimant and athletes; `RECORDS_COMMUNICATION_EMAIL` (communication@); holders of a record it beat | summary, public link, the superseded record |
| Changes requested / rejected | claimant and athletes (subject starts with "Rejected:" for rejections) | comment or reason, edit link |

## 8. Data and migration

- Table `sporthub-records` (categories, entries, audit log, import review items, rate limit; see the code map).
  Athletes stay in `sporthub-users`; entries store user ids plus a name/gender/country snapshot. Production uses
  `sporthub-records-prod` in Frankfurt. App code uses single `DeleteItem` calls, since the production role has no
  `BatchWriteItem`.
- **Import** (`pnpm records:import:*`, `--use-records-sheet`): record categories and records come from the World
  Records sheet (tabs Categories and Data, joint performances as one row with several athletes); firsts from the
  certificates sheet. Unclear rows go to the **import review list** (`/admin/records-import`); unmatched athletes
  keep their name and are listed for linking.
- **Production import done 2026-11-08:** 63 categories, 369 records, 81 firsts, live on slacklinesport.org. While
  the table is empty, `/world_records` falls back to reading the Google Sheet.

## 9. Open issues

1. **Per-category rule checklists** on the claim form: wanted later; which rules apply where is undecided.
2. **Merge / split imported entries** (admin) is not built; today a Record Manager edits athletes with Modify.
3. **Import review on production:** 192 athletes to link to profiles, and a possible duplicate (wr145 / wr146).
   Known wrong or broken emails in the sheet: Anthony/Antony Newton (wr 43–48), "Raphael Bridi" (wr 240), Ando
   Franscini (wr 35), Tancrède Melet (wr 280), Quirin Herterich (wr 229–232).
4. **Production settings:** SMTP (`SMTP_*`, `RECORDS_*_EMAIL`) and the Drive evidence folder on a Shared Drive
   (§5.1) are not set up yet, so production sends no emails and accepts links only.
5. **Verifiable certificates** (PR #148, open): sign the QR code through the isa-tools `/sign` service so a scan
   shows the ISA-signed statement on verify.slacklineinternational.org, like the old certificates. Needs the
   `ISA_TOOLS_API_KEY` Amplify secret and agreement on a 10-year validity.
6. **All records and firsts overview** (PR #128, open, changes requested): one admin table of every entry in any
   status, voided included.
7. **Phone layouts** (PR #147, open): claim lists as cards below 640px, category picker without the Select column,
   header that fits a phone.
8. **Athletes with gender "other" or none** can't be on a claim for now.
9. **Retire the Google Sheet fallback** in `data-services.ts` now that production has data; and remove the
   duplicate `validateForSubmit` (the Yup schema is the single source of form validation).
10. **Records & Firsts header image** does not load on production.
