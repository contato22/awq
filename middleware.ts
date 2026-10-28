import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";
import { isApiAllowedForRole } from "@/lib/api-scope";

const ROLE_BU_LOCK: Record<string, string> = { enrd: "ENRD", caza: "CAZA", jacqes: "JACQES", "live-shop": "LIVE" };

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
    const brandGrants = (token.brandGrants as string[] | undefined) ?? [];

    // For API routes: inject identity headers so handlers don't need to re-decrypt
    // the JWT (getToken() fails in App Router API routes after NextResponse.next()).
    // Must use NextResponse.next({ request: { headers } }) — setting headers on the
    // response object only adds them to the browser response, not the request seen
    // by the API handler.
    if (pathname.startsWith("/api/")) {
      // BU-scoped roles só podem chamar APIs explicitamente liberadas.
      if (!isApiAllowedForRole(role, pathname)) {
        return NextResponse.json(
          { error: "Forbidden: API fora do escopo da BU" },
          { status: 403 },
        );
      }
      const requestHeaders = new Headers(req.headers);
      const lockedBU = ROLE_BU_LOCK[role];
      if (lockedBU)    requestHeaders.set("x-bu-lock",    lockedBU);
      if (token.email) requestHeaders.set("x-user-email", token.email as string);
      if (token.role)  requestHeaders.set("x-user-role",  token.role  as string);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      return withSecurityHeaders(res);
    }

    // Convidado da marca: confinado ao portal da(s) marca(s) liberada(s).
    if (role === "live-guest") {
      const firstGrant = brandGrants[0];
      if (!firstGrant) return NextResponse.redirect(new URL("/login", req.url));
      const m = pathname.match(/^\/awq\/live-shop\/publico\/([^/]+)/);
      if (m) {
        if (!brandGrants.includes(m[1])) {
          return NextResponse.redirect(new URL(`/awq/live-shop/publico/${firstGrant}`, req.url));
        }
        return withSecurityHeaders(NextResponse.next());
      }
      // qualquer outra rota → portal da primeira marca liberada
      return NextResponse.redirect(new URL(`/awq/live-shop/publico/${firstGrant}`, req.url));
    }

    if (!canAccess(role, pathname)) {
      const user = findUserByEmail(token.email as string);
      // Convidado JACQES fora do escopo → volta pra /jacqes (nunca vaza outras áreas).
      const guestHome = role === "jacqes-guest" ? "/jacqes" : "/login";
      const home = user?.homeRoute ?? guestHome;
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
    "/((?!login|patricia-canto|api/patricia-canto|api/auth|api/health|api/debug/version|api/cora/audit-probe|api/cora/sync-probe|api/cora/cron-sync|api/enrd/montagem/cron-sync|api/live-shop/webhook|api/live-shop/cron|api/setup/seed-santander-extracts|api/setup/seed-btg-extract-jun2026|api/setup/seed-itau-extract-jun2026|api/setup/backfill-snapshots|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
