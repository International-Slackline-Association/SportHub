# Claude AI Setup for SportHub Developers

This guide sets up the same Claude Code environment used in this project — a lean `CLAUDE.md` backed by MemPalace (persistent memory) and an Obsidian vault (knowledge base). Once configured, Claude has full project context without a bloated CLAUDE.md.

---

## Overview

| Tool | Purpose |
|---|---|
| **MemPalace** | Persistent structured memory across Claude sessions (project knowledge, decisions, commands) |
| **Obsidian + Local REST API** | Knowledge vault — architecture insights, ideas, patterns |
| **context-mode** | Keeps Claude's context window lean during sessions |

---

## 1. Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed
- [Node.js](https://nodejs.org/) 18+
- [Obsidian](https://obsidian.md/) desktop app

---

## 2. MemPalace Setup

MemPalace gives Claude persistent, queryable memory across sessions. Project knowledge lives in the `sporthub` wing.

### Install

```bash
npm install -g @mempalace/cli
mempalace init
```

### Register as MCP server

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "mempalace": {
      "command": "npx",
      "args": ["-y", "@mempalace/server"]
    }
  }
}
```

Or via Claude Code settings:

```bash
claude mcp add mempalace -- npx -y @mempalace/server
```

### Verify

In a Claude Code session, run:
```
/mcp
```
You should see `mempalace` listed as connected.

### Load SportHub knowledge

The existing `sporthub` wing has all project knowledge pre-filed (stack, structure, commands, schema, conventions, auth, env). To search it:

```
mempalace_search: "SportHub <topic>"
```

Or tell Claude: *"search MemPalace for SportHub schema"* — it will query the `sporthub` wing automatically per the session start protocol in `CLAUDE.md`.

---

## 3. Obsidian + Local REST API Setup

### Install Obsidian

Download from [obsidian.md](https://obsidian.md/) and create or open a vault. The project vault is at `~/Obsidian/Second Brain/`.

### Install Local REST API plugin

1. In Obsidian: **Settings → Community plugins → Browse**
2. Search `Local REST API` → Install → Enable
3. **Settings → Local REST API**: note the API key and confirm port `27124`

### Register as MCP server

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "npx",
      "args": ["-y", "mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "<your-api-key>",
        "OBSIDIAN_HOST": "http://localhost:27124"
      }
    }
  }
}
```

Replace `<your-api-key>` with the key from the Local REST API plugin settings.

### Verify

```bash
claude mcp list
```
`obsidian-vault` should appear as connected.

---

## 4. context-mode Setup (optional but recommended)

Keeps Claude's context window lean during long sessions.

```bash
npm install -g @context-mode/cli
context-mode init
```

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "context-mode": {
      "command": "npx",
      "args": ["-y", "@context-mode/server"]
    }
  }
}
```

---

## 5. CLAUDE.md

The project `CLAUDE.md` (`sport-hub/CLAUDE.md`) is intentionally minimal — it just points Claude at MemPalace and Obsidian. All detailed project knowledge lives in MemPalace.

See [`claude-md-reference.md`](./claude-md-reference.md) for the full original reference that was migrated into MemPalace.

---

## 6. Claude Code Plugins

Install all plugins used in this project. Plugins add skills, agents, and tools to Claude Code.

### Install command

```bash
claude plugin install <name>@<marketplace>
```

### Official plugins

```bash
claude plugin install claude-code-setup@claude-plugins-official   # Project setup automation
claude plugin install security-guidance@claude-plugins-official    # Security best practices
claude plugin install coderabbit@claude-plugins-official           # AI code review
claude plugin install typescript-lsp@claude-plugins-official       # TypeScript language server
```

### Ruflo plugins (AI agent framework)

```bash
claude plugin install ruflo-core@ruflo              # Core agent infrastructure
claude plugin install ruflo-swarm@ruflo             # Multi-agent swarm coordination
claude plugin install ruflo-testgen@ruflo           # Test generation (TDD London School)
claude plugin install ruflo-ddd@ruflo               # Domain-Driven Design scaffolding
claude plugin install ruflo-security-audit@ruflo    # Security audit agents
claude plugin install ruflo-aidefence@ruflo         # AI threat detection + PII scanning
claude plugin install ruflo-goals@ruflo             # Goal planning + deep research
claude plugin install ruflo-intelligence@ruflo      # Neural pattern routing
claude plugin install ruflo-agentdb@ruflo           # Agent memory + semantic search
claude plugin install ruflo-ruvector@ruflo          # Vector embeddings + HNSW indexing
claude plugin install ruflo-knowledge-graph@ruflo   # Knowledge graph extraction
claude plugin install ruflo-autopilot@ruflo         # Autonomous task completion
claude plugin install ruflo-ruvllm@ruflo            # Local LLM inference + MicroLoRA
```

### Memory + context plugins

```bash
claude plugin install mempalace@mempalace           # Persistent memory palace (v3.3.3+)
claude plugin install context-mode@context-mode     # Context window optimization
claude plugin install claude-obsidian@claude-obsidian-marketplace  # Obsidian vault integration
```

---

## 7. Confirming the setup works

Start a Claude Code session in `sport-hub/` and say:

> "Search MemPalace for SportHub schema and tell me the sort key patterns for the events table."

Claude should retrieve the answer from the `sporthub / schema` drawer without you providing any context.
