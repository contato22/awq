import Header from "@/components/Header";
import { Construction, Info } from "lucide-react";

// ─── /advisor/customers — Advisor · BU Em Construção ─────────────────────────
//
// SOURCE: lib/awq-group-data.ts buData["advisor"]
//   customers: 0   — sem clientes ativos confirmados
//   revenue:   0   — pré-receita
//
// IMPORTANT: a carteira de 8 clientes anterior (R$6.2M–R$32.4M AUM cada,
// R$142.8M total) era FICTÍCIA — sem respaldo em contratos ou extratos.
// Removida para não distorcer o relatório de clientes do grupo.

export default function AdvisorCustomersPage() {
  return (
    <>
      <Header
        title="Customers — Advisor"
        subtitle="Consultoria · AWQ Group"
      />
      <div className="page-container">

        {/* ── Status card ───────────────────────────────────────────────────── */}
        <div className="card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Construction size={22} className="text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Carteira vazia · Pré-receita</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                PRÉ-RECEITA
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              A BU Advisor não possui clientes ativos confirmados. A carteira será
              exibida aqui após o primeiro contrato assinado e cadastrado no sistema.
            </p>
          </div>
        </div>

        {/* ── Counters ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Clientes Ativos",   value: "0",    sub: "Sem contratos ativos"     },
            { label: "AUM Total",         value: "R$ 0", sub: "Sem capital sob gestão"   },
            { label: "Retorno Médio",     value: "—",    sub: "Sem histórico"             },
            { label: "NPS Médio",         value: "—",    sub: "Sem avaliações"            },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-300">{m.value}</div>
              <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-1">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Info notice ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 flex items-start gap-3">
          <Info size={15} className="text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-violet-800">
              Carteira aguardando primeiro cliente
            </p>
            <p className="text-[11px] text-violet-700 mt-1 leading-relaxed">
              Quando o primeiro cliente Advisor for contratado, seus dados (perfil,
              AUM, retorno, NPS) aparecerão aqui derivados do pipeline de dados real.
              Clientes fictícios foram removidos para manter integridade dos relatórios.
            </p>
            <p className="text-[11px] text-violet-600 mt-2">
              Fonte autoritativa:{" "}
              <code className="bg-violet-100 px-1 rounded text-[10px]">lib/awq-group-data.ts</code>
              {" "}→ buData[&quot;advisor&quot;].customers = 0
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
