import { auth } from "@lib/auth"
import { NextResponse } from "next/server"
import { isGeneralAdmin, roleHasPermission, type Permission, type UserSubType } from "./types/rbac"

// Define route patterns and their required permission/sub-types.
// The coarse gate here is "any admin role"; each admin page and action then
// checks the specific permission (events:* for Event Managers, records:* for
// Record Managers, General admin for the rest).
const PROTECTED_ROUTES: Array<{
  pattern: string;
  requiredPermission?: Permission;
  allowedSubTypes?: UserSubType[];
  requireAuth: boolean;
}> = [
  { pattern: '/dashboard', requireAuth: true },
  { pattern: '/admin', requiredPermission: 'admin:access', requireAuth: true },
  // Event submission and management: accessible to event admins and organizers
  { pattern: '/events/submit', requiredPermission: 'events:create', requireAuth: true, allowedSubTypes: ['organizer'] },
  { pattern: '/events/my-events', requiredPermission: 'events:create', requireAuth: true, allowedSubTypes: ['organizer'] },
  { pattern: '/api/admin', requiredPermission: 'admin:access', requireAuth: true },
  // Record and first claims: any signed-in user
  { pattern: '/world_records/claim', requireAuth: true },
  { pattern: '/world_records/my-claims', requireAuth: true },
];

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRoles = req.auth?.user?.roles ?? []
  const userSubTypes = req.auth?.user?.userSubTypes ?? []

  // Find matching route pattern
  const matchedRoute = PROTECTED_ROUTES.find(route =>
    pathname.startsWith(route.pattern)
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  // Check authentication
  if (matchedRoute.requireAuth && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    signInUrl.searchParams.set('error', 'SessionRequired')
    return NextResponse.redirect(signInUrl)
  }

  const hasRequiredPermission = !!matchedRoute.requiredPermission && roleHasPermission(userRoles, matchedRoute.requiredPermission)

  // The role grants this route (General admins always do)
  if (hasRequiredPermission || isGeneralAdmin(userRoles)) {
    return NextResponse.next()
  }

  // Routes that only need a permission (no sub-type alternative)
  if (matchedRoute.requiredPermission && !matchedRoute.allowedSubTypes) {
    const unauthorizedUrl = new URL('/unauthorized', req.url)
    unauthorizedUrl.searchParams.set('required', matchedRoute.requiredPermission)
    return NextResponse.redirect(unauthorizedUrl)
  }

  // Check sub-type access (for routes that allow specific sub-types)
  if (matchedRoute.allowedSubTypes) {
    const hasAllowedSubType = matchedRoute.allowedSubTypes.some(t => userSubTypes.includes(t))
    if (!hasAllowedSubType) {
      const unauthorizedUrl = new URL('/unauthorized', req.url)
      return NextResponse.redirect(unauthorizedUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static (public static files)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|static).*)',
  ],
}
