"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, BookOpen, CheckCircle2,
  Clock, ExternalLink, TrendingDown,
} from "lucide-react";
import type { APEntry, APSummary } from "@/lib/ap-shared";
import { effectiveStatus } from "@/lib/ap-shared";

interface Props {
  entries: APEntry[];
  summary: APSummary | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_LABELS: Record<string, string> = {
  folha_remuneracao:          "Folha / RH",
  prolabore_retirada:         "Pró-Labore",
  freelancer_terceiro:        "Freelancers",
  fornecedor_operacional:     "Fornecedores Op.",
  software_assinatura:        "Software / SaaS",
  marketing_midia:            "Marketing / Mídia",
  aluguel_locacao:            "Aluguel",
  energia_agua_internet:      "Utilidades",
  servicos_contabeis_juridicos: "Contab. / Jurídico",
  viagem_hospedagem:          "Viagens",
  deslocamento_combustivel:   "Deslocamento",
  alimentacao_representacao:  "Alimentação",
  imposto_tributo:            "Impostos",
  tarifa_bancaria:            "Tarifas Bancárias",
  juros_multa_iof:            "Juros / Multas",
  despesa_ambigua:            "Diversos",
};

export default function APPainel({ entries, summary }: Props) {
  const today = useMemo(() => new Date(), []);

  // Compute from live entries (summary may be stale after client-side mutations)
  const liveStats = entries.reduce(
    (acc, e) => {
      const eff = effectiveStatus(e, today);
      if (eff === "pendente")  { acc.pendente += e.amount; acc.cntPendente++; }
      if (eff === "aprovado")  { acc.aprovado += e.amount; acc.cntAprovado++; }
      if (eff === "vencido")   { acc.vencido  += e.amount; acc.cntVencido++;  }
      if (eff === "pago")      { acc.pago     += e.amount; acc.cntPago++;     }
      return acc;
    },
    { pendente: 0, aprovado: 0, vencido: 0, pago: 0, cntPendente: 0, cntAprovado: 0, cntVencido: 0, cntPago: 0 }
  );

  const aging = summary?.aging ?? { days0to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 };
  const byCategory = summary?.byCategory.slice(0, 8) ?? [];

  const maxAging = Math.max(aging.days0to30, aging.days31to60, aging.days61to90, aging.days90plus, 1);

  // Upcoming in 7 days
  const next7 = entries.filter(e => {
    if (e.status === "pago" || e.status === "cancelado") return false;
    const days = Math.ceil((new Date(e.dueDate).getTime() - today.getTime()) / 86_400_000);
    return days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="A Pagar (Pendente)"
          value={fmtBRL(liveStats.pendente)}
          sub={`${liveStats.cntPendente} APs`}
          icon={<Clock size={18} className="text-amber-500" />}
          color="border-l-amber-400"
        />
        <KPICard
          label="Aprovado"
          value={fmtBRL(liveStats.aprovado)}
          sub={`${liveStats.cntAprovado} APs`}
          icon={<CheckCircle2 size={18} className="text-blue-500" />}
          color="border-l-blue-400"
        />
        <KPICard
          label="Vencidas"
          value={fmtBRL(liveStats.vencido)}
          sub={`${liveStats.cntVencido} APs`}
          icon={<AlertTriangle size={18} className="text-red-500" />}
          color="border-l-red-400"
        />
        <KPICard
          label="Pagas (total)"
          value={fmtBRL(liveStats.pago)}
          sub={`${liveStats.cntPago} APs`}
          icon={<BarChart3 size={18} className="text-emerald-500" />}
          color="border-l-emerald-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Aging de Vencimento</h3>
          <div className="space-y-3">
            {[
              { label: "0-30 dias", value: aging.days0to30,  color: "bg-emerald-400" },
              { label: "31-60 dias", value: aging.days31to60, color: "bg-amber-400" },
              { label: "61-90 dias", value: aging.days61to90, color: "bg-orange-500" },
              { label: "90+ dias",   value: aging.days90plus, color: "bg-red-500" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-gray-800 tabular-nums">{fmtBRL(row.value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all`}
                    style={{ width: `${(row.value / maxAging) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Por Categoria (DRE)</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-2.5">
              {byCategory.map(c => (
                <div key={c.category} className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 truncate">
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-semibold text-gray-800 tabular-nums">{fmtBRL(c.total)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({c.count})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming + Integration links */}
        <div className="space-y-4">
          {/* Upcoming 7 days */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Vencendo em 7 dias
              {next7.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium">{next7.length}</span>
              )}
            </h3>
            {next7.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma AP vence nos próximos 7 dias</p>
            ) : (
              <div className="space-y-2">
                {next7.slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{e.supplierName}</p>
                      <p className="text-[11px] text-gray-400">{new Date(e.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 tabular-nums ml-2">{fmtBRL(e.amount)}</span>
                  </div>
                ))}
                {next7.length > 5 && <p className="text-[11px] text-gray-400">+{next7.length - 5} mais</p>}
              </div>
            )}
          </div>

          {/* Integration pipeline */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline de Integração</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">1</span>
                <span><strong>Cadastro AP</strong> → Passivo Circulante no Balanço</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">2</span>
                <span><strong>Pagamento</strong> → saída no DFC (regime caixa)</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">3</span>
                <span><strong>Categoria</strong> → competência no DRE (emissão)</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">4</span>
                <span><strong>Vínculo</strong> → concilia com extrato bancário</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <Link href="/awq/conciliacao" className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <span className="flex items-center gap-1.5"><TrendingDown size={12} /> Conciliação</span>
                <ExternalLink size={10} />
              </Link>
              <Link href="/awq/financial" className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <span className="flex items-center gap-1.5"><BarChart3 size={12} /> DRE Gerencial</span>
                <ExternalLink size={10} />
              </Link>
              <Link href="/awq/cashflow" className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <span className="flex items-center gap-1.5"><BarChart3 size={12} /> DFC</span>
                <ExternalLink size={10} />
              </Link>
              <Link href="/awq/contabilidade" className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <span className="flex items-center gap-1.5"><BookOpen size={12} /> Balanço Patrimonial</span>
                <ExternalLink size={10} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
