"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  UserCircle2,
  ArrowUp,
  ArrowDown,
  DollarSign,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

/**
 * Brazilian Real formatter.
 *  < R$ 100k  → "R$ 8.485,00"  (full, with cents)
 *  < R$ 1mi   → "R$ 85,5 mil"
 *  < R$ 1bi   → "R$ 1,2 mi"
 *  >= R$ 1bi  → "R$ 1,5 bi"
 */
function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000)
    return sign + "R$ " + (abs / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " bi";
  if (abs >= 1_000_000)
    return sign + "R$ " + (abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
  if (abs >= 100_000)
    return sign + "R$ " + (abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return sign + "R$ " + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface OverdueItem {
  id: string;
  party: string;
  amount: number;
  due_date: string;
  type: "AR" | "AP";
  days_overdue: number;
}

interface Props {
  companyName: string;
  cashBalance: number;
  pendingRequestsCount: number;
  todayReceivable: number;
  todayPayable: number;
  overdueItems: OverdueItem[];
  hasData: boolean;
}

function dispatchDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("awq:open-mobile-drawer"));
  }
}

/**
 * Mobile home that mirrors the Conta Azul Pro reference exactly:
 * a short teal header strip (company name + eye + user), then stacked white
 * cards on a gray page — Saldo + solicitações in one card, "Sua empresa hoje"
 * in another, "Em atraso" last.
 *
 * Teal hex picked to match Conta Azul's brand strip in the reference image.
 */
const TEAL = "#2DBFEB";
const TEAL_LINK = "text-[#0EA5C9]";

export default function MobileHomeAwq({
  companyName,
  cashBalance,
  pendingRequestsCount,
  todayReceivable,
  todayPayable,
  overdueItems,
  hasData,
}: Props) {
  const [hidden, setHidden] = useState(false);
  const fmt = (v: number) => (hidden ? "R$ ••••••" : fmtBRL(v));
  const hasOverdue = overdueItems.length > 0;

  return (
    <div className="lg:hidden flex flex-col bg-gray-50 min-h-screen -mt-px">
      {/* ── Teal header strip (Conta Azul style) ─────────────────── */}
      <div
        className="px-4 py-4 text-white flex items-center justify-between"
        style={{ backgroundColor: TEAL }}
      >
        <button
          onClick={dispatchDrawer}
          className="text-sm font-semibold -ml-1 px-1 py-1 rounded-lg active:bg-white/10"
        >
          {companyName}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHidden((h) => !h)}
            className="p-2 rounded-lg active:bg-white/10"
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
          >
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={dispatchDrawer}
            className="p-2 rounded-lg active:bg-white/10"
            aria-label="Menu"
          >
            <UserCircle2 size={20} />
          </button>
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-4 pb-32">
        {/* Saldo da Conta PJ + Solicitações pendentes (single card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Link
            href="/awq/bank"
            className="flex items-center justify-between px-4 py-4 active:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Saldo da Conta PJ</div>
              <div className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">
                {fmt(cashBalance)}
              </div>
            </div>
            <span className={`text-sm font-semibold shrink-0 ${TEAL_LINK}`}>Acessar</span>
          </Link>

          <div className="h-px bg-gray-100 mx-4" />

          <Link
            href="/awq/ap-ar"
            className="flex items-center justify-between px-4 py-3.5 active:bg-gray-50"
          >
            <span className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{pendingRequestsCount}</span>{" "}
              {pendingRequestsCount === 1 ? "solicitação pendente" : "solicitações pendentes"}
            </span>
            <span className={`text-sm font-semibold ${TEAL_LINK}`}>Ver</span>
          </Link>
        </div>

        {/* Sua empresa hoje */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 pt-4 pb-3">
          <h2 className="text-base font-bold text-gray-900 mb-3">Sua empresa hoje</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                <DollarSign size={16} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Saldo</div>
                <div className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                  {fmt(cashBalance)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <ArrowUp size={16} className="text-emerald-500" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">A receber hoje</div>
                <div className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                  {fmt(todayReceivable)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <ArrowDown size={16} className="text-red-500" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">A pagar hoje</div>
                <div className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                  {fmt(todayPayable)}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/awq/cashflow"
            className={`block text-center text-sm font-semibold mt-3 py-2 -mb-1 rounded-lg active:bg-gray-50 ${TEAL_LINK}`}
          >
            Ver fluxo de caixa
          </Link>
        </div>

        {/* Em atraso — only shown when there are real (non-zero) overdue items */}
        {hasOverdue ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Em atraso</h2>
              <Link href="/awq/ap-ar?filter=overdue" className={`text-xs font-semibold ${TEAL_LINK}`}>
                Ver todos
              </Link>
            </div>
            <ul className="divide-y divide-gray-100 -mx-1">
              {overdueItems.slice(0, 5).map((item) => {
                const isReceivable = item.type === "AR";
                return (
                  <li key={item.id} className="flex items-center gap-3 px-1 py-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isReceivable ? "bg-emerald-50" : "bg-red-50"
                      }`}
                    >
                      {isReceivable ? (
                        <ArrowUp size={14} className="text-emerald-600" strokeWidth={2.5} />
                      ) : (
                        <ArrowDown size={14} className="text-red-600" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.party}</div>
                      <div className="text-xs text-gray-500">
                        Venceu há {item.days_overdue} {item.days_overdue === 1 ? "dia" : "dias"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold tabular-nums ${
                          isReceivable ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {fmt(item.amount)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
            <h2 className="text-base font-bold text-gray-900 mb-2">Em atraso</h2>
            <div className="flex items-center gap-3 py-1 text-sm text-gray-400">
              <AlertCircle size={16} className="text-gray-300" />
              {hasData ? "Nenhum item em atraso" : "Aguardando dados"}
            </div>
          </div>
        )}

        {!hasData && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Aguardando dados do banco — sincronize com a Cora para ver saldos atualizados.
          </div>
        )}
      </div>
    </div>
  );
}
