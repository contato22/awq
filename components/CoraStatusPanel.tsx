"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankTransaction } from "@/lib/financial-db";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
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

const LIVE_INTERVAL_MS  = 5 * 60 * 1000;
const LIVE_WINDOW_DAYS  = 7;
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
  const [balances, setBalances]             = useState<Record<AccountKey, CoraBalance | null>>({ AWQ_Holding: null, JACQES: null });
  const [balanceErrors, setBalanceErrors]   = useState<Record<AccountKey, string | null>>({ AWQ_Holding: null, JACQES: null });
  const [loadingBalance, setLoadingBalance] = useState<Record<AccountKey, boolean>>({ AWQ_Holding: true, JACQES: true });
  const [syncing, setSyncing]               = useState(false);
  const [lastSyncAt, setLastSyncAt]         = useState<Date | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);
  const [syncError, setSyncError]           = useState<string | null>(null);
  const [diagInfo, setDiagInfo]             = useState<{ account: string; debug: unknown } | null>(null);
  const isMounted = useRef(true);
  const router = useRouter();

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

  const runSync = useCallback(async (startDate: string) => {
    if (!isMounted.current) return;
    setSyncing(true);
    setSyncError(null);
    const endDate = today();
    let totalSynced = 0;

    for (const acc of ACCOUNTS) {
      try {
        const res = await fetch("/api/cora/sync", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity:      acc.entity,
            accountName: acc.name,
            startDate,
            endDate,
          }),
        });
        const data = await res.json() as SyncResult & { error?: string };
        if (res.ok) {
          totalSynced += data.synced;
          if (data.total === 0 && data._debug) {
            console.error("[CoraSync] 0 entradas para", acc.key, data.period, data._debug);
            if (isMounted.current) setDiagInfo({ account: acc.key, debug: data._debug });
          }
          void loadBalance(acc.key);
        } else {
          if (isMounted.current) setSyncError(data.error ?? "Falha ao sincronizar");
        }
      } catch (err) {
        if (isMounted.current)
          setSyncError(err instanceof Error ? err.message : "Erro de rede");
      }
    }

    if (!isMounted.current) return;
    setSyncing(false);
    setLastSyncAt(new Date());
    setLastSyncedCount(totalSynced);
    // router.refresh() atualiza dados server-side sem resetar estado client-side
    // (não perde filtros, seleções ou itens em processo de conciliação)
    if (totalSynced > 0) router.refresh();
  }, [loadBalance, router]);

  useEffect(() => {
    void loadBalance("AWQ_Holding");
    void loadBalance("JACQES");
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

  function pendingFor(entity: AccountKey) {
    return transactions.filter(
      (t) => t.entity === entity &&
        (t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao")
    ).length;
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-emerald-50 border-b border-emerald-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi size={15} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-900">Cora Bank — Integração Direta</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-semibold uppercase tracking-wide">
            Live
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {syncing ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Loader2 size={12} className="animate-spin" />
              Sincronizando…
            </span>
          ) : lastSyncAt ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw size={11} className="text-emerald-500" />
              Atualizado {lastSyncAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              {lastSyncedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  +{lastSyncedCount} novas
                </span>
              )}
            </span>
          ) : null}
          <span className="text-gray-400">sync a cada 5 min</span>
        </div>
      </div>

      {/* Erro de sync */}
      {syncError && (
        <div className="flex items-start gap-2 px-5 py-2.5 text-xs border-b bg-red-50 border-red-200 text-red-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {syncError}
        </div>
      )}

      {/* Diagnóstico — aparece quando sync retorna 0 transações da API Cora */}
      {diagInfo && (
        <div className="px-5 py-3 border-b bg-amber-50 border-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <AlertTriangle size={13} className="shrink-0" />
            Cora API retornou 0 transações para &quot;{diagInfo.account}&quot;. Resposta bruta:
          </div>
          <pre className="bg-white border border-amber-200 rounded p-2 text-[10px] text-gray-700 overflow-x-auto max-h-40 leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(diagInfo.debug, null, 2)}
          </pre>
        </div>
      )}

      {/* Account cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACCOUNTS.map((acc) => {
          const bal        = balances[acc.key];
          const balErr     = balanceErrors[acc.key];
          const loadingBal = loadingBalance[acc.key];
          const lastSync   = lastSyncFor(acc.entity);
          const pending    = pendingFor(acc.entity);

          return (
            <div key={acc.key} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4">

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-gray-900">{acc.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {syncing ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                        <Loader2 size={10} className="animate-spin" /> Sincronizando…
                      </span>
                    ) : lastSync ? (
                      <>
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">Última sync: {lastSync}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400">Aguardando primeira sync…</span>
                    )}
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              </div>

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
                  <div>
                    <div className="text-xl font-bold text-emerald-900">{fmtBRL(bal.available)}</div>
                    {bal.blocked != null && bal.blocked > 0 && (
                      <div className="text-[11px] text-emerald-600 mt-0.5">
                        Bloqueado: {fmtBRL(bal.blocked)}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center text-xs">
                {pending > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                    {pending} pendente(s) de conciliação
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    Em dia
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Novas transações entram com status <strong className="text-gray-600">pendente</strong> e são classificadas automaticamente.
        </span>
        <span>Cora API · mTLS + OAuth2 · live</span>
      </div>
    </div>
  );
}
