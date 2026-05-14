import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccess, findUserByEmail, type Role } from "@/lib/auth-users";

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh session — must call getUser() (not getSession()) per Supabase SSR docs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Skip RBAC for API routes — each handler manages its own authorization
  if (pathname.startsWith("/api/")) {
    return withSecurityHeaders(supabaseResponse);
  }

  const appRole = (user.app_metadata?.role as string | undefined);
  const authUser = findUserByEmail(user.email ?? "");
  const role = (appRole ?? authUser?.role ?? "analyst") as Role;

  if (!canAccess(role, pathname)) {
    const home = authUser?.homeRoute ?? "/login";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return withSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
