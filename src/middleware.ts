import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/api/auth",
    "/api/upload/presigned-url",
  ];

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For now, check for a simple auth token in cookies
  // In production, this would validate the Better Auth session
  const sessionToken = request.cookies.get("__Secure-better-auth.session_token") || request.cookies.get("better-auth.session_token");

  // If no session and trying to access protected route, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  // Log request
  const duration = Date.now() - start;
  logger.info(`${request.method} ${pathname}`, {
    status: response.status,
    duration: `${duration}ms`,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
