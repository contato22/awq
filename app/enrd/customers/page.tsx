import Header from "@/components/Header";
import Link from "next/link";
import { Users, UserPlus, ArrowUpRight } from "lucide-react";

export default function EnrdCustomersPage() {
  return (
    <>
      <Header title="Clientes — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Clientes Ativos", value: "0", icon: Users      },
            { label: "Leads Abertos",   value: "0", icon: UserPlus   },
            { label: "Oportunidades",   value: "0", icon: ArrowUpRight },
          ].map((kpi) => (
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

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users size={14} className="text-orange-600" />
              Clientes ENRD
            </h2>
            <Link
              href="/crm/leads?bu=ENRD"
              className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 font-medium"
            >
              Ver no CRM <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="py-8 text-center text-sm text-gray-400">
            Nenhum cliente cadastrado.{" "}
            <Link href="/crm/leads/add" className="text-orange-600 underline font-medium">
              Adicionar lead
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
