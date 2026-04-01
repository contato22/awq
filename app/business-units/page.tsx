import React from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, Building2, TrendingUp, ChevronRight, Users, DollarSign, Briefcase } from "lucide-react";

const BUS: {
  id: string; label: string; sub: string; href: string;
  color: string; borderColor: string; bgColor: string; textColor: string; badgeColor: string;
  icon: React.ElementType;
  kpis: { label: string; value: string }[];
  status: string; statusColor: string;
}[] = [];

export default function BusinessUnitsPage() {
  return (
    <>
      <Header title="Business Units" subtitle="Portfolio de empresas do AWQ Group" />
      <div className="px-8 py-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2, label: "Total de BUs", value: String(BUS.length) },
            { icon: Users, label: "BUs Ativas", value: String(BUS.filter((b) => b.status === "Ativa").length) },
            { icon: DollarSign, label: "Receita Consolidada", value: "—" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center">
                <s.icon size={16} className="text-gray-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BU Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUS.length === 0 && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
            </div>
          )}
          {BUS.map((bu) => {
            const Icon = bu.icon;
            const isActive = bu.status === "Ativa";
            return (
              <Link
                key={bu.id}
                href={bu.href}
                className={`card p-6 flex flex-col gap-5 border-2 transition-all hover:scale-[1.01] hover:shadow-lg ${
                  isActive ? "cursor-pointer" : "cursor-default opacity-75"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${bu.color} flex items-center justify-center shadow-md`}>
                    <Icon size={20} className="text-gray-900" />
                  </div>
                  <span className={`badge ${bu.statusColor}`}>{bu.status}</span>
                </div>

                {/* Name */}
                <div>
                  <div className="text-lg font-bold text-gray-900">{bu.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{bu.sub} · AWQ Group</div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
                  {bu.kpis.map((kpi) => (
                    <div key={kpi.label} className="text-center">
                      <div className="text-sm font-bold text-gray-900">{kpi.value}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">
                    {isActive ? "Clique para acessar" : "Em desenvolvimento"}
                  </span>
                  {isActive && <ChevronRight size={14} className="text-brand-600" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
