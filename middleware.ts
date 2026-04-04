import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Skip RBAC for API routes — each API handler manages its own authorization
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const role = token.role as Role;

    if (!canAccess(role, pathname)) {
      // Redirect to the user's home route instead of showing a 403
      const user = findUserByEmail(token.email as string);
      const home = user?.homeRoute ?? "/login";
      return NextResponse.redirect(new URL(home, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Protect all routes except:
  //   login          — public sign-in page
  //   api/auth       — NextAuth internal endpoints
  //   api/health     — public infrastructure probe (boolean presence flags only)
  //   _next/static   — static assets
  //   _next/image    — image optimization
  //   favicon.ico    — favicon
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
