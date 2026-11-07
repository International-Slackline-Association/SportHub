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
- **Amplify hosting**: app `SportHub` in **US East (Ohio, us-east-2)**, prod branch `main`. Look there for env vars, deployments, IAM roles and compute logs.
- **DynamoDB prod**: **Europe (Frankfurt, eu-central-1)**: `sporthub-users-prod`, `sporthub-events-prod`, `sporthub-records-prod` (created 2026-11-07).
- **DynamoDB dev**: **US East (Ohio, us-east-2)**: `sporthub-users-dev`, `sporthub-events-dev` (`sporthub-records-dev` not yet created).
- Table names come from `getTableName()` in `src/lib/dynamodb.ts`: `-dev` suffix if `DEV=true`, else `-prod`. Region is `DB_REGION || AWS_REGION || us-east-2`.
- In production no AWS keys are written to `.env.production` (see `amplify.yml`), so DynamoDB access uses the Amplify app's IAM role. A new table needs adding to that role's policy (table ARN and `/index/*`).
- If the AWS console shows no tables or apps, check the region selector first.
