import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next({ request: req });
  const { supabase, response } = createMiddlewareClient(req, res);

  // Refresh session — required so cookies stay alive on every request.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Skip RBAC for API routes — each handler manages its own authorization.
  if (pathname.startsWith("/api/")) {
    return withSecurityHeaders(response);
  }

  const appUser = findUserByEmail(user.email ?? "");
  const role    = (appUser?.role ?? "analyst") as Role;

  if (!canAccess(role, pathname)) {
    const home = appUser?.homeRoute ?? "/login";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
