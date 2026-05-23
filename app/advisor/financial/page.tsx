import Header from "@/components/Header";
import { Construction, Info } from "lucide-react";

// ─── /advisor/financial — Advisor · BU Em Construção ─────────────────────────
//
// SOURCE: lib/awq-group-data.ts buData["advisor"]
//   economicType: "pre_revenue"
//   status:       "Em construção"
//   revenue:      0   — sem receita confirmada
//   customers:    0   — sem clientes ativos
//   capitalAllocated: 0
//
// IMPORTANT: todos os dados financeiros anteriores (AUM R$142.8M, DRE R$1.57M,
// feeIncome, aumByStrategy) eram FICCIONAIS — não tinham respaldo em extrato
// bancário ou contrato assinado. Removidos para não contaminar o P&L da holding.

export default function AdvisorFinancialPage() {
  return (
    <>
      <Header
        title="Financial — Advisor"
        subtitle="Consultoria · AWQ Group"
      />
      <div className="page-container">

        {/* ── Status card ───────────────────────────────────────────────────── */}
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
            <Construction size={22} className="text-brand-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">BU em construção · Pré-receita</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200">
                PRÉ-RECEITA
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              A BU Advisor não possui receita operacional confirmada, clientes ativos
              ou capital alocado registrado. Dados financeiros serão exibidos aqui
              após o primeiro contrato assinado e extrato bancário ingerido via{" "}
              <a href="/awq/conciliacao" className="underline font-medium text-brand-700">
                /awq/conciliacao
              </a>.
            </p>
          </div>
        </div>

        {/* ── Status summary ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Receita YTD",        value: "R$ 0",   sub: "Pré-receita"         },
            { label: "Clientes Ativos",     value: "0",      sub: "Sem contratos"       },
            { label: "Capital Alocado",     value: "R$ 0",   sub: "Não capitalizada"    },
            { label: "FTEs",                value: "0",      sub: "Em estruturação"     },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-300">{m.value}</div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
              <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Info notice ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 flex items-start gap-3">
          <Info size={15} className="text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-brand-800">
              Por que este painel está vazio?
            </p>
            <p className="text-xs text-brand-700 mt-1 leading-relaxed">
              Dados financeiros da BU Advisor (AUM, receita de taxas, DRE) só serão
              exibidos quando derivados de extratos bancários ou contratos reais.
              Exibir valores não confirmados contamina o P&L consolidado da holding e
              compromete decisões operacionais.
            </p>
            <p className="text-xs text-brand-600 mt-2">
              Fonte autoritativa:{" "}
              <code className="bg-brand-100 px-1 rounded text-xs">lib/awq-group-data.ts</code>
              {" "}→ buData[&quot;advisor&quot;].economicType = &quot;pre_revenue&quot;
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
