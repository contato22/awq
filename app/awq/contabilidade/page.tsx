// ─── /awq/contabilidade — Contabilidade Formal ───────────────────────────────
//
// CAMADA: corporate-control (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Plano de Contas, Balancete, DRE Contábil, Fechamento Mensal
//
// DISTINÇÃO OBRIGATÓRIA:
//   Este módulo = Contabilidade Formal (caixa contábil, competência, escrituração)
//   /awq/financial = DRE Gerencial (caixa-base, gestão, real-time)
//   /awq/management (Controladoria) = diagnósticos de qualidade e regras internas
//
// FONTE FUTURA:
//   • Plano de contas por entidade
//   • Balancete mensal
//   • DRE contábil (regime de competência)
//   • Balanço Patrimonial
//   • Fechamento e lançamentos contábeis
//   • Conciliação contábil, provisões, rateios
//
// BLOQUEADOR:
//   Pipeline contábil (lançamentos, regime de competência) ainda não implementado.
//   Requer integração com sistema de escrituração (contador) ou pipeline próprio.

import Header from "@/components/Header";
import { BookOpen, FileText, BarChart3, Calendar, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "Plano de Contas",
    desc: "Estrutura de contas contábeis por entidade e centro de custo.",
    icon: BookOpen,
    status: "Aguardando pipeline contábil",
  },
  {
    title: "Balancete",
    desc: "Balancete mensal por entidade com saldos de abertura e fechamento.",
    icon: BarChart3,
    status: "Aguardando pipeline contábil",
  },
  {
    title: "DRE Contábil",
    desc: "Demonstrativo de Resultado pelo regime de competência (≠ DRE gerencial).",
    icon: FileText,
    status: "Aguardando pipeline contábil",
  },
  {
    title: "Fechamento Mensal",
    desc: "Agenda de fechamento, lançamentos, provisões e pendências contábeis.",
    icon: Calendar,
    status: "Aguardando pipeline contábil",
  },
];

export default function ContabilidadePage() {
  return (
    <>
      <Header title="Contabilidade" subtitle="Financeiro Corporativo · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-blue-400">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <BookOpen size={22} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Contabilidade centraliza a escrituração formal do grupo — plano de
              contas, balancete, DRE contábil (competência) e fechamento mensal. É a
              camada de verdade contábil formal, distinta do DRE gerencial caixa-base
              disponível em Financial.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                <ArrowRight size={13} />
                <span>DRE gerencial (caixa-base) disponível em{" "}
                  <a href="/awq/financial" className="underline font-semibold">Financial</a>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ArrowRight size={13} />
                <span>Bloqueador: pipeline contábil (lançamentos por competência)</span>
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
