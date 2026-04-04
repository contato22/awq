// ─── GET /api/health — Infrastructure presence check ─────────────────────────
//
// PUBLIC endpoint (excluded from middleware auth). Reports which environment
// variables are PRESENT (boolean) — never exposes values or secrets.
//
// Used by the probe-vercel.yml workflow to empirically verify which env vars
// are configured in the Vercel dashboard without requiring admin dashboard access.
//
// Explicitly excluded from middleware in middleware.ts matcher.
// Accessible without authentication.

import { NextResponse } from "next/server";
import { USE_DB, USE_BLOB } from "@/lib/db";

export const runtime = "nodejs";
// No caching — always reflect live env state
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    // Infrastructure presence flags — boolean only, no values
    db:      USE_DB,                               // DATABASE_URL configured
    blob:    USE_BLOB,                             // BLOB_READ_WRITE_TOKEN configured
    ai:      !!process.env.ANTHROPIC_API_KEY,      // ANTHROPIC_API_KEY configured
    auth:    !!process.env.NEXTAUTH_SECRET,        // NEXTAUTH_SECRET configured
    authUrl: !!process.env.NEXTAUTH_URL,           // NEXTAUTH_URL configured
    // Adapter names (no values)
    dbAdapter:   USE_DB   ? "neon-postgres"  : "filesystem-json",
    blobAdapter: USE_BLOB ? "vercel-blob"    : "local-filesystem",
    // Runtime identifier
    runtime: "nodejs",
  });
}
