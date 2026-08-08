"use client";

import { useMemo, useState } from "react";
import type { Channel, Lead } from "@/lib/patricia-canto/leads";
import { STAGES } from "@/lib/patricia-canto/leads";
import type { CaseItem } from "@/lib/patricia-canto/cases";
import { CASE_STAGES } from "@/lib/patricia-canto/cases";
import type { ComunicacaoItem } from "@/lib/patricia-canto/gtm-extra";
import type { Lancamento } from "@/lib/patricia-canto/financeiro";
import type { SalesGoals } from "@/lib/patricia-canto/goals";
import { computeGoalProgress } from "@/lib/patricia-canto/goals";
import { computeComercialMetrics, computeCsMetrics, computeGtmMetrics } from "@/lib/patricia-canto/metrics";
import { computeAdminTasks } from "@/lib/patricia-canto/my-tasks";
import type { Tab } from "@/lib/patricia-canto/auth";
import MyTasksPanel from "./MyTasksPanel";
import PatriciaCantoLogo from "./PatriciaCantoLogo";
import StatTile from "./StatTile";
import GaugeChart from "./GaugeChart";
import HorizontalBarChart from "./HorizontalBarChart";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

function DateBadge({ iso }: { iso: string }) {
  const { day, month } = dateParts(iso);
  return (
    <span className="flex w-9 shrink-0 flex-col items-center rounded-md bg-canto-100 py-1 leading-none text-canto-700">
      <span className="text-sm font-semibold">{day}</span>
      <span className="mt-0.5 text-[8px] font-semibold tracking-wide">{month}</span>
    </span>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[11px] font-semibold text-canto-500 transition hover:text-canto-800">
      Ver tudo
    </button>
  );
}

// Paleta pastel da referência de UI/UX, reservando o dourado da marca
// (canto-600) para o estágio de sucesso ("ganho").
const STAGE_COLOR: Record<string, string> = {
  novo: "#9B7C93", // chart.mauve
  qualificado: "#C1936A", // chart.terracotta
  proposta: "#8FA890", // chart.sage
  negociacao: "#6E9C93", // chart.teal
  ganho: "#847455", // canto-600 (dourado da marca)
  perdido: "#C79098", // chart.rose
};

function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M16 4.5c1.4.4 2.4 1.7 2.4 3.2S17.4 10.5 16 11" strokeLinecap="round" />
      <path d="M18.5 14.3c1.9.7 3.3 2.7 3.3 5.7" strokeLinecap="round" />
    </svg>
  );
}
function IconCash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconScale(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3v18M8 21h8M5 7h14M5 7 2 13a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrend(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  let cumulative = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = cumulative;
      const pct = total > 0 ? (s.value / total) * 100 : 0;
      cumulative += pct;
      return `${s.color} ${start}% ${cumulative}%`;
    });
  const gradient = stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#E3D9C4 0% 100%)";

  return (
    <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: gradient }}>
      <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold text-canto-900">{total}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-canto-400">leads</span>
      </div>
    </div>
  );
}

