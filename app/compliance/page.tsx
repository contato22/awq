// ─── /awq/compliance — Compliance ─────────────────────────────────────────────
//
// CAMADA: corporate-legal (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Compliance Corporativo — LGPD, confidencialidade, políticas internas,
//         aceites, controles de acesso, obrigações regulatórias
//
// DISTINÇÃO OBRIGATÓRIA:
//   Este módulo = Compliance (obrigações regulatórias, políticas internas, aceites)
//   /awq/juridico = Jurídico Operacional (contratos, aditivos, vencimentos)
//   /awq/societario = Societário (quadro de sócios, participações, cap table)
//
// FONTE FUTURA:
//   • Políticas internas formalizadas (LGPD, confidencialidade, não circunvenção)
//   • Registro de aceites por colaborador/parceiro/fornecedor
//   • Controles de acesso e permissões por perfil
//   • Obrigações regulatórias aplicáveis às BUs do grupo
//   • Evidências de conformidade e auditorias internas
//
// BLOQUEADOR:
//   Políticas internas ainda não formalizadas no sistema.
//   Ativar quando houver aprovação e catalogação formal do framework de compliance.

import Header from "@/components/Header";
import { ShieldCheck, Lock, FileCheck, AlertTriangle, Users, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "LGPD & Privacidade",
    desc: "Base legal de tratamento, mapeamento de dados pessoais, DPA, política de privacidade.",
    icon: Lock,
    status: "Aguardando formalização",
  },
  {
    title: "Confidencialidade & NDA",
    desc: "NDAs, cláusulas de não circunvenção, sigilo por parceiro, contraparte e colaborador.",
    icon: ShieldCheck,
    status: "Aguardando formalização",
  },
  {
    title: "Aceites & Evidências",
    desc: "Registro de aceites de políticas internas por pessoa, data e versão do documento.",
    icon: FileCheck,
    status: "Aguardando formalização",
  },
  {
    title: "Controles de Acesso",
    desc: "Matriz de permissões por perfil, revisão periódica, acesso a dados sensíveis.",
    icon: Users,
    status: "Aguardando formalização",
  },
  {
    title: "Obrigações Regulatórias",
    desc: "Obrigações legais por BU, setor e atividade — monitoramento e status de conformidade.",
    icon: AlertTriangle,
    status: "Aguardando formalização",
  },
];

export default function CompliancePage() {
  return (
    <>
      <Header title="Compliance" subtitle="Governança & Jurídico · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-violet-400">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Compliance centraliza as políticas de LGPD, confidencialidade, aceites
              de documentos internos, controles de acesso e obrigações regulatórias do grupo.
              Distinto do Jurídico Operacional (contratos) e do Societário (estrutura de sócios).
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-violet-700 font-medium">
                <ArrowRight size={13} />
                <span>Pré-requisito: formalização do framework de compliance interno do grupo</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ArrowRight size={13} />
                <span>Contratos operacionais disponíveis em{" "}
                  <a href="/juridico" className="underline">Jurídico</a>
                  {" "}· Estrutura societária em{" "}
                  <a href="/societario" className="underline">Societário</a>
                </span>
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
