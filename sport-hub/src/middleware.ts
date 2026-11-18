import { auth } from "@lib/auth"
import type { NextAuthRequest } from "next-auth"
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

function guard(req: NextAuthRequest): NextResponse {
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
}

// Every response from here may carry auth cookies (the refreshed session, or
// the csrf and callback-url cookies on redirects), so no shared cache may
// store it.
export default auth((req) => {
  const res = guard(req)
  res.headers.set('Cache-Control', 'private, no-store')
  return res
})

// Run only on the protected routes above. Auth.js re-issues the session
// cookie (Set-Cookie) on every request the middleware handles, and
// prerendered pages (/rankings, /faq, ...) are sent with
// "Cache-Control: s-maxage=31536000". A shared cache (Amplify/CloudFront)
// could then store one user's session cookie with a public page and hand it
// to other visitors. Public pages read the session client-side through
// /api/auth/session, which is never cached.
// Keep this list in sync with PROTECTED_ROUTES.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/events/submit/:path*',
    '/events/my-events/:path*',
    '/api/admin/:path*',
    '/world_records/claim/:path*',
    '/world_records/my-claims/:path*',
  ],
}
