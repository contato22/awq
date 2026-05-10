// ─── POST /api/setup ───────────────────────────────────────────────────────────
//
// Auto-configura o Supabase na primeira execução:
//   1. Cria todas as tabelas (todos os schemas SQL)
//   2. Cria o bucket "financial-pdfs" no Supabase Storage
//   3. Semeia os deals hardcoded no venture_deals
//
// Idempotente — pode ser chamado múltiplas vezes sem efeito colateral.
// Requer: DATABASE_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sql } from "@/lib/db";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { upsertDeal } from "@/lib/venture-db";
import { dealWorkspaces } from "@/lib/deal-data";

export const runtime = "nodejs";

const SCHEMA_FILES = [
  "awq_epm_full_schema.sql",    // EPM first (other schemas reference its tables)
  "awq_crm_full_schema.sql",
  "awq_bpm_full_schema.sql",
  "awq_ppm_full_schema.sql",
  "awq_venture_full_schema.sql",
];

type StepResult = { step: string; status: "ok" | "skipped" | "error"; detail?: string };

export async function POST(): Promise<NextResponse> {
  const results: StepResult[] = [];

  // ── 1. Database schemas ──────────────────────────────────────────────────────
  if (!sql) {
    results.push({ step: "schemas", status: "skipped", detail: "DATABASE_URL não configurado" });
  } else {
    for (const filename of SCHEMA_FILES) {
      const filePath = path.join(process.cwd(), filename);
      try {
        const sqlText = fs.readFileSync(filePath, "utf-8");
        // Split on statement boundaries, skip empty/comment-only blocks
        const statements = sqlText
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));
        for (const stmt of statements) {
          // Use unsafe() for DDL statements (CREATE TABLE, CREATE INDEX, etc.)
          await (sql as unknown as { unsafe: (q: string) => Promise<unknown> }).unsafe(stmt + ";");
        }
        results.push({ step: `schema:${filename}`, status: "ok" });
      } catch (err) {
        results.push({ step: `schema:${filename}`, status: "error", detail: String(err) });
      }
    }

    // Also bootstrap the financial + caza tables that live in initDB()
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS financial_documents (
          id TEXT PRIMARY KEY, filename TEXT NOT NULL, file_hash TEXT NOT NULL UNIQUE,
          bank TEXT NOT NULL, account_name TEXT NOT NULL, account_number TEXT,
          entity TEXT NOT NULL, period_start TEXT, period_end TEXT,
          opening_balance NUMERIC, closing_balance NUMERIC,
          uploaded_at TEXT NOT NULL, uploaded_by TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'received', error_message TEXT,
          transaction_count INTEGER NOT NULL DEFAULT 0, parser_confidence TEXT,
          extraction_notes TEXT, blob_url TEXT
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS bank_transactions (
          id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES financial_documents(id),
          bank TEXT NOT NULL, account_name TEXT NOT NULL, entity TEXT NOT NULL,
          transaction_date TEXT NOT NULL, description_original TEXT NOT NULL,
          amount NUMERIC NOT NULL, direction TEXT NOT NULL, running_balance NUMERIC,
          counterparty_name TEXT, managerial_category TEXT NOT NULL,
          classification_confidence TEXT NOT NULL, classification_note TEXT,
          is_intercompany BOOLEAN NOT NULL DEFAULT false, intercompany_match_id TEXT,
          excluded_from_consolidated BOOLEAN NOT NULL DEFAULT false,
          extracted_at TEXT NOT NULL, classified_at TEXT
        )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bt_document_id ON bank_transactions(document_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bt_entity ON bank_transactions(entity)`;
      results.push({ step: "schema:financial_tables", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:financial_tables", status: "error", detail: String(err) });
    }

    // Caza DB bootstrap
    try {
      const { initCazaDB } = await import("@/lib/caza-db");
      await initCazaDB();
      results.push({ step: "schema:caza_tables", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:caza_tables", status: "error", detail: String(err) });
    }

    // GL bootstrap
    try {
      const { initGlDB } = await import("@/lib/epm-gl");
      await initGlDB();
      results.push({ step: "schema:epm_gl_entries", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:epm_gl_entries", status: "error", detail: String(err) });
    }

    // AP/AR manual items bootstrap
    try {
      const { initAWQAPARDB } = await import("@/lib/awq-apar-db");
      await initAWQAPARDB();
      results.push({ step: "schema:awq_ap_ar_items", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:awq_ap_ar_items", status: "error", detail: String(err) });
    }

    // Contrapartes bootstrap
    try {
      const { initContraparteDB } = await import("@/lib/contraparte-db");
      await initContraparteDB();
      results.push({ step: "schema:awq_contrapartes", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:awq_contrapartes", status: "error", detail: String(err) });
    }
  }

  // ── 2. Supabase Storage bucket ───────────────────────────────────────────────
  if (!supabaseAdmin) {
    results.push({ step: "storage_bucket", status: "skipped", detail: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados" });
  } else {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
      if (!exists) {
        const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
          public: false,
          fileSizeLimit: 20 * 1024 * 1024, // 20 MB
          allowedMimeTypes: ["application/pdf"],
        });
        if (error) throw error;
        results.push({ step: "storage_bucket", status: "ok", detail: `Bucket '${STORAGE_BUCKET}' criado` });
      } else {
        results.push({ step: "storage_bucket", status: "ok", detail: `Bucket '${STORAGE_BUCKET}' já existe` });
      }
    } catch (err) {
      results.push({ step: "storage_bucket", status: "error", detail: String(err) });
    }
  }

  // ── 3. Seed venture deals ────────────────────────────────────────────────────
  if (!sql) {
    results.push({ step: "seed_deals", status: "skipped", detail: "DATABASE_URL não configurado" });
  } else {
    try {
      const deals = dealWorkspaces;
      let seeded = 0;
      for (const deal of deals) {
        const existing = await sql`SELECT id FROM venture_deals WHERE id = ${deal.id}`;
        if (existing.length === 0) {
          await upsertDeal(deal, false);
          seeded++;
        }
      }
      results.push({ step: "seed_deals", status: "ok", detail: `${seeded} deal(s) inserido(s) (${deals.length - seeded} já existiam)` });
    } catch (err) {
      results.push({ step: "seed_deals", status: "error", detail: String(err) });
    }
  }

  // ── 4. Security audit log table ──────────────────────────────────────────────
  if (sql) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS awq_security_audit_log (
          id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, user_id TEXT NOT NULL,
          role TEXT NOT NULL, path TEXT NOT NULL, action TEXT NOT NULL,
          resource TEXT NOT NULL, result TEXT NOT NULL, reason TEXT NOT NULL,
          enforcement_mode TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON awq_security_audit_log(timestamp DESC)`;
      results.push({ step: "schema:audit_log", status: "ok" });
    } catch (err) {
      results.push({ step: "schema:audit_log", status: "error", detail: String(err) });
    }
  }

  const hasError = results.some((r) => r.status === "error");
  const summary = {
    ok:      results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    error:   results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json(
    { success: !hasError, summary, steps: results },
    { status: hasError ? 500 : 200 }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Envie POST para /api/setup para configurar o Supabase automaticamente.",
    requires: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    idempotent: true,
  });
}
