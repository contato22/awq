// DB-backed user lookup. Uses Supabase service role (server-side only, bypasses RLS).
// Falls back to the static list when SUPABASE_SERVICE_ROLE_KEY is absent (dev/CI).

import { createClient } from "@supabase/supabase-js";
import { USERS, type AuthUser } from "@/lib/auth-users";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function findUserByEmailDB(email: string): Promise<AuthUser | undefined> {
  const client = getServiceClient();

  if (client) {
    const { data, error } = await client
      .from("awq_users")
      .select("id, name, email, password_hash, role, home_route, active")
      .ilike("email", email)
      .eq("active", true)
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.password_hash,
        role: data.role,
        homeRoute: data.home_route,
      };
    }
  }

  // No DB client available — authentication requires SUPABASE_SERVICE_ROLE_KEY.
  // Return metadata-only user so middleware can resolve role/route, but
  // passwordHash is empty so NextAuth's bcrypt.compare rejects the login.
  // For local dev without Supabase, set SUPABASE_SERVICE_ROLE_KEY in .env.local.
  const meta = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (meta) {
    console.warn(
      `[auth] DB unavailable — login blocked for ${meta.email}. Set SUPABASE_SERVICE_ROLE_KEY.`
    );
  }
  return undefined;
}
