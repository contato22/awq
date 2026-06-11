// ─── Conciliação Inteligente — acesso server-side ao schema (migration 003) ──
// Escreve nas tabelas recon_* / bank_transaction via cliente Supabase com
// service role (bypass RLS). Toda mutation passa por aqui — nada de mutation
// direta no cliente (convenção do projeto).
//
// Priority chain (igual a lib/financial-db.ts):
//   erpAdmin (service role, bypass RLS)  ??  erpAnon (anon key — RLS aplica)
//
// IMPORTANTE: importar APENAS de Route Handlers / Server Actions.

import { erpAdmin, erpAnon } from "@/lib/supabase";
import type { BankTxRow, ReconBankTxInput, IngestResult } from "@/lib/recon-types";

const db = erpAdmin ?? erpAnon;

function requireDb() {
  if (!db) {
    throw new Error(
      "ERP Supabase não configurado (ERP_SUPABASE_SERVICE_ROLE_KEY ausente). " +
      "Conciliação Inteligente requer acesso ao schema da migration 003.",
    );
  }
  return db;
}

/** Surrogate determinístico de dedupe: e2eId real, senão `<source>:<sourceId>`. */
export function dedupeKey(input: ReconBankTxInput): string {
  return input.e2eId ?? `${input.source}:${input.sourceId}`;
}

function toRow(bu: "AWQ" | "ENRD", input: ReconBankTxInput): BankTxRow {
  return {
    bu,
    account_id:   input.accountId,
    posted_at:    input.postedAt,
    amount:       input.amount,
    counterparty: input.counterparty,
    counter_doc:  input.counterDoc,
    e2e_id:       dedupeKey(input),
    txid:         input.txid,
    raw_descr:    input.rawDescr,
    source:       input.source,
  };
}

/**
 * Upsert idempotente em bank_transaction com dedupe por (bu, e2e_id).
 * Lê as chaves já existentes do lote e insere só as novas — assim o resultado
 * reporta synced/skipped com precisão (Teste 1: sincronizar 2× não duplica).
 */
export async function upsertBankTransactions(
  bu: "AWQ" | "ENRD",
  inputs: ReconBankTxInput[],
): Promise<IngestResult> {
  const client = requireDb();
  const total = inputs.length;
  if (total === 0) return { synced: 0, skipped: 0, total: 0 };

  // Dedup dentro do próprio lote (duas linhas com a mesma chave).
  const byKey = new Map<string, ReconBankTxInput>();
  for (const i of inputs) byKey.set(dedupeKey(i), i);
  const keys = [...byKey.keys()];

  // Chaves já presentes no banco para esta BU.
  const existing = new Set<string>();
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = keys.slice(i, i + 500);
    const { data, error } = await client
      .from("bank_transaction")
      .select("e2e_id")
      .eq("bu", bu)
      .in("e2e_id", chunk);
    if (error) throw error;
    for (const r of data ?? []) existing.add((r as { e2e_id: string }).e2e_id);
  }

  const toInsert: BankTxRow[] = [];
  for (const [key, input] of byKey) {
    if (existing.has(key)) continue;
    toInsert.push(toRow(bu, input));
  }

  // Insere em lotes. ignoreDuplicates protege contra corrida concorrente.
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error } = await client
      .from("bank_transaction")
      .upsert(chunk, { onConflict: "bu,e2e_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  return { synced: toInsert.length, skipped: total - toInsert.length, total };
}

/** Contagem de transações por BU — usado pelo painel de cobertura. */
export async function countBankTransactions(bu: "AWQ" | "ENRD"): Promise<number> {
  const client = requireDb();
  const { count, error } = await client
    .from("bank_transaction")
    .select("id", { count: "exact", head: true })
    .eq("bu", bu);
  if (error) throw error;
  return count ?? 0;
}
