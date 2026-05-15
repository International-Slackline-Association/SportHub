# SportHub Docs

Developer reference hub. The root [`README.md`](../README.md) covers quick start, commands, and project structure — this covers architecture, tooling, and how to onboard.

---

## Documentation Index

### Architecture & Auth
| Doc | What's in it |
|-----|-------------|
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Cognito + NextAuth flow, onboarding, `sportHubUserId` vs `isaUsersId`, RBAC |
| [architecture/reference-db-pattern.md](./architecture/reference-db-pattern.md) | Why isa-users is read-only, two-DB pattern, ID model deep-dive |
| [RBAC.md](./RBAC.md) | Roles, permissions, protection layers |

### Database
| Doc | What's in it |
|-----|-------------|
| [schema/database-schema.md](./schema/database-schema.md) | Table definitions, sort key patterns, GSI specs |
| [schema/query-patterns.md](./schema/query-patterns.md) | Access patterns, query examples, performance benchmarks |
| [db-setup.md](./db-setup.md) | Local Docker setup, table creation |
| [DATABASE-SYNC.md](./DATABASE-SYNC.md) | Local ↔ remote sync tool, all workflows |

### Deployment & Ops
| Doc | What's in it |
|-----|-------------|
| [AMPLIFY_DEPLOYMENT.md](./AMPLIFY_DEPLOYMENT.md) | AWS Amplify CI/CD, env vars, build config |
| [STATIC-PAGES.md](./STATIC-PAGES.md) | ISR, on-demand revalidation, build output |
| [AUTH_SETUP.md](./AUTH_SETUP.md) | Cognito user pool setup, env var reference |

### API Reference
| Doc | What's in it |
|-----|-------------|
| [api/data-services.md](./api/data-services.md) | Main data access layer functions |

### AI / Developer Tooling
| Doc | What's in it |
|-----|-------------|
| [claude-setup.md](./claude-setup.md) | **Start here on a new machine** — installs MemPalace, Obsidian MCP, context-mode, all plugins |
| [WIKI.md](./WIKI.md) | Obsidian vault structure, Local REST API plugin, MCP config |
| [claude-md-reference.md](./claude-md-reference.md) | Archived full project reference — human-readable backup of what lives in MemPalace |

---

## AI Tooling — How It Works

Three systems keep Claude productive without a bloated `CLAUDE.md`:

```
sport-hub/CLAUDE.md          ← loaded every session (keep lean — rules + pointers only)
         │
         └─ session start: search MemPalace ──→ sporthub wing
                                                 (decisions, architecture, solved problems)
         └─ long-form reference ──────────────→ docs/ (this folder)
         └─ ideas / research ─────────────────→ Obsidian vault
```

### CLAUDE.md — keep it lean

`sport-hub/CLAUDE.md` is injected verbatim into every Claude session. It should stay under ~150 lines.

**What belongs in CLAUDE.md:**
- Session start protocol (MemPalace search block — do not remove)
- `pnpm` commands and path aliases
- DB schema key patterns (sort keys, GSI names)
- Layout rules and critical constraints

**What does NOT belong in CLAUDE.md:**
- Architecture explanations → `docs/`
- Implementation details → MemPalace or source comments
- Anything already in a doc file → link to it, don't copy it

When CLAUDE.md grows past ~150 lines, audit it. Move prose to `docs/`, file decisions into MemPalace, and leave only the lookup-table content.

### MemPalace — project memory

All architectural decisions, solved problems, and non-obvious context live in the `sporthub` MemPalace wing. Claude queries it automatically at session start.

Rooms: `backend` (auth, DB, services) · `documentation` · `scripts` · `general`

To search: `mempalace_search: "SportHub <topic>" wing=sporthub`

To file a new memory: tell Claude *"remember this"* or *"save this to MemPalace"* and it will file it to the right room.

---

## New Machine Setup

### 1. Project

See root [README.md](../README.md) for `pnpm install` + local DB quickstart.

### 2. Claude AI Tooling

Follow **[docs/claude-setup.md](./claude-setup.md)** — it covers:
- MemPalace install + MCP server registration
- Obsidian + Local REST API plugin + MCP config
- context-mode install
- All Claude Code plugin installs (official + Ruflo + memory plugins)
- Verification steps

### 3. Seed MemPalace

After installing MemPalace on a new machine, the `sporthub` wing needs to be populated. Two options:

**Option A — mine from codebase (recommended):**
```
/mempalace:mine
```
Claude will crawl `sport-hub/src/` and `docs/` and file structured memories automatically.

**Option B — manually reseed from key docs:**
Ask Claude:
> "Read docs/AUTHENTICATION.md and docs/architecture/reference-db-pattern.md and file the key architecture decisions into MemPalace under sporthub/backend."

**Verify the palace is warm:**
```
mempalace_search: "SportHub authentication sportHubUserId"
```
If that returns the auth architecture drawer, you're good. If not, re-run option A or B.

---

## Documentation Standards

- Architecture decisions → `docs/architecture/`
- API references → `docs/api/`
- Schema and query patterns → `docs/schema/`
- Setup and ops guides → `docs/` root
- Solved problems and non-obvious decisions → MemPalace (not docs)
- Do not duplicate content between CLAUDE.md and docs — link, don't copy
