![](/sport-hub/public/favicon.ico)

[![](https://dcbadge.limes.pink/api/server/ugeS27zcuD)](https://discord.gg/ugeS27zcuD)

# ISA SportHub

Next.js application for sports management, athlete profiles, and competition rankings — built for the International Slackline Association.

## Tech Stack

- **Framework**: Next.js 15.3 · App Router · Turbopack
- **Runtime**: React 19 · TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Database**: AWS DynamoDB (local Docker + remote AWS)
- **Auth**: NextAuth v5 + AWS Cognito
- **Hosting**: AWS Amplify
- **Package Manager**: pnpm — run all commands from `sport-hub/`

## Quick Start

```bash
cd sport-hub
pnpm install
pnpm db:local && pnpm db:setup && pnpm db:seed
pnpm dev
# → http://localhost:3000
```

## Project Structure

```
SportHub/
├── sport-hub/          # Next.js application (src/, scripts/, public/)
├── docs/               # Architecture, API reference, setup guides
│   └── README.md       # ← start here for everything beyond quick start
└── mempalace.yaml      # AI memory palace config (sporthub wing)
```

## Documentation

Everything else — architecture, database schema, auth, deployment, AI tooling, new machine setup — is in **[`docs/`](docs/README.md)**.
