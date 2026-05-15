# Authentication & Authorization

## Overview

SportHub uses **AWS Cognito** for authentication via **NextAuth v5 (Beta)** with OIDC, and implements a custom **Role-Based Access Control (RBAC)** system stored in DynamoDB.

## Architecture

```
┌─────────────────┐
│   AWS Cognito   │  ─── Authentication (OIDC / JWT)
│  (user pool)    │  ─── All authorized users managed here
└────────┬────────┘
         │ sub, email
         ▼
┌─────────────────┐
│   NextAuth v5   │  ─── Session management (JWT, 30-day)
│   (auth.ts)     │  ─── Runs onboarding on first login
└────────┬────────┘
         │ customUserId (ISA_xxx)
         ▼
┌────────────────────────────────────────────────┐
│  isa-users  (eu-central-1)   READ-ONLY         │
│  ISA athlete identity: name, email, country    │
│  Primary key: user:{ISA_xxx} / userDetails     │
└────────────────────────────────────────────────┘
         │ ISA_xxx ID
         ▼
┌────────────────────────────────────────────────┐
│  sporthub-users  (us-east-2)                   │
│  App data: role, points, rankings, profile     │
│  PK: userId (ISA_xxx) / sortKey (Profile, ...) │
└────────────────────────────────────────────────┘
```

### Key Principles
- **Authentication** = Cognito (who you are)
- **Authorization** = sporthub-users RBAC (what you can do)
- **Identity** = isa-users (read-only ISA athlete data)
- **Session** = JWT with `customUserId` + role embedded

### User ID Formats
- `ISA_XXXXXXXX` — new users and Cognito-onboarded users (8 random hex, uppercase)
- `SportHubID:xxxxx` — legacy migrated users from ISA-Rankings

---

## Login Flow (JWT Callback)

Every login runs through `src/lib/auth.ts` → `jwt()` callback:

```
1. getUserByEmail(email)        → sporthub-users scan
   Found? → use existing userId (migrated or previously onboarded user)

2. Not found → ensureUserExists(cognitoSub, email)  [onboarding.ts]
   a. getReferenceUserByEmail(email) → isa-users (READ-ONLY, guaranteed to find user)
   b. userExists(ISA_xxx)            → sporthub-users check
   c. If not exists: createUser(ISA_xxx, { email }) → create Profile record

3. Load RBAC: getUserRole() + getUserPermissions() + getUserSubTypes()
   → stored in JWT token → passed to session
```

**isa-users is never written to.** All Cognito users are guaranteed to have an isa-users entry before they ever log in.

---

## User Roles

| Role    | Description                                   | Permissions                           |
|---------|-----------------------------------------------|---------------------------------------|
| `user`  | Default role for all authenticated users      | View public content, edit own profile |
| `admin` | Full system access                            | All permissions                       |

New users are assigned `role: 'user'` and `userSubTypes: ['athlete']` by default.

### User Sub-Types (classification, not authorization)
- `athlete` — default
- `judge`
- `organizer`

---

## Permissions

Format: `resource:action`. Only restricted operations require permissions.

| Permission       | Description                 |
|------------------|-----------------------------|
| `events:create`  | Create new events           |
| `events:edit`    | Edit existing events        |
| `events:delete`  | Delete events               |
| `users:manage`   | Manage user roles/profiles  |
| `rankings:edit`  | Edit rankings data          |
| `admin:access`   | Access admin dashboard      |

Public access (no permissions required): events, rankings, athlete profiles.

---

## sporthub-users Profile Record

Created on first login for new Cognito users:

```typescript
{
  userId: 'ISA_A1B2C3D4',    // from isa-users reference DB
  sortKey: 'Profile',
  role: 'user',
  userSubTypes: ['athlete'],
  primarySubType: 'athlete',
  email: 'user@example.com', // stored for getUserByEmail lookup on subsequent logins
  totalPoints: 0,
  contestCount: 0,
  profileCompleted: false,
  createdAt: <timestamp>,
  roleAssignedAt: <ISO string>,
  roleAssignedBy: 'system',
}
```

---

## Authorization Functions (`src/lib/authorization.ts`)

| Function | Purpose |
|----------|---------|
| `requireAuth()` | Require any authentication (redirects to /auth/signin) |
| `requireRole(role)` | Require specific role |
| `requireAdmin()` | Require admin role |
| `hasRole(role)` | Boolean check |
| `canEditUser(userId)` | Ownership OR admin check |
| `getCurrentUser()` | Returns session user (pure session read, no DB call) |

---

## Protection Layers

Three layers of defense:

**Layer 1 — Middleware** (`src/middleware.ts`): Edge-level route protection.

**Layer 2 — Page components**:
```typescript
export default async function AdminPage() {
  await requireAdmin();
  // ...
}
```

**Layer 3 — Server Actions**:
```typescript
export async function saveEvent(data: EventData) {
  await requireAdmin();
  // ...
}
```

---

## Role Caching

Roles are cached in `rbac-service.ts` with a 5-minute TTL to reduce DynamoDB calls. Role changes require re-login to take effect in the session JWT.

---

## Test Pages

| Page | Purpose |
|------|---------|
| `/test_LOCAL` | DynamoDB test UI |
| `/test_SSR` | SSR tests + role management |
| `/test_CSR` | CSR tests + role management |

Access: any authenticated user in dev; admin-only in production.

---

## File Locations

```
src/
├── lib/
│   ├── auth.ts                # NextAuth config + JWT callback + onboarding trigger
│   ├── authorization.ts       # requireAuth, requireAdmin, canEditUser, getCurrentUser
│   ├── onboarding.ts          # ensureUserExists — creates sporthub-users on first login
│   ├── rbac-service.ts        # getUserRole, getUserPermissions (with 5-min cache)
│   ├── reference-db-service.ts # READ-ONLY isa-users access (identity lookup)
│   └── user-service.ts        # createUser, getUserByEmail, updateUserProfile
├── types/
│   ├── auth.ts                # NextAuth type extensions (customUserId, role, etc.)
│   └── rbac.ts                # Role, Permission, UserSubType types
└── middleware.ts              # Route protection
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `COGNITO_CLIENT_ID` | Cognito app client ID |
| `COGNITO_CLIENT_SECRET` | Cognito app client secret |
| `COGNITO_REGION` | Cognito region (e.g. `eu-central-1`) |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID |
| `AUTH_SECRET` | NextAuth secret |
| `REFERENCE_DB_TABLE` | isa-users table name (default: `isa-users`) |
| `REFERENCE_DB_REGION` | isa-users region (default: `eu-central-1`) |
| `LOCAL_REFERENCE_DB` | `true` = use local DynamoDB for reference DB (dev only) |

---

## Troubleshooting

**Role mismatch after update**: Sign out and sign back in to refresh JWT.

**New user has no sporthub account after login**: Check server logs for `[Onboarding]` errors. The isa-users lookup by email may be failing — verify `REFERENCE_DB_TABLE` and `REFERENCE_DB_REGION` env vars, and that the `GSI` index exists on isa-users.

**`session.user.role` is undefined**: User may not have a sporthub-users Profile record. Check `getUserByEmail` returns a result for their email.

**Test pages not accessible in production**: Only admins can access test pages in prod. Promote your user via another admin's `/test_SSR` page.

---

## Future Enhancements

- [ ] Organizer/judge role activation
- [ ] Fine-grained permission checks
- [ ] Audit logging for role changes
- [ ] Email GSI on sporthub-users (replace scan in `getUserByEmail`)
