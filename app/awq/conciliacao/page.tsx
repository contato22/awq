// ─── /awq/conciliacao — Conciliação Bancária ─────────────────────────────────
//
// CAMADA: corporate-treasury (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Conciliação bancária, conferência de extratos e lançamentos
//
// DISTINÇÃO:
//   Este módulo = Conciliação (cruzamento extrato bancário × lançamentos internos)
//   /awq/bank       = posição de caixa local (saldos manuais)
//   /awq/cashflow   = fluxo de caixa operacional (pipeline canônico)
//
// FONTE FUTURA:
//   • Importação de extratos OFX/CSV por banco
//   • Matching automático extrato × lançamento
//   • Fila de divergências e pendências de conciliação
//   • Relatório de saldo conciliado por conta e período
//
// BLOQUEADOR:
//   Pipeline de ingestão de extratos bancários estruturado ainda não implementado.

import Header from "@/components/Header";
import { CheckCircle2, FileText, GitMerge, AlertCircle, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "Importação de Extratos",
    desc: "Upload de extratos bancários nos formatos OFX, CSV e PDF por instituição.",
    icon: FileText,
    status: "Aguardando pipeline de ingestão",
  },
  {
    title: "Matching Automático",
    desc: "Cruzamento automático de lançamentos internos com movimentos do extrato bancário.",
    icon: GitMerge,
    status: "Aguardando pipeline de ingestão",
  },
  {
    title: "Fila de Divergências",
    desc: "Gestão de pendências: lançamentos sem extrato correspondente e vice-versa.",
    icon: AlertCircle,
    status: "Aguardando pipeline de ingestão",
  },
  {
    title: "Relatório de Conciliação",
    desc: "Saldo conciliado por conta bancária e período, com rastreabilidade completa.",
    icon: CheckCircle2,
    status: "Aguardando pipeline de ingestão",
  },
];

export default function ConciliacaoPage() {
  return (
    <>
      <Header title="Conciliação" subtitle="Tesouraria · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-emerald-400">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Conciliação centraliza o cruzamento entre extratos bancários e os
              lançamentos registrados internamente — garantindo que o caixa registrado
              corresponda exatamente ao extrato de cada instituição financeira.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <ArrowRight size={13} />
                <span>Posição de caixa manual disponível em{" "}
                  <a href="/awq/bank" className="underline font-semibold">Contas Banco</a>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ArrowRight size={13} />
                <span>Bloqueador: pipeline de ingestão de extratos bancários (OFX/CSV)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Module inventory */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Submódulos previstos
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((m) => (
              <div key={m.title} className="card p-5 flex items-start gap-4 opacity-60">
                <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <m.icon size={16} className="text-gray-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">{m.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                  <div className="text-[10px] text-gray-300 mt-1.5 font-medium">{m.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
