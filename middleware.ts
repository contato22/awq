import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";
import { authPathname, identityRequestHeaders, isLegitNextAuthPath } from "@/lib/middleware-request";
import { isPublicRoute } from "@/lib/public-routes";

const ROLE_BU_LOCK: Record<string, string> = { enrd: "ENRD", caza: "CAZA", jacqes: "JACQES", "live-shop": "LIVE" };

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
  "live-shop": [
    /^\/api\/live-shop(\/|$)/,
  ],
  // Convidados: NENHUMA API (lista vazia → bloqueia todo /api/*).
  "live-guest": [],
  "jacqes-guest": [],
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

// Headers de identidade do cliente não são autenticados. Todo encaminhamento
// passa por aqui — API, página e rota pública — e regrava só o JWT.
function continueWith(
  req: { headers: Headers },
  token: { email?: unknown; role?: unknown } | null,
): NextResponse {
  return withSecurityHeaders(
    NextResponse.next({
      request: { headers: identityRequestHeaders(req.headers, token, ROLE_BU_LOCK) },
    }),
  );
}

function nextWithoutIdentity(req: NextRequest) {
  return continueWith(req, null);
}

function runGate(req: NextRequest, token: { email?: unknown; role?: unknown; brandGrants?: unknown }) {
  const pathname = authPathname(req.nextUrl.pathname);

  const role = token.role as Role;
  const brandGrants = (token.brandGrants as string[] | undefined) ?? [];

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
    return continueWith(req, token);
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
      return continueWith(req, token);
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

  return continueWith(req, token);
}

// withAuth devolve cedo em qualquer path que comece com /api/auth ou /_next
// (e em /favicon.ico como prefixo). Isso reabriria /api/auth/..%2F… e
// /_nextX. Só o NextAuth legítimo e os assets /_next/static/ e /_next/image
// seguem por aquele atalho; o resto exige sessão aqui.
function isNextAssetPath(pathname: string): boolean {
  return (
    pathname === "/_next/static" ||
    pathname.startsWith("/_next/static/") ||
    pathname === "/_next/image" ||
    pathname.startsWith("/_next/image/")
  );
}

function withAuthSkipsSession(pathname: string): boolean {
  if (pathname.startsWith("/api/auth") && !isLegitNextAuthPath(pathname)) return true;
  if (pathname.startsWith("/_next") && !isNextAssetPath(pathname)) return true;
  if (pathname.startsWith("/favicon.ico") && pathname !== "/favicon.ico") return true;
  return false;
}

function isDevWebpackHmr(pathname: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    (pathname === "/_next/webpack-hmr" || pathname === "/_next/webpack-hmr/")
  );
}

const gated = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return runGate(req, token);
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

// leads/capture/?$ e o restante de lib/public-routes.ts, no path cru.
// Sem sessão, mas os cabeçalhos de identidade do cliente saem antes do handler
// (nextWithoutIdentity). /api/public não é isento: não há handler.
// /_next/webpack-hmr só passa sem sessão em development (HMR do next dev).
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const raw = req.nextUrl.pathname;
  if (isDevWebpackHmr(raw) || isPublicRoute(raw)) {
    return nextWithoutIdentity(req);
  }
  if (withAuthSkipsSession(raw)) {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = secret ? await getToken({ req, secret }) : null;
    if (!token) {
      const signInUrl = new URL("/login", req.url);
      signInUrl.searchParams.set("callbackUrl", authPathname(raw));
      return NextResponse.redirect(signInUrl);
    }
    return runGate(req, token);
  }
  return (gated as (req: NextRequest, event: NextFetchEvent) => ReturnType<typeof gated>)(req, event);
}

export const config = {
  matcher: [
    "/((?!_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$).*)",
  ],
};
