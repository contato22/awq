"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import ChannelTable from "@/components/ChannelTable";
import { revenueData } from "@/lib/data";
import { JACQES_MRR, buData } from "@/lib/awq-group-data";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3 } from "lucide-react";

const _jacqes = buData.find((b) => b.id === "jacqes")!;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[140px]">
      <div className="text-[11px] font-semibold text-gray-900 mb-1.5">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.fill }} />
            <span className="text-gray-500 capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900 tabular-nums">
            {formatCurrency(entry.value, "BRL", true)}
          </span>
        </div>
      ))}
    </div>
  );
}

// summaryStats — derivados de awq-group-data.ts (auto-atualiza)
function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  return "R$" + n.toLocaleString("pt-BR");
}

const summaryStats = [
  { label: "MRR Atual (Abr/26)",    value: fmtR(JACQES_MRR),         sub: "Notion CRM · 4 clientes FEE",          positive: true,  icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Receita YTD (Jan–Abr)", value: fmtR(_jacqes.revenue),    sub: "6490×3 (Jan/Fev/Mar) + 8280 (Abr)",    positive: true,  icon: BarChart3,  color: "text-brand-600",   bg: "bg-brand-50"   },
  { label: "Lucro Bruto / EBITDA",  value: "R$0",                     sub: "Aguardando confirmação contábil",       positive: false, icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
  { label: "Contas Ativas",         value: String(_jacqes.customers), sub: "Notion CRM · CEM, Carol, André, Tati", positive: true,  icon: DollarSign, color: "text-cyan-700",    bg: "bg-cyan-50"    },
];

export default function RevenuePage() {
  return (
    <>
      <Header
        title="Revenue"
        subtitle="JACQES · Detailed financial performance and acquisition breakdown"
      />

      <div className="page-container">
        {/* Summary stats */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card card-hover p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <Icon size={17} className={stat.color} />
                    </div>
                    <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${stat.positive ? "text-emerald-600" : "text-red-600"}`}>
                      {stat.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {stat.sub}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bar chart */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title="Monthly Revenue vs Profit"
            badge={<span className="text-[11px] text-gray-400 font-medium ml-1">Q1 2026 — Jan/Fev/Mar · monthlyRevenue empírico</span>}
          />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={revenueData}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              barGap={4}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Bar dataKey="revenue" name="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="profit" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-gray-100">
            {[
              { label: "Revenue", color: "#6366f1" },
              { label: "Profit", color: "#10b981" },
              { label: "Expenses", color: "#f59e0b" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        {/* Margin progression */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title="Gross Margin Progression"
            badge={<span className="text-[11px] text-gray-400 font-medium ml-1">Q1/26 · margem = profit/revenue (expenses = COGS 40%)</span>}
          />
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {revenueData.map((d) => {
              const margin = ((d.profit / d.revenue) * 100).toFixed(1);
              const pct = parseFloat(margin);
              return (
                <div key={d.month} className="flex flex-col items-center gap-1.5">
                  <div className="text-[11px] font-bold text-gray-900 tabular-nums">{margin}%</div>
                  <div className="w-full h-16 bg-gray-100 rounded-md overflow-hidden flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-md transition-all duration-500"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">{d.month}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Channel table */}
        <section>
          <ChannelTable />
        </section>
      </div>
    </>
  );
}
