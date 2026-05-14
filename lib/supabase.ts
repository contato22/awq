import { createBrowserClient } from "@supabase/ssr";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Browser client — for Client Components and login page. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}

/**
 * Admin client using the service role key.
 * Never expose to the browser.  Use only in trusted server contexts.
 */
export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Server client backed by Next.js App Router cookie store.
 * Pass `cookies()` from `next/headers`.
 */
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            (cookieStore as unknown as { set: (name: string, value: string, options: CookieOptions) => void }).set(name, value, options);
          } catch {
            // In Server Components cookies() is read-only — safe to ignore.
          }
        });
      },
    },
  });
}

/**
 * Middleware client that refreshes the session and threads cookies into the
 * request/response pair.  Returns the supabase instance and the (potentially
 * mutated) response.
 */
export function createMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  let response = res;
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
  return { supabase, response };
}

/**
 * Returns the authenticated user's email and role for use in API route handlers.
 * Falls back to "anonymous" when no session is present or Supabase is not configured.
 */
export async function getRouteUser(
  request: NextRequest
): Promise<{ email: string; role: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { email: "anonymous", role: "anonymous" };
  }
  const { supabase } = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { email: "anonymous", role: "anonymous" };

  // Role is resolved server-side from the static user registry.
  // Importing here avoids a circular dependency via a dynamic require.
  const { findUserByEmail } = await import("./auth-users");
  const appUser = findUserByEmail(user.email);
  return { email: user.email, role: appUser?.role ?? "anonymous" };
}

/**
 * Lightweight helper for App Router API route handlers.
 * Creates a server client that reads cookies from the incoming Request
 * and writes them to a mutable Headers object.
 */
export function createRouteClient(request: NextRequest) {
  const headers = new Headers(request.headers);
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            `${name}=${value}; Path=/; ${options?.httpOnly ? "HttpOnly;" : ""} ${options?.secure ? "Secure;" : ""} SameSite=${options?.sameSite ?? "Lax"}`
          );
        });
      },
    },
  });
  return { supabase, headers };
}
