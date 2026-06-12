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
import type { BankTxRow, ReconBankTxInput, IngestResult, BU, ReconStatus } from "@/lib/recon-types";

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

// ─── Acesso do motor (PR-3+) ─────────────────────────────────────────────────

export interface EngineBankTx {
  id: string;
  bu: BU;
  amount: number;        // sinalizado
  value_date: string;
  direction: "IN" | "OUT";
  counterparty: string | null;
  counter_doc: string | null;
  e2e_id: string | null;
  txid: string | null;
  recon_status: ReconStatus;
}

export interface EngineLedger {
  id: string;
  bu: BU;
  kind: string;
  due_date: string | null;
  amount: number;
  open_amount: number;
  categoria: string;
  conta_contabil: string;
  counterparty: string | null;
  counter_doc: string | null;
  doc_ref: string | null;
  status: string;
}

/** Transações ainda na fila (recon_status='unmatched') de uma BU. */
export async function getUnmatchedBankTx(bu: BU): Promise<EngineBankTx[]> {
  const client = requireDb();
  const { data, error } = await client
    .from("bank_transaction")
    .select("id,bu,amount,value_date,direction,counterparty,counter_doc,e2e_id,txid,recon_status")
    .eq("bu", bu)
    .eq("recon_status", "unmatched")
    .order("value_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EngineBankTx[];
}

/** Lançamentos abertos (aberto/parcial, open_amount>0) de uma BU. */
export async function getOpenLedgerEntries(bu: BU): Promise<EngineLedger[]> {
  const client = requireDb();
  const { data, error } = await client
    .from("ledger_entry")
    .select("id,bu,kind,due_date,amount,open_amount,categoria,conta_contabil,counterparty,counter_doc,doc_ref,status")
    .eq("bu", bu)
    .in("status", ["aberto", "parcial"])
    .gt("open_amount", 0);
  if (error) throw error;
  return (data ?? []) as EngineLedger[];
}

export interface MemRecord {
  kind: string | null;
  categoria: string | null;
  conta_contabil: string | null;
}

/** Memória de aprendizado por contraparte normalizada (Via 4 + score). */
export async function getMemory(bu: BU): Promise<Map<string, MemRecord>> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_payee_memory")
    .select("counterparty_key,kind,categoria,conta_contabil")
    .eq("bu", bu);
  if (error) throw error;
  const map = new Map<string, MemRecord>();
  for (const r of data ?? []) {
    const row = r as { counterparty_key: string } & MemRecord;
    map.set(row.counterparty_key, { kind: row.kind, categoria: row.categoria, conta_contabil: row.conta_contabil });
  }
  return map;
}

/**
 * Grava/incrementa a memória ao resolver uma exceção (chamada pela UI/PR-5).
 * Faz upsert com incremento de hit_count e atualização de last_seen.
 */
export async function upsertPayeeMemory(
  bu: BU,
  counterpartyKey: string,
  rec: MemRecord,
): Promise<void> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_payee_memory")
    .select("hit_count")
    .eq("bu", bu)
    .eq("counterparty_key", counterpartyKey)
    .maybeSingle();
  if (error) throw error;
  const hit = ((data as { hit_count?: number } | null)?.hit_count ?? 0) + 1;
  const { error: upErr } = await client.from("recon_payee_memory").upsert(
    {
      bu,
      counterparty_key: counterpartyKey,
      kind: rec.kind,
      categoria: rec.categoria,
      conta_contabil: rec.conta_contabil,
      hit_count: hit,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "bu,counterparty_key" },
  );
  if (upErr) throw upErr;
}

/**
 * bank_tx_ids que já participam de um grupo NÃO revertido (idempotência:
 * não reprocessar tx já agrupada). Faz join via recon_match → recon_group.
 */
export async function getActivelyMatchedTxIds(bu: BU): Promise<Set<string>> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_match")
    .select("bank_tx_id, recon_group!inner(bu,state)")
    .eq("recon_group.bu", bu)
    .neq("recon_group.state", "reverted");
  if (error) throw error;
  const set = new Set<string>();
  for (const r of data ?? []) {
    const id = (r as { bank_tx_id: string | null }).bank_tx_id;
    if (id) set.add(id);
  }
  return set;
}

export interface NewLedgerInput {
  bu: BU;
  kind: string;
  due_date?: string | null;
  amount: number;
  open_amount: number;
  categoria: string;
  conta_contabil: string;
  counterparty?: string | null;
  counter_doc?: string | null;
  doc_ref?: string | null;
  origem?: "documento" | "banco";
  is_intercompany?: boolean;
  status?: string;
}

/** Insere um lançamento (ex.: DIFF de tarifa) e devolve o id. */
export async function insertLedgerEntry(input: NewLedgerInput): Promise<string> {
  const client = requireDb();
  const { data, error } = await client
    .from("ledger_entry")
    .insert({ origem: "banco", ...input })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export interface NewGroupInput {
  bu: BU;
  confidence: number;
  method: "deterministic" | "heuristic" | "fuzzy" | "memory" | "manual";
  state: "auto" | "suggested" | "weak" | "manual" | "reverted";
  matched_by?: string;
}

export interface NewMatchInput {
  bank_tx_id?: string | null;
  ledger_id?: string | null;
  applied_amount: number;
}

/** Cria um recon_group + seus recon_match numa tacada. Devolve o group_id. */
export async function createGroupWithMatches(
  group: NewGroupInput,
  matches: NewMatchInput[],
): Promise<string> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_group")
    .insert(group)
    .select("id")
    .single();
  if (error) throw error;
  const groupId = (data as { id: string }).id;

  const rows = matches.map((m) => ({ group_id: groupId, ...m }));
  const { error: mErr } = await client.from("recon_match").insert(rows);
  if (mErr) throw mErr;
  return groupId;
}

/** Atualiza recon_status de uma bank_transaction. */
export async function setBankTxStatus(id: string, status: ReconStatus): Promise<void> {
  const client = requireDb();
  const { error } = await client.from("bank_transaction").update({ recon_status: status }).eq("id", id);
  if (error) throw error;
}

/** Atualiza open_amount/status de um lançamento. */
export async function updateLedgerOpen(id: string, openAmount: number, status: string): Promise<void> {
  const client = requireDb();
  const { error } = await client.from("ledger_entry").update({ open_amount: openAmount, status }).eq("id", id);
  if (error) throw error;
}
