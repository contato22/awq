#!/usr/bin/env node
/**
 * Seed Supabase Auth with the users defined in lib/auth-users.ts.
 *
 * Run once after setting up the Supabase project:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/seed-supabase-users.mjs
 *
 * Each user is created (or updated if already existing) with a temporary
 * password.  Set permanent passwords via the Supabase dashboard or email
 * password reset.
 *
 * USERS (from lib/auth-users.ts):
 *   alex@awqgroup.com        role: owner
 *   s.chen@jacqes.com        role: admin
 *   p.nair@jacqes.com        role: analyst
 *   danilo@jacqes.com        role: cs-ops
 *   contato@awq.com.br       role: owner
 *   danielcchiappetta@live.com role: caza
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "alex@awqgroup.com",          name: "Alex Whitmore",       role: "owner" },
  { email: "s.chen@jacqes.com",          name: "Sam Chen",            role: "admin" },
  { email: "p.nair@jacqes.com",          name: "Priya Nair",          role: "analyst" },
  { email: "danilo@jacqes.com",          name: "Danilo",              role: "cs-ops" },
  { email: "contato@awq.com.br",         name: "Miguel",              role: "owner" },
  { email: "danielcchiappetta@live.com", name: "Daniel Chiappetta",   role: "caza" },
];

// Temporary password — users should reset via dashboard or email flow
const TEMP_PASSWORD = process.env.SEED_TEMP_PASSWORD ?? "ChangeMe123!";

console.log(`\nSeeding ${USERS.length} users into Supabase Auth…\n`);

const { data: existing } = await admin.auth.admin.listUsers();
const existingEmails = new Set((existing?.users ?? []).map(u => u.email));

for (const u of USERS) {
  if (existingEmails.has(u.email)) {
    // Update metadata only — don't overwrite password
    const match = (existing?.users ?? []).find(eu => eu.email === u.email);
    if (match) {
      const { error } = await admin.auth.admin.updateUserById(match.id, {
        user_metadata: { name: u.name, role: u.role },
      });
      if (error) console.log(`  ⚠️  ${u.email} — metadata update failed: ${error.message}`);
      else       console.log(`  ✅  ${u.email} — metadata updated (role: ${u.role})`);
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error) console.log(`  ❌  ${u.email} — create failed: ${error.message}`);
    else       console.log(`  ✅  ${u.email} — created (role: ${u.role})`);
  }
}

console.log("\nDone. Set permanent passwords via the Supabase dashboard.\n");
