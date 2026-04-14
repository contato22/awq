"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDealById } from "@/lib/deal-data";
import {
  ArrowLeft, Clock, Settings, MessageSquare, Send,
  CheckCircle2, User, ChevronRight, Trash2, RefreshCw,
} from "lucide-react";
import type { DealOverride } from "../DealWorkspacePage";

function overrideKey(id: string) { return `awq_deal_override_${id}`; }
function loadOverride(id: string): DealOverride {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(overrideKey(id)) ?? "{}"); } catch { return {}; }
}
function saveOverride(id: string, data: DealOverride) {
  if (typeof window === "undefined") return;
  localStorage.setItem(overrideKey(id), JSON.stringify(data));
}

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    "id.companyName": "Nome da Empresa", "id.sector": "Setor", "id.location": "Localização",
    "id.cnpj": "CNPJ", "id.dealOrigin": "Origem do Deal", "id.mainContact": "Contato Principal",
    "id.mainContactRole": "Cargo do Contato", "id.email": "Email", "id.phone": "Telefone",
    "id.website": "Website", "thesis.rationale": "Racional Estratégico", "thesis.whyNow": "Por que Agora",
    "thesis.synergies": "Sinergias", "thesis.valueCreation": "Tese de Criação de Valor",
    "thesis.awqFit": "Encaixe AWQ Venture", "diag.summary": "Diagnóstico Resumido",
    "diag.opMaturity": "Maturidade Operacional", "diag.comMaturity": "Maturidade Comercial",
    "diag.strengths": "Pontos Fortes", "diag.weaknesses": "Fragilidades", "diag.risks": "Riscos",
    "fin.revenue": "Receita Estimada", "fin.ebitda": "EBITDA Estimado", "fin.ebitdaMargin": "Margem EBITDA",
    "fin.askVal": "Valuation Pedido", "fin.propVal": "Valuation Proposto", "fin.multiple": "Múltiplo",
    "fin.ownership": "Participação", "fin.investment": "Investimento", "fin.upside": "Upside",
    "fin.dealType": "Tipo de Deal", "fin.fee": "Fee", "fin.earnin": "Earn-in", "fin.offerStructure": "Estrutura da Oferta",
    "fin.notes": "Observações Financeiras", "risk.legal": "Riscos Jurídicos", "risk.fin": "Riscos Financeiros",
    "risk.ops": "Riscos Operacionais", "risk.integ": "Riscos de Integração", "risk.killCriteria": "Kill Criteria",
    "risk.pending": "Pendências de Diligência", "risk.blockers": "Blockers", "risk.precedentConditions": "Condições Precedentes",
    "economicProposal": "Proposta Econômica", "paymentStructure": "Forma de Pagamento",
    "timeline": "Cronograma", "stage": "Estágio do Deal", "sendStatus": "Status de Envio",
    "proposalDeleted": "Proposta Excluída",
  };
  return labels[key] ?? key;
}

