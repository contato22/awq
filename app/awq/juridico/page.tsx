// ─── /awq/juridico — Governança & Jurídico ───────────────────────────────────
//
// CAMADA: corporate-legal (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Jurídico Operacional — contratos, aditivos, vencimentos, obrigações
//
// FONTE FUTURA:
//   • Base canônica de contratos (a implementar)
//   • Contratos com clientes, fornecedores, parceiros
//   • Status de assinatura, vencimentos, obrigações contratuais
//   • Checklist documental, procurações, modelos
//
// BLOQUEADOR:
//   Nenhuma base de contratos ingerida ou estruturada ainda.
//   Implementar quando houver pipeline de contratos (PDF/DocuSign/Notion).

import Header from "@/components/Header";
import { Scale, FileText, Clock, AlertTriangle, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "Contratos com Clientes",
    desc: "Contratos ativos, rascunhos, aditivos e histórico por cliente.",
    icon: FileText,
    status: "Aguardando pipeline",
  },
  {
    title: "Contratos com Fornecedores",
    desc: "Contratos de prestação de serviços, SLAs e obrigações.",
    icon: FileText,
    status: "Aguardando pipeline",
  },
  {
    title: "Vencimentos & Alertas",
    desc: "Calendário de vencimentos contratuais e alertas automáticos.",
    icon: Clock,
    status: "Aguardando pipeline",
  },
  {
    title: "Risco Jurídico",
    desc: "Riscos contratuais, litígios, passivos potenciais por contrato e deal.",
    icon: AlertTriangle,
    status: "Aguardando pipeline",
  },
];

export default function JuridicoPage() {
  return (
    <>
      <Header title="Jurídico" subtitle="Governança & Jurídico · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-amber-400">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Scale size={22} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Jurídico centraliza contratos, aditivos, vencimentos e obrigações
              contratuais de todas as BUs do grupo. Será ativado quando a base canônica de
              contratos for estruturada e ingerida no sistema.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <ArrowRight size={13} />
              <span>Pré-requisito: pipeline de contratos (PDF/DocuSign/Notion → AWQ)</span>
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
