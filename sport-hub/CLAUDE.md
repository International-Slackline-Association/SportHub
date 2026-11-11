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

## Forms
- The form's Yup `validationSchema` is the single source of validation rules. Do not add a parallel hand-written validator that has to be kept in sync with it. Server actions validate with the same Yup schema (e.g. `schema.validate(values, { abortEarly: false })`) instead.
- Existing duplicates are tech debt to remove, not a pattern to extend: `validateForSubmit` in `src/lib/records-claims.ts` duplicates `src/app/world_records/claim/schemas.ts` and should be replaced by the schema. Until then, a new rule must go into both.
- One Formik form per kind, each with its own fields component and its own Yup schema; reuse `@ui/Form` and `@ui/UserAutocomplete` instead of recreating inputs.
- A condition with more than one assertion gets a named variable (e.g. `isClaimEditable`).