export default function HistoryPage({ params }: { params: { id: string } }) {
  const maybeDeal = getDealById(params.id);
  if (!maybeDeal) notFound();
  const deal = maybeDeal;

  const [override, setOverride] = useState<DealOverride>({});

  useEffect(() => { setOverride(loadOverride(deal.id)); }, [deal.id]);

  function clearOverrides() {
    const cleared = { internalNotes: override.internalNotes, historyLog: override.historyLog };
    setOverride(cleared);
    saveOverride(deal.id, cleared);
  }

  function clearAll() {
    setOverride({});
    saveOverride(deal.id, {});
  }

  const historyLog = (override.historyLog ?? []) as { timestamp: string; field: string; from: string; to: string }[];
  const auditTrail = deal.governance.auditTrail ?? [];

  // Combine governance static audit trail + localStorage change log
  const allEvents = [
    ...auditTrail.map((e: any) => ({ ...e, source: "governance" })),
    ...historyLog.map((e) => ({
      date: e.timestamp.split("T")[0],
      by: "Operador",
      action: `${fieldLabel(e.field)}: ${e.from} → ${e.to}`,
      source: "override",
      timestamp: e.timestamp,
    })),
  ].sort((a, b) => {
    const ta = (a as any).timestamp ?? a.date + "T00:00:00";
    const tb = (b as any).timestamp ?? b.date + "T00:00:00";
    return tb.localeCompare(ta);
  });

  // Count overridden fields
  const fieldCount = Object.keys(override.fields ?? {}).length
    + Object.keys(override.numericFields ?? {}).length
    + Object.keys(override.arrayFields ?? {}).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/awq-venture/deals/${deal.id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={13} /> Workspace
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-xs text-gray-500">{deal.companyName}</span>
          <span className="text-gray-200">/</span>
          <span className="text-xs font-semibold text-gray-700">Histórico</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              Histórico de Alterações — {deal.companyName}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Log de todas as edições, mudanças de status e eventos de governança do deal.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
        <Link href={`/awq-venture/deals/${deal.id}`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <Settings size={11} /> Workspace
        </Link>
        <Link href={`/awq-venture/deals/${deal.id}/negotiation`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <MessageSquare size={11} /> Negociação
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
          <Clock size={11} /> Histórico
        </span>
        <Link href={`/awq-venture/deals/${deal.id}/share`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <Send size={11} /> Preview Cliente
        </Link>
      </div>

      {/* Override summary */}
      {fieldCount > 0 && (
        <div className="card p-4 border border-amber-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {fieldCount} campo{fieldCount !== 1 ? "s" : ""} com override local
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Alterações salvas em localStorage. Não sincronizadas com nenhuma base de dados.
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={clearOverrides}
                className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw size={11} /> Reverter campos
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={11} /> Limpar tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campos atualmente alterados */}
      {fieldCount > 0 && (
        <div className="card p-5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Campos com Alteração Local</div>
          <div className="space-y-2">
            {Object.entries(override.fields ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-600 w-40 shrink-0">{fieldLabel(k)}</span>
                <span className="text-gray-700 truncate">{String(v)}</span>
              </div>
            ))}
            {Object.entries(override.numericFields ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-600 w-40 shrink-0">{fieldLabel(k)}</span>
                <span className="text-gray-700">{String(v)}</span>
              </div>
            ))}
            {Object.entries(override.arrayFields ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-600 w-40 shrink-0">{fieldLabel(k)}</span>
                <span className="text-gray-700">{(v as string[]).join("; ")}</span>
              </div>
            ))}
            {override.stage && (
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-600 w-40 shrink-0">Estágio</span>
                <span className="text-gray-700">{override.stage}</span>
              </div>
            )}
            {override.sendStatus && (
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="font-semibold text-gray-600 w-40 shrink-0">Status de Envio</span>
                <span className="text-gray-700">{override.sendStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline completo */}
      <div className="card p-5">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
          Timeline de Eventos ({allEvents.length})
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="relative space-y-3 pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-200" />
            {allEvents.map((e: any, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white shrink-0 mt-1 ${
                  e.source === "override" ? "bg-amber-500" : "bg-brand-500"
                }`} />
                <div className="flex-1 surface-subtle p-3 rounded-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      e.source === "override"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-brand-50 text-brand-700 border border-brand-200"
                    }`}>
                      {e.source === "override" ? "Edit Local" : "Governança"}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <User size={9} /> {e.by}
                    </span>
                    <span className="text-[10px] text-gray-400">{e.date ?? (e.timestamp ?? "").split("T")[0]}</span>
                  </div>
                  <p className="text-xs text-gray-700 mt-1.5 leading-relaxed">{e.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit trail estático do deal */}
      {auditTrail.length > 0 && (
        <div className="card p-5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Audit Trail (Governança Static)
          </div>
          <div className="space-y-2">
            {auditTrail.map((e: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs py-2 border-b border-gray-50 last:border-0">
                <CheckCircle2 size={12} className="text-brand-500 mt-0.5 shrink-0" />
                <span className="text-gray-400 w-20 shrink-0">{e.date}</span>
                <span className="text-gray-500 w-24 shrink-0">{e.by}</span>
                <span className="text-gray-700">{e.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-gray-300 pb-4">
        Histórico local · {deal.id} · Para versionamento permanente, integrar com API
      </div>
    </div>
  );
}
