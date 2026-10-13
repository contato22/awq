/**
 * Missões do Office: estado persistente do trabalho de um ciclo editorial, com critérios de pronto
 * verificados pelo motor, limites de tentativas e de tokens e registro de decisão. Tudo aqui são
 * fatos do motor (não texto de LLM) e funções puras: a tela só chama e guarda o resultado.
 */
import type { Analise, EntregaKind } from "./office-analysis";

export type StatusMissao = "working" | "waiting" | "approval_required" | "blocked" | "budget_exhausted" | "failed" | "complete";

export const ROTULO_STATUS: Record<StatusMissao, string> = {
  working: "Em andamento",
  waiting: "Aguardando dependência",
  approval_required: "Aguardando aprovação",
  blocked: "Bloqueada",
  budget_exhausted: "Limite atingido",
  failed: "Falhou",
  complete: "Concluída",
};

export type IdCriterio = "triagem" | "briefing" | "peca" | "pacote" | "aprovacao_gestor" | "execucao";

export interface Criterio {
  id: IdCriterio;
  texto: string;
  ok: boolean;
  /** Evidência da verificação mais recente (campos achados, alertas, quem aprovou). */
  evidencia?: string;
}

/** Registro curto de uma decisão relevante, montado pelo motor a partir de fatos. */
export interface RegistroDecisao {
  ts: string;
  objetivo: string;
  acao: string;
  alternativas: string;
  restricoes: string;
  evidencias: string;
  politica: string;
  custo: string;
  resultado: string;
  proximo: string;
}

export interface Missao {
  id: string;
  bu: string;
  demanda: string;
  criadaEm: string;
  atualizadaEm: string;
  status: StatusMissao;
  acaoAtual: string | null;
  proximaAcao: string;
  /** O que falta para destravar, quando não está em andamento. */
  bloqueio: string | null;
  criterios: Criterio[];
  tentativas: number;
  maxTentativas: number;
  tokens: { input: number; output: number };
  maxTokensSaida: number;
  /** Quem autorizou o quê (decisões do gestor). */
  autorizacoes: string[];
  decisoes: RegistroDecisao[];
}

export const MAX_MISSOES = 40;
export const LIMITE_TENTATIVAS = 10;
export const LIMITE_TOKENS_SAIDA = 40000;

const CRITERIOS: Omit<Criterio, "ok">[] = [
  { id: "triagem", texto: "Triagem com prioridade, escopo e lacunas registrados" },
  { id: "briefing", texto: "Briefing com fontes e premissas explícitas" },
  { id: "peca", texto: "Peça no formato obrigatório, sem alertas altos" },
  { id: "pacote", texto: "Pacote de aprovação no formato obrigatório" },
  { id: "aprovacao_gestor", texto: "Aprovação explícita do gestor (Miguel)" },
  { id: "execucao", texto: "Plano de publicação preparado (nada foi publicado)" },
];

const KIND_CRITERIO: Partial<Record<EntregaKind, IdCriterio>> = {
  triagem: "triagem", briefing: "briefing", peca: "peca", aprovacao: "pacote", execucao: "execucao",
};

const PROXIMA: Record<IdCriterio, string> = {
  triagem: "Triagem pelo CS",
  briefing: "Briefing pelo agente de Referências",
  peca: "Produção da peça pelo Criativo",
  pacote: "Pacote de aprovação pelo CS",
  aprovacao_gestor: "Decisão do gestor sobre o pacote",
  execucao: "Plano de publicação pela Mídia",
};

export function novaMissao(bu: string, demanda: string): Missao {
  const agora = new Date().toISOString();
  return {
    id: `missao-${Date.now()}`,
    bu, demanda,
    criadaEm: agora, atualizadaEm: agora,
    status: "working",
    acaoAtual: "Triagem da demanda",
    proximaAcao: PROXIMA.triagem,
    bloqueio: null,
    criterios: CRITERIOS.map((c) => ({ ...c, ok: false })),
    tentativas: 0, maxTentativas: LIMITE_TENTATIVAS,
    tokens: { input: 0, output: 0 }, maxTokensSaida: LIMITE_TOKENS_SAIDA,
    autorizacoes: [],
    decisoes: [],
  };
}

export const progresso = (m: Missao) => Math.round((m.criterios.filter((c) => c.ok).length / m.criterios.length) * 100);

const pendentes = (m: Missao) => m.criterios.filter((c) => !c.ok);

/** Limite de tentativas ou de tokens atingido? Devolve o motivo ou null. */
export function limiteAtingido(m: Missao): string | null {
  if (m.tentativas >= m.maxTentativas) return `limite de ${m.maxTentativas} tentativas atingido`;
  if (m.tokens.output >= m.maxTokensSaida) return `limite de ${m.maxTokensSaida.toLocaleString("pt-BR")} tokens de saída atingido`;
  return null;
}

