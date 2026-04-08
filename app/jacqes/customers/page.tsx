import Header from "@/components/Header";
import { Users, DollarSign, Info, AlertTriangle } from "lucide-react";

// ─── /jacqes/customers — Carteira JACQES ──────────────────────────────────────
//
// ZEROED — aguardando pipeline de dados real (CRM / extrato JACQES).
// Nenhum valor pode ser exibido sem fonte verificável.
//
// REMOVIDO: lista individual de clientes (Ambev, Samsung, Nike, iFood, etc.)
// era uma criação fictícia sem respaldo em CRM, contrato ou extrato bancário.
// Nenhum nome de cliente, MRR individual, LTV ou NPS pode ser exibido sem
// fonte real (Notion CRM, ERP, ou extrato conciliado).

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

export default function JacqesCustomersPage() {
  return (
    <>
      <Header
        title="Customers — JACQES"
        subtitle="Carteira de clientes · Dados agregados Q1/26"
      />
      <div className="page-container">

        {/* ── Aggregate cards (buData only) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:  "Contas Ativas",
              value:  "0",
              sub:    "Aguardando dados",
              icon:   Users,
              color:  "text-brand-600",
              bg:     "bg-brand-50",
            },
            {
              label:  "MRR Total (Mar/26)",
              value:  "R$0",
              sub:    "Aguardando dados",
              icon:   DollarSign,
              color:  "text-emerald-600",
              bg:     "bg-emerald-50",
            },
            {
              label:  "MRR Médio por Conta",
              value:  "R$0",
              sub:    "Aguardando dados",
              icon:   DollarSign,
              color:  "text-violet-700",
              bg:     "bg-violet-50",
            },
            {
              label:  "Receita YTD Q1/26",
              value:  "R$0",
              sub:    "Aguardando dados",
              icon:   DollarSign,
              color:  "text-amber-700",
              bg:     "bg-amber-50",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pending notice ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Carteira detalhada pendente de ingestão
            </p>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              Para ver a carteira individual (nome, MRR por cliente, LTV, NPS, risco de churn)
              é necessário importar dados reais via CRM integrado ou extrato conciliado.
              Ingira o extrato bancário JACQES em{" "}
              <a href="/awq/ingest" className="underline font-medium text-amber-800">
                /awq/ingest
              </a>{" "}
              e conecte o banco de clientes ao Notion para habilitar esta visão.
            </p>
          </div>
        </div>

        {/* ── Info: what was removed ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
          <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Dados removidos:</strong> a lista anterior de 10 clientes com nomes
            (Ambev, Samsung, Nike, etc.), valores de MRR individuais, LTV, NPS e histórico
            de churn era uma <strong>criação fictícia</strong> sem origem em CRM, contrato
            ou extrato bancário. Exibi-la criava risco de decisões baseadas em dados falsos.
            Apenas o total de 10 contas ativas (buData) e o MRR agregado (monthlyRevenue)
            são exibidos enquanto a ingestão real não for realizada.
          </p>
        </div>

      </div>
    </>
  );
}
