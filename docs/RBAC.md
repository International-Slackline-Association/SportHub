# Role-Based Access Control (RBAC) Documentation

## Overview

SportHub implements a comprehensive RBAC (Role-Based Access Control) system that controls user access to different parts of the application. The system is designed with two primary roles and extensibility for future permission-based features.

**Key Principle:** Only restricted operations require permissions. Public data (events, rankings, user profiles) can be accessed by anyone without authentication or special permissions.

## Table of Contents

- [Architecture](#architecture)
- [Roles and Permissions](#roles-and-permissions)
- [Implementation](#implementation)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)
- [Security Considerations](#security-considerations)
- [Testing](#testing)

## Architecture

### Storage

Roles and permissions are stored in DynamoDB within the `users` table. This approach provides:
- Flexibility for complex role/permission models
- Easy querying and auditing
- Integration with existing user data
- No dependency on external services

### Security Layers (Defense in Depth)

The RBAC system implements three layers of security:

1. **Middleware** (`src/middleware.ts`)
   - First line of defense
   - Blocks unauthorized requests before they reach pages
   - Redirects to `/unauthorized` or `/auth/signin`

2. **Page Components** (Server Components)
   - Second layer using `requireAdmin()` or `requireRole()`
   - Executes on server before rendering
   - Returns 401 or redirects if unauthorized

3. **Server Actions**
   - Final enforcement layer
   - Protects all data mutations
   - Validates permissions before database operations

### Caching Strategy

Role data is cached for performance:
- **In-Memory Cache**: 5-minute TTL per user
- **JWT Session**: Role embedded in session token (30-day expiry)
- **Cache Invalidation**: Automatic on role updates

## Roles and Permissions

### Primary Roles

#### User (`'user'`)
Default role for all authenticated users.

**Permissions:**
- No special permissions (empty array `[]`)
- Can access all public content without restrictions:
  - Read events
  - View rankings
  - View athlete profiles
- Can edit own profile (enforced by ownership check in `canEditUser()`)

**Restrictions:**
- Cannot access admin pages (`/admin/*`)
- Cannot create/edit/delete events
- Cannot modify other users' data

#### Admin (`'admin'`)
Full administrative access.

**Permissions:**
- `events:create` - Create new events
- `events:edit` - Edit existing events
- `events:delete` - Delete events
- `users:manage` - Manage user accounts and roles
- `rankings:edit` - Edit rankings data
- `admin:access` - Access admin dashboard

**Access:**
- All `/admin/*` routes
- Event submission and management
- Can edit any user's profile
- All public content (inherited)

### Permission Philosophy

**Important:** We only define permissions for **restricted operations**.

✅ **Needs Permission:**
- Creating events (write operation)
- Editing events (write operation)
- Deleting events (write operation)
- Accessing admin dashboard (restricted area)
- Managing users (sensitive operation)

❌ **Doesn't Need Permission:**
- Reading events (public data)
- Viewing rankings (public data)
- Viewing athlete profiles (public data)
- Viewing event details (public data)

### Future Extensions

The system is designed to support:

**User Sub-Types:**
- `'judge'` - Can score competitions
- `'organizer'` - Can create and manage events (via `events:create` permission)
- `'athlete'` - Enhanced athlete profile features

**Example: Organizer Role**
```typescript
// Future: Grant event creation to organizers
const permissions = user.userSubTypes?.includes('organizer')
  ? ['events:create']
  : [];
```

## Implementation

### Database Schema

**UserRecord Interface** (`src/lib/relational-types.ts`):
```typescript
interface UserRecord {
  userId: string;
  name: string;
  email: string;

  // RBAC fields
  role: Role;                      // 'user' | 'admin'
  permissions?: string[];           // Granular permissions
  roleAssignedAt?: string;         // ISO timestamp
  roleAssignedBy?: string;         // User ID or 'system'
  userSubTypes?: UserSubType[];    // ['judge', 'organizer', 'athlete']

  // Profile metadata
  profileCompleted?: boolean;
  lastProfileUpdate?: string;

  // ... other fields
}
```

### Type Definitions

**RBAC Types** (`src/types/rbac.ts`):
```typescript
export type Role = 'user' | 'admin';

export type UserSubType = 'judge' | 'organizer' | 'athlete';

export type Permission =
  | 'events:create'
  | 'events:edit'
  | 'events:delete'
  | 'users:manage'
  | 'rankings:edit'
  | 'admin:access';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],  // No special permissions
  admin: [
    'events:create',
    'events:edit',
    'events:delete',
    'users:manage',
    'rankings:edit',
    'admin:access',
  ],
};
```

### Session Integration

**Auth Configuration** (`src/lib/auth.ts`):
```typescript
callbacks: {
  async jwt({ token, account, profile }) {
    if (account && profile && token.sub) {
      // Ensure user exists in database
      await ensureUserExists(token.sub, token.email, token.name);

      // Load role and permissions
      const role = await getUserRole(token.sub);
      const permissions = await getUserPermissions(token.sub);

      token.role = role;
      token.permissions = permissions;
    }
    return token;
  },

  async session({ session, token }) {
    session.user.role = token.role || 'user';
    session.user.permissions = token.permissions || [];
    return session;
  }
}
```

## Usage Examples

### Protecting Pages

```typescript
// src/app/admin/page.tsx
import { requireAdmin } from '@lib/authorization';

export default async function AdminPage() {
  // Require admin role - redirects if unauthorized
  await requireAdmin();

  return <AdminDashboard />;
}
```

### Protecting Server Actions

```typescript
// src/app/admin/submit/event/actions.ts
import { requireAdmin } from '@lib/authorization';

// PROTECTED: Only admins can create events
export async function saveEvent(data: EventData) {
  await requireAdmin();

  const session = await auth();
  const eventData = {
    ...data,
    createdBy: session?.user?.id,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.putItem('events', eventData);
  revalidatePath('/events');

  return { success: true };
}

// PUBLIC: Anyone can read events
export async function getAllEvents() {
  const events = await dynamodb.scanItems('events');
  return { success: true, events };
}
```

### Ownership Validation

```typescript
// User can only edit own profile, admins can edit any
import { canEditUser } from '@lib/authorization';

export async function updateProfile(userId: string, data: ProfileUpdate) {
  const authResult = await canEditUser(userId);

  if (!authResult.authorized) {
    throw new Error('Unauthorized: ' + authResult.reason);
  }

  await updateUserProfile(userId, data);
  return { success: true };
}
```

### Conditional UI

```typescript
// Show admin link only to admins
import { auth } from '@lib/auth';

export default async function Dashboard() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <div>
      <h1>Dashboard</h1>
      {isAdmin && (
        <Link href="/admin">Admin Panel</Link>
      )}
    </div>
  );
}
```

### Client-Side Role Checks

```typescript
'use client';

import { useSession } from 'next-auth/react';

export function UserMenu() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <div>
      {isAdmin && <AdminMenuItem />}
    </div>
  );
}
```

## API Reference

### Authorization Functions

#### `requireAuth()`
Requires any authentication. Redirects to sign-in if not authenticated.

```typescript
await requireAuth();
```

#### `requireRole(role: Role)`
Requires specific role. Redirects to unauthorized page if user doesn't have role.

```typescript
await requireRole('admin');
```

#### `requireAdmin()`
Shorthand for `requireRole('admin')`.

```typescript
await requireAdmin();
```

#### `hasRole(role: Role)`
Checks if current user has role. Returns boolean, doesn't throw.

```typescript
const isAdmin = await hasRole('admin');
if (isAdmin) {
  // Show admin features
}
```

#### `canEditUser(targetUserId: string)`
Checks if current user can edit target user (ownership or admin).

```typescript
const { authorized, reason } = await canEditUser(userId);
if (!authorized) {
  throw new Error(reason);
}
```

#### `getCurrentUser()`
Gets current authenticated user with role.

```typescript
const user = await getCurrentUser();
console.log(user?.role); // 'user' | 'admin'
```

#### `isAdmin()`
Checks if current user is admin. Returns boolean.

```typescript
const adminAccess = await isAdmin();
```

### Role Service Functions

#### `getUserRole(userId: string)`
Fetches user role from database (with caching).

```typescript
const role = await getUserRole(userId);
// Returns: 'user' | 'admin'
```

#### `getUserPermissions(userId: string)`
Gets permissions array based on user role.

```typescript
const permissions = await getUserPermissions(userId);
// Returns: Permission[]
// Example for admin: ['events:create', 'events:edit', 'events:delete', ...]
// Example for user: []
```

#### `updateUserRole(userId: string, newRole: Role, assignedBy: string)`
Updates user role and invalidates cache.

```typescript
await updateUserRole(userId, 'admin', currentUser.id);
```

#### `clearRoleCache(userId: string)`
Manually clear role cache for a user.

```typescript
clearRoleCache(userId);
```

### Middleware Configuration

Protected routes are defined in `src/middleware.ts`:

```typescript
const PROTECTED_ROUTES = [
  { pattern: '/dashboard', requireAuth: true },
  { pattern: '/admin', requiredRole: 'admin', requireAuth: true },
  { pattern: '/api/admin', requiredRole: 'admin', requireAuth: true },
];
```

## Migration Guide

### Initial Setup

1. **Run Migration Script**

For local development:
```bash
pnpm migrate:rbac
```

For production:
```bash
NODE_ENV=production pnpm migrate:rbac
```

The script will:
- Add RBAC fields to all existing users
- Set default role to `'user'`
- Add audit fields (`roleAssignedAt`, `roleAssignedBy`)

2. **Promote First Admin**

Manually update a user in DynamoDB:
```javascript
{
  userId: "your-user-id",
  role: "admin",
  roleAssignedAt: "2025-12-09T00:00:00Z",
  roleAssignedBy: "manual"
}
```

Or via DynamoDB console (http://localhost:8001 for local):
- Navigate to `local-users` table
- Find your user
- Edit item
- Update `role` to `"admin"`

3. **Verify Migration**

Check migration results:
```bash
pnpm db:count  # For local
```

### Rollback

If needed, you can rollback the migration:

```typescript
import { rollbackRBACFields } from './src/lib/migrations/add-rbac-fields';

await rollbackRBACFields();
```

**WARNING:** This removes all RBAC fields from all users.

## Security Considerations

### Authentication vs Authorization

- **Authentication**: Handled by NextAuth + AWS Cognito
  - Verifies identity ("Who are you?")
- **Authorization**: Handled by RBAC system (this implementation)
  - Controls access ("What can you do?")

The systems are separate but integrated through the session.

### Session Security

- **Token Storage**: HTTP-only, secure cookies
- **Token Expiry**: 30 days (configurable)
- **Role Caching**: 5 minutes TTL
- **Tamper Protection**: JWT signature verification

### Best Practices

1. **Always Check on Server**
   - Never rely solely on client-side role checks
   - Client checks are for UI only

2. **Use All Three Layers**
   - Middleware for routes
   - Page components for rendering
   - Server actions for mutations

3. **Log Role Changes**
   - Always set `roleAssignedBy`
   - Track `roleAssignedAt`
   - Consider adding audit log table

4. **Principle of Least Privilege**
   - Default to `'user'` role
   - Grant admin sparingly
   - Consider granular permissions for specific features

5. **Cache Invalidation**
   - Role changes clear cache automatically
   - Force re-login for immediate effect

6. **Public Data Stays Public**
   - Don't add permissions for public operations
   - Keep public APIs unrestricted

### Common Vulnerabilities

❌ **Don't:**
```typescript
// Client-side only check
'use client';
if (session?.user?.role === 'admin') {
  // Anyone can modify client code!
}
```

✅ **Do:**
```typescript
// Server-side validation
export async function deleteEvent(eventId: string) {
  await requireAdmin(); // Enforced on server
  await dynamodb.deleteItem('events', { eventId });
}
```

## Testing

### Manual Testing Checklist

#### User Role
- [ ] Sign in as regular user
- [ ] Can view all events (public access)
- [ ] Can view all rankings (public access)
- [ ] Can view all athlete profiles (public access)
- [ ] Try to access `/admin` → redirected to `/unauthorized`
- [ ] Try to access `/admin/submit/event` → redirected
- [ ] Can edit own profile on `/dashboard`
- [ ] Cannot edit other users' profiles
- [ ] Cannot create events (no UI shown)
- [ ] Middleware blocks unauthorized routes

#### Admin Role
- [ ] Sign in as admin
- [ ] Can access `/admin` → dashboard loads
- [ ] Can access `/admin/submit/event` → form loads
- [ ] Can create events → saves successfully
- [ ] Can edit own profile
- [ ] Can edit other users' profiles
- [ ] Can delete events
- [ ] All public content accessible
- [ ] All middleware checks pass

#### Session & Caching
- [ ] Role appears in session after login
- [ ] Role cached for 5 minutes
- [ ] Role update clears cache
- [ ] JWT expires after 30 days
- [ ] Re-login required after role change

#### Public Access
- [ ] Events page loads without authentication
- [ ] Rankings page loads without authentication
- [ ] Athlete profiles load without authentication
- [ ] No permission checks on public read operations

### Automated Testing

```typescript
// Example test structure
describe('RBAC System', () => {
  describe('requireAdmin', () => {
    it('allows admins', async () => {
      // Mock admin session
      await expect(requireAdmin()).resolves.not.toThrow();
    });

    it('blocks users', async () => {
      // Mock user session
      await expect(requireAdmin()).rejects.toThrow('Unauthorized');
    });
  });

  describe('public access', () => {
    it('allows unauthenticated event reads', async () => {
      // No auth required
      const result = await getAllEvents();
      expect(result.success).toBe(true);
    });
  });
});
```

## Performance Impact

### Database Queries

- **Login**: +1 query to load role
- **Subsequent requests**: 0 queries (cached in JWT)
- **Role update**: 1 write + cache invalidation
- **Public reads**: 0 auth queries (no permission check)

### Caching Benefits

- **Role Cache**: Reduces DB calls from every request to once per 5 minutes
- **JWT Session**: 30-day session eliminates per-request auth DB hits
- **Middleware**: Uses session role (no DB lookup)
- **No Permission Checks**: Public operations skip permission resolution entirely

### Optimization Tips

1. **Batch Role Updates**: Update multiple users in parallel
2. **Cache Warming**: Pre-load roles for active users
3. **Monitor Cache Hit Rate**: Ensure cache is effective
4. **Keep Public APIs Fast**: No auth checks = faster response times

## Future Enhancements

### Planned Features

1. **Organizer Permissions**
   - Allow users with `userSubType: 'organizer'` to create events
   - Check: `hasPermission('events:create')`
   - Implementation:
   ```typescript
   async function getUserPermissions(userId: string) {
     const user = await getUser(userId);
     const rolePerms = ROLE_PERMISSIONS[user.role];

     // Add organizer permissions
     if (user.userSubTypes?.includes('organizer')) {
       return [...rolePerms, 'events:create'];
     }

     return rolePerms;
   }
   ```

2. **Permission-Based Access**
   - Move beyond basic roles
   - Granular permission checks using `hasPermission()`

3. **User Sub-Types**
   - Activate judge/organizer/athlete classifications
   - Specialized permissions per sub-type

4. **Role Hierarchy**
   - Add moderator role
   - Add super-admin role

5. **Audit Logging**
   - Track all role changes
   - Log access attempts
   - Monitor event modifications

6. **Time-Based Access**
   - Temporary elevated permissions
   - Event organizer role for specific duration

7. **Multi-Role Support**
   - Users can have multiple roles simultaneously
   - Permission union across roles

## API Endpoints

### Admin Role Management

Create an API endpoint to manage roles (admin only):

```typescript
// src/app/api/admin/users/[userId]/role/route.ts
import { requireAdmin } from '@lib/authorization';
import { updateUserRole } from '@lib/rbac-service';
import { auth } from '@lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  await requireAdmin();

  const session = await auth();
  const { role } = await request.json();

  await updateUserRole(
    params.userId,
    role,
    session!.user.id
  );

  return Response.json({ success: true });
}
```

## Troubleshooting

### Role not updating after login

**Cause**: JWT token cached for 30 days
**Solution**: Clear cookies or wait for token expiry

### Cache not clearing after role update

**Cause**: `clearRoleCache()` not called
**Solution**: Check `updateUserRole()` calls `clearRoleCache()`

### Middleware blocking legitimate access

**Cause**: Route pattern too broad
**Solution**: Check `PROTECTED_ROUTES` patterns in middleware

### "Unauthorized" despite correct role

**Cause**: Role not loaded into session
**Solution**: Check JWT callback in `auth.ts` loads role

### User permissions empty but should have access

**Cause**: Trying to check permission for public operation
**Solution**: Public operations don't need permissions - remove the check

## Support

For issues or questions:
- Check this documentation
- Review implementation in `src/lib/authorization.ts`
- Check plan at `.claude/plans/twinkling-growing-micali.md`
- Create issue in repository

## License

Same as parent project.
