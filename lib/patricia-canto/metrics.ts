// Cálculos de indicadores compartilhados entre o board (por aba) e a
// visão geral de BI — uma única fonte de verdade para cada métrica.
import { STAGES, CHANNELS, type Lead, type Channel } from "./leads";
import { isCommunicationLate, type CaseItem } from "./cases";

export interface ComercialMetrics {
  totalLeads: number;
  qualificados: number;
  ganhos: number;
  perdidos: number;
  taxaConversaoGeral: number | null;
  valorAcaoTotal: number;
  honorariosPipeline: number;
  honorariosGanho: number;
  ticketMedio: number | null;
  avgCycleDays: number | null;
  conversion: { stage: string; entered: number; rate: number | null }[];
  motivoPredominante: [string, number] | undefined;
}

export function computeComercialMetrics(leads: Lead[]): ComercialMetrics {
  const qualificados = leads.filter((l) => l.stage === "qualificado").length;
  const ganhosLeads = leads.filter((l) => l.stage === "ganho");
  const ganhos = ganhosLeads.length;
  const perdidos = leads.filter((l) => l.stage === "perdido").length;

  const valorAcaoTotal = leads.reduce((sum, l) => sum + (l.valorAcao ?? 0), 0);
  const honorariosPipeline = leads.reduce((sum, l) => sum + (l.honorarios ?? 0), 0);
  const honorariosGanho = ganhosLeads.reduce((sum, l) => sum + (l.honorarios ?? 0), 0);

  const conversion = STAGES.filter((s) => s.id !== "ganho" && s.id !== "perdido").map((s) => {
    const entered = leads.filter((l) => l.stageHistory.some((h) => h.stage === s.id));
    const won = entered.filter((l) => l.stageHistory.some((h) => h.stage === "ganho"));
    return {
      stage: s.label,
      entered: entered.length,
      rate: entered.length > 0 ? (won.length / entered.length) * 100 : null,
    };
  });

  const cycleDays = ganhosLeads
    .filter((l) => l.dataFechamento)
    .map((l) => (new Date(l.dataFechamento!).getTime() - new Date(l.dataEntrada).getTime()) / 86_400_000)
    .filter((d) => d >= 0);
  const avgCycleDays = cycleDays.length > 0 ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length : null;

  const motivos = new Map<string, number>();
  for (const l of leads.filter((l) => l.stage === "perdido")) {
    const m = l.motivoPerda || "Sem motivo registrado";
    motivos.set(m, (motivos.get(m) ?? 0) + 1);
  }
  const motivoPredominante = [...motivos.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalLeads: leads.length,
    qualificados,
    ganhos,
    perdidos,
    taxaConversaoGeral: leads.length > 0 ? (ganhos / leads.length) * 100 : null,
    valorAcaoTotal,
    honorariosPipeline,
    honorariosGanho,
    ticketMedio: ganhos > 0 ? honorariosGanho / ganhos : null,
    avgCycleDays,
    conversion,
    motivoPredominante,
  };
}

export interface GtmMetrics {
  byChannel: Array<{
    id: Channel;
    tipo: "Pago" | "Orgânico";
    observacao: string;
    total: number;
    won: number;
    conversao: number | null;
    cac: number | null;
    receita: number;
    roi: number | null;
  }>;
  semOrigem: number;
  pctSemOrigem: number;
  slaHoras: number | null;
  melhorCanal: { id: Channel; total: number } | null;
}

export function computeGtmMetrics(leads: Lead[], investment: Partial<Record<Channel, number>>): GtmMetrics {
  const byChannel = CHANNELS.map((c) => {
    const channelLeads = leads.filter((l) => l.origem === c.id);
    const won = channelLeads.filter((l) => l.stage === "ganho");
    const inv = investment[c.id];
    // Receita = honorários dos leads desse canal já fechados (ganho) — retorno
    // realizado, não potencial. ROI = (receita - investimento) / investimento.
    const receita = won.reduce((sum, l) => sum + (l.honorarios ?? 0), 0);
    return {
      ...c,
      total: channelLeads.length,
      won: won.length,
      conversao: channelLeads.length > 0 ? (won.length / channelLeads.length) * 100 : null,
      cac: inv != null && channelLeads.length > 0 ? inv / channelLeads.length : null,
      receita,
      roi: inv != null && inv > 0 ? ((receita - inv) / inv) * 100 : null,
    };
  });

  const semOrigem = leads.filter((l) => !l.origem).length;
  const pares = leads
    .filter((l) => l.dataPrimeiroContato)
    .map((l) => (new Date(l.dataPrimeiroContato!).getTime() - new Date(l.dataEntrada).getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const slaHoras = pares.length > 0 ? pares.reduce((a, b) => a + b, 0) / pares.length : null;

  const melhorCanal = byChannel.filter((c) => c.total > 0).sort((a, b) => b.total - a.total)[0] ?? null;

  return {
    byChannel,
    semOrigem,
    pctSemOrigem: leads.length > 0 ? (semOrigem / leads.length) * 100 : 0,
    slaHoras,
    melhorCanal: melhorCanal ? { id: melhorCanal.id, total: melhorCanal.total } : null,
  };
}

export interface CsMetrics {
  totalAtivos: number;
  taxaSucesso: number | null;
  porTipo: [string, { total: number; deferidos: number }][];
  tempoMedioDecisao: number | null;
  taxaIndicacao: number | null;
  atrasadosCount: number;
  pctAtrasados: number;
}

export function computeCsMetrics(cases: CaseItem[]): CsMetrics {
  const decididos = cases.filter((c) => c.resultado != null);
  const deferidos = decididos.filter((c) => c.resultado === "Deferido");
  const porTipo = new Map<string, { total: number; deferidos: number }>();
  for (const c of decididos) {
    const cur = porTipo.get(c.tipoProcesso) ?? { total: 0, deferidos: 0 };
    cur.total += 1;
    if (c.resultado === "Deferido") cur.deferidos += 1;
    porTipo.set(c.tipoProcesso, cur);
  }

  const temposDecisao = cases
    .filter((c) => c.dataDecisao && c.dataAberturaProcesso)
    .map((c) => (new Date(c.dataDecisao!).getTime() - new Date(c.dataAberturaProcesso!).getTime()) / 86_400_000)
    .filter((d) => d >= 0);
  const tempoMedioDecisao =
    temposDecisao.length > 0 ? temposDecisao.reduce((a, b) => a + b, 0) / temposDecisao.length : null;

  const fechados = cases.filter((c) => c.stage === "pos_caso");
  const indicaram = fechados.filter((c) => c.pedidoIndicacaoEnviado);
  const atrasados = cases.filter((c) => isCommunicationLate(c));
  const ativos = cases.filter((c) => c.stage !== "pos_caso");

  return {
    totalAtivos: ativos.length,
    taxaSucesso: decididos.length > 0 ? (deferidos.length / decididos.length) * 100 : null,
    porTipo: [...porTipo.entries()],
    tempoMedioDecisao,
    taxaIndicacao: fechados.length > 0 ? (indicaram.length / fechados.length) * 100 : null,
    pctAtrasados: cases.length > 0 ? (atrasados.length / cases.length) * 100 : 0,
    atrasadosCount: atrasados.length,
  };
}
