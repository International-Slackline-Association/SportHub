# SportHub

ISA SportHub — Next.js 15.3 (App Router) sports management app. Full project knowledge is stored in MemPalace under the `sporthub` wing.

## Tool Configs

**MemPalace**: wing = `sporthub` (also `sessions` for prior conversation context)
**Obsidian**: vault = `~/Obsidian/Second Brain/` | MCP = `obsidian-vault` | active note = `projects/active/SportHub.md`

## Session Start

Search MemPalace for relevant context before starting work:
- `sporthub / stack` — tech stack, dependencies, path aliases
- `sporthub / structure` — directory tree, key files
- `sporthub / commands` — all pnpm commands
- `sporthub / schema` — DynamoDB table schemas and sort key patterns
- `sporthub / conventions` — PageLayout standard, ISR behavior, test pages
- `sporthub / auth` — NextAuth, RBAC, roles
- `sporthub / env` — environment variables (local + production), Google Sheets

## Hard Rules
- All pages MUST use `PageLayout` from `@ui/PageLayout` — no exceptions
- All content sections MUST use `className="p-4 sm:p-0"`
- No table scans in hot paths — use composite keys or GSI lookups
- After prod data changes: `pnpm revalidate:all`

## AWS Infrastructure (where things run)
- **Amplify hosting**: app `SportHub` in **US East (Ohio, us-east-2)**, prod branch `main` serves slacklinesport.org. Env vars, deployments, IAM roles and compute logs are there.
- **The live site uses the `-dev` tables in Ohio**: Amplify env vars are `DEV=TRUE` and `DB_REGION=us-east-2` (as of 2026-11-07).
- **DynamoDB Ohio (us-east-2), used by slacklinesport.org**: `sporthub-users-dev`, `sporthub-events-dev`, `sporthub-records-dev`.
- **DynamoDB Frankfurt (eu-central-1)**: `sporthub-users-prod`, `sporthub-events-prod`, `sporthub-records-prod`. Not used by the live site while `DEV=TRUE`.
- Table names come from `getTableName()` in `src/lib/dynamodb.ts`: `-dev` suffix if `DEV` is `true` (case-insensitive), else `-prod`. Region is `DB_REGION || AWS_REGION || us-east-2`.
- New tables are not created on deploy; create them by hand (`db-setup.ts` schema, or the console) in the region the site reads.
- In production no AWS keys are written to `.env.production` (see `amplify.yml`), so DynamoDB access goes through the Amplify app's IAM role.
- Scripts against live data must use the same `DEV`/`DB_REGION` as Amplify. The `*:aws:*` pnpm scripts load env via `env $(grep … | xargs)`, which breaks values with spaces (the Google private key); use `npx tsx --env-file=<file> <script>` instead.
- A Next.js "Application error … Digest: N" in prod: search N in the Amplify compute logs (Amplify → SportHub → Hosting → Monitoring → Hosting compute logs).
- If the AWS console shows no tables or apps, check the region selector first.
