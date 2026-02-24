# Authentication & Authorization

## Overview

SportHub uses **AWS Cognito** for authentication via **NextAuth v5 (Beta)** with OIDC, and implements a custom **Role-Based Access Control (RBAC)** system stored in DynamoDB for authorization.

## Architecture

```
┌─────────────┐
│ AWS Cognito │ ──── Authentication (OIDC)
└─────────────┘
       │
       ▼
┌─────────────┐
│  NextAuth   │ ──── Session Management (JWT)
└─────────────┘
       │
       ▼
┌─────────────┐
│  DynamoDB   │ ──── User Roles & Permissions
└─────────────┘
```

### Key Principles
- **Authentication** = Who you are (Cognito handles this)
- **Authorization** = What you can do (DynamoDB + RBAC handles this)
- **Session** = JWT with role embedded (30-day expiry)
- **Defense in Depth** = 3 layers (Middleware → Page → Server Action)

## User Roles

### Available Roles

| Role    | Description                                   | Permissions                           |
|---------|-----------------------------------------------|---------------------------------------|
| `user`  | Default role for all users                    | View public content, edit own profile |
| `admin` | Full system access                            | All permissions including event creation, user management |

### Role Assignment
- **Default**: New users automatically get `user` role
- **Admin Assignment**: Only via test pages (`/test_SSR`, `/test_CSR`) in development or by existing admins in production
- **Session Update**: Role changes require re-login to take effect in session

## Permissions

Permissions use the format `resource:action`. Only **restricted operations** require permissions.

### Admin Permissions
- `events:create` - Create new events
- `events:edit` - Edit existing events
- `events:delete` - Delete events
- `users:manage` - Manage user roles and profiles
- `rankings:edit` - Edit rankings data
- `admin:access` - Access admin dashboard

### Public Access (No Permissions Required)
- View events
- View rankings
- View athlete profiles
- View public pages

## Implementation

### 1. Database Schema

User records in DynamoDB include RBAC fields:

```typescript
interface UserRecord {
  userId: string;              // Cognito user ID
  role: 'user' | 'admin';      // Primary role
  roleAssignedAt?: string;     // ISO timestamp
  roleAssignedBy?: string;     // Who assigned the role

  // User data
  name: string;
  email: string;
  country?: string;

  // Index signature for DynamoDB
  [key: string]: unknown;
}
```

### 2. Session Extension

The JWT session includes role information:

```typescript
// src/lib/auth.ts
async jwt({ token, account, profile }) {
  if (account && profile && token.sub) {
    const role = await getUserRole(token.sub);
    token.role = role;
  }
  return token;
}

async session({ session, token }) {
  session.user.role = token.role as Role;
  return session;
}
```

### 3. Authorization Functions

Located in `src/lib/authorization.ts`:

```typescript
// Require authentication
await requireAuth();

// Require specific role
await requireRole('admin');

// Shorthand for admin
await requireAdmin();

// Check if user has role (returns boolean)
const isAdmin = await hasRole('admin');

// Check ownership or admin
const authResult = await canEditUser(targetUserId);
if (!authResult.authorized) {
  throw new Error('Unauthorized');
}

// Get current user
const user = await getCurrentUser();
```

### 4. Protection Layers

#### Layer 1: Middleware
```typescript
// src/middleware.ts
// Routes like /admin/* are protected at the edge
```

#### Layer 2: Page Components
```typescript
// src/app/admin/page.tsx
export default async function AdminPage() {
  await requireAdmin();
  // ... page content
}
```

#### Layer 3: Server Actions
```typescript
// src/app/admin/submit/event/actions.ts
export async function saveEvent(data: EventData) {
  await requireAdmin();
  // ... save logic
}
```

## User Dashboard

Users can manage their profile at `/dashboard`:

### Features
- **Edit Profile**: Name, email, country
- **Country Selection**: Dropdown with flag icons
- **Role Display**: Shows current role badge
- **Auto-Creation**: Users created automatically on first profile edit

### Profile Editing
```typescript
// Server action with authorization
export async function updateProfile(userId: string, data: ProfileUpdateData) {
  const authResult = await canEditUser(userId);

  if (!authResult.authorized) {
    return { success: false, error: 'Unauthorized' };
  }

  // Update profile...
}
```

## Test Pages

All test pages (`/test_SSR`, `/test_CSR`, `/test_LOCAL`) and test API routes (`/api/test-local/*`, `/api/test-runtime`) are protected:

- **Development**: Accessible by any authenticated user
- **Production**: Only accessible by admin users

### Test Page Access
```typescript
// src/lib/test-page-access.ts
export async function requireTestPageAccess() {
  if (process.env.NODE_ENV === 'development') {
    return; // Allow in dev
  }

  const session = await auth();
  if (session?.user.role !== 'admin') {
    redirect('/unauthorized');
  }
}
```

