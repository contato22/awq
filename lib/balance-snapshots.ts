// ─── Daily Balance Snapshots ─────────────────────────────────────────────────
//
// Fechamento diário do saldo consolidado por (data, entity, conta).
//
// Modelo:
//   - Cron diário (após Cora sync) grava saldo do dia para cada conta:
//       * Contas Cora → API live (`source = 'cora_live'`)
//       * Outras contas → último `running_balance` da tx até a data (`source = 'running_balance'`)
//   - Backfill reconstrói histórico a partir do `running_balance` das tx existentes.
//   - Gráficos leem essa série como fonte de verdade para a linha de saldo.
//
// Tabela: daily_balance_snapshots (snapshot_date, entity, account_key, balance, source, computed_at)
// PK composta (snapshot_date, entity, account_key) — UPSERT idempotente.

import { erpAdmin, erpAnon, anonClient, supabase, USE_SUPABASE, USE_ERP_ADMIN } from "@/lib/supabase";
import { getAllTransactions, type BankTransaction } from "@/lib/financial-db";
import { fetchCoraBalanceForAccount } from "@/lib/cora-api";

export type SnapshotSource = "cora_live" | "running_balance" | "manual";

export interface BalanceSnapshot {
  snapshotDate: string;   // YYYY-MM-DD
  entity:       string;
  accountKey:   string;   // "Bank::AccountName"
  balance:      number;
  source:       SnapshotSource;
  computedAt:   string;
}

interface Row {
  snapshot_date: string;
  entity:        string;
  account_key:   string;
  balance:       number | string;
  source:        string;
  computed_at:   string;
}

function rowToSnapshot(r: Row): BalanceSnapshot {
  return {
    snapshotDate: r.snapshot_date,
    entity:       r.entity,
    accountKey:   r.account_key,
    balance:      typeof r.balance === "string" ? parseFloat(r.balance) : r.balance,
    source:       r.source as SnapshotSource,
    computedAt:   r.computed_at,
  };
}

function snapshotToRow(s: BalanceSnapshot): Row {
  return {
    snapshot_date: s.snapshotDate,
    entity:        s.entity,
    account_key:   s.accountKey,
    balance:       s.balance,
    source:        s.source,
    computed_at:   s.computedAt,
  };
}

