// ─── GET /api/epm/health — Diagnóstico Supabase EPM ──────────────────────────
// Excluído do middleware de auth (ver middleware.ts matcher).
// Verifica conectividade + read + write na tabela general_ledger.

import { NextResponse } from "next/server";
import { USE_SUPABASE_EPM, getSupabaseEpm } from "@/lib/supabase-epm";
import { randomUUID } from "crypto";

export async function GET() {
  const result: Record<string, unknown> = {
    configured: USE_SUPABASE_EPM,
    url: process.env.NEXT_PUBLIC_SUPABASE_EPM_URL ?? null,
    hasServiceKey: !!process.env.SUPABASE_EPM_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_EPM_ANON_KEY,
  };

  if (!USE_SUPABASE_EPM) {
    return NextResponse.json({ ...result, status: "not_configured" }, { status: 200 });
  }

  const sb = getSupabaseEpm();

  // 1. Ping (SELECT 1 row)
  const ping = await sb.from("general_ledger").select("gl_id").limit(1);
  if (ping.error) {
    return NextResponse.json({
      ...result,
      status: "error",
      step: "ping",
      error: ping.error.message,
      code: ping.error.code,
      hint: ping.error.code === "42P01"
        ? "Tabela não existe — execute scripts/supabase-epm-setup.sql no Supabase SQL Editor"
        : undefined,
    }, { status: 200 });
  }
  result.ping = "ok";
  result.existingRows = ping.data.length;

  // 2. INSERT de teste (partidas dobradas)
  const journalId = randomUUID();
  const now = new Date().toISOString();
  const testRows = [
    {
      gl_id: randomUUID(), journal_id: journalId,
      transaction_date: "2026-05-14", period_code: "2026-05",
      bu_code: "AWQ", account_code: "1.1.01",
      account_name: "Caixa e Equivalentes", account_type: "ASSET",
      debit_amount: 999.99, credit_amount: 0,
      description: "[HEALTH-CHECK] auto-delete", source_system: "manual",
      is_intercompany: false, created_at: now, created_by: "health-route",
    },
    {
      gl_id: randomUUID(), journal_id: journalId,
      transaction_date: "2026-05-14", period_code: "2026-05",
      bu_code: "AWQ", account_code: "3.1.01",
      account_name: "Capital Social", account_type: "EQUITY",
      debit_amount: 0, credit_amount: 999.99,
      description: "[HEALTH-CHECK] auto-delete", source_system: "manual",
      is_intercompany: false, created_at: now, created_by: "health-route",
    },
  ];

  const ins = await sb.from("general_ledger").insert(testRows);
  if (ins.error) {
    return NextResponse.json({ ...result, status: "error", step: "insert", error: ins.error.message }, { status: 200 });
  }
  result.insert = "ok";

  // 3. SELECT de volta
  const sel = await sb.from("general_ledger").select("*").eq("journal_id", journalId);
  if (sel.error || sel.data.length !== 2) {
    return NextResponse.json({ ...result, status: "error", step: "select",
      error: sel.error?.message ?? `expected 2 rows, got ${sel.data?.length}` }, { status: 200 });
  }
  result.select = "ok";
  result.rows = sel.data.length;

  // 4. DELETE (limpeza)
  const del = await sb.from("general_ledger").delete().eq("journal_id", journalId);
  result.delete = del.error ? `error: ${del.error.message}` : "ok";

  return NextResponse.json({ ...result, status: "ok" }, { status: 200 });
}
