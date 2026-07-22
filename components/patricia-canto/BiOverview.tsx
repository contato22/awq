"use client";

import { useMemo } from "react";
import type { Channel, Lead } from "@/lib/patricia-canto/leads";
import type { CaseItem } from "@/lib/patricia-canto/cases";
import { computeComercialMetrics, computeCsMetrics, computeGtmMetrics } from "@/lib/patricia-canto/metrics";
import StatTile from "./StatTile";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BiOverview({
  leads,
  cases,
  investment,
}: {
  leads: Lead[];
  cases: CaseItem[];
  investment: Partial<Record<Channel, number>>;
}) {
  const comercial = useMemo(() => computeComercialMetrics(leads), [leads]);
  const cs = useMemo(() => computeCsMetrics(cases), [cases]);
  const gtm = useMemo(() => computeGtmMetrics(leads, investment), [leads, investment]);

  return (
    <div className="space-y-6">
      <Section title="Indicadores de Vendas" subtitle="Pipeline Comercial — leads, conversão e receita">
        <StatTile label="Total de leads" value={comercial.totalLeads.toString()} />
        <StatTile label="Qualificados" value={comercial.qualificados.toString()} />
        <StatTile label="Fechados (ganho)" value={comercial.ganhos.toString()} />
        <StatTile
          label="Taxa de conversão geral"
          value={comercial.taxaConversaoGeral == null ? "—" : `${comercial.taxaConversaoGeral.toFixed(0)}%`}
        />
        <StatTile label="Honorários fechados" value={currency(comercial.honorariosGanho)} variant="accent" />
        <StatTile label="Honorários em pipeline" value={currency(comercial.honorariosPipeline)} />
        <StatTile
          label="Ticket médio (honorários)"
          value={comercial.ticketMedio == null ? "—" : currency(comercial.ticketMedio)}
        />
        <StatTile
          label="Tempo médio de ciclo"
          value={comercial.avgCycleDays == null ? "—" : `${comercial.avgCycleDays.toFixed(1)} dias`}
        />
        <StatTile
          label="Perdas"
          value={
            comercial.perdidos.toString() +
            (comercial.motivoPredominante ? ` — "${comercial.motivoPredominante[0]}"` : "")
          }
          variant={comercial.perdidos > 0 ? "warn" : "default"}
        />
      </Section>

      <Section title="Indicadores de Processos" subtitle="CS/Jurídico — acompanhamento pós-fechamento">
        <StatTile label="Casos ativos" value={cs.totalAtivos.toString()} />
        <StatTile label="Taxa de sucesso" value={cs.taxaSucesso == null ? "—" : `${cs.taxaSucesso.toFixed(0)}%`} />
        <StatTile
          label="Tempo médio até decisão"
          value={cs.tempoMedioDecisao == null ? "—" : `${cs.tempoMedioDecisao.toFixed(0)} dias`}
        />
        <StatTile
          label="Taxa de indicação pós-caso"
          value={cs.taxaIndicacao == null ? "—" : `${cs.taxaIndicacao.toFixed(0)}%`}
        />
        <StatTile
          label="Comunicação atrasada"
          value={`${cs.atrasadosCount} (${cs.pctAtrasados.toFixed(0)}%)`}
          variant={cs.atrasadosCount > 0 ? "warn" : "default"}
        />
      </Section>

      <Section title="Indicadores de Aquisição" subtitle="GTM — origem dos leads e eficiência de canal">
        <StatTile
          label="Leads sem origem"
          value={`${gtm.semOrigem} (${gtm.pctSemOrigem.toFixed(0)}%)`}
          variant={gtm.pctSemOrigem > 20 ? "warn" : "default"}
        />
        <StatTile label="SLA médio de 1º contato" value={gtm.slaHoras == null ? "—" : `${gtm.slaHoras.toFixed(1)}h`} />
        <StatTile label="Canal com mais leads" value={gtm.melhorCanal ? `${gtm.melhorCanal.id} (${gtm.melhorCanal.total})` : "—"} />
        {gtm.byChannel
          .filter((c) => c.total > 0)
          .map((c) => (
            <StatTile
              key={c.id}
              label={`Conversão — ${c.id}`}
              value={c.conversao == null ? "—" : `${c.conversao.toFixed(0)}%`}
            />
          ))}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-canto-200 bg-white p-4">
      <h3 className="font-canto-serif text-base font-semibold text-canto-900">{title}</h3>
      <p className="mt-0.5 text-xs text-canto-500">{subtitle}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}
