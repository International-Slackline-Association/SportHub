# SportHub Documentation

Welcome to the SportHub documentation! This folder contains comprehensive guides for working with the application.

## 📚 Documentation Index

### Core Guides

- **[STATIC-PAGES.md](./STATIC-PAGES.md)** - Static page generation, ISR, and revalidation
  - How ISR works with Next.js
  - When and how to revalidate pages after data updates
  - Build requirements and troubleshooting
  - Environment variables and configuration

- **[DATABASE-SYNC.md](./DATABASE-SYNC.md)** - DynamoDB sync tool (local ↔ remote)
  - Quick start guide for database synchronization
  - All command options and workflows
  - Common scenarios (first-time setup, schema changes, data updates)
  - Advanced usage, troubleshooting, and backup procedures

- **[CLAUDE.md](./CLAUDE.md)** - Working with Claude Code
  - AI assistant integration guide
  - Best practices for development
  - Code generation workflows

## 🚀 Quick Reference

### Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm test:local             # Dev with local DynamoDB

# Database
pnpm db:local               # Start local DynamoDB
pnpm db:setup               # Create tables
pnpm db:seed                # Add sample data

# Sync to Production
pnpm sync:compare           # Compare schemas
pnpm sync:export            # Export local data
pnpm sync:import            # Import to remote
pnpm sync:recreate          # Recreate remote table

# Revalidation
pnpm revalidate:all         # Update all static pages
pnpm revalidate:rankings    # Update rankings page
pnpm revalidate:events      # Update events page
```

### Common Workflows

#### 1. Local Development
```bash
pnpm db:local
pnpm db:setup
pnpm db:seed
pnpm dev
```

#### 2. Update Production Data
```bash
# Update local data first
pnpm db:seed

# Sync to remote
pnpm sync:import

# Refresh static pages
pnpm revalidate:all
```

#### 3. First-Time Production Setup
```bash
# Setup local
pnpm db:local
pnpm db:setup
pnpm db:seed

# Sync to production
pnpm sync:recreate

# Deploy
git push
```

## 📖 Getting Started

New to the project? Start here:

1. Read the main [README.md](../sport-hub/README.md) for project overview
2. Follow [DATABASE-SYNC.md](./DATABASE-SYNC.md) to set up your database
3. Review [STATIC-PAGES.md](./STATIC-PAGES.md) to understand how pages are built

### Other Existing Guides

- **[AMPLIFY_DEPLOYMENT.md](./AMPLIFY_DEPLOYMENT.md)** - AWS Amplify deployment setup
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Authentication configuration
- **[db-setup.md](./db-setup.md)** - Database setup guide

## 🔧 Tech Stack

- **Framework**: Next.js 15.3 with App Router
- **Database**: AWS DynamoDB
- **Authentication**: NextAuth v5 + AWS Cognito
- **Hosting**: AWS Amplify
- **Build**: Turbopack
- **Language**: TypeScript 5

## 🌟 Key Features

- **ISR (Incremental Static Regeneration)**: Fast pages that auto-update
- **Database Sync Tool**: Easy local-to-production data migration
- **On-Demand Revalidation**: Manually refresh pages after data changes
- **Local DynamoDB**: Full offline development capability

## 💡 Need Help?

- Check the relevant guide in this folder
- Review error messages and troubleshooting sections
- Consult the main [README.md](../sport-hub/README.md) for basic setup

## 📝 Documentation Updates

When making changes that affect these docs:

1. Update the relevant .md file
2. Update cross-references if files are renamed
3. Keep command examples consistent with package.json
4. Test all code examples to ensure they work

---

**Last Updated**: November 2025
**Version**: 1.0
