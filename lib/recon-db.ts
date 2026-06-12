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
import { isGatePassed } from "@/lib/recon-scoring";
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

// ─── Leitura para a UI (PR-5) ────────────────────────────────────────────────

export interface ReconMetrics {
  bu: BU;
  total: number;            // total de transações
  matched: number;          // matched + partial
  counts: { auto: number; suggested: number; weak: number; exceptions: number };
  firstPass: number;        // grupos auto / total (0..1)
  cobertura: number;        // matched / total (0..1)
  divergencia: number;      // saldo extrato − saldo razão (R$)
  agingMax: number;         // dias da exceção mais antiga
  gatePassed: boolean;      // cobertura ≥ 98% E divergência = 0
}

export interface QueueItem {
  groupId: string | null;   // null = exceção (tx sem grupo)
  bankTxId: string;
  state: "auto" | "suggested" | "weak" | "exception";
  method: string | null;
  confidence: number | null;
  valueDate: string;
  counterparty: string | null;
  amount: number;
  direction: "IN" | "OUT";
  rawDescr: string | null;
  appliedSum: number;
  ledgers: { id: string; kind: string; categoria: string; counterparty: string | null; applied: number }[];
}

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round(Math.abs(new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86_400_000);

/** KPIs de saúde + gate de publicação para uma BU. */
export async function getReconMetrics(bu: BU): Promise<ReconMetrics> {
  const client = requireDb();

  const { data: txs, error: txErr } = await client
    .from("bank_transaction")
    .select("id,amount,value_date,recon_status")
    .eq("bu", bu);
  if (txErr) throw txErr;
  const tx = (txs ?? []) as { id: string; amount: number; value_date: string; recon_status: ReconStatus }[];

  const { data: grps, error: gErr } = await client
    .from("recon_group")
    .select("state")
    .eq("bu", bu)
    .neq("state", "reverted");
  if (gErr) throw gErr;
  const groups = (grps ?? []) as { state: string }[];

  const total = tx.length;
  const matched = tx.filter((t) => t.recon_status === "matched" || t.recon_status === "partial").length;
  const counts = {
    auto: groups.filter((g) => g.state === "auto").length,
    suggested: groups.filter((g) => g.state === "suggested").length,
    weak: groups.filter((g) => g.state === "weak").length,
    exceptions: tx.filter((t) => t.recon_status === "unmatched").length,
  };

  // Divergência = soma do não conciliado (|amount| das tx unmatched + residual das partial).
  // Aproximação: residual = |amount| − Σ applied. Buscamos applied por tx via recon_match.
  const { data: ms, error: mErr } = await client
    .from("recon_match")
    .select("bank_tx_id,applied_amount,recon_group!inner(bu,state)")
    .eq("recon_group.bu", bu)
    .neq("recon_group.state", "reverted");
  if (mErr) throw mErr;
  const appliedByTx = new Map<string, number>();
  for (const m of (ms ?? []) as { bank_tx_id: string | null; applied_amount: number }[]) {
    if (!m.bank_tx_id) continue;
    appliedByTx.set(m.bank_tx_id, (appliedByTx.get(m.bank_tx_id) ?? 0) + m.applied_amount);
  }
  let divergencia = 0;
  for (const t of tx) {
    const applied = appliedByTx.get(t.id) ?? 0;
    divergencia += Math.max(0, Math.abs(t.amount) - applied);
  }
  divergencia = Math.round(divergencia * 100) / 100;

  const td = today();
  let agingMax = 0;
  for (const t of tx) {
    if (t.recon_status === "unmatched") agingMax = Math.max(agingMax, daysBetween(t.value_date, td));
  }

  const cobertura = total > 0 ? matched / total : 0;
  const firstPass = total > 0 ? counts.auto / total : 0;
  const gatePassed = isGatePassed(cobertura, divergencia);

  return { bu, total, matched, counts, firstPass, cobertura, divergencia, agingMax, gatePassed };
}

/** Fila de conciliação por estado (grupos não revertidos + exceções). */
export async function getReconQueue(bu: BU): Promise<QueueItem[]> {
  const client = requireDb();

  const { data: grps, error: gErr } = await client
    .from("recon_group")
    .select(
      "id,state,method,confidence,matched_at," +
        "recon_match(applied_amount," +
        "bank_transaction(id,value_date,counterparty,amount,direction,raw_descr)," +
        "ledger_entry(id,kind,categoria,counterparty))",
    )
    .eq("bu", bu)
    .neq("state", "reverted")
    .order("matched_at", { ascending: false })
    .limit(500);
  if (gErr) throw gErr;

  const items: QueueItem[] = [];
  for (const g of (grps ?? []) as any[]) {
    const matchRows = g.recon_match ?? [];
    const txRow = matchRows.find((m: any) => m.bank_transaction)?.bank_transaction;
    if (!txRow) continue;
    const ledgers = matchRows
      .filter((m: any) => m.ledger_entry)
      .map((m: any) => ({
        id: m.ledger_entry.id,
        kind: m.ledger_entry.kind,
        categoria: m.ledger_entry.categoria,
        counterparty: m.ledger_entry.counterparty,
        applied: m.applied_amount,
      }));
    const appliedSum = matchRows
      .filter((m: any) => m.bank_transaction)
      .reduce((a: number, m: any) => a + (m.applied_amount ?? 0), 0);
    items.push({
      groupId: g.id,
      bankTxId: txRow.id,
      state: g.state,
      method: g.method,
      confidence: g.confidence,
      valueDate: txRow.value_date,
      counterparty: txRow.counterparty,
      amount: txRow.amount,
      direction: txRow.direction,
      rawDescr: txRow.raw_descr,
      appliedSum,
      ledgers,
    });
  }

  // Exceções: tx unmatched.
  const { data: exc, error: eErr } = await client
    .from("bank_transaction")
    .select("id,value_date,counterparty,amount,direction,raw_descr")
    .eq("bu", bu)
    .eq("recon_status", "unmatched")
    .order("value_date", { ascending: true })
    .limit(500);
  if (eErr) throw eErr;
  for (const t of (exc ?? []) as any[]) {
    items.push({
      groupId: null,
      bankTxId: t.id,
      state: "exception",
      method: null,
      confidence: null,
      valueDate: t.value_date,
      counterparty: t.counterparty,
      amount: t.amount,
      direction: t.direction,
      rawDescr: t.raw_descr,
      appliedSum: 0,
      ledgers: [],
    });
  }
  return items;
}

/** Série da view v_saldo_conciliado (alimenta o gráfico — Teste 12). */
export async function getSaldoConciliado(
  bu: BU,
): Promise<{ refMonth: string; entradas: number; saidas: number; resultado: number }[]> {
  const client = requireDb();
  const { data, error } = await client
    .from("v_saldo_conciliado")
    .select("bu,ref_month,entradas,saidas,resultado")
    .eq("bu", bu)
    .order("ref_month", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    refMonth: r.ref_month,
    entradas: Number(r.entradas ?? 0),
    saidas: Number(r.saidas ?? 0),
    resultado: Number(r.resultado ?? 0),
  }));
}

