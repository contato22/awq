// ─── POST /api/conciliacao/import ────────────────────────────────────────────
// Fallback de upload OFX/CSV para quando a API Cora falhar. Parser server-side,
// mesmo dedupe por (bu, e2e_id) do sync. Após o upsert, dispara reconcile(bu).
//
// multipart/form-data:
//   file       — arquivo .ofx | .csv
//   bu         — "AWQ" | "ENRD"
//   accountId  — identificador da conta (opcional; default "import")

import { NextRequest, NextResponse } from "next/server";
import { parseOFX, parseCSV } from "@/lib/recon-ingest";
import { upsertBankTransactions } from "@/lib/recon-db";
import { reconcile } from "@/lib/recon-engine";
import type { BU, ReconBankTxInput } from "@/lib/recon-types";

export const runtime     = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Esperado multipart/form-data com campo 'file'." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente (campo 'file')." }, { status: 400 });
  }

  const bu = (form.get("bu") === "ENRD" ? "ENRD" : "AWQ") as BU;
  const accountId = (form.get("accountId") as string | null) ?? "import";

  const lockedBU = req.headers.get("x-bu-lock");
  if (lockedBU && lockedBU !== bu) {
    return NextResponse.json(
      { error: `Operação bloqueada: usuário ${lockedBU} não pode importar para bu=${bu}` },
      { status: 403 },
    );
  }

  const name = file.name.toLowerCase();
  const content = await file.text();

  let inputs: ReconBankTxInput[];
  try {
    if (name.endsWith(".ofx") || content.includes("<STMTTRN>")) {
      inputs = parseOFX(content, accountId);
    } else if (name.endsWith(".csv")) {
      inputs = parseCSV(content, accountId);
    } else {
      return NextResponse.json({ error: "Formato não suportado. Use .ofx ou .csv." }, { status: 415 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao processar o arquivo." },
      { status: 422 },
    );
  }

  if (inputs.length === 0) {
    return NextResponse.json({ error: "Nenhuma transação reconhecida no arquivo." }, { status: 422 });
  }

  let result;
  try {
    result = await upsertBankTransactions(bu, inputs);
  } catch (err) {
    const pgErr = err as { message?: string; code?: string };
    const detail = pgErr?.message ?? (err instanceof Error ? err.message : JSON.stringify(err));
    const isMissingTable = pgErr?.code === "42P01" || detail.includes("does not exist");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Tabela bank_transaction não encontrada. Rode a migration 003 no Supabase SQL Editor."
          : `Falha ao salvar: ${detail}`,
        missingMigration: isMissingTable,
      },
      { status: 500 },
    );
  }

  const recon = await reconcile(bu).catch(() => null);

  return NextResponse.json({ bu, source: name.endsWith(".ofx") ? "ofx" : "csv", ...result, reconcile: recon });
}
