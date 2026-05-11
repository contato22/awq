import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

// ── Subdomain → path prefix map ───────────────────────────────────────────
// Each key is the subdomain label (e.g. "jacqes" from "jacqes.awq.com.br").
// The value is the Next.js route prefix that subdomain should render.
const SUBDOMAIN_PREFIXES: Record<string, string> = {
  jacqes:  "/jacqes",
  caza:    "/caza-vision",
  venture: "/awq-venture",
};

/** Returns the route prefix for the given host, or null if not a known subdomain. */
function resolveSubdomain(host: string): string | null {
  const sub = host.split(":")[0].split(".")[0];
  return SUBDOMAIN_PREFIXES[sub] ?? null;
}

/**
 * Converts an absolute homeRoute to a path relative to the current subdomain.
 * e.g. prefix="/jacqes", homeRoute="/jacqes/csops" → "/csops"
 * Falls back to "/" so the subdomain rewrite picks it up correctly.
 */
function subdomainRelativePath(homeRoute: string, prefix: string): string {
  if (homeRoute.startsWith(prefix)) {
    return homeRoute.slice(prefix.length) || "/";
  }
  return "/";
}

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

    // Skip RBAC for API routes — each API handler manages its own authorization
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.next());
    }

    const host = req.headers.get("host") ?? "";
    const prefix = resolveSubdomain(host);

    // ── Subdomain routing ────────────────────────────────────────────────
    // When the request comes from a known subdomain, transparently rewrite
    // the path to the corresponding route prefix so the browser URL stays clean.
    if (prefix && !pathname.startsWith(prefix)) {
      const rewrittenPath = prefix + (pathname === "/" ? "" : pathname);

      // RBAC check against the effective (rewritten) path
      const role = token.role as Role;
      if (!canAccess(role, rewrittenPath)) {
        const user = findUserByEmail(token.email as string);
        const rawHome = user?.homeRoute ?? "/login";
        const home = subdomainRelativePath(rawHome, prefix);
        return NextResponse.redirect(new URL(home, req.url));
      }

      const url = req.nextUrl.clone();
      url.pathname = rewrittenPath;
      return withSecurityHeaders(NextResponse.rewrite(url));
    }

    // ── Standard path-based RBAC ─────────────────────────────────────────
    const role = token.role as Role;

    if (!canAccess(role, pathname)) {
      // Redirect to the user's home route instead of showing a 403
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
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
