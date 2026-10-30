# Requirements: World Records & World Firsts Workflow

Status: **v8**, 2026-10-30 (evidence uploads to Google Drive, §5.1; matches the implementation on branch `records-firsts-3-claims`).
Rules source: ISA Sport Commission, *Slackline World Records and World Firsts*, October 2026 v2. Where this
document and the framework differ, the framework wins; the Sport Commission decides on every record and first.
Every section states the decisions taken; §9 lists what is still open. Code map for reviewers:
[`docs/records-and-firsts-code.md`](../records-and-firsts-code.md).

## 1. Goal and scope

Athletes (or people affiliated with them) claim World Records and World Firsts in SportHub, ISA admins verify
them, and approved entries are published on `/world_records` and the athletes' profiles. SportHub replaces the
"World Records" and "World Firsts" tabs of the ISA certificates Google Sheet as the source of truth.

**Out of scope:** national/continental records; unleashed ("free solo") highline records; crossings (only sends
count, except falls during a speedline run); combos as firsts; the framework's ranking records; Guinness
submissions; records per webbing material; announcing attempts in the app (later);
automated verification, public voting or comments.

## 2. Actors and permissions

- **Visitor**: browses published records and firsts.
- **Claimant** (signed in): claims for themselves or others, saves drafts, withdraws, resubmits. The ISA never
  claims on someone's behalf.
- **Athlete**: a SportHub profile on the claim (existing, or new and created on approval); sees claims made for them
  on "My claims" once submitted.
- **Reviewer** (`records:review`): approves, requests changes, rejects. **Admin** (`records:manage`): modifies any
  entry, voids/restores, manages categories, resolves the import list; never creates entries from scratch. Both
  permissions belong to `role: admin` in v1.

## 3. Lifecycle

```
draft ──submit──▶ pending ──approve──▶ published ──beaten (records only)──▶ historical
  ▲   ◀─withdraw──  │  │  │                │
  │                 │  │  └──reject──▶ rejected ◀──void (admin)──┘
  │                 ▼  │                  └──restore (voided only)──▶ published
  └─resubmit── changes_requested
```

- **draft**: only the claimant sees it. Withdrawing a pending claim makes it a draft again. A draft can be deleted.
- **pending** ("Under review"): visible to claimant, athletes and reviewers. **changes_requested**: sent back with a
  comment; the claimant edits and resubmits.
- **published** / **historical**: public. A record becomes historical when a strictly better one on the same list
  is published; equal values are co-holders and all stay published. Firsts are never historical.
- **rejected**: closed with a reason, visible to claimant and athletes. Only entries an admin **voided** after
  publication can be restored; a claim rejected in review cannot.
- "My claims" shows this workflow as a diagram with a count of the user's claims per step.

## 4. Categories

**Record categories** are one flat list: name, description, group (Length, Endurance, Speed, Altitude, Other),
free-text unit, direction (higher or lower is better) and status. Units "m", "s" (times such as "1:59 min") and
"count" are parsed, "°" means coordinates, anything else is a plain number. Changing the unit kind re-reads the
values of the category's entries.

| Status | Meaning | New claims | Public |
|---|---|---|---|
| Active | Established, others compete | yes | yes |
| Unchallenged | One record so far, nobody else tried | yes | yes, shown apart and labelled |
| Archived | Discontinued (e.g. per-material records) | no | yes, as history |

- Only admins change a status. Approving a claim into an Unchallenged category that already has a record prompts
  the reviewer to consider setting it Active; nothing changes automatically.
- The geographic record ("most northern / southern highline") is one category: the larger absolute latitude wins.
- Seeded from the April 2025 v1 list (v2 has no list); material-specific and discontinued categories are archived.
- **First categories** (Trickline, Highline Freestyle, Rodeoline, Static) have a name, a termination rule shown to
  reviewers, and status Active or Archived. Training or competition does not matter for a first.
- Categories are managed at `/admin/records-categories`; every change is logged.

## 5. Claim

One button, "Claim World Record or World First" (on `/world_records`, "My claims" and the dashboard), opens a form
with three paths: **(a)** record in an existing category, **(b)** record in a new category (proposal: name, what is
measured and how, unit, direction, why it is distinct), **(c)** world first. The record form reminds claimants to
email records@slacklineinternational.org before an attempt.

**Athletes.** A signed-in account is required to claim. Each athlete is an existing profile or a new athlete (name,
surname, email, gender, country) whose profile is created on approval. Every athlete needs gender male or female;
otherwise neither submitting nor saving a draft works. Gender and country are copied from the profile at submission.
More than one athlete means **one joint performance** (tandem, group rigging): one entry, all athletes hold it
equally. People who reached the same value **separately** are **co-holders** and each submit their own claim. The
form says this and asks the claimant to confirm a joint performance. If the claimant is not the only athlete, they
confirm they have every athlete's consent. Athletes are not asked to confirm; they get the "submitted" email.

**Lists.** All men → men's list, all women → women's, men and women together → mixed. The form shows the list and
the current mark; a record must **beat or equal** it.

| Record (paths a, b) | First (path c) |
|---|---|
| Category or proposal; value (a coordinate for "°") | Discipline; trick name; description; why it is a first |
| Date, location name and country | Date; location and similar tricks (optional) |
| Setup, further specs (optional); event (optional) | Line details (optional) |
| At least 2 witnesses: name, email, optional phone | — |
| Evidence (§5.1): "There is a full video" ticked → at least one item (the video); unticked → reason required, other evidence can still be added | Evidence (§5.1): at least one item showing the landing |
| Ethics and Code of Conduct confirmation | Ethics and Code of Conduct confirmation |

