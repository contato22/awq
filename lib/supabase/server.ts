import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { NextApiRequest } from "next";
import { findUserByEmail } from "@/lib/auth-users";

type SupabaseToken = {
  sub: string;
  id: string;
  email: string;
  name: string | undefined;
  role: string;
};

// ── App Router: create a Supabase client for Server Components or route handlers ──
// Pass `cookieStore` from `cookies()` (next/headers) when calling from RSC/Server Actions.
export function createServerSupabaseClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: Record<string, unknown>): void;
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (cookieStore.set) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as Record<string, unknown>);
            }
          }
        },
      },
    }
  );
}

function buildToken(user: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): SupabaseToken {
  const email = user.email ?? "";
  const appRole = (user.app_metadata?.role as string | undefined);
  const fallback = findUserByEmail(email);
  const role = appRole ?? fallback?.role ?? "analyst";
  const name = (user.user_metadata?.name as string | undefined) ?? fallback?.name;
  return { sub: user.id, id: user.id, email, name, role };
}

// ── App Router API routes (NextRequest) ──────────────────────────────────────
export async function getSupabaseToken(req: NextRequest): Promise<SupabaseToken | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return buildToken(user);
}

// ── Pages Router API routes (NextApiRequest) ─────────────────────────────────
export async function getSupabaseTokenFromApiReq(req: NextApiRequest): Promise<SupabaseToken | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return buildToken(user);
}
