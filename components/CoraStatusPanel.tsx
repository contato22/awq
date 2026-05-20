"use client";

// CoraStatusPanel — painel de integração direta com o Cora Bank
//
// Mostra para cada conta (AWQ Holding e JACQES):
//   - Saldo disponível em tempo real (via GET /api/cora/balance)
//   - Data da última sincronização
//   - Quantidade de transações pendentes de conciliação
//   - Botão de sync individual + "Sincronizar Tudo"
//   - Seletor de período: 7d / 30d / 90d / personalizado

import { useCallback, useEffect, useState } from "react";
import type { BankTransaction } from "@/lib/financial-db";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoraBalance {
  account: string;
  available: number;
  blocked: number | null;
  total: number | null;
  updatedAt: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  period: { startDate: string; endDate: string };
  error?: string;
}

type SyncRange = "7" | "30" | "90";
type AccountKey = "AWQ_Holding" | "JACQES";

interface Account {
  key: AccountKey;
  name: string;
  entity: AccountKey;
}

const ACCOUNTS: Account[] = [
  { key: "AWQ_Holding", name: "Conta PJ AWQ Holding", entity: "AWQ_Holding" },
  { key: "JACQES",      name: "Conta PJ JACQES",      entity: "JACQES"      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoraStatusPanel({
  transactions,
}: {
  transactions: BankTransaction[];
}) {
  const [balances, setBalances]         = useState<Record<AccountKey, CoraBalance | null>>({ AWQ_Holding: null, JACQES: null });
  const [balanceErrors, setBalanceErrors] = useState<Record<AccountKey, string | null>>({ AWQ_Holding: null, JACQES: null });
  const [loadingBalance, setLoadingBalance] = useState<Record<AccountKey, boolean>>({ AWQ_Holding: true, JACQES: true });
  const [syncingAccount, setSyncingAccount] = useState<AccountKey | "all" | null>(null);
  const [syncRange, setSyncRange]       = useState<SyncRange>("30");
  const [showCustom, setShowCustom]     = useState(false);
  const [customStart, setCustomStart]   = useState(daysAgo(30));
  const [customEnd, setCustomEnd]       = useState(today());
  const [toast, setToast]               = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [lastResults, setLastResults]   = useState<Record<AccountKey, SyncResult | null>>({ AWQ_Holding: null, JACQES: null });

  function showToast(kind: "ok" | "err" | "info", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 6000);
  }

  // ── Load balance for one account ─────────────────────────────────────────
  const loadBalance = useCallback(async (account: AccountKey) => {
    setLoadingBalance((p) => ({ ...p, [account]: true }));
    setBalanceErrors((p) => ({ ...p, [account]: null }));
    try {
      const res = await fetch(`/api/cora/balance?account=${account}`);
      const data = await res.json() as CoraBalance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar saldo");
      setBalances((p) => ({ ...p, [account]: data }));
    } catch (err) {
      setBalanceErrors((p) => ({
        ...p,
        [account]: err instanceof Error ? err.message : "Falha ao buscar saldo",
      }));
    } finally {
      setLoadingBalance((p) => ({ ...p, [account]: false }));
    }
  }, []);

  useEffect(() => {
    void loadBalance("AWQ_Holding");
    void loadBalance("JACQES");
  }, [loadBalance]);

  // ── Sync one account ──────────────────────────────────────────────────────
  async function syncAccount(account: Account, force = false) {
    setSyncingAccount(account.key);
    const startDate = showCustom ? customStart : daysAgo(Number(syncRange));
    const endDate   = showCustom ? customEnd   : today();
    try {
      const res = await fetch("/api/cora/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity:      account.entity,
          accountName: account.name,
          startDate,
          endDate,
          force,
        }),
      });
      const data = await res.json() as SyncResult;
      if (!res.ok) throw new Error(data.error ?? "Falha na sincronização");

      setLastResults((p) => ({ ...p, [account.key]: data }));

      if (data.synced === 0 && !force) {
        showToast("info", `${account.name}: nenhuma transação nova. ${data.skipped} já importadas.`);
      } else {
        showToast("ok", `${account.name}: ${data.synced} transação(ões) importadas${force ? " (re-importação)" : ""}.`);
        setTimeout(() => window.location.reload(), 1800);
      }

      void loadBalance(account.key);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : `Falha ao sincronizar ${account.name}`);
    } finally {
      setSyncingAccount(null);
    }
  }

  // ── Sync all accounts sequentially ───────────────────────────────────────
  async function syncAll() {
    setSyncingAccount("all");
    let totalSynced = 0;
    for (const acc of ACCOUNTS) {
      const startDate = showCustom ? customStart : daysAgo(Number(syncRange));
      const endDate   = showCustom ? customEnd   : today();
      try {
        const res = await fetch("/api/cora/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity: acc.entity, accountName: acc.name, startDate, endDate,
          }),
        });
        const data = await res.json() as SyncResult;
        if (res.ok) {
          setLastResults((p) => ({ ...p, [acc.key]: data }));
          totalSynced += data.synced;
          void loadBalance(acc.key);
        }
      } catch { /* continue with next account */ }
    }
    setSyncingAccount(null);
    if (totalSynced > 0) {
      showToast("ok", `${totalSynced} transação(ões) nova(s) importadas de todas as contas.`);
      setTimeout(() => window.location.reload(), 1800);
    } else {
      showToast("info", "Todas as contas já estavam atualizadas.");
    }
  }

  // ── Derived: last sync + pending count per entity ─────────────────────────
  function lastSyncFor(entity: AccountKey) {
    const dates = transactions
      .filter((t) => t.entity === entity)
      .map((t) => t.extractedAt)
      .filter(Boolean)
      .sort()
      .reverse();
    return dates[0] ? fmtDatetime(dates[0]) : null;
  }

  function pendingFor(entity: AccountKey) {
    return transactions.filter(
      (t) => t.entity === entity &&
        (t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao")
    ).length;
  }

  const isSyncing = syncingAccount !== null;
  const rangeLabel = showCustom
    ? `${customStart} → ${customEnd}`
    : `últimos ${syncRange} dias`;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-emerald-50 border-b border-emerald-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi size={15} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-900">Cora Bank — Integração Direta</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-semibold uppercase tracking-wide">
            Conectado
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync range toggle */}
          <div className="flex rounded-lg border border-emerald-200 overflow-hidden text-[11px] font-medium">
            {(["7", "30", "90"] as SyncRange[]).map((d) => (
              <button
                key={d}
                onClick={() => { setSyncRange(d); setShowCustom(false); }}
                className={
                  "px-3 py-1.5 transition-colors " +
                  (!showCustom && syncRange === d
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-700 hover:bg-emerald-100")
                }
              >
                {d}d
              </button>
            ))}
            <button
              onClick={() => setShowCustom((v) => !v)}
              className={
                "px-3 py-1.5 flex items-center gap-1 transition-colors " +
                (showCustom ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-100")
              }
            >
              Período <ChevronDown size={10} />
            </button>
          </div>

          {/* Sincronizar Tudo */}
          <button
            onClick={() => void syncAll()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {syncingAccount === "all"
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />
            }
            {syncingAccount === "all" ? "Sincronizando…" : "Sincronizar Tudo"}
          </button>
        </div>
      </div>

      {/* ── Custom date range ──────────────────────────────────────────────── */}
      {showCustom && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50/60 border-b border-emerald-100 text-xs">
          <span className="text-gray-600 font-medium">De</span>
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-gray-800 focus:outline-none focus:border-emerald-400"
          />
          <span className="text-gray-600 font-medium">até</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={today()}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-gray-800 focus:outline-none focus:border-emerald-400"
          />
          <span className="text-gray-400">Período selecionado: <strong className="text-gray-700">{rangeLabel}</strong></span>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={
          "flex items-start gap-2 px-5 py-2.5 text-xs border-b " +
          (toast.kind === "ok"   ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
           toast.kind === "info" ? "bg-blue-50 border-blue-200 text-blue-800" :
                                   "bg-red-50 border-red-200 text-red-800")
        }>
          {toast.kind === "err" && <AlertTriangle size={13} className="shrink-0 mt-0.5" />}
          {toast.msg}
        </div>
      )}

      {/* ── Account cards ──────────────────────────────────────────────────── */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACCOUNTS.map((acc) => {
          const bal        = balances[acc.key];
          const balErr     = balanceErrors[acc.key];
          const loadingBal = loadingBalance[acc.key];
          const lastSync   = lastSyncFor(acc.entity);
          const pending    = pendingFor(acc.entity);
          const result     = lastResults[acc.key];
          const isSyncingThis = syncingAccount === acc.key || syncingAccount === "all";

          return (
            <div key={acc.key} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4">

              {/* Account header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-gray-900">{acc.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lastSync ? (
                      <>
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">Última sync: {lastSync}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400">Nunca sincronizado</span>
                    )}
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              </div>

              {/* Balance */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={12} className="text-emerald-600" />
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Saldo Disponível</span>
                </div>
                {loadingBal ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <Loader2 size={14} className="animate-spin" /> Buscando…
                  </div>
                ) : balErr ? (
                  <div className="flex items-start gap-2">
                    <WifiOff size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-700 leading-snug">{balErr}</span>
                  </div>
                ) : bal ? (
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-xl font-bold text-emerald-900">{fmtBRL(bal.available)}</div>
                      {bal.blocked != null && bal.blocked > 0 && (
                        <div className="text-[11px] text-emerald-600 mt-0.5">
                          Bloqueado: {fmtBRL(bal.blocked)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => void loadBalance(acc.key)}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 hover:underline shrink-0"
                    >
                      <RefreshCw size={10} /> Atualizar
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Pending + last sync result */}
              <div className="flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2">
                  {pending > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                      {pending} pendente(s)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                      Em dia
                    </span>
                  )}
                  {result && (
                    <span className="text-[11px] text-gray-400">
                      +{result.synced} na última sync
                    </span>
                  )}
                </div>

                {/* Sync buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void syncAccount(acc)}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-[11px] font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isSyncingThis
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RefreshCw size={12} />
                    }
                    {isSyncingThis ? "Sincronizando…" : `Sincronizar (${showCustom ? "período" : syncRange + "d"})`}
                  </button>
                  <button
                    onClick={() => void syncAccount(acc, true)}
                    disabled={isSyncing}
                    title="Re-importa todas as transações do período, substituindo as existentes"
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 text-[11px] font-semibold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    Re-importar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Novas transações entram com status <strong className="text-gray-600">pendente</strong> e são classificadas automaticamente.
        </span>
        <span>Cora API · mTLS + OAuth2</span>
      </div>
    </div>
  );
}