export default function BiOverview({
  leads,
  cases,
  investment,
  comunicacoes,
  lancamentos,
  salesGoals,
  onSaveSalesGoals,
  onNavigate,
}: {
  leads: Lead[];
  cases: CaseItem[];
  investment: Partial<Record<Channel, number>>;
  comunicacoes: ComunicacaoItem[];
  lancamentos: Lancamento[];
  salesGoals: SalesGoals;
  onSaveSalesGoals: (goals: SalesGoals) => void;
  onNavigate: (tab: Tab) => void;
}) {
  const comercial = useMemo(() => computeComercialMetrics(leads), [leads]);
  const cs = useMemo(() => computeCsMetrics(cases), [cases]);
  const gtm = useMemo(() => computeGtmMetrics(leads, investment), [leads, investment]);
  const goalProgress = useMemo(() => computeGoalProgress(lancamentos, salesGoals), [lancamentos, salesGoals]);
  const adminTasks = useMemo(() => computeAdminTasks(leads, cases, lancamentos), [leads, cases, lancamentos]);

  const stageBreakdown = useMemo(
    () =>
      STAGES.map((s) => ({
        label: s.label,
        value: leads.filter((l) => l.stage === s.id).length,
        color: STAGE_COLOR[s.id] ?? "#CBBB9A",
      })),
    [leads],
  );

  const recentLeads = useMemo(
    () => [...leads].sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime()).slice(0, 4),
    [leads],
  );

  const upcomingComunicacoes = useMemo(
    () =>
      comunicacoes
        .filter((c) => c.status === "planejado")
        .sort((a, b) => new Date(a.dataPlanejada).getTime() - new Date(b.dataPlanejada).getTime())
        .slice(0, 4),
    [comunicacoes],
  );

  const recentCases = useMemo(
    () =>
      [...cases]
        .sort((a, b) => new Date(b.dataUltimaAtualizacao).getTime() - new Date(a.dataUltimaAtualizacao).getTime())
        .slice(0, 4),
    [cases],
  );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        {/* Banner de boas-vindas */}
        <div className="flex flex-col gap-4 rounded-xl border border-canto-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <PatriciaCantoLogo className="h-12 w-12 shrink-0" shieldColor="#FBF9F5" markColor="#847455" />
            <div>
              <p className="font-canto-serif text-2xl text-canto-900 sm:text-3xl">Bem-vinda de volta, Patrícia</p>
              <p className="mt-1 text-sm text-canto-500">Aqui está o resumo do escritório hoje.</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="rounded-lg border border-canto-line bg-canto-50 px-4 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-canto-500">Pipeline ativo</p>
              <p className="text-base font-semibold text-canto-900">{comercial.totalLeads - comercial.ganhos - comercial.perdidos}</p>
            </div>
            <div className="rounded-lg border border-canto-line bg-canto-50 px-4 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-canto-500">Honorários fechados</p>
              <p className="text-base font-semibold text-canto-700">{currency(comercial.honorariosGanho)}</p>
            </div>
          </div>
        </div>

        <MyTasksPanel title="Suas tarefas" subtitle="Atividades atrasadas ou que vencem hoje" tasks={adminTasks} />

        <GoalsPanel goals={salesGoals} progress={goalProgress} onSave={onSaveSalesGoals} />

        {/* Stat tiles principais */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total de leads" value={comercial.totalLeads.toString()} icon={<IconUsers className="h-4 w-4" />} />
          <StatTile
            label="Conversão geral"
            value={comercial.taxaConversaoGeral == null ? "—" : `${comercial.taxaConversaoGeral.toFixed(0)}%`}
            icon={<IconTrend className="h-4 w-4" />}
          />
          <StatTile label="Casos ativos" value={cs.totalAtivos.toString()} icon={<IconScale className="h-4 w-4" />} />
          <StatTile
            label="Honorários pipeline"
            value={currency(comercial.honorariosPipeline)}
            icon={<IconCash className="h-4 w-4" />}
            variant="accent"
          />
        </div>

        {/* Donut de distribuição do funil */}
        <div className="rounded-xl border border-canto-line bg-white p-5">
          <h3 className="font-canto-serif text-lg text-canto-900">Pipeline por estágio</h3>
          <p className="mt-0.5 text-xs text-canto-500">Distribuição atual de todos os leads no funil comercial</p>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <DonutChart segments={stageBreakdown} total={leads.length} />
            <div className="w-full flex-1 space-y-2.5">
              {stageBreakdown.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-canto-700">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold text-canto-900">{s.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canto-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${leads.length > 0 ? (s.value / leads.length) * 100 : 0}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gauges de desempenho */}
        <div className="rounded-xl border border-canto-line bg-white p-5">
          <h3 className="font-canto-serif text-lg text-canto-900">Desempenho</h3>
          <p className="mt-0.5 text-xs text-canto-500">Principais taxas do funil, de ponta a ponta</p>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GaugeChart
              label="Conversão geral"
              value={comercial.taxaConversaoGeral == null ? "—" : `${comercial.taxaConversaoGeral.toFixed(0)}%`}
              pct={comercial.taxaConversaoGeral ?? 0}
              color="#847455"
            />
            <GaugeChart
              label="Taxa de sucesso (CS)"
              value={cs.taxaSucesso == null ? "—" : `${cs.taxaSucesso.toFixed(0)}%`}
              pct={cs.taxaSucesso ?? 0}
              color="#8FA890"
            />
            <GaugeChart
              label="Indicação pós-caso"
              value={cs.taxaIndicacao == null ? "—" : `${cs.taxaIndicacao.toFixed(0)}%`}
              pct={cs.taxaIndicacao ?? 0}
              color="#6E9C93"
            />
          </div>
        </div>

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

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <h3 className="font-canto-serif text-lg text-canto-900">Indicadores de Aquisição</h3>
          <p className="mt-0.5 text-xs text-canto-500">GTM — origem dos leads e eficiência de canal</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Leads sem origem"
              value={`${gtm.semOrigem} (${gtm.pctSemOrigem.toFixed(0)}%)`}
              variant={gtm.pctSemOrigem > 20 ? "warn" : "default"}
            />
            <StatTile label="SLA médio de 1º contato" value={gtm.slaHoras == null ? "—" : `${gtm.slaHoras.toFixed(1)}h`} />
            <StatTile label="Canal com mais leads" value={gtm.melhorCanal ? `${gtm.melhorCanal.id} (${gtm.melhorCanal.total})` : "—"} />
          </div>
          <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wide text-canto-500">Conversão por canal</p>
          <HorizontalBarChart
            data={gtm.byChannel
              .filter((c) => c.total > 0)
              .map((c) => ({
                label: c.id,
                value: c.conversao ?? 0,
                displayValue: c.conversao == null ? "—" : `${c.conversao.toFixed(0)}%`,
                color: "#C1936A",
              }))}
          />
        </div>
      </div>

      {/* Painel lateral de atividade */}
      <div className="space-y-5">
        <p className="font-canto-serif text-lg font-semibold text-canto-900">Atividade</p>

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-canto-900">Comunicações planejadas</h3>
            <ViewAll onClick={() => onNavigate("gtm")} />
          </div>
          {upcomingComunicacoes.length === 0 ? (
            <p className="mt-3 text-xs text-canto-500">Nenhuma ação planejada no momento.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcomingComunicacoes.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <DateBadge iso={c.dataPlanejada} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-canto-900">{c.titulo}</p>
                    <p className="text-xs text-canto-500">
                      {c.tipo}
                      {c.canal ? ` · ${c.canal}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-canto-900">Leads recentes</h3>
            <ViewAll onClick={() => onNavigate("comercial")} />
          </div>
          {recentLeads.length === 0 ? (
            <p className="mt-3 text-xs text-canto-500">Nenhum lead cadastrado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STAGE_COLOR[l.stage] ?? "#CBBB9A" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-canto-900">{l.nomeCliente || "Sem nome"}</p>
                    <p className="truncate text-xs text-canto-500">{l.tipoProcesso}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-canto-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-canto-900">Casos atualizados</h3>
            <ViewAll onClick={() => onNavigate("cs")} />
          </div>
          {recentCases.length === 0 ? (
            <p className="mt-3 text-xs text-canto-500">Nenhum caso em acompanhamento ainda.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentCases.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <DateBadge iso={c.dataUltimaAtualizacao} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-canto-900">{c.nomeCliente}</p>
                    <p className="truncate text-xs text-canto-500">
                      {CASE_STAGES.find((s) => s.id === c.stage)?.label ?? c.stage}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  label,
  atual,
  meta,
  pct,
}: {
  label: string;
  atual: number;
  meta: number;
  pct: number;
}) {
  const met = pct >= 100;
  return (
    <div className="rounded-lg border border-canto-line bg-canto-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
        <span className={`text-[11px] font-semibold ${met ? "text-canto-700" : "text-canto-500"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold text-canto-900">
        {currency(atual)} <span className="text-sm font-normal text-canto-400">/ {currency(meta)}</span>
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canto-200">
        <div
          className={`h-full rounded-full ${met ? "bg-canto-600" : "bg-canto-400"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function GoalsPanel({
  goals,
  progress,
  onSave,
}: {
  goals: SalesGoals;
  progress: ReturnType<typeof computeGoalProgress>;
  onSave: (goals: SalesGoals) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [vendasInput, setVendasInput] = useState(String(goals.metaVendasMensal));
  const [recebimentoInput, setRecebimentoInput] = useState(String(goals.metaRecebimentoMensal));

  function startEdit() {
    setVendasInput(String(goals.metaVendasMensal));
    setRecebimentoInput(String(goals.metaRecebimentoMensal));
    setEditing(true);
  }

  function save() {
    const metaVendasMensal = Number(vendasInput);
    const metaRecebimentoMensal = Number(recebimentoInput);
    if (!Number.isFinite(metaVendasMensal) || !Number.isFinite(metaRecebimentoMensal)) return;
    onSave({ metaVendasMensal, metaRecebimentoMensal });
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-canto-line bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-canto-serif text-lg text-canto-900">
            Metas de {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h3>
          <p className="mt-0.5 text-xs text-canto-500">
            Vendas (competência) e recebimento (caixa) — meta gravada por mês, cada mês guarda a sua
          </p>
        </div>
        {!editing && (
          <button onClick={startEdit} className="text-[11px] font-semibold text-canto-500 transition hover:text-canto-800">
            Editar metas
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-canto-500">
            Meta de vendas (R$)
            <input
              type="number"
              min={0}
              value={vendasInput}
              onChange={(e) => setVendasInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <label className="text-xs text-canto-500">
            Meta de recebimento (R$)
            <input
              type="number"
              min={0}
              value={recebimentoInput}
              onChange={(e) => setRecebimentoInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-canto-200 px-2 py-1.5 text-sm outline-none focus:border-canto-500"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-canto-200 px-3 py-1.5 text-xs font-medium text-canto-600 hover:bg-canto-50"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-canto-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-canto-800"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <GoalCard label="Vendas do mês" atual={progress.vendasDoMes} meta={goals.metaVendasMensal} pct={progress.pctVendas} />
          <GoalCard
            label="Recebimento do mês"
            atual={progress.recebidoDoMes}
            meta={goals.metaRecebimentoMensal}
            pct={progress.pctRecebimento}
          />
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-canto-line bg-white p-5">
      <h3 className="font-canto-serif text-lg text-canto-900">{title}</h3>
      <p className="mt-0.5 text-xs text-canto-500">{subtitle}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}
