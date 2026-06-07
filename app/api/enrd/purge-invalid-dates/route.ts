// POST /api/enrd/purge-invalid-dates — apaga bank_transactions com transactionDate corrompido
//
// Sintoma: as 11 txns ENERDY tem transaction_date = "Invalid Date" (string)
// no DB. Provavelmente vindas de um sync antigo onde parseDate retornou
// new Date(invalido).toLocaleDateString() = "Invalid Date" e gravou.
//
// Auth: owner global (contato@awq.com.br) ou owner ENRD (kazadem2@gmail.com).
// Dry-run por default (preview=1 obrigatorio). Pra apagar, mandar { confirm: "PURGE" } no body.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase, erpAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set([
  "kazadem2@gmail.com",
  "contato@awq.com.br",
]);

const BAD_DATE_VALUES = ["Invalid Date", "", "null", "undefined"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({ req });
  if (!token?.email || !ALLOWED_EMAILS.has(token.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabase ?? erpAdmin;
  if (!db) {
    return NextResponse.json({ error: "No service-role DB client available" }, { status: 500 });
  }

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  // Lista os ids candidatos a purge
  const { data: bad, error: selErr } = await db
    .from("bank_transactions")
    .select("id, transaction_date, amount, direction")
    .eq("entity", "ENERDY")
    .in("transaction_date", BAD_DATE_VALUES);

  if (selErr) {
    return NextResponse.json({ error: "Select failed", detail: selErr.message }, { status: 500 });
  }

  const candidates = bad ?? [];

  if (body.confirm !== "PURGE") {
    return NextResponse.json({
      dryRun: true,
      candidateCount: candidates.length,
      candidates,
      note: "Re-envie POST com body { \"confirm\": \"PURGE\" } pra apagar.",
    });
  }

  // Purge confirmado
  const { error: delErr, count } = await db
    .from("bank_transactions")
    .delete({ count: "exact" })
    .eq("entity", "ENERDY")
    .in("transaction_date", BAD_DATE_VALUES);

  if (delErr) {
    return NextResponse.json({ error: "Delete failed", detail: delErr.message }, { status: 500 });
  }

  return NextResponse.json({
    purged: true,
    deletedCount: count ?? candidates.length,
    runBy: token.email,
    runAt: new Date().toISOString(),
  });
}
