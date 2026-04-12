// ─── /awq/fiscal — Fiscal & Obrigações Tributárias ───────────────────────────
//
// CAMADA: corporate-control (ERP AWQ)
// OWNER:  AWQ Group (holding)
// SCOPE:  Notas fiscais, tributos, obrigações acessórias, apuração, calendário
//
// DISTINÇÃO OBRIGATÓRIA:
//   Este módulo = Fiscal (obrigações tributárias, NF, apuração, regime)
//   /awq/financial = DRE gerencial (sem foco tributário)
//   /awq/contabilidade = Contabilidade formal (escrituração, competência)
//
// FONTE FUTURA:
//   • Notas fiscais emitidas e recebidas por entidade
//   • Tributos, retenções, apuração fiscal
//   • Obrigações acessórias (SPED, DCTF, etc.)
//   • Calendário fiscal e alertas de vencimento
//   • Regime tributário por entidade (Simples, Lucro Presumido, Real)
//
// BLOQUEADOR:
//   Integração com sistema fiscal (emissor NF-e, contador, SEFAZ) não implementada.
//   Requer pipeline externo de NF ou importação de XML/CSV fiscal.

import Header from "@/components/Header";
import { Receipt, FileText, Calendar, AlertTriangle, ArrowRight } from "lucide-react";

const modules = [
  {
    title: "Notas Fiscais Emitidas",
    desc: "NFs emitidas por entidade, valor, destinatário e status de pagamento.",
    icon: FileText,
    status: "Aguardando integração fiscal",
  },
  {
    title: "Notas Fiscais Recebidas",
    desc: "NFs de fornecedores, retenções aplicadas e conciliação com despesas.",
    icon: FileText,
    status: "Aguardando integração fiscal",
  },
  {
    title: "Apuração & Tributos",
    desc: "ISS, PIS, COFINS, IRPJ, CSLL — apuração mensal por regime tributário.",
    icon: Receipt,
    status: "Aguardando integração fiscal",
  },
  {
    title: "Calendário Fiscal",
    desc: "Obrigações acessórias, prazos de entrega, alertas de vencimento.",
    icon: Calendar,
    status: "Aguardando integração fiscal",
  },
  {
    title: "Inconsistências Fiscais",
    desc: "Alertas de NFs sem classificação, divergências de CNPJ, retenções incorretas.",
    icon: AlertTriangle,
    status: "Aguardando integração fiscal",
  },
];

export default function FiscalPage() {
  return (
    <>
      <Header title="Fiscal" subtitle="Financeiro Corporativo · AWQ Group" />
      <div className="page-container">

        {/* Status banner */}
        <div className="card p-6 flex items-start gap-4 border-l-4 border-l-orange-400">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <Receipt size={22} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900">Módulo em Estruturação</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                PLANEJADO
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              O módulo Fiscal centraliza notas fiscais emitidas e recebidas, apuração de
              tributos, obrigações acessórias e calendário fiscal do grupo. Distinto da
              Contabilidade (competência) e do Financial (caixa gerencial).
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-orange-700 font-medium">
                <ArrowRight size={13} />
                <span>Bloqueador: integração com emissor NF-e / SEFAZ / sistema contábil</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ArrowRight size={13} />
                <span>Ingestão de extratos disponível em{" "}
                  <a href="/awq/ingest" className="underline">Ingestão</a>
                  {" "}(extratos bancários — não NFs)
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
