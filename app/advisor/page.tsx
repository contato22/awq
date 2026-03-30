import Header from "@/components/Header";
import { Briefcase, Users, DollarSign, TrendingUp, Activity } from "lucide-react";

const kpis = [
  { label: "Clientes Ativos", value: "—", icon: Users },
  { label: "AUM", value: "—", icon: DollarSign },
  { label: "Retorno Médio", value: "—", icon: TrendingUp },
  { label: "NPS", value: "—", icon: Activity },
];

export default function AdvisorPage() {
  return (
    <>
      <Header title="Advisor" subtitle="Consultoria · AWQ Group" />
      <div className="px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-violet-400" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overview */}
        <div className="card p-6 flex flex-col items-center justify-center min-h-[280px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Briefcase size={26} className="text-violet-400" />
          </div>
          <div className="text-base font-semibold text-gray-300">Advisor</div>
          <div className="text-sm text-gray-600 mt-1">
            Consultoria estratégica · AWQ Group
          </div>
          <div className="text-xs text-gray-700 mt-4 max-w-xs">
            Dashboard em configuração. Os dados serão exibidos assim que os módulos forem ativados.
          </div>
        </div>
      </div>
    </>
  );
}