Links use the same check as event submission (a link without `https://` gets it added); dates cannot be in the future. If two people act on the same claim at once
(e.g. two reviewers), only the first succeeds; the second is asked to reload. The framework's rules for sends, measurements
and first termination are **not** shown as a checklist on the form (open issue 1).

### 5.1 Evidence

- Evidence is a list of up to 20 items. Each item is a **link** (e.g. a video on YouTube) or an **uploaded file**
  (photos, videos, GPX/KML/FIT/TCX tracks, PDF, CSV, TXT, spreadsheets; up to 2 GB per file), and every item needs a
  **description**. The claimant enters the description before uploading.
- Every claim gets a **Google Drive folder named after its ID** inside the ISA evidence folder
  (`RECORDS_EVIDENCE_FOLDER_ID`, today folder `1_bXF33HOPKdEuq8CnxHzV1YXaY-g4yjX`), created with the first item, so
  drafts can hold files. A new claim is saved as a draft before its first upload.
- **Uploads** are named after their description, keeping the extension ("Laser measurement anchor A.jpg"); the same
  description twice gets " (2)". The original file name is kept in the file's Drive description. Changing a
  description renames the file. Files go from the browser straight to Drive (resumable upload), not through SportHub.
- **Links** are written to the folder as `<description>.url` shortcut files. `_Evidence overview.txt` lists every
  item with its description and is rewritten on every save.
- Removing an item and saving moves its file to the Drive trash. Deleting a draft moves its folder to the trash.
  Files ISA staff add to the folder by hand are left alone.
- Evidence files are **internal to the ISA**: public pages show links only, and the folder link goes only to the
  records team (email and review page), not to athletes or witnesses.
- **Setup:** the service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, the one the sheet import uses) needs the Drive API
  enabled and Content manager access to the evidence folder. The folder must be on a **Shared Drive**, because a
  service account has no storage of its own; alternatively set `GOOGLE_DRIVE_IMPERSONATE_USER` to upload as an ISA
  Workspace user (domain-wide delegation). Without these settings, local development keeps files in the temp
  directory, and production accepts links only.

## 6. Review and publishing

- `/admin/records-review` has three tables: records, records in a new category, firsts (oldest first). "Modify
  Records" / "Modify Firsts" list every non-draft entry with search and status filter.
- The detail page shows all fields, the history, the current record per list (for significance, a reviewer
  judgment), and actions **Approve**, **Request changes** (comment required), **Reject** (reason required) and
  **Modify**. New-category claims show similar categories and the framework's record criteria; the reviewer
  creates the category (Unchallenged, group Other) or maps the claim to an existing one. Firsts show the first
  criteria and the existing firsts of the discipline, and can be linked to the same trick on another list.
- **Modify** edits every field before or after approval (logged, with an optional reason); published/historical is
  recomputed. Admins see an **Edit** link on every public row.
- **Titles** follow the gender only: "Men's World Record", "Women's World Record" and "Mixed World Record" stand side
  by side, whichever value is better; the same for "Men's / Women's / Mixed World First", whichever landing came
  first. There is no overall "World Record" or "World First". Linking a first to the same trick on another gender is
  for reference only. Computed, never stored.
- **Export:** `/admin/records-export` downloads records, firsts, athletes and categories as CSV (all entries except
  drafts, including witness contacts, so admins only).
- Every status change is in the audit log (who, when, comment); approval clears the world-records cache.
- **Certificates** (PDF, placeholder layout until the ISA design exists) are generated on demand per athlete for
  published and historical entries at `/api/certificates/{record|first}/{id}?athlete={n}`, linked from the
  athlete's profile, "My claims" and the admin detail, so corrections show immediately.

## 7. Notifications

Sent over SMTP (`SMTP_*` variables, links use `SITE_URL`); without SMTP, or locally, mails are only logged. A failed
email never blocks the action. Because claims email addresses the claimant types in, each account can submit at most
5 claims per day, with at most 10 athletes and 10 witnesses per claim.

| Event | To | Content |
|---|---|---|
| Submitted / resubmitted | claimant and athletes; each witness; `RECORDS_REVIEW_EMAIL` (records@) | all claim data with each evidence item and its description; witnesses asked to report errors; reviewer gets the review link and the link to the claim's Drive evidence folder |
| Approved | claimant and athletes; `RECORDS_COMMUNICATION_EMAIL` (communication@) | summary, public link, the superseded record |
| Changes requested / rejected | claimant and athletes | comment or reason, edit link |

## 8. Data and migration

- New table `sporthub-records` (categories, entries, audit log, import review items; see the code map). Athletes
  stay in `sporthub-users`; entries store user ids plus a name/gender/country snapshot. In production someone with
  AWS access creates the table.
- **Import** (`pnpm records:import:*`): sheet rows become published entries with their Cert IDs; anything unclear
  goes to the **import review list** (`/admin/records-import`). Same value and date rows merge into one joint entry
  only in joint categories (tandem, group rigging). Unmatched athletes keep their name and are listed for linking.
- Until the records table has data, `/world_records` still falls back to the Google Sheet.

## 9. Open issues

1. **Per-category rule checklists.** Jonas likes the claimant confirming the category's rules on the form, but the
   right checkboxes per kind of record are unclear. Removed from v1; decide which rules apply where and whether the
   category stores its checklist.
2. **Merge / split imported entries** (admin) is not built yet; today an admin edits athletes with Modify.
3. **Retire the Google Sheet fallback** in `data-services.ts` once the import is verified on production data.
4. **Sport Commission access:** actions check `records:review` / `records:manage`, but admin pages still require
   `role: admin`.
5. **Athletes with gender "other" or none** can't be on a claim for now.
6. **Evidence folder on a Shared Drive:** the ISA evidence folder must move to a Shared Drive (or impersonation be
   set up) before uploads work on staging and production (§5.1).