### RBAC Testing
Role management is available via `/test_SSR` and `/test_CSR` test pages:
- View current session role
- See all users and their roles
- Promote users to admin
- Demote admins to user
- Detect role/session mismatches

## Security Considerations

### JWT Security
- **Tamper-proof**: Role stored in signed JWT
- **HTTP-only cookies**: Prevents XSS attacks
- **30-day expiry**: Automatic session timeout
- **Role caching**: 5-minute TTL reduces DB calls

### Authorization Checks
- **Always verify ownership**: Users can only edit their own data
- **Admin bypass**: Admins can edit any user's data
- **Audit trail**: Track who assigned roles and when
- **Triple verification**: Middleware, page, and action layers

### Best Practices
```typescript
// ✅ Good: Check authorization before operations
const authResult = await canEditUser(userId);
if (!authResult.authorized) {
  return { success: false, error: authResult.reason };
}

// ❌ Bad: Trust client-side data
if (session.user.role === 'admin') {
  // Client could manipulate this
}

// ✅ Good: Server-side verification
await requireAdmin(); // Verifies server-side
```

## Common Patterns

### Protecting a Page
```typescript
import { requireAdmin } from '@lib/authorization';

export default async function MyAdminPage() {
  await requireAdmin();

  return <div>Admin content</div>;
}
```

### Protecting a Server Action
```typescript
import { canEditUser } from '@lib/authorization';

export async function updateResource(userId: string, data: any) {
  const authResult = await canEditUser(userId);

  if (!authResult.authorized) {
    return { success: false, error: 'Unauthorized' };
  }

  // Perform update...
  return { success: true };
}
```

### Conditional UI
```typescript
import { getCurrentUser } from '@lib/authorization';

export default async function Dashboard() {
  const user = await getCurrentUser();

  return (
    <div>
      {user?.role === 'admin' && <AdminPanel />}
      <UserContent />
    </div>
  );
}
```

## API Reference

### Authorization Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `requireAuth()` | Require any authentication | `Promise<void>` (throws or redirects) |
| `requireRole(role)` | Require specific role | `Promise<void>` (throws or redirects) |
| `requireAdmin()` | Require admin role | `Promise<void>` (throws or redirects) |
| `hasRole(role)` | Check if user has role | `Promise<boolean>` |
| `canEditUser(userId)` | Check ownership or admin | `Promise<AuthorizationResult>` |
| `getCurrentUser()` | Get current session user | `Promise<User \| null>` |

### Test Page Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `requireTestPageAccess()` | Protect test pages | `Promise<void>` (redirects if unauthorized) |
| `canAccessTestAPI()` | Check API access | `Promise<{allowed: boolean, status?: number}>` |

## File Locations

```
src/
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── authorization.ts           # Authorization utilities
│   ├── rbac-service.ts           # Role service with caching
│   └── test-page-access.ts       # Test page protection
├── types/
│   ├── auth.ts                   # NextAuth type extensions
│   └── rbac.ts                   # RBAC type definitions
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # User dashboard
│   │   ├── actions.ts            # Profile update actions
│   │   └── components/
│   │       ├── ProfileSection.tsx
│   │       └── ProfileEditForm.tsx
│   └── unauthorized/
│       └── page.tsx              # Access denied page
└── middleware.ts                 # Route protection
```

## Migration

If upgrading from a system without RBAC:

1. **Add RBAC fields to existing users**:
   ```bash
   pnpm migrate:rbac
   ```

2. **Manually promote admins**:
   - Visit `/test_SSR` or `/test_CSR` in development
   - Promote specific users to admin role
   - Have them sign out and sign back in

3. **Verify migration**:
   - Check all users have `role` field
   - Test admin access to protected routes
   - Verify regular users cannot access admin pages

## Troubleshooting

### Role mismatch after update
**Problem**: Database shows `admin` but session shows `user`

**Solution**: Sign out and sign back in to refresh JWT token

### Test pages not accessible in production
**Expected behavior**: Only admins can access test pages in production

**Solution**: Promote your user to admin via another admin's `/test_SSR` page

### Unauthorized error on dashboard
**Problem**: Cannot edit own profile

**Solution**: Check that `canEditUser()` is comparing correct user IDs

### Session doesn't include role
**Problem**: `session.user.role` is undefined

**Solution**:
1. Check `src/lib/auth.ts` JWT callback loads role
2. Verify user exists in DynamoDB with role field
3. Clear cookies and re-authenticate

## Future Enhancements

- [ ] **Organizer role**: Allow event organizers to create their own events
- [ ] **Fine-grained permissions**: More granular permission checks
- [ ] **User sub-types**: Activate judge/organizer/athlete classifications
- [ ] **Temporary permissions**: Time-limited role assignments
- [ ] **Multi-role support**: Users with multiple roles simultaneously
- [ ] **Audit logging**: Track all role changes and access attempts
- [ ] **Permission caching**: Cache user permissions separately from roles

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [RBAC Implementation Plan](./RBAC.md)
