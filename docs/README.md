# SportHub Documentation

Developer reference hub. The root `README.md` covers quick start and commands — this covers everything else.

---

## Documentation Index

### Architecture
- [Authentication & Authorization](./AUTHENTICATION.md) — Cognito + NextAuth + RBAC, onboarding flow, ID model
- [Reference DB Pattern](./architecture/reference-db-pattern.md) — isa-users (read-only) vs sporthub-users separation
- [RBAC System](./RBAC.md) — Roles, permissions, protection layers

### Database
- [Database Schema](./schema/database-schema.md) — Table definitions, sort key patterns, GSIs
- [Query Patterns](./schema/query-patterns.md) — Query examples, access patterns, performance
- [Database Sync](./DATABASE-SYNC.md) — Local ↔ remote DynamoDB sync tool
- [DB Setup](./db-setup.md) — Table creation and local Docker setup

### Deployment
- [Amplify Deployment](./AMPLIFY_DEPLOYMENT.md) — AWS Amplify setup and CI/CD
- [Static Pages & ISR](./STATIC-PAGES.md) — Static generation, revalidation, build output

### API Reference
- [Data Services](./api/data-services.md) — Main data access layer
- [Reference DB Service](./api/reference-db-service.md) — isa-users read operations

### Setup
- [Auth Setup](./AUTH_SETUP.md) — Cognito user pool, env vars, NextAuth config

---

## AI Tooling

SportHub uses Claude Code with persistent memory to maintain context across sessions. Three systems work together:

| Tool | Purpose | Config |
|------|---------|--------|
| `sport-hub/CLAUDE.md` | Project rules, DB schema, commands — loaded into every Claude session | Committed to repo |
| MemPalace | Long-term semantic memory — decisions, architecture, solved problems | `mempalace.yaml` at repo root |
| context-mode | In-session context compression — prevents large outputs flooding the window | Claude Code plugin |

### How CLAUDE.md Should Stay Lean

`sport-hub/CLAUDE.md` is loaded verbatim into every Claude session. **Keep it as an index, not a library.**

Rules:
- **Commands and aliases only** — no prose explanations. If a workflow needs a paragraph, it belongs in `docs/` with a link from CLAUDE.md.
- **No implementation details** — code patterns, function signatures, and architecture decisions belong in MemPalace or `docs/`, not CLAUDE.md.
- **No duplication** — if it's in a doc file, point to that file. Don't copy-paste it into CLAUDE.md.
- **Session start protocol at the top** — the MemPalace search block is load-bearing; don't remove it.

When CLAUDE.md grows past ~150 lines, audit it: anything that isn't a command, path alias, or schema key belongs elsewhere.

### MemPalace

Memories are stored in the `sporthub` wing with rooms: `backend`, `documentation`, `scripts`, `general`.

Searching:
```
mempalace_search: "topic keywords"   # semantic search
wing: sporthub                        # scope to this project
```

Adding a memory (via Claude):
```
mempalace_add_drawer wing=sporthub room=backend content="..."
```

---

## New Machine Setup

### 1. Project

```bash
git clone <repo>
cd SportHub/sport-hub
pnpm install

# Copy and fill env vars
cp .env.local.example .env.local

# Start local DB and seed
pnpm db:local
pnpm db:setup
pnpm db:seed

pnpm dev
```

### 2. Claude Code + Plugins

Install Claude Code and the two project plugins:

```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# context-mode — in-session context compression
# (follow install steps at https://github.com/dwarvesf/context-mode or run /ctx-upgrade inside Claude Code)

# MemPalace — persistent semantic memory
npx mempalace init
```

### 3. Seed MemPalace from Existing Context

The `mempalace.yaml` at the repo root defines the palace structure. To populate it with project knowledge on a new machine, ask Claude to mine the existing codebase and docs:

```
/mempalace:mine
```

Then manually trigger a context search to confirm it loaded:

```
mempalace_search: "SportHub authentication architecture"
```

Key memories already filed under `sporthub/backend`:
- Authentication architecture + ID model (`sportHubUserId` vs `isaUsersId`)
- isa-users read-only constraint + onboarding flow

If those return results, the palace is warm. If not, re-run `/mempalace:mine` or ask Claude to re-file them from `docs/AUTHENTICATION.md` and `docs/architecture/reference-db-pattern.md`.

### 4. Verify Claude Setup

Open Claude Code in the `SportHub/sport-hub` directory. On the first message it should:
1. Search MemPalace for recent SportHub context (per the session start protocol in `CLAUDE.md`)
2. Have access to all project commands and schema from `CLAUDE.md`

If MemPalace searches return nothing, follow step 3 above.

---

## Documentation Standards

- Architecture decisions → `docs/architecture/`
- API references → `docs/api/`
- Schemas and query patterns → `docs/schema/`
- Setup/ops guides → `docs/` root
- Code-level comments → source files only, never duplicate in docs
- Keep CLAUDE.md lean — see [AI Tooling](#ai-tooling) above
