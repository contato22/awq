// ─── /awq/societario — Societário & Cap Table ────────────────────────────────
//
// CAMADA: corporate-legal (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Estrutura societária, participações, SCPs, vesting, earn-in, atas
//
// FONTE FUTURA:
//   • Quadro societário das entidades do grupo
//   • Participações, SCPs, PhantomEquity, Vesting schedules
//   • Cap table lógico por deal (AWQ Venture)
//   • Atas, eventos societários, reorganizações
//   • Diluição, change of control, bad/good leaver
//
// BLOQUEADOR:
//   Estrutura societária não formalizada no sistema ainda.
//   Deals em andamento devem ir para /awq-venture/deals até este módulo ser ativado.

import Header from "@/components/Header";
import { Building, Users, FileText, TrendingUp, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "Quadro Societário",
    desc: "Sócios, participações percentuais e instrumentos por entidade.",
    icon: Users,
    status: "Aguardando formalização",
  },
  {
    title: "SCPs e Parcerias",
    desc: "Sociedades em Conta de Participação, co-investimentos, earn-in.",
    icon: Building,
    status: "Aguardando formalização",
  },
  {
    title: "Cap Table — Deals",
    desc: "Tabela de capitalização lógica por deal Venture (fee, upside, equity).",
    icon: TrendingUp,
    status: "Parcialmente em /awq-venture/deals",
  },
  {
    title: "Atas & Eventos Societários",
    desc: "Atas de reunião, reorganizações, diluições, eventos relevantes.",
    icon: FileText,
    status: "Aguardando formalização",
  },
];

export default function SocietarioPage() {
  return (
    <>
      <Header title="Societário" subtitle="Governança & Jurídico · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-amber-400">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Building size={22} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Societário centraliza o quadro de sócios, participações, SCPs,
              estruturas de vesting e earn-in de todos os deals e entidades do grupo.
              Complementa o módulo de Deals do AWQ Venture com visão jurídico-societária.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <ArrowRight size={13} />
                <span>Cap table operacional dos deals: disponível em{" "}
                  <a href="/awq-venture/deals" className="underline font-semibold">
                    AWQ Venture → Deals
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ArrowRight size={13} />
                <span>Este módulo ativado quando estrutura societária for formalizada</span>
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
