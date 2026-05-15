# Obsidian Wiki Setup

## Vault
Path: `~/Obsidian/Second Brain/`
Purpose: Project ideas, code stacks/structures, and architecture decisions for future reference. Separate from MemPalace (active session memory).

## Setup Checklist

1. **Obsidian installed** — download from https://obsidian.md if missing
2. **Local REST API plugin** — must be running on port 27124
   - Install in Obsidian: Settings → Community Plugins → search "Local REST API" (by coddingtonbear)
   - Enable it and note the API key
3. **MCP server** — registered as `obsidian-vault` at user scope via REST API (`mcp-obsidian`)
   - Verify: `claude mcp list | grep obsidian`
   - Re-add if missing:
     ```
     claude mcp add-json obsidian-vault '{"type":"stdio","command":"uvx","args":["mcp-obsidian"],"env":{"OBSIDIAN_API_KEY":"<key>","OBSIDIAN_HOST":"127.0.0.1","OBSIDIAN_PORT":"27124","NODE_TLS_REJECT_UNAUTHORIZED":"0"}}' --scope user
     ```
   - Test connection: `curl -sk -H "Authorization: Bearer <key>" https://127.0.0.1:27124/`

## Vault Structure

```
~/Obsidian/Second Brain/
├── .raw/                    ← drop sources here to ingest
├── wiki/
│   ├── index.md             ← master catalog
│   ├── hot.md               ← session context summary
│   ├── log.md               ← ingestion history
│   └── canvases/
├── projects/
│   ├── ideas/               ← raw project ideas
│   ├── active/
│   │   └── SportHub.md      ← current SportHub architecture
│   └── archived/
├── stacks/
│   ├── frontend/            ← React, Next.js, Tailwind patterns
│   ├── backend/             ← APIs, databases, auth
│   ├── infrastructure/      ← deployment, hosting, CI/CD
│   └── patterns/            ← reusable code patterns
├── resources/               ← articles, tools, references
└── templates/
    ├── project-idea.md
    └── stack-reference.md
```

## Usage During Sessions

Write to the vault proactively when these come up:
- Architecture decisions and trade-offs → `projects/active/SportHub.md` or `stacks/patterns/`
- New project ideas → `projects/ideas/<idea>.md`
- Stack/tech insights → `stacks/<category>/`
- Notable resources → `resources/`

Commands:
- `ingest [file]` — create wiki pages from a source in `.raw/`
- `update hot cache` — refresh session context summary
- `/save` — file current conversation as a wiki note
- `/autoresearch [topic]` — autonomous web research → wiki
