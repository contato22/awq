"use client";

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
}

type SyncRange = "7" | "30" | "90";

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
  const [balance, setBalance]         = useState<CoraBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [syncRange, setSyncRange]     = useState<SyncRange>("30");
  const [showCustom, setShowCustom]   = useState(false);
  const [customStart, setCustomStart] = useState(daysAgo(30));
  const [customEnd, setCustomEnd]     = useState(today());
  const [toast, setToast]             = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [lastResult, setLastResult]   = useState<SyncResult | null>(null);

  function showToast(kind: "ok" | "err" | "info", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 6000);
  }

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    setBalanceError(null);
    try {
      const res  = await fetch("/api/cora/balance");
      const data = await res.json() as CoraBalance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar saldo");
      setBalance(data);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Falha ao buscar saldo");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => { void loadBalance(); }, [loadBalance]);

  async function sync(force = false) {
    setSyncing(true);
    const startDate = showCustom ? customStart : daysAgo(Number(syncRange));
    const endDate   = showCustom ? customEnd   : today();
    try {
      const res = await fetch("/api/cora/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity:      "AWQ_Holding",
          accountName: "Conta PJ AWQ Group",
          startDate,
          endDate,
          force,
        }),
      });
      const data = await res.json() as SyncResult;
      if (!res.ok) throw new Error(data.error ?? "Falha na sincronização");
      setLastResult(data);
      if (data.synced === 0 && !force) {
        showToast("info", `Nenhuma transação nova. ${data.skipped} já importadas.`);
      } else {
        showToast("ok", `${data.synced} transação(ões) importadas${force ? " (re-importação)" : ""}.`);
        setTimeout(() => window.location.reload(), 1800);
      }
      void loadBalance();
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  const lastSync = transactions
    .map((t) => t.extractedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const pending = transactions.filter(
    (t) => t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao"
  ).length;

  const rangeLabel = showCustom
    ? `${customStart} → ${customEnd}`
    : `últimos ${syncRange} dias`;

  return (
    <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm">

      {/* Header */}
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

          <button
            onClick={() => void sync()}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {showCustom && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50/60 border-b border-emerald-100 text-xs">
          <span className="text-gray-600 font-medium">De</span>
          <input
            type="date" value={customStart} max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-gray-800 focus:outline-none focus:border-emerald-400"
          />
          <span className="text-gray-600 font-medium">até</span>
          <input
            type="date" value={customEnd} min={customStart} max={today()}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-gray-800 focus:outline-none focus:border-emerald-400"
          />
          <span className="text-gray-400">
            Período selecionado: <strong className="text-gray-700">{rangeLabel}</strong>
          </span>
        </div>
      )}

      {/* Toast */}
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

      {/* Account card */}
      <div className="p-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-gray-900">Conta PJ · AWQ Group</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {lastSync ? (
                  <>
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500">Última sync: {fmtDatetime(lastSync)}</span>
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
            {loadingBalance ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <Loader2 size={14} className="animate-spin" /> Buscando…
              </div>
            ) : balanceError ? (
              <div className="flex items-start gap-2">
                <WifiOff size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-xs text-amber-700 leading-snug">{balanceError}</span>
              </div>
            ) : balance ? (
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-xl font-bold text-emerald-900">{fmtBRL(balance.available)}</div>
                  {balance.blocked != null && balance.blocked > 0 && (
                    <div className="text-[11px] text-emerald-600 mt-0.5">
                      Bloqueado: {fmtBRL(balance.blocked)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => void loadBalance()}
                  className="flex items-center gap-1 text-[10px] text-emerald-600 hover:underline shrink-0"
                >
                  <RefreshCw size={10} /> Atualizar
                </button>
              </div>
            ) : null}
          </div>

          {/* Pending + sync actions */}
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
              {lastResult && (
                <span className="text-[11px] text-gray-400">
                  +{lastResult.synced} na última sync
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void sync()}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-[11px] font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {syncing ? "Sincronizando…" : `Sincronizar (${showCustom ? "período" : syncRange + "d"})`}
              </button>
              <button
                onClick={() => void sync(true)}
                disabled={syncing}
                title="Re-importa todas as transações do período, substituindo as existentes"
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 text-[11px] font-semibold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Re-importar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Novas transações entram com status <strong className="text-gray-600">pendente</strong> e são classificadas automaticamente.
        </span>
        <span>Cora API · mTLS + OAuth2</span>
      </div>
    </div>
  );
}
