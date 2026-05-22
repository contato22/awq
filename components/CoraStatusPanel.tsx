"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankTransaction } from "@/lib/financial-db";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

interface CoraBalance {
  available: number;
  blocked: number | null;
  error?: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  period: { startDate: string; endDate: string };
  error?: string;
  _debug?: unknown;
}

type AccountKey = "AWQ_Holding" | "ENERDY";

interface Account {
  key: AccountKey;
  name: string;
  entity: AccountKey;
  initials: string;
  color: {
    border: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    balanceBg: string;
    balanceBorder: string;
    balanceLabel: string;
    balanceValue: string;
    dot: string;
    syncBtn: string;
    syncBtnHover: string;
  };
}

const ACCOUNTS: Account[] = [
  {
    key:      "AWQ_Holding",
    name:     "Conta PJ AWQ Holding",
    entity:   "AWQ_Holding",
    initials: "AWQ",
    color: {
      border:       "border-blue-200",
      bg:           "bg-blue-50/30",
      badgeBg:      "bg-blue-600",
      badgeText:    "text-white",
      balanceBg:    "bg-blue-50",
      balanceBorder:"border-blue-100",
      balanceLabel: "text-blue-700",
      balanceValue: "text-blue-900",
      dot:          "bg-blue-500",
      syncBtn:      "border-blue-200 bg-blue-50 text-blue-700",
      syncBtnHover: "hover:bg-blue-100",
    },
  },
  {
    key:      "ENERDY",
    name:     "Cora Enerdy",
    entity:   "ENERDY",
    initials: "ENR",
    color: {
      border:       "border-brand-200",
      bg:           "bg-brand-50/30",
      badgeBg:      "bg-brand-600",
      badgeText:    "text-white",
      balanceBg:    "bg-brand-50",
      balanceBorder:"border-brand-100",
      balanceLabel: "text-brand-700",
      balanceValue: "text-brand-900",
      dot:          "bg-brand-500",
      syncBtn:      "border-brand-200 bg-brand-50 text-brand-700",
      syncBtnHover: "hover:bg-brand-100",
    },
  },
];

const LIVE_INTERVAL_MS   = 5 * 60 * 1000;
const LIVE_WINDOW_DAYS   = 7;
const INITIAL_START_DATE = "2026-01-01";

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

