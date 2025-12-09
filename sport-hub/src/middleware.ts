import { auth } from "@lib/auth"
import { NextResponse } from "next/server"
import type { Role } from "./types/rbac"

// Define route patterns and their required roles
const PROTECTED_ROUTES: Array<{
  pattern: string;
  requiredRole?: Role;
  requireAuth: boolean;
}> = [
  { pattern: '/dashboard', requireAuth: true },
  { pattern: '/admin', requiredRole: 'admin', requireAuth: true },
  { pattern: '/api/admin', requiredRole: 'admin', requireAuth: true },
];

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

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

  // Check role-based access (admins always have access)
  if (matchedRoute.requiredRole && userRole !== matchedRoute.requiredRole && userRole !== 'admin') {
    const unauthorizedUrl = new URL('/unauthorized', req.url)
    unauthorizedUrl.searchParams.set('required', matchedRoute.requiredRole)
    return NextResponse.redirect(unauthorizedUrl)
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
