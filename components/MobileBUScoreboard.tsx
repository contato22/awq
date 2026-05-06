"use client";

import Link from "next/link";
import {
  Building2,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { BuData, allocFlags, flagConfig } from "@/lib/awq-group-data";

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MobileBUScoreboardProps {
  buData: BuData[];
}

export default function MobileBUScoreboard({ buData }: MobileBUScoreboardProps) {
  return (
    <div className="space-y-3">
      {buData.map((bu) => {
        const flag    = allocFlags[bu.id];
        const flagCfg = flagConfig[flag];
        const isVenture   = bu.id === "venture";
        const grossMargin = bu.revenue > 0 ? (bu.grossProfit / bu.revenue) * 100 : 0;

        return (
          <Link
            key={bu.id}
            href={bu.hrefOverview}
            className="card p-4 block active:bg-gray-50 transition-colors"
          >
            {/* BU Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                  <Building2 size={14} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{bu.name}</div>
                  <div className="text-[10px] text-gray-400">{bu.sub.split(" · ")[0]}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                  {flagCfg.label}
                </span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>

            {/* KPI Grid — 2×2 compact */}
            <div className="grid grid-cols-2 gap-3">
              {!isVenture && (
                <>
                  <div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <DollarSign size={10} /> Receita
                    </div>
                    <div className="text-sm font-bold text-gray-900">{fmtR(bu.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <TrendingUp size={10} /> M. Bruta
                    </div>
                    <div className="text-sm font-bold text-gray-900">{grossMargin.toFixed(0)}%</div>
                  </div>
                </>
              )}
              <div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <ArrowUpRight size={10} /> Lucro Líq.
                </div>
                <div className="text-sm font-bold text-gray-900">{fmtR(bu.netIncome)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Users size={10} /> ROIC
                </div>
                <div className={`text-sm font-bold ${bu.roic >= 30 ? "text-emerald-600" : bu.roic >= 15 ? "text-amber-700" : "text-red-600"}`}>
                  {bu.roic.toFixed(0)}%
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
