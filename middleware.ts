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
  // Protect all routes except login, NextAuth API, static assets
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
