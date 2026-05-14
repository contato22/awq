/**
 * scripts/seed-supabase-users.ts
 *
 * Creates all platform users in Supabase Auth and sets their roles in
 * app_metadata (admin-only field — cannot be overwritten by users).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/seed-supabase-users.ts
 *
 * Each user is created with email_confirm = true (no verification email).
 * Passwords default to a temporary value — users must reset via the
 * Supabase dashboard or a password-reset email.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    name: "Alex Whitmore",
    email: "alex@awqgroup.com",
    role: "owner",
    tempPassword: "ChangeMe@2026!",
  },
  {
    name: "Sam Chen",
    email: "s.chen@jacqes.com",
    role: "admin",
    tempPassword: "ChangeMe@2026!",
  },
  {
    name: "Priya Nair",
    email: "p.nair@jacqes.com",
    role: "analyst",
    tempPassword: "ChangeMe@2026!",
  },
  {
    name: "Danilo",
    email: "danilo@jacqes.com",
    role: "cs-ops",
    tempPassword: "ChangeMe@2026!",
  },
  {
    name: "Miguel",
    email: "contato@awq.com.br",
    role: "owner",
    tempPassword: "ChangeMe@2026!",
  },
  {
    name: "Daniel Chiappetta",
    email: "danielcchiappetta@live.com",
    role: "caza",
    tempPassword: "ChangeMe@2026!",
  },
];

async function seed() {
  console.log(`Seeding ${USERS.length} users into Supabase Auth…\n`);

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.tempPassword,
      email_confirm: true,
      user_metadata: { name: u.name },
      app_metadata: { role: u.role },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        // User exists — update app_metadata role instead
        const { data: existing } = await supabase.auth.admin.listUsers();
        const match = existing?.users?.find((eu) => eu.email === u.email);
        if (match) {
          const { error: updateErr } = await supabase.auth.admin.updateUserById(match.id, {
            app_metadata: { role: u.role },
            user_metadata: { name: u.name },
          });
          if (updateErr) {
            console.error(`  ✗ ${u.email} — update failed: ${updateErr.message}`);
          } else {
            console.log(`  ↻ ${u.email} (${u.role}) — role updated`);
          }
        }
      } else {
        console.error(`  ✗ ${u.email} — ${error.message}`);
      }
    } else {
      console.log(`  ✓ ${u.email} (${u.role}) — created [id: ${data.user?.id}]`);
    }
  }

  console.log("\nDone. Remind users to reset their passwords via Supabase dashboard.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
