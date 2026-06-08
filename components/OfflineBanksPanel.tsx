"use client";

import type { BankTransaction } from "@/lib/financial-db";
import { Clock, FileUp, Landmark, WifiOff } from "lucide-react";

interface OfflineBank {
  key: string;
  name: string;
  subtitle: string;
  initials: string;
  color: {
    border: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
  };
  matchesBank: (bank: string) => boolean;
}

const BANKS: OfflineBank[] = [
  {
    key:      "itau",
    name:     "Conta Itaú AWQ",
    subtitle: "Itaú · AWQ Holding",
    initials: "ITAU",
    color: {
      border:    "border-orange-200",
      bg:        "bg-orange-50/30",
      badgeBg:   "bg-orange-600",
      badgeText: "text-white",
      dot:       "bg-orange-500",
    },
    matchesBank: (b) => b.toLowerCase().includes("ita"),
  },
  {
    key:      "btg",
    name:     "Conta BTG Empresas AWQ",
    subtitle: "BTG Empresas · AWQ Holding",
    initials: "BTG",
    color: {
      border:    "border-slate-300",
      bg:        "bg-slate-50/40",
      badgeBg:   "bg-slate-800",
      badgeText: "text-white",
      dot:       "bg-slate-500",
    },
    matchesBank: (b) => b.toLowerCase().includes("btg"),
  },
  {
    key:      "santander",
    name:     "Conta Santander AWQ",
    subtitle: "Santander · AWQ Holding",
    initials: "SAN",
    color: {
      border:    "border-red-200",
      bg:        "bg-red-50/30",
      badgeBg:   "bg-red-600",
      badgeText: "text-white",
      dot:       "bg-red-500",
    },
    matchesBank: (b) => b.toLowerCase().includes("santander"),
  },
];

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function OfflineBanksPanel({ transactions }: { transactions: BankTransaction[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <Landmark size={15} className="text-gray-600" />
          <span className="text-sm font-bold text-gray-900">Outros bancos · AWQ Holding</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-semibold uppercase tracking-wide">
            Manual
          </span>
          <span className="text-xs text-gray-400">{BANKS.length} contas</span>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <WifiOff size={11} />
          Sem integração API · importe extrato
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BANKS.map((b) => {
          const c = b.color;
          const txns = transactions.filter((t) => b.matchesBank(t.bank ?? ""));
          const txCount = txns.length;
          const pending = txns.filter(
            (t) => t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao"
          ).length;
          const lastIso = txns
            .map((t) => t.extractedAt)
            .filter(Boolean)
            .sort()
            .reverse()[0];

          return (
            <div
              key={b.key}
              className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${c.badgeBg} flex items-center justify-center shrink-0`}>
                    <span className={`text-xs font-bold tracking-wider ${c.badgeText}`}>{b.initials}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{b.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.subtitle}</div>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5`} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {pending > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold">
                      {pending} pendente{pending > 1 ? "s" : ""}
                    </span>
                  ) : txCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      Em dia
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs">
                      Sem transações
                    </span>
                  )}
                  {txCount > 0 && (
                    <span className="text-xs text-gray-400">{txCount} tx</span>
                  )}
                </div>

                <button
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors`}
                  title={`Importar extrato ${b.name}`}
                >
                  <FileUp size={11} />
                  Importar extrato
                </button>
              </div>

              {lastIso ? (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={9} />
                  Última importação: {fmtDatetime(lastIso)}
                </div>
              ) : (
                <div className="text-xs text-gray-400">Nenhum extrato importado ainda.</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-400">
        <span>
          Sem integração ao vivo — extratos entram via upload (PDF/CSV).
        </span>
        <span>Itaú · BTG · Santander</span>
      </div>
    </div>
  );
}