/** Verificação do motor sobre uma entrega: formato e alertas, sem opinião de LLM. */
export function verificar(analise: Analise): { ok: boolean; evidencia: string } {
  const altas = analise.flags.filter((f) => f.severity === "alta");
  const formatoOk = analise.formatoScore === null || analise.formatoScore >= 0.75;
  const campos = analise.formatoScore === null ? "sem formato obrigatório" : `${analise.camposEncontrados}/${analise.camposEsperados} campos`;
  const falta = analise.camposFaltando.length ? `; faltam: ${analise.camposFaltando.slice(0, 3).join(", ")}` : "";
  return { ok: formatoOk && altas.length === 0, evidencia: `${campos}; ${altas.length} alerta(s) alto(s)${altas.length ? ` (${altas.map((f) => f.label).slice(0, 2).join("; ")})` : ""}${formatoOk ? "" : falta}` };
}

const comAtualizacao = (m: Missao, p: Partial<Missao>): Missao => ({ ...m, ...p, atualizadaEm: new Date().toISOString() });

/** Marca o início de uma tentativa (conta contra o limite). */
export function iniciarTentativa(m: Missao, acao: string): Missao {
  return comAtualizacao(m, { status: "working", acaoAtual: acao, bloqueio: null, tentativas: m.tentativas + 1 });
}

/** Aplica o resultado de uma execução concluída: custo, critério verificado e registro de decisão. */
export function aplicarResultado(
  m: Missao,
  r: { kind: EntregaKind; acao: string; origem: string; modo: string; analise: Analise; usage?: { input: number; output: number } }
): Missao {
  const tokens = { input: m.tokens.input + (r.usage?.input ?? 0), output: m.tokens.output + (r.usage?.output ?? 0) };
  const id = KIND_CRITERIO[r.kind];
  const v = verificar(r.analise);
  const criterios = m.criterios.map((c) => (c.id === id ? { ...c, ok: v.ok, evidencia: v.evidencia } : c));
  const reg: RegistroDecisao = {
    ts: new Date().toISOString(),
    objetivo: id ? CRITERIOS.find((c) => c.id === id)!.texto : "Responder ao gestor",
    acao: r.acao,
    alternativas: r.modo === "recomendar" ? "Produzir o material final (descartado: modo Recomendar)" : "Apenas recomendar (descartado: modo Preparar)",
    restricoes: "Sem ferramentas externas; nada é publicado ou enviado; isolamento por cliente",
    evidencias: v.evidencia,
    politica: `Modo de autonomia: ${r.modo}`,
    custo: r.usage ? `${r.usage.input} tokens de entrada, ${r.usage.output} de saída` : "sem medição",
    resultado: id ? (v.ok ? "Critério verificado" : "Critério NÃO atendido: refazer ou ajustar") : "Resposta entregue",
    proximo: "",
  };
  const base = comAtualizacao(m, { tokens, criterios, acaoAtual: null });
  const proxima = pendentes(base)[0];
  reg.proximo = proxima ? PROXIMA[proxima.id] : "Encerrar a missão";
  return { ...base, proximaAcao: reg.proximo, decisoes: [...m.decisoes, reg].slice(-30) };
}

/** Pacote pronto: a missão espera o gestor. */
export function aguardarAprovacao(m: Missao): Missao {
  return comAtualizacao(m, {
    status: "approval_required",
    acaoAtual: null,
    proximaAcao: PROXIMA.aprovacao_gestor,
    bloqueio: "Falta a decisão do gestor sobre o pacote. Aprovar, pedir ajustes ou rejeitar na aba Ciclo.",
  });
}