export default function CoraStatusPanel({
  transactions,
}: {
  transactions: BankTransaction[];
}) {
  const [balances, setBalances]             = useState<Record<AccountKey, CoraBalance | null>>({ AWQ_Holding: null, ENERDY: null });
  const [balanceErrors, setBalanceErrors]   = useState<Record<AccountKey, string | null>>({ AWQ_Holding: null, ENERDY: null });
  const [loadingBalance, setLoadingBalance] = useState<Record<AccountKey, boolean>>({ AWQ_Holding: true, ENERDY: true });
  const [syncingAll, setSyncingAll]         = useState(false);
  const [syncingKey, setSyncingKey]         = useState<AccountKey | null>(null);
  const [lastSyncAt, setLastSyncAt]         = useState<Date | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);
  const [syncErrors, setSyncErrors]         = useState<Record<AccountKey, string | null>>({ AWQ_Holding: null, ENERDY: null });
  const [diagInfo, setDiagInfo]             = useState<{ account: string; debug: unknown } | null>(null);
  const [coraDebug, setCoraDebug]           = useState<unknown | null>(null);
  const [loadingDebug, setLoadingDebug]     = useState(false);
  const isMounted = useRef(true);
  const router = useRouter();

  const runCoraDebug = useCallback(async () => {
    setLoadingDebug(true);
    try {
      const res = await fetch("/api/cora/debug");
      const data = await res.json() as unknown;
      if (isMounted.current) setCoraDebug(data);
    } catch (err) {
      if (isMounted.current) setCoraDebug({ error: err instanceof Error ? err.message : "Falha" });
    } finally {
      if (isMounted.current) setLoadingDebug(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadBalance = useCallback(async (account: AccountKey) => {
    setLoadingBalance((p) => ({ ...p, [account]: true }));
    setBalanceErrors((p) => ({ ...p, [account]: null }));
    try {
      const res  = await fetch(`/api/cora/balance?account=${account}`);
      const data = await res.json() as CoraBalance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar saldo");
      if (isMounted.current) setBalances((p) => ({ ...p, [account]: data }));
    } catch (err) {
      if (isMounted.current)
        setBalanceErrors((p) => ({
          ...p,
          [account]: err instanceof Error ? err.message : "Falha ao buscar saldo",
        }));
    } finally {
      if (isMounted.current) setLoadingBalance((p) => ({ ...p, [account]: false }));
    }
  }, []);

  const syncAccount = useCallback(async (acc: Account, startDate: string): Promise<number> => {
    const endDate = today();
    const res = await fetch("/api/cora/sync", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: acc.entity, accountName: acc.name, startDate, endDate }),
    });
    const data = await res.json() as SyncResult & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Falha ao sincronizar");
    if (data.total === 0 && data._debug && isMounted.current)
      setDiagInfo({ account: acc.key, debug: data._debug });
    void loadBalance(acc.key);
    return data.synced;
  }, [loadBalance]);

  const runSync = useCallback(async (startDate: string) => {
    if (!isMounted.current) return;
    setSyncingAll(true);
    setSyncErrors({ AWQ_Holding: null, ENERDY: null });
    let totalSynced = 0;

    for (const acc of ACCOUNTS) {
      try {
        totalSynced += await syncAccount(acc, startDate);
      } catch (err) {
        if (isMounted.current)
          setSyncErrors((p) => ({ ...p, [acc.key]: err instanceof Error ? err.message : "Erro de rede" }));
      }
    }

    if (!isMounted.current) return;
    setSyncingAll(false);
    setLastSyncAt(new Date());
    setLastSyncedCount(totalSynced);
    if (totalSynced > 0) router.refresh();
  }, [syncAccount, router]);

  const runSyncSingle = useCallback(async (acc: Account) => {
    if (!isMounted.current) return;
    setSyncingKey(acc.key);
    setSyncErrors((p) => ({ ...p, [acc.key]: null }));
    try {
      const synced = await syncAccount(acc, INITIAL_START_DATE);
      if (isMounted.current) {
        setLastSyncAt(new Date());
        setLastSyncedCount(synced);
        if (synced > 0) router.refresh();
      }
    } catch (err) {
      if (isMounted.current)
        setSyncErrors((p) => ({ ...p, [acc.key]: err instanceof Error ? err.message : "Erro" }));
    } finally {
      if (isMounted.current) setSyncingKey(null);
    }
  }, [syncAccount, router]);

  useEffect(() => {
    void loadBalance("AWQ_Holding");
    void loadBalance("ENERDY");
    void runSync(INITIAL_START_DATE);
    const timer = setInterval(() => void runSync(daysAgo(LIVE_WINDOW_DAYS)), LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadBalance, runSync]);

  function lastSyncFor(entity: AccountKey) {
    const dates = transactions
      .filter((t) => t.entity === entity)
      .map((t) => t.extractedAt)
      .filter(Boolean)
      .sort()
      .reverse();
    return dates[0] ? fmtDatetime(dates[0]) : null;
  }

  function txCountFor(entity: AccountKey) {
    return transactions.filter((t) => t.entity === entity).length;
  }

  function pendingFor(entity: AccountKey) {
    return transactions.filter(
      (t) => t.entity === entity &&
        (t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao")
    ).length;
  }

  const isSyncing = syncingAll || syncingKey !== null;
  const globalSyncError = (syncErrors.AWQ_Holding && syncErrors.ENERDY)
    ? `AWQ: ${syncErrors.AWQ_Holding} · Enerdy: ${syncErrors.ENERDY}`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi size={15} className="text-emerald-600" />
          <span className="text-sm font-bold text-gray-900">Cora Bank</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold uppercase tracking-wide">
            Live
          </span>
          <span className="text-[11px] text-gray-400">{ACCOUNTS.length} contas</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          {syncingAll ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Loader2 size={12} className="animate-spin" />
              Sincronizando todas…
            </span>
          ) : lastSyncAt ? (
            <span className="flex items-center gap-1.5 text-gray-500">
              <RefreshCw size={11} className="text-emerald-500" />
              {lastSyncAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              {lastSyncedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  +{lastSyncedCount}
                </span>
              )}
            </span>
          ) : null}
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">a cada 5 min</span>
          <button
            onClick={() => void runCoraDebug()}
            disabled={loadingDebug}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-400 hover:text-amber-700 transition-colors disabled:opacity-50"
            title="Debug Cora API"
          >
            {loadingDebug ? <Loader2 size={10} className="animate-spin" /> : <FlaskConical size={10} />}
            <span className="text-[10px]">Debug</span>
          </button>
        </div>
      </div>

      {/* Erro global */}
      {globalSyncError && (
        <div className="flex items-start gap-2 px-5 py-2 text-xs border-b bg-red-50 border-red-200 text-red-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {globalSyncError}
        </div>
      )}

      {/* Debug panel */}
      {(coraDebug || diagInfo) && (
        <div className="px-5 py-3 border-b bg-amber-50 border-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <AlertTriangle size={13} className="shrink-0" />
            {coraDebug
              ? "Diagnóstico Cora — resposta bruta:"
              : `Cora retornou 0 transações para "${diagInfo?.account}"`}
          </div>
          <pre className="bg-white border border-amber-200 rounded p-2 text-[10px] text-gray-700 overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(coraDebug ?? diagInfo?.debug, null, 2)}
          </pre>
        </div>
      )}

      {/* Account cards — side by side */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACCOUNTS.map((acc) => {
          const c          = acc.color;
          const bal        = balances[acc.key];
          const balErr     = balanceErrors[acc.key];
          const loadingBal = loadingBalance[acc.key];
          const lastSync   = lastSyncFor(acc.entity);
          const pending    = pendingFor(acc.entity);
          const txCount    = txCountFor(acc.entity);
          const syncErr    = syncErrors[acc.key];
          const isSyncingThis = syncingKey === acc.key || syncingAll;

          return (
            <div
              key={acc.key}
              className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${c.badgeBg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[11px] font-bold tracking-wider ${c.badgeText}`}>{acc.initials}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{acc.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{acc.entity}</div>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  {isSyncingThis ? (
                    <Loader2 size={15} className="text-gray-400 animate-spin" />
                  ) : lastSync ? (
                    <CheckCircle2 size={15} className="text-emerald-500" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5`} />
                  )}
                </div>
              </div>

              {/* Saldo */}
              <div className={`rounded-lg border ${c.balanceBorder} ${c.balanceBg} px-3 py-2.5`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={11} className={c.balanceLabel} />
                  <span className={`text-[10px] font-semibold ${c.balanceLabel} uppercase tracking-wide`}>Saldo disponível</span>
                </div>
                {loadingBal ? (
                  <div className={`flex items-center gap-1.5 text-sm ${c.balanceLabel}`}>
                    <Loader2 size={13} className="animate-spin" /> Buscando…
                  </div>
                ) : balErr ? (
                  <div className="flex items-start gap-1.5">
                    <WifiOff size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-700 leading-snug">{balErr}</span>
                  </div>
                ) : bal ? (
                  <div>
                    <div className={`text-xl font-bold ${c.balanceValue}`}>{fmtBRL(bal.available)}</div>
                    {bal.blocked != null && bal.blocked > 0 && (
                      <div className={`text-[11px] ${c.balanceLabel} mt-0.5`}>
                        Bloqueado: {fmtBRL(bal.blocked)}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {pending > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                      {pending} pendente{pending > 1 ? "s" : ""}
                    </span>
                  ) : txCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                      Em dia
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-[11px]">
                      Sem transações
                    </span>
                  )}
                  {txCount > 0 && (
                    <span className="text-[10px] text-gray-400">{txCount} tx</span>
                  )}
                </div>

                <button
                  onClick={() => void runSyncSingle(acc)}
                  disabled={isSyncing}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-40 ${c.syncBtn} ${c.syncBtnHover}`}
                  title={`Sincronizar ${acc.name}`}
                >
                  {isSyncingThis
                    ? <Loader2 size={10} className="animate-spin" />
                    : <RefreshCw size={10} />
                  }
                  Sync
                </button>
              </div>

              {/* Última sync / erro individual */}
              {syncErr && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                  {syncErr}
                </div>
              )}
              {!syncErr && lastSync && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock size={9} />
                  Última sync: {lastSync}
                </div>
              )}
              {!syncErr && !lastSync && !isSyncingThis && (
                <div className="text-[10px] text-gray-400">Aguardando primeira sync…</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Novas transações entram como <strong className="text-gray-600">pendente</strong> e são classificadas automaticamente.
        </span>
        <span>mTLS + OAuth2</span>
      </div>
    </div>
  );
}
