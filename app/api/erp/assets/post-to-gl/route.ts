import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getErpAdminClient } from "@/lib/supabase-erp";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

/**
 * POST /api/erp/assets/post-to-gl
 *
 * Gera lançamentos contábeis (general_ledger) para cada ativo ATI-CV-* que
 * ainda não tem entrada no GL. Cada aquisição vira um journal balanceado:
 *   DEBIT  1.2.01 Imobilizado (líquido)  = acquisition_value
 *   CREDIT 1.1.01 Caixa e Equivalentes   = acquisition_value
 *
 * Idempotente: pula ativos cujo `code` já aparece como reference_doc em GL.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getErpAdminClient();

  // 1. Resolver IDs de contas e BU
  const { data: accs, error: accErr } = await db
    .from("accounts")
    .select("account_id, account_code")
    .in("account_code", ["1.2.01", "1.1.01"]);
  if (accErr) return NextResponse.json({ error: `accounts: ${accErr.message}` }, { status: 500 });
  const accountByCode = new Map((accs ?? []).map((a: { account_code: string; account_id: string }) => [a.account_code, a.account_id]));
  const imobId = accountByCode.get("1.2.01");
  const caixaId = accountByCode.get("1.1.01");
  if (!imobId || !caixaId) {
    return NextResponse.json({ error: "Contas 1.2.01 ou 1.1.01 não encontradas — rodar seed do plano de contas EPM antes." }, { status: 412 });
  }

  const { data: bus, error: buErr } = await db
    .from("business_units")
    .select("bu_id, bu_code")
    .eq("bu_code", "CAZA")
    .maybeSingle();
  if (buErr) return NextResponse.json({ error: `business_units: ${buErr.message}` }, { status: 500 });
  if (!bus) return NextResponse.json({ error: "BU CAZA não encontrada em business_units." }, { status: 412 });
  const buId = bus.bu_id as string;

  // 2. Ativos a lançar
  const { data: assets, error: aErr } = await db
    .from("erp_assets")
    .select("id, code, description, acquisition_value, acquisition_date")
    .like("code", "ATI-CV-%");
  if (aErr) return NextResponse.json({ error: `erp_assets: ${aErr.message}` }, { status: 500 });

  if (!assets || assets.length === 0) {
    return NextResponse.json({ posted: 0, skipped: [], message: "Nenhum ativo ATI-CV-* encontrado." });
  }

  // 3. Lançamentos já existentes (idempotência)
  const codes = assets.map(a => a.code);
  const { data: existingGl, error: glErr } = await db
    .from("general_ledger")
    .select("reference_doc")
    .in("reference_doc", codes);
  if (glErr) return NextResponse.json({ error: `general_ledger select: ${glErr.message}` }, { status: 500 });
  const alreadyPosted = new Set((existingGl ?? []).map((r: { reference_doc: string }) => r.reference_doc));

  // 4. Montar linhas
  const today = new Date().toISOString().slice(0, 10);
  const rows: Array<Record<string, unknown>> = [];
  const skipped: { code: string; reason: string }[] = [];
  const posted: { code: string; journal_id: string; value: number }[] = [];

  for (const a of assets) {
    if (alreadyPosted.has(a.code)) {
      skipped.push({ code: a.code, reason: "já lançado no GL" });
      continue;
    }
    const value = Number(a.acquisition_value);
    if (!Number.isFinite(value) || value <= 0) {
      skipped.push({ code: a.code, reason: `acquisition_value inválido (${a.acquisition_value})` });
      continue;
    }
    const journalId = randomUUID();
    const txnDate = a.acquisition_date ?? today;

    rows.push({
      journal_id: journalId,
      transaction_date: txnDate,
      bu_id: buId,
      account_id: imobId,
      debit_amount: value,
      credit_amount: 0,
      description: `Aquisição imobilizado: ${a.description}`,
      reference_doc: a.code,
      source_system: "asset_acquisition",
      created_by: (token.email as string) ?? null,
    });
    rows.push({
      journal_id: journalId,
      transaction_date: txnDate,
      bu_id: buId,
      account_id: caixaId,
      debit_amount: 0,
      credit_amount: value,
      description: `Aquisição imobilizado: ${a.description}`,
      reference_doc: a.code,
      source_system: "asset_acquisition",
      created_by: (token.email as string) ?? null,
    });
    posted.push({ code: a.code, journal_id: journalId, value });
  }

  if (rows.length === 0) {
    return NextResponse.json({ posted: 0, skipped });
  }

  const { error: insErr } = await db.from("general_ledger").insert(rows);
  if (insErr) return NextResponse.json({ error: `general_ledger insert: ${insErr.message}`, skipped }, { status: 500 });

  const totalValue = posted.reduce((s, p) => s + p.value, 0);
  return NextResponse.json({ posted: posted.length, totalValue, skipped, entries: posted }, { status: 201 });
}