export function decisaoDoGestor(m: Missao, decisao: "aprovado" | "ajustes" | "rejeitado", versao: number, feedback?: string): Missao {
  const quando = new Date().toLocaleString("pt-BR");
  const texto = `${decisao === "aprovado" ? "Aprovou" : decisao === "ajustes" ? "Pediu ajustes em" : "Rejeitou"} a v${versao} em ${quando}${feedback ? ` ("${feedback.slice(0, 80)}")` : ""}`;
  const reg: RegistroDecisao = {
    ts: new Date().toISOString(),
    objetivo: "Aprovação explícita do gestor",
    acao: `Decisão do gestor: ${decisao}`,
    alternativas: "Aprovar, pedir ajustes ou rejeitar",
    restricoes: "Só o gestor autoriza efeitos externos; a aprovação vale para a versão indicada",
    evidencias: texto,
    politica: "Aprovação humana obrigatória",
    custo: "sem custo de modelo",
    resultado: decisao === "aprovado" ? "Aprovação registrada" : decisao === "ajustes" ? "Nova versão será produzida" : "Missão encerrada",
    proximo: decisao === "aprovado" ? PROXIMA.execucao : decisao === "ajustes" ? "Nova peça pelo Criativo" : "Nenhum",
  };
  const autorizacoes = [...m.autorizacoes, texto];
  const decisoes = [...m.decisoes, reg].slice(-30);
  if (decisao === "rejeitado") {
    return comAtualizacao(m, { status: "failed", acaoAtual: null, bloqueio: "Rejeitada pelo gestor.", proximaAcao: "Nenhuma", autorizacoes, decisoes });
  }
  if (decisao === "ajustes") {
    const criterios = m.criterios.map((c) => (c.id === "peca" || c.id === "pacote" || c.id === "aprovacao_gestor" ? { ...c, ok: false, evidencia: c.id === "aprovacao_gestor" ? undefined : `${c.evidencia ?? ""} (refeito após ajustes)`.trim() } : c));
    return comAtualizacao(m, { status: "working", bloqueio: null, proximaAcao: "Nova peça pelo Criativo", criterios, autorizacoes, decisoes });
  }
  const criterios = m.criterios.map((c) => (c.id === "aprovacao_gestor" ? { ...c, ok: true, evidencia: texto } : c));
  return comAtualizacao(m, { status: "working", bloqueio: null, proximaAcao: PROXIMA.execucao, criterios, autorizacoes, decisoes });
}

/** Falha numa tentativa: bloqueia a missão com a causa e o jeito de destravar. */
export function falhar(m: Missao, causa: { mensagem: string; proxima: string; recuperavel: boolean }, limite?: string): Missao {
  if (limite) {
    return comAtualizacao(m, { status: "budget_exhausted", acaoAtual: null, bloqueio: `Parou: ${limite}. Só o gestor pode ampliar o limite (nova missão).`, proximaAcao: "Nenhuma até o gestor decidir" });
  }
  return comAtualizacao(m, {
    status: causa.recuperavel ? "blocked" : "failed",
    acaoAtual: null,
    bloqueio: `${causa.mensagem} Para destravar: ${causa.proxima}`,
    proximaAcao: "Repetir a etapa depois de destravar",
  });
}

/** Conclusão: só "complete" quando todos os critérios estão comprovados. */
export function concluirSeProvado(m: Missao): Missao {
  const falta = pendentes(m);
  if (falta.length === 0) return comAtualizacao(m, { status: "complete", acaoAtual: null, bloqueio: null, proximaAcao: "Nenhuma: definição de pronto comprovada" });
  return comAtualizacao(m, {
    status: "blocked",
    acaoAtual: null,
    bloqueio: `Critérios não comprovados: ${falta.map((c) => c.texto).join("; ")}.`,
    proximaAcao: "Refazer a entrega que não passou na verificação",
  });
}

/** Resumo curto para o contrato do agente. */
export function resumoParaContrato(m: Missao): string {
  const falta = pendentes(m).map((c) => c.id).join(", ") || "nenhum";
  return `missão ${progresso(m)}% pronta; critérios pendentes: ${falta}; tentativa ${Math.min(m.tentativas + 1, m.maxTentativas)} de ${m.maxTentativas}`;
}

/** Estado no formato do plano mestre. `confidence` é null: não há critério de calibração. */
export function estadoJson(m: Missao) {
  return {
    status: m.status,
    objective: m.demanda.slice(0, 160),
    current_action: m.acaoAtual,
    next_action: m.proximaAcao,
    decision_summary: m.decisoes.length ? `${m.decisoes[m.decisoes.length - 1].acao}: ${m.decisoes[m.decisoes.length - 1].resultado}` : null,
    confidence: null,
    evidence: m.criterios.filter((c) => c.ok && c.evidencia).map((c) => `${c.id}: ${c.evidencia}`),
    assumptions: [],
    risks: m.status === "blocked" || m.status === "failed" || m.status === "budget_exhausted" ? [m.bloqueio] : [],
    dependencies: m.status === "approval_required" ? ["decisão do gestor"] : [],
    approvals_needed: m.status === "approval_required" ? ["gestor"] : [],
    artifacts: [],
    resources_used: { attempts: m.tentativas, max_attempts: m.maxTentativas, tokens_in: m.tokens.input, tokens_out: m.tokens.output, max_tokens_out: m.maxTokensSaida },
    definition_of_done_progress: progresso(m),
  };
}
