import { auth } from "@lib/auth"
import { NextResponse } from "next/server"
import type { Role, UserSubType } from "./types/rbac"

// Define route patterns and their required roles/sub-types
const PROTECTED_ROUTES: Array<{
  pattern: string;
  requiredRole?: Role;
  allowedSubTypes?: UserSubType[];
  requireAuth: boolean;
}> = [
  { pattern: '/dashboard', requireAuth: true },
  { pattern: '/admin', requiredRole: 'admin', requireAuth: true },
  // Event submission: accessible to admins and organizers
  { pattern: '/events/submit', requireAuth: true, allowedSubTypes: ['organizer'] },
  { pattern: '/api/admin', requiredRole: 'admin', requireAuth: true },
];

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role
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

  // Admins always have access
  if (userRole === 'admin') {
    return NextResponse.next()
  }

  // Check role-based access
  if (matchedRoute.requiredRole && userRole !== matchedRoute.requiredRole) {
    const unauthorizedUrl = new URL('/unauthorized', req.url)
    unauthorizedUrl.searchParams.set('required', matchedRoute.requiredRole)
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
