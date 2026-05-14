// Auth migrated to Supabase — this route is no longer active.
// Sessions are managed via @supabase/ssr cookies (see middleware.ts).
// Login: app/login/page.tsx → supabase.auth.signInWithPassword
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({
    error: "Auth provider migrated to Supabase",
    login: "/login",
  });
}