// Priority: ERP admin → financial admin → ERP anon → anon. Match financial-db.ts.
function getClient() {
  if (USE_ERP_ADMIN && erpAdmin) return erpAdmin;
  if (USE_SUPABASE && supabase)  return supabase;
  if (erpAnon)                   return erpAnon;
  return anonClient;
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getSnapshots(
  from: string,
  to:   string,
  entity?: string,
): Promise<BalanceSnapshot[]> {
  const client = getClient();
  if (!client) return [];

  let query = client
    .from("daily_balance_snapshots")
    .select("*")
    .gte("snapshot_date", from)
    .lte("snapshot_date", to)
    .order("snapshot_date", { ascending: true });

  if (entity) query = query.eq("entity", entity);

  const { data, error } = await query;
  if (error) {
    console.error("[balance-snapshots] getSnapshots error:", error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToSnapshot(r as Row));
}

/**
 * Saldo consolidado por dia (soma das contas) — pronto para alimentar o chart.
 * Carry-forward em dias sem snapshot: usa último valor conhecido por conta.
 */
export async function getConsolidatedDaily(
  from: string,
  to:   string,
  entity?: string,
): Promise<Array<{ date: string; total: number; perAccount: Record<string, number> }>> {
  const snaps = await getSnapshots(from, to, entity);

  // Bucket por (date, account_key)
  const byDate = new Map<string, Map<string, number>>();
  const accountKeys = new Set<string>();
  for (const s of snaps) {
    accountKeys.add(s.accountKey);
    if (!byDate.has(s.snapshotDate)) byDate.set(s.snapshotDate, new Map());
    byDate.get(s.snapshotDate)!.set(s.accountKey, s.balance);
  }

  // Itera dia a dia entre from e to (inclusive), aplicando carry-forward por conta
  const result: Array<{ date: string; total: number; perAccount: Record<string, number> }> = [];
  const lastByAccount = new Map<string, number>();
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate   = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = fromDate; t <= toDate; t += 86_400_000) {
    const d = new Date(t).toISOString().slice(0, 10);
    const today = byDate.get(d);
    if (today) {
      for (const [k, v] of today.entries()) lastByAccount.set(k, v);
    }
    const perAccount: Record<string, number> = {};
    let total = 0;
    for (const k of accountKeys) {
      const v = lastByAccount.get(k);
      if (v != null) { perAccount[k] = v; total += v; }
    }
    result.push({ date: d, total, perAccount });
  }
  return result;
}

// ─── Write ─────────────────────────────────────────────────────────────────

export async function upsertSnapshots(snapshots: BalanceSnapshot[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (snapshots.length === 0) return { ok: true, count: 0 };
  const client = getClient();
  if (!client) return { ok: false, count: 0, error: "Sem cliente DB configurado" };

  const rows = snapshots.map(snapshotToRow);
  const { error } = await client
    .from("daily_balance_snapshots")
    .upsert(rows, { onConflict: "snapshot_date,entity,account_key" });

  if (error) {
    console.error("[balance-snapshots] upsert error:", error.message);
    return { ok: false, count: 0, error: error.message };
  }
  return { ok: true, count: rows.length };
}

// ─── Compute ───────────────────────────────────────────────────────────────

/** Lista de contas únicas presentes em bank_transactions, com sua entity. */
function listAccounts(txns: BankTransaction[]): Array<{ key: string; bank: string; accountName: string; entity: string }> {
  const map = new Map<string, { key: string; bank: string; accountName: string; entity: string }>();
  for (const t of txns) {
    const key = `${t.bank}::${t.accountName}`;
    if (!map.has(key)) map.set(key, { key, bank: t.bank, accountName: t.accountName, entity: t.entity });
  }
  return Array.from(map.values());
}

/**
 * Saldo da conta no fim do dia `date`:
 *   - Última tx (por transactionDate) com runningBalance != null em date <= target
 *   - Retorna null se a conta nunca teve runningBalance até essa data
 */
function balanceAtDay(txns: BankTransaction[], accountKey: string, date: string): number | null {
  let last: { date: string; balance: number } | null = null;
  for (const t of txns) {
    if (`${t.bank}::${t.accountName}` !== accountKey) continue;
    if (t.runningBalance == null) continue;
    if (t.transactionDate > date) continue;
    if (!last || t.transactionDate >= last.date) {
      last = { date: t.transactionDate, balance: t.runningBalance };
    }
  }
  return last?.balance ?? null;
}

/**
 * Snapshot de hoje (ou data informada) — usa Cora live para contas Cora ativas,
 * runningBalance para as demais. Usado pelo cron diário pós-sync.
 */
export async function computeAndSaveSnapshotForDate(
  date: string,
  coraAccounts: Array<{ entity: "AWQ_Holding" | "JACQES" | "ENERDY"; accountName: string }> = [],
): Promise<{ ok: boolean; saved: number; details: Array<{ accountKey: string; balance: number; source: SnapshotSource }>; error?: string }> {
  const now = new Date().toISOString();
  const txns = await getAllTransactions();
  const accounts = listAccounts(txns);

  const snapshots: BalanceSnapshot[] = [];
  const details: Array<{ accountKey: string; balance: number; source: SnapshotSource }> = [];

  // Cora live primeiro (sobrescreve carry-forward quando ambos existirem)
  const liveBalances = new Map<string, number>();
  for (const acc of coraAccounts) {
    try {
      const { available } = await fetchCoraBalanceForAccount(acc.entity);
      const key = `Cora::${acc.accountName}`;
      liveBalances.set(key, available);
    } catch (err) {
      console.error(`[snapshot] live balance fail (${acc.entity}):`, err instanceof Error ? err.message : err);
    }
  }

  for (const acc of accounts) {
    const live = liveBalances.get(acc.key);
    if (live != null) {
      snapshots.push({
        snapshotDate: date, entity: acc.entity, accountKey: acc.key,
        balance: live, source: "cora_live", computedAt: now,
      });
      details.push({ accountKey: acc.key, balance: live, source: "cora_live" });
      continue;
    }
    const bal = balanceAtDay(txns, acc.key, date);
    if (bal == null) continue; // conta sem runningBalance até essa data — pula
    snapshots.push({
      snapshotDate: date, entity: acc.entity, accountKey: acc.key,
      balance: bal, source: "running_balance", computedAt: now,
    });
    details.push({ accountKey: acc.key, balance: bal, source: "running_balance" });
  }

  const res = await upsertSnapshots(snapshots);
  return { ok: res.ok, saved: res.count, details, error: res.error };
}

/**
 * Backfill: para cada dia entre `from` e `to`, para cada conta, grava o último
 * `runningBalance` conhecido até aquele dia. Carry-forward natural.
 */
export async function backfillSnapshots(
  from: string,
  to:   string,
): Promise<{ ok: boolean; saved: number; days: number; accounts: number; error?: string }> {
  const txns = await getAllTransactions();
  const accounts = listAccounts(txns);
  if (accounts.length === 0) return { ok: true, saved: 0, days: 0, accounts: 0 };

  // Pre-computa o último runningBalance por (date, account) — single pass.
  // Para cada conta, mantém uma lista ordenada de (date, balance); depois
  // varremos dia a dia usando carry-forward.
  const byAccount = new Map<string, Array<{ date: string; balance: number }>>();
  for (const t of txns) {
    if (t.runningBalance == null) continue;
    const key = `${t.bank}::${t.accountName}`;
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push({ date: t.transactionDate, balance: t.runningBalance });
  }
  for (const list of byAccount.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date().toISOString();
  const snapshots: BalanceSnapshot[] = [];
  const fromTs = new Date(`${from}T00:00:00Z`).getTime();
  const toTs   = new Date(`${to}T00:00:00Z`).getTime();
  let dayCount = 0;

  // Ponteiros por conta avançam conforme avançamos no calendário
  const ptr = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  for (const k of byAccount.keys()) { ptr.set(k, 0); lastSeen.set(k, NaN); }

  for (let ts = fromTs; ts <= toTs; ts += 86_400_000) {
    const d = new Date(ts).toISOString().slice(0, 10);
    dayCount++;
    for (const acc of accounts) {
      const list = byAccount.get(acc.key);
      if (!list || list.length === 0) continue;
      let i = ptr.get(acc.key) ?? 0;
      while (i < list.length && list[i].date <= d) {
        lastSeen.set(acc.key, list[i].balance);
        i++;
      }
      ptr.set(acc.key, i);
      const bal = lastSeen.get(acc.key);
      if (bal == null || Number.isNaN(bal)) continue;
      snapshots.push({
        snapshotDate: d, entity: acc.entity, accountKey: acc.key,
        balance: bal, source: "running_balance", computedAt: now,
      });
    }
  }

  const res = await upsertSnapshots(snapshots);
  return { ok: res.ok, saved: res.count, days: dayCount, accounts: accounts.length, error: res.error };
}
