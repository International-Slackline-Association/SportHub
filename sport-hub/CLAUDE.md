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
- **Amplify hosting**: app `SportHub` in **US East (Ohio, us-east-2)**; branch `main` serves slacklinesport.org. Env vars, deployments, IAM roles and compute logs are there.
- **DynamoDB prod (used by `main` / slacklinesport.org)**: **Europe (Frankfurt, eu-central-1)**: `sporthub-users-prod`, `sporthub-events-prod`, `sporthub-records-prod`.
- **DynamoDB dev**: **US East (Ohio, us-east-2)**: `sporthub-users-dev`, `sporthub-events-dev`, `sporthub-records-dev`.
- The Amplify env vars `DEV=TRUE` / `DB_REGION=us-east-2` shown for "All branches" are overridden for `main`; check the logs, not that list, to see which table a branch uses.
- Table names come from `getTableName()` in `src/lib/dynamodb.ts`: `-dev` suffix if `DEV` is `true` (case-insensitive), else `-prod`. Region is `DB_REGION || AWS_REGION || us-east-2`.
- In production no AWS keys are written to `.env.production` (see `amplify.yml`). The app uses the compute role `rankings-dynamodb-role` with policy `rankings-dynamodb-policy` (dev tables by wildcard, prod tables listed one by one). **A new prod table must be added to that policy** (table ARN and `/index/*`), or the app gets `AccessDeniedException`.
- New tables are not created on deploy; create them by hand (`db-setup.ts` schema, or the console) in the right region.
- Prod scripts need `DB_REGION=eu-central-1`. The `*:aws:*` pnpm scripts load env via `env $(grep … | xargs)`, which breaks values with spaces (the Google private key); use `npx tsx --env-file=.env.production <script>` instead.
- A Next.js "Application error … Digest: N" in prod: search N in the Amplify compute logs (Amplify → SportHub → Hosting → Monitoring → Hosting compute logs).
- If the AWS console shows no tables or apps, check the region selector first.
