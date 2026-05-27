"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  UserCircle2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  DollarSign,
  AlertCircle,
} from "lucide-react";
function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return sign + "R$" + (abs / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000)     return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)         return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  return (
    <div className="lg:hidden flex flex-col bg-gray-50 min-h-screen -mt-px">
      {/* ── Header azul ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pt-5 pb-10 text-white relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {/* future: entity selector */}}
            className="flex items-center gap-1.5 -ml-1 px-1.5 py-1 rounded-lg active:bg-white/10"
          >
            <span className="text-base font-semibold">{companyName}</span>
            <ChevronDown size={16} className="opacity-80" />
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
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <div className="-mt-6 px-4 space-y-4 pb-32">
        {/* Saldo da Conta PJ + Solicitações pendentes */}
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
            <span className="text-sm font-semibold text-brand-600 shrink-0">
              Acessar
            </span>
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
            <span className="text-sm font-semibold text-brand-600">Ver</span>
          </Link>
        </div>

        {/* Sua empresa hoje */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 pt-4 pb-3">
          <h2 className="text-base font-bold text-gray-900 mb-3">Sua empresa hoje</h2>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <DollarSign size={16} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Saldo</div>
                <div className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                  {fmt(cashBalance)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <ArrowUp size={16} className="text-emerald-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">A receber hoje</div>
                <div className="text-base font-bold text-emerald-700 tabular-nums leading-tight">
                  {fmt(todayReceivable)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <ArrowDown size={16} className="text-red-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">A pagar hoje</div>
                <div className="text-base font-bold text-red-700 tabular-nums leading-tight">
                  {fmt(todayPayable)}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/awq/cashflow"
            className="block text-center text-sm font-semibold text-brand-600 mt-3 py-2 -mb-1 active:bg-brand-50 rounded-lg"
          >
            Ver fluxo de caixa
          </Link>
        </div>

        {/* Em atraso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Em atraso</h2>
            {overdueItems.length > 0 && (
              <Link href="/awq/ap-ar?filter=overdue" className="text-xs font-semibold text-brand-600">
                Ver todos
              </Link>
            )}
          </div>

          {overdueItems.length === 0 ? (
            <div className="flex items-center gap-3 py-2 text-sm text-gray-400">
              <AlertCircle size={16} className="text-gray-300" />
              {hasData ? "Nenhum item em atraso" : "Aguardando dados"}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 -mx-1">
              {overdueItems.slice(0, 5).map((item) => {
                const isReceivable = item.type === "AR";
                return (
                  <li key={item.id} className="flex items-center gap-3 px-1 py-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.party}
                      </div>
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
          )}
        </div>

        {/* Atalhos para módulos profundos */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/awq/risk"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 active:bg-gray-50"
          >
            <div className="text-xs text-gray-500">Riscos</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">Control Tower</div>
          </Link>
          <Link
            href="/awq/kpis"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 active:bg-gray-50"
          >
            <div className="text-xs text-gray-500">KPIs</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5">Indicadores</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
