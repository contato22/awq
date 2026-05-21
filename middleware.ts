import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

const ROLE_BU_LOCK: Record<string, string> = { enrd: "ENRD", caza: "CAZA" };

// ── Security headers (aplicados a todas as respostas server-side) ──────────
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as Role;

    // For API routes: inject identity headers so handlers don't need to re-decrypt
    // the JWT (getToken() fails in App Router API routes after NextResponse.next()).
    // Must use NextResponse.next({ request: { headers } }) — setting headers on the
    // response object only adds them to the browser response, not the request seen
    // by the API handler.
    if (pathname.startsWith("/api/")) {
      const requestHeaders = new Headers(req.headers);
      const lockedBU = ROLE_BU_LOCK[role];
      if (lockedBU)    requestHeaders.set("x-bu-lock",    lockedBU);
      if (token.email) requestHeaders.set("x-user-email", token.email as string);
      if (token.role)  requestHeaders.set("x-user-role",  token.role  as string);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      return withSecurityHeaders(res);
    }

    if (!canAccess(role, pathname)) {
      const user = findUserByEmail(token.email as string);
      const home = user?.homeRoute ?? "/login";
      return NextResponse.redirect(new URL(home, req.url));
    }

    return withSecurityHeaders(NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|api/cora/audit-probe|api/cora/sync-probe|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