export interface RuleRow {
  id: string; bu: string | null; priority: number; match_field: string; pattern: string;
  set_kind: string | null; set_categoria: string | null; set_conta: string | null;
  set_intercompany: boolean | null; active: boolean | null;
}

export async function getRules(bu: BU): Promise<RuleRow[]> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_rule")
    .select("*")
    .or(`bu.eq.${bu},bu.is.null`)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RuleRow[];
}

export async function upsertRule(rule: Partial<RuleRow>): Promise<void> {
  const client = requireDb();
  const { error } = await client.from("recon_rule").upsert(rule);
  if (error) throw error;
}

export async function deleteRule(id: string): Promise<void> {
  const client = requireDb();
  const { error } = await client.from("recon_rule").delete().eq("id", id);
  if (error) throw error;
}

export interface MemoryRow {
  bu: string; counterparty_key: string; kind: string | null; categoria: string | null;
  conta_contabil: string | null; hit_count: number | null; last_seen: string | null;
}

export async function getMemoryList(bu: BU): Promise<MemoryRow[]> {
  const client = requireDb();
  const { data, error } = await client
    .from("recon_payee_memory")
    .select("*")
    .eq("bu", bu)
    .order("hit_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MemoryRow[];
}

export async function deleteMemory(bu: BU, key: string): Promise<void> {
  const client = requireDb();
  const { error } = await client.from("recon_payee_memory").delete().eq("bu", bu).eq("counterparty_key", key);
  if (error) throw error;
}

/**
 * Reverte um grupo (append-only): marca state='reverted' e reabre o que foi
 * aplicado. NUNCA deleta. Reabre os lançamentos e devolve a tx para a fila.
 */
export async function revertGroup(groupId: string, by: string): Promise<void> {
  const client = requireDb();
  // Carrega matches do grupo.
  const { data: ms, error: mErr } = await client
    .from("recon_match")
    .select("bank_tx_id,ledger_id,applied_amount")
    .eq("group_id", groupId);
  if (mErr) throw mErr;
  const matches = (ms ?? []) as { bank_tx_id: string | null; ledger_id: string | null; applied_amount: number }[];

  // Reabre lançamentos (origem documento) e devolve tx para unmatched.
  for (const m of matches) {
    if (m.ledger_id) {
      const { data: le } = await client
        .from("ledger_entry").select("amount,open_amount,origem").eq("id", m.ledger_id).maybeSingle();
      const row = le as { amount: number; open_amount: number; origem: string } | null;
      if (row && row.origem === "documento") {
        const reopened = Math.round((row.open_amount + m.applied_amount) * 100) / 100;
        await client.from("ledger_entry")
          .update({ open_amount: reopened, status: reopened >= row.amount ? "aberto" : "parcial" })
          .eq("id", m.ledger_id);
      }
    }
  }
  const txIds = [...new Set(matches.map((m) => m.bank_tx_id).filter(Boolean))] as string[];
  for (const id of txIds) {
    await client.from("bank_transaction").update({ recon_status: "unmatched" }).eq("id", id);
  }
  const { error } = await client
    .from("recon_group")
    .update({ state: "reverted", reverted_at: new Date().toISOString(), reverted_by: by })
    .eq("id", groupId);
  if (error) throw error;
}

/** Aprova um grupo sugerido/fraco → promove a state='manual' (confirmação humana). */
export async function approveGroup(groupId: string, by: string): Promise<void> {
  const client = requireDb();
  const { error } = await client
    .from("recon_group")
    .update({ state: "manual", matched_by: by })
    .eq("id", groupId);
  if (error) throw error;
}
