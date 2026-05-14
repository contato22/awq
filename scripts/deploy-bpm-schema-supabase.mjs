#!/usr/bin/env node
// ─── BPM Schema Deployment — Supabase ────────────────────────────────────────
//
// Deploys awq_bpm_full_schema.sql to the Supabase project via the
// Supabase Management API (requires a personal access token).
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-bpm-schema-supabase.mjs
//
// Or deploy manually: paste awq_bpm_full_schema.sql into the Supabase SQL editor.
//   Dashboard → SQL Editor → New Query → paste → Run
//
// The Supabase project: kkhxxsrgsewjfvnnssyf
// URL: https://kkhxxsrgsewjfvnnssyf.supabase.co

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "kkhxxsrgsewjfvnnssyf";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN env var is required.");
  console.error("Get it from: https://app.supabase.com/account/tokens");
  process.exit(1);
}

const sqlPath = join(__dir, "..", "awq_bpm_full_schema.sql");
let sql;
try {
  sql = readFileSync(sqlPath, "utf8");
} catch {
  console.error("ERROR: awq_bpm_full_schema.sql not found at", sqlPath);
  process.exit(1);
}

console.log(`Deploying BPM schema to Supabase project ${PROJECT_REF}…`);
console.log(`SQL file: ${sqlPath} (${sql.length} chars)\n`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await res.text();

if (!res.ok) {
  console.error(`FAILED (HTTP ${res.status}):`, body);
  console.error("\nAlternative: paste awq_bpm_full_schema.sql into the Supabase SQL editor.");
  process.exit(1);
}

console.log("Schema deployed successfully!");
console.log("Response:", body.slice(0, 300));
console.log("\nNext step: set the env vars on Vercel:");
console.log("  NEXT_PUBLIC_SUPABASE_URL=https://kkhxxsrgsewjfvnnssyf.supabase.co");
console.log("  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from .env.example>");
console.log("  SUPABASE_SERVICE_ROLE_KEY=<service role key from .env.example>");
