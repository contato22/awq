import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

const ROLE_BU_LOCK: Record<string, string> = { enrd: "ENRD", caza: "CAZA", jacqes: "JACQES" };

// API allow-list por role BU-scoped. Qualquer outra rota /api/* retorna 403.
// Mantém Holding-only surfaces (bpm, epm, admin, ingest, supervisor, agents,
// ma, security, setup, chat, internal, financial-link, erp) fora do alcance
// dessas roles. Roles permissivas (owner/admin/analyst/cs-ops) não passam por
// este filtro.
const BU_API_ALLOW_LIST: Record<string, RegExp[]> = {
  jacqes: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/ppm(\/|$)/,
    /^\/api\/jacqes(\/|$)/,
    /^\/api\/cora\/(sync|audit|debug)(\/|$|$)/,
  ],
  caza: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/caza(\/|$)/,
  ],
  enrd: [
    /^\/api\/crm(\/|$)/,
    /^\/api\/ppm(\/|$)/,
    /^\/api\/enrd(\/|$)/,
    /^\/api\/conciliacao(\/|$)/,
  ],
};

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
      // BU-scoped roles só podem chamar APIs explicitamente liberadas.
      const allow = BU_API_ALLOW_LIST[role];
      if (allow && !allow.some((re) => re.test(pathname))) {
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
    "/((?!login|api/auth|api/health|api/debug/version|api/cora/audit-probe|api/cora/sync-probe|api/cora/cron-sync|api/enrd/montagem/cron-sync|api/setup/seed-santander-extracts|api/setup/seed-btg-extract-jun2026|api/setup/seed-itau-extract-jun2026|api/setup/backfill-snapshots|api/enrd/debug-saldo|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
