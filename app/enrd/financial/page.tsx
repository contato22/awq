import Header from "@/components/Header";
import { Construction, Info } from "lucide-react";

export default function EnrdFinancialPage() {
  return (
    <>
      <Header title="Financial — ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <Construction size={22} className="text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">BU em estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                OPERACIONAL
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Os dados financeiros da ENRD serão exibidos após ingestão dos primeiros
              extratos bancários e contratos via{" "}
              <a href="/awq/conciliacao" className="underline font-medium text-orange-700">
                /awq/conciliacao
              </a>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Receita YTD",     value: "R$ 0", sub: "Aguardando dados" },
            { label: "Clientes Ativos", value: "0",    sub: "Aguardando CRM"   },
            { label: "EBITDA %",        value: "—",    sub: "Aguardando dados" },
            { label: "FTEs",            value: "0",    sub: "Em estruturação"  },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-300">{m.value}</div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-4 flex items-start gap-3">
          <Info size={15} className="text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700 leading-relaxed">
            Fonte autoritativa:{" "}
            <code className="bg-orange-100 px-1 rounded text-[10px]">lib/awq-group-data.ts</code>
            {" "}→ buData[&quot;enrd&quot;]. Os valores serão propagados automaticamente para o
            P&L consolidado do AWQ Group assim que alimentados.
          </p>
        </div>

      </div>
    </>
  );
}
