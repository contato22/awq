import Link from "next/link";
import Header from "@/components/Header";
import { Zap, Users, DollarSign, TrendingUp, ChevronRight } from "lucide-react";

export default function EnrdPage() {
  const kpis = [
    { label: "Receita YTD",   value: "—", icon: DollarSign },
    { label: "Clientes",      value: "—", icon: Users      },
    { label: "EBITDA %",      value: "—", icon: TrendingUp },
  ];

  return (
    <>
      <Header title="ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-orange-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-orange-600" />
            <h2 className="text-sm font-semibold text-gray-900">Módulos</h2>
          </div>
          <div className="space-y-2">
            <Link href="/enrd/financial" className="flex items-center justify-between py-2.5 border-b border-gray-100 hover:bg-gray-50 px-2 rounded-lg transition-colors">
              <div>
                <div className="text-xs font-semibold text-gray-900">EPM · Financial</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Financeiro & Performance</div>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>
            <Link href="/enrd/customers" className="flex items-center justify-between py-2.5 border-b border-gray-100 hover:bg-gray-50 px-2 rounded-lg transition-colors">
              <div>
                <div className="text-xs font-semibold text-gray-900">CRM · Clientes</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Clientes & Relacionamento</div>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
