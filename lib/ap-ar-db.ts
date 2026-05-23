// ─── AP/AR Data Access Layer ─────────────────────────────────────────────────
//
// Manages Accounts Payable and Accounts Receivable.
// Includes Brazilian fiscal retention auto-calculation (IRRF, INSS, ISS, PIS, COFINS).
//
// Storage priority: sql (DATABASE_URL direct) → Supabase Storage (erpAdmin svc key) → JSON
// DO NOT import in client components.

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sql } from "./db";
import { supabase as supaFallback, erpAdmin } from "./supabase";

// sql health flag: set to true when a connection attempt fails (e.g. wrong DATABASE_URL password)
// so subsequent calls fall through to the supabase REST tier (same project, gqkgsoglgubmaborixfb).
let _sqlBroken = false;
function sqlOk() { return !!sql && !_sqlBroken; }