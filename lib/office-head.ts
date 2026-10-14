/**
 * Motor do Head de CS do Office. O Head é ativado por evento, heartbeat ou pelo gestor; a cada
 * ativação lê o estado, decide e devolve despachos em JSON. O motor (não o modelo) valida
 * autoridade, orçamento e idempotência, grava a fila, a trilha e o checkpoint.
 *
 * Limites reais deste ambiente: tudo roda neste navegador (localStorage) e só enquanto a página
 * está aberta; não há SLAs, health score, uso de produto nem mensagens de clientes; os agentes
 * só geram texto. O que falta é declarado no estado lido, para o Head pedir em runtime_requirements.
 */
import type { ModoAutonomia } from "./office-policy";
import type { PapelAgente } from "./office-scenarios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type StatusTarefa =
  | "solicitado" | "aceito" | "atribuido" | "iniciado" | "bloqueado"
  | "aguardando_aprovacao" | "concluido" | "validado" | "falhou" | "cancelado";

export const ROTULO_TAREFA: Record<StatusTarefa, string> = {
  solicitado: "Solicitada", aceito: "Aceita", atribuido: "Atribuída", iniciado: "Iniciada", bloqueado: "Bloqueada",
  aguardando_aprovacao: "Aguardando aprovação", concluido: "Concluída (não validada)", validado: "Validada", falhou: "Falhou", cancelado: "Cancelada",
};

export interface TarefaHead {
  id: string;
  chave: string;
  agenteId: string;
  bu: string;
  role: PapelAgente;
  resultado: string;
  motivo: string;
  prioridade: string;
  contexto: string;
  prazo: string;
  checkpoint: string;
  dependencias: string[];
  permitidas: string[];
  proibidas: string[];
  aceite: string[];
  evidencia: string[];
  escalar: string[];
  status: StatusTarefa;
  criadaEm: string;
  atualizadaEm: string;
  tentativas: number;
  ativacaoId: string;
  aprovacaoId?: string;
  bloqueio?: string;
  /** Fatos do motor sobre a entrega (formato, alertas, tokens); o texto do agente não volta ao Head. */
  evidenciasColetadas?: string;
  tokensSaida?: number;
}

export interface AprovacaoHead { id: string; ts: string; motivo: string; pedido: string; tarefaId?: string; estado: "pendente" | "aprovada" | "recusada"; decididaEm?: string }
export interface MensagemInterna { id: string; ts: string; de: string; para: string; texto: string }
export interface ContaHead { bu: string; risco: string | null; responsavel: string; plano: string; prazo: string; nota: string; atualizadaEm: string }
export interface Wakeup { at: string | null; on: string[]; reason: string }

export interface SaidaHead {
  activation_id?: string;
  leader_state?: string;
  situation_summary?: string;
  priorities?: { level?: string; account_id?: string; reason?: string; decision?: string; evidence_refs?: string[] }[];
  dispatches?: DespachoHead[];
  followups?: unknown[];
  state_updates?: { account_id?: string; risk?: string; owner?: string; plan?: string; due_at?: string; note?: string }[];
  approval_requests?: { reason?: string; request?: string; task_key?: string }[];
  escalations?: unknown[];
  internal_messages?: { to?: string; text?: string }[];
  validations?: { task_id?: string; accepted?: boolean; reason?: string }[];
  runtime_requirements?: unknown[];
  wakeup?: { at?: string | null; on?: string[]; reason?: string };
  human_update?: string;
}

export interface DespachoHead {
  task_id?: string;
  idempotency_key?: string;
  agent_id?: string;
  account_id?: string;
  desired_outcome?: string;
  reason?: string;
  priority?: string;
  context?: string;
  due_at?: string;
  checkpoint_at?: string;
  dependencies?: string[];
  allowed_actions?: string[];
  prohibited_actions?: string[];
  acceptance_criteria?: string[];
  evidence_required?: string[];
  escalate_when?: string[];
}

export interface AtivacaoHead {
  id: string;
  ts: string;
  motivo: string;
  saida: SaidaHead | null;
  erro?: string;
  criadas: string[];
  rejeitadas: { chave: string; motivo: string }[];
  aprovacoes: string[];
  tokens?: { input: number; output: number };
}

export interface ConfigHead {
  autonomo: boolean;
  heartbeatMin: number;
  maxConcorrencia: number;
  maxTentativasTarefa: number;
  maxAtivacoesDia: number;
  maxTokensSaidaDia: number;
}

export interface EstadoHead {
  tarefas: TarefaHead[];
  aprovacoes: AprovacaoHead[];
  mensagens: MensagemInterna[];
  contas: Record<string, ContaHead>;
  checkpoint: { id: string; ts: string; ativacaoId: string; resumo: string; wakeup: Wakeup } | null;
  ativacoes: AtivacaoHead[];
  eventosPendentes: { ts: string; tipo: string; bu?: string }[];
  config: ConfigHead;
  uso: { dia: string; ativacoes: number; tokensSaida: number };
  ultimaAtivacaoEm: string | null;
}

export const CONFIG_PADRAO: ConfigHead = {
  autonomo: false, heartbeatMin: 15, maxConcorrencia: 2, maxTentativasTarefa: 3, maxAtivacoesDia: 8, maxTokensSaidaDia: 60000,
};

const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export function estadoInicial(): EstadoHead {
  return {
    tarefas: [], aprovacoes: [], mensagens: [], contas: {}, checkpoint: null, ativacoes: [], eventosPendentes: [],
    config: { ...CONFIG_PADRAO }, uso: { dia: hoje(), ativacoes: 0, tokensSaida: 0 }, ultimaAtivacaoEm: null,
  };
}

export const MAX_TAREFAS = 120;
const id = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Fontes de estado ───────────────────────────────────────────────────────────

export interface AgenteInfo { id: string; bu: string; role: PapelAgente; nome: string }

export interface SnapshotEntrada {
  empresas: { bu: string; nome: string; trabalhando: number; agentes: number; execs: number; alta: number; estados?: Record<PapelAgente, string> }[];
  missoes: { id: string; bu: string; status: string; progresso: number; bloqueio: string | null; proxima: string; tentativas: number; max: number }[];
  eventosRecentes: { ts: string; tipo: string; bu: string; ator: string; acao: string; erro?: string }[];
}

/** read_cs_state: carteira, riscos e compromissos que o Head enxerga. Nunca inclui o conteúdo das entregas. */
export function lerEstadoCS(estado: EstadoHead, snap: SnapshotEntrada) {
  const abertas = estado.tarefas.filter((t) => !["validado", "cancelado", "falhou"].includes(t.status));
  return {
    carteira: snap.empresas.map((e) => ({
      conta: e.bu,
      agentes_trabalhando: `${e.trabalhando}/${e.agentes}`,
      execucoes_registradas: e.execs,
      alertas_altos: e.alta,
      estado_dos_agentes: e.estados ?? null,
      missoes: snap.missoes.filter((m) => m.bu === e.bu).slice(-3),
      conta_em_acompanhamento: estado.contas[e.bu] ?? null,
      tarefas_abertas: abertas.filter((t) => t.bu === e.bu).map(resumoTarefa),
    })),
    aprovacoes_pendentes: estado.aprovacoes.filter((a) => a.estado === "pendente").map((a) => ({ id: a.id, motivo: a.motivo, pedido: a.pedido })),
    tarefas_vencidas: abertas.filter((t) => new Date(t.prazo).getTime() < Date.now()).map(resumoTarefa),
    tarefas_concluidas_sem_validacao: estado.tarefas.filter((t) => t.status === "concluido").map((t) => ({ ...resumoTarefa(t), evidencias_do_motor: t.evidenciasColetadas })),
    eventos_desde_o_ultimo_checkpoint: estado.eventosPendentes.slice(-20),
    eventos_recentes_do_sistema: snap.eventosRecentes.slice(-15),
    ultimo_checkpoint: estado.checkpoint ? { ts: estado.checkpoint.ts, resumo: estado.checkpoint.resumo, wakeup: estado.checkpoint.wakeup } : null,
    indisponivel_neste_ambiente: [
      "SLAs e tickets", "health score e seus sinais", "uso e adoção do produto", "mensagens e feedbacks de clientes",
      "janelas de renovação", "compromissos formais com clientes", "conteúdo das entregas (por isolamento de cliente)",
    ],
  };
}

const resumoTarefa = (t: TarefaHead) => ({ id: t.id, agente: t.agenteId, conta: t.bu, resultado: t.resultado, status: t.status, prazo: t.prazo, checkpoint: t.checkpoint, tentativas: t.tentativas, bloqueio: t.bloqueio ?? null });

const COMPETENCIAS: Record<PapelAgente, string[]> = {
  cs: ["triagem", "relacionamento com a conta", "consolidação e validação", "pacote de aprovação"],
  ref: ["pesquisa e referências", "briefing", "inteligência de mercado"],
  criativo: ["produção de peças", "edição e revisão de texto"],
  midia: ["plano de publicação", "calendário e canais"],
};

/** list_agent_capacity: status, competências, carga e lease (lease = tarefa iniciada; expira no prazo). */
export function capacidadeDosAgentes(estado: EstadoHead, agentes: AgenteInfo[], statusPorAgente: (a: AgenteInfo) => string) {
  return agentes.map((a) => {
    const ativas = estado.tarefas.filter((t) => t.agenteId === a.id && ["atribuido", "iniciado", "aceito"].includes(t.status));
    const lease = ativas.filter((t) => t.status === "iniciado").map((t) => t.prazo).sort()[0] ?? null;
    return {
      agent_id: a.id, nome: a.nome, conta: a.bu, funcao: a.role, competencias: COMPETENCIAS[a.role],
      status: statusPorAgente(a), tarefas_ativas: ativas.length, capacidade_livre: Math.max(0, estado.config.maxConcorrencia - ativas.length),
      lease_until: lease, presenca: "presença em tempo real indisponível: status vem do último evento registrado",
    };
  });
}

// ── Ferramentas de escrita (validadas pelo motor) ──────────────────────────────

export interface CtxMotor {
  agentes: AgenteInfo[];
  modoDe: (bu: string, role: PapelAgente) => ModoAutonomia;
  agora: Date;
}

const SENSIVEL = /desconto|cr[eé]dito|reembolso|contrat|cl[aá]usula|jur[ií]dic|enviar ao cliente|contatar o cliente|responder ao cliente|publicar|postar|agendar|compartilhar dados|excluir dados|prazo ao cliente|promet/i;

export type ResultadoCriar = { estado: EstadoHead; tarefa?: TarefaHead; rejeicao?: string; aprovacao?: AprovacaoHead };

/** create_and_assign_task: valida agente, isolamento, política, concorrência, idempotência e autoridade. */
export function criarTarefa(estado: EstadoHead, d: DespachoHead, ativacaoId: string, ctx: CtxMotor): ResultadoCriar {
  const agente = ctx.agentes.find((a) => a.id.toLowerCase() === (d.agent_id ?? "").toLowerCase());
  if (!agente) return { estado, rejeicao: `agente "${d.agent_id ?? "?"}" não existe na capacidade informada` };
  if (!d.desired_outcome?.trim()) return { estado, rejeicao: "falta o resultado esperado" };
  if (!d.acceptance_criteria?.length) return { estado, rejeicao: "faltam critérios de aceitação objetivos" };
  if (!d.evidence_required?.length) return { estado, rejeicao: "falta a evidência exigida" };
  if (d.account_id && d.account_id !== agente.bu) return { estado, rejeicao: `isolamento: tarefa da conta "${d.account_id}" não pode ir a agente de "${agente.bu}"` };
  const chave = d.idempotency_key?.trim() || `${agente.id}|${d.desired_outcome.trim().toLowerCase().slice(0, 60)}`;
  const dup = estado.tarefas.find((t) => t.chave === chave && !["cancelado", "falhou"].includes(t.status));
  if (dup) return { estado, rejeicao: `duplicada (chave já usada pela tarefa ${dup.id})` };
  if (ctx.modoDe(agente.bu, agente.role) === "bloqueado") return { estado, rejeicao: "política de autonomia bloqueia este agente" };
  const ativas = estado.tarefas.filter((t) => t.agenteId === agente.id && ["atribuido", "iniciado", "aceito", "aguardando_aprovacao"].includes(t.status));
  if (ativas.length >= estado.config.maxConcorrencia) return { estado, rejeicao: `agente no limite de ${estado.config.maxConcorrencia} tarefas simultâneas` };

  const prazoMs = Date.parse(d.due_at ?? "");
  const prazo = Number.isFinite(prazoMs) && prazoMs > ctx.agora.getTime() ? new Date(prazoMs).toISOString() : new Date(ctx.agora.getTime() + 24 * 3600 * 1000).toISOString();
  const cpMs = Date.parse(d.checkpoint_at ?? "");
  const checkpoint = Number.isFinite(cpMs) && cpMs > ctx.agora.getTime() && cpMs <= Date.parse(prazo) ? new Date(cpMs).toISOString() : new Date(ctx.agora.getTime() + (Date.parse(prazo) - ctx.agora.getTime()) / 2).toISOString();
  const agoraIso = ctx.agora.toISOString();
  const precisaAprovar = SENSIVEL.test(`${d.desired_outcome} ${d.context ?? ""} ${(d.allowed_actions ?? []).join(" ")}`);
  const tarefa: TarefaHead = {
    id: d.task_id?.trim() || id("tarefa"), chave, agenteId: agente.id, bu: agente.bu, role: agente.role,
    resultado: d.desired_outcome.trim(), motivo: d.reason?.trim() ?? "", prioridade: d.priority ?? "P2", contexto: (d.context ?? "").slice(0, 1500),
    prazo, checkpoint, dependencias: d.dependencies ?? [], permitidas: d.allowed_actions ?? [],
    proibidas: Array.from(new Set([...(d.prohibited_actions ?? []), "contatar o cliente", "publicar ou enviar qualquer coisa", "oferecer condição comercial", "usar dados de outras contas"])),
    aceite: d.acceptance_criteria, evidencia: d.evidence_required, escalar: d.escalate_when ?? [],
    status: precisaAprovar ? "aguardando_aprovacao" : "atribuido", criadaEm: agoraIso, atualizadaEm: agoraIso, tentativas: 0, ativacaoId,
  };
  let novoEstado: EstadoHead = { ...estado, tarefas: [...estado.tarefas, tarefa].slice(-MAX_TAREFAS) };
  let aprovacao: AprovacaoHead | undefined;
  if (precisaAprovar) {
    const r = pedirAprovacao(novoEstado, "Tarefa toca ação sensível (comunicação externa, condição comercial, dados ou contrato)", `Liberar a tarefa ${tarefa.id}: ${tarefa.resultado}`, tarefa.id, ctx.agora);
    novoEstado = r.estado; aprovacao = r.aprovacao;
    novoEstado = { ...novoEstado, tarefas: novoEstado.tarefas.map((t) => (t.id === tarefa.id ? { ...t, aprovacaoId: r.aprovacao.id } : t)) };
  }
  return { estado: novoEstado, tarefa, aprovacao };
}

/** request_approval */
export function pedirAprovacao(estado: EstadoHead, motivo: string, pedido: string, tarefaId: string | undefined, agora: Date): { estado: EstadoHead; aprovacao: AprovacaoHead } {
  const aprovacao: AprovacaoHead = { id: id("aprov"), ts: agora.toISOString(), motivo, pedido, tarefaId, estado: "pendente" };
  return { estado: { ...estado, aprovacoes: [...estado.aprovacoes, aprovacao].slice(-60) }, aprovacao };
}

/** Decisão do gestor sobre uma aprovação: libera ou cancela a tarefa ligada. */
export function decidirAprovacao(estado: EstadoHead, aprovacaoId: string, decisao: "aprovada" | "recusada", agora: Date): EstadoHead {
  const ap = estado.aprovacoes.find((a) => a.id === aprovacaoId);
  if (!ap || ap.estado !== "pendente") return estado;
  const iso = agora.toISOString();
  return {
    ...estado,
    aprovacoes: estado.aprovacoes.map((a) => (a.id === aprovacaoId ? { ...a, estado: decisao, decididaEm: iso } : a)),
    tarefas: estado.tarefas.map((t) => (t.id === ap.tarefaId && t.status === "aguardando_aprovacao" ? { ...t, status: decisao === "aprovada" ? "atribuido" : "cancelado", atualizadaEm: iso, bloqueio: decisao === "recusada" ? "Recusada pelo gestor" : undefined } : t)),
    eventosPendentes: [...estado.eventosPendentes, { ts: iso, tipo: decisao === "aprovada" ? "approval_granted" : "approval_refused" }].slice(-60),
  };
}

/** send_internal_message */
export function mensagemInterna(estado: EstadoHead, de: string, para: string, texto: string, agora: Date): EstadoHead {
  return { ...estado, mensagens: [...estado.mensagens, { id: id("msg"), ts: agora.toISOString(), de, para, texto: texto.slice(0, 600) }].slice(-80) };
}

/** update_customer_state: só campos internos de acompanhamento da conta. */
export function atualizarConta(estado: EstadoHead, bu: string, p: { risco?: string; responsavel?: string; plano?: string; prazo?: string; nota?: string }, agora: Date): EstadoHead {
  const atual = estado.contas[bu] ?? { bu, risco: null, responsavel: "", plano: "", prazo: "", nota: "", atualizadaEm: "" };
  return { ...estado, contas: { ...estado.contas, [bu]: { ...atual, risco: p.risco ?? atual.risco, responsavel: p.responsavel ?? atual.responsavel, plano: p.plano ?? atual.plano, prazo: p.prazo ?? atual.prazo, nota: (p.nota ?? atual.nota).slice(0, 400), atualizadaEm: agora.toISOString() } } };
}

/** save_leader_checkpoint + schedule_wakeup */
export function salvarCheckpoint(estado: EstadoHead, ativacaoId: string, resumo: string, wakeup: Wakeup, agora: Date): EstadoHead {
  return { ...estado, checkpoint: { id: id("ckpt"), ts: agora.toISOString(), ativacaoId, resumo: resumo.slice(0, 600), wakeup }, eventosPendentes: [] };
}

export function normalizarWakeup(w: SaidaHead["wakeup"], agora: Date): Wakeup {
  const ms = Date.parse(w?.at ?? "");
  const at = Number.isFinite(ms) && ms > agora.getTime() ? new Date(ms).toISOString() : null;
  return { at, on: (w?.on ?? []).slice(0, 8), reason: (w?.reason ?? "").slice(0, 200) };
}

// ── Limites e ativação ─────────────────────────────────────────────────────────

export function zerarUsoSeNovoDia(e: EstadoHead): EstadoHead {
  return e.uso.dia === hoje() ? e : { ...e, uso: { dia: hoje(), ativacoes: 0, tokensSaida: 0 } };
}

export function limiteDoDia(e: EstadoHead): string | null {
  const u = zerarUsoSeNovoDia(e).uso;
  if (u.ativacoes >= e.config.maxAtivacoesDia) return `limite de ${e.config.maxAtivacoesDia} ativações por dia atingido`;
  if (u.tokensSaida >= e.config.maxTokensSaidaDia) return `limite de ${e.config.maxTokensSaidaDia.toLocaleString("pt-BR")} tokens de saída por dia atingido`;
  return null;
}

/** Motivo para ativar agora (heartbeat, wakeup vencido ou eventos pendentes), ou null. */
export function ativacaoDevida(e: EstadoHead, agora: Date): string | null {
  if (!e.config.autonomo || limiteDoDia(e)) return null;
  const ult = e.ultimaAtivacaoEm ? Date.parse(e.ultimaAtivacaoEm) : 0;
  const wk = e.checkpoint?.wakeup;
  if (wk?.at && Date.parse(wk.at) <= agora.getTime()) return `wakeup agendado (${wk.reason || "sem motivo"})`;
  if (e.eventosPendentes.length > 0 && agora.getTime() - ult > 60_000) return `eventos: ${Array.from(new Set(e.eventosPendentes.map((x) => x.tipo))).join(", ")}`;
  if (agora.getTime() - ult >= e.config.heartbeatMin * 60_000) return "heartbeat de segurança";
  return null;
}

export function registrarEvento(e: EstadoHead, tipo: string, bu: string | undefined, agora: Date): EstadoHead {
  return { ...e, eventosPendentes: [...e.eventosPendentes, { ts: agora.toISOString(), tipo, bu }].slice(-60) };
}

export function atualizarTarefa(e: EstadoHead, tarefaId: string, p: Partial<TarefaHead>, agora: Date): EstadoHead {
  return { ...e, tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, ...p, atualizadaEm: agora.toISOString() } : t)) };
}

/** Aplica a saída do Head: grava tarefas (validadas), aprovações, contas, mensagens, checkpoint e wakeup. */
export function aplicarSaida(estado: EstadoHead, saida: SaidaHead, ativacaoId: string, motivo: string, ctx: CtxMotor, tokens?: { input: number; output: number }): { estado: EstadoHead; ativacao: AtivacaoHead } {
  let e = zerarUsoSeNovoDia(estado);
  const criadas: string[] = [];
  const rejeitadas: { chave: string; motivo: string }[] = [];
  const aprovacoes: string[] = [];
  for (const d of (saida.dispatches ?? []).slice(0, 8)) {
    const r = criarTarefa(e, d, ativacaoId, ctx);
    e = r.estado;
    if (r.tarefa) criadas.push(r.tarefa.id);
    else rejeitadas.push({ chave: d.idempotency_key ?? d.task_id ?? d.desired_outcome?.slice(0, 40) ?? "?", motivo: r.rejeicao ?? "inválida" });
    if (r.aprovacao) aprovacoes.push(r.aprovacao.id);
  }
  for (const v of (saida.validations ?? []).slice(0, 10)) {
    const t = e.tarefas.find((x) => x.id === v.task_id && x.status === "concluido");
    if (!t) continue;
    const reabre = v.accepted === false && t.tentativas < e.config.maxTentativasTarefa;
    e = atualizarTarefa(e, t.id, { status: v.accepted ? "validado" : reabre ? "atribuido" : "falhou", bloqueio: v.accepted ? undefined : (v.reason ?? "Reprovada na validação").slice(0, 200) }, ctx.agora);
  }
  for (const a of (saida.approval_requests ?? []).slice(0, 5)) {
    if (!a.request?.trim()) continue;
    const r = pedirAprovacao(e, a.reason ?? "Decisão fora da autoridade do Head", a.request, undefined, ctx.agora);
    e = r.estado; aprovacoes.push(r.aprovacao.id);
  }
  for (const u of (saida.state_updates ?? []).slice(0, 8)) {
    const bu = ctx.agentes.find((a) => a.bu.toLowerCase() === (u.account_id ?? "").toLowerCase())?.bu;
    if (bu) e = atualizarConta(e, bu, { risco: u.risk, responsavel: u.owner, plano: u.plan, prazo: u.due_at, nota: u.note }, ctx.agora);
  }
  for (const m of (saida.internal_messages ?? []).slice(0, 6)) if (m.text?.trim()) e = mensagemInterna(e, "Head de CS", m.to ?? "equipe", m.text, ctx.agora);
  const wakeup = normalizarWakeup(saida.wakeup, ctx.agora);
  e = salvarCheckpoint(e, ativacaoId, saida.situation_summary ?? "", wakeup, ctx.agora);
  const ativacao: AtivacaoHead = { id: ativacaoId, ts: ctx.agora.toISOString(), motivo, saida, criadas, rejeitadas, aprovacoes, tokens };
  e = {
    ...e, ativacoes: [...e.ativacoes, ativacao].slice(-20), ultimaAtivacaoEm: ctx.agora.toISOString(),
    uso: { ...e.uso, ativacoes: e.uso.ativacoes + 1, tokensSaida: e.uso.tokensSaida + (tokens?.output ?? 0) },
  };
  return { estado: e, ativacao };
}

/** `contar` falso: falha de credencial/crédito não consome o limite diário de ativações (nada foi gasto nem decidido). */
export function registrarFalhaAtivacao(estado: EstadoHead, ativacaoId: string, motivo: string, erro: string, agora: Date, tokens?: { input: number; output: number }, contar = true): EstadoHead {
  const e = zerarUsoSeNovoDia(estado);
  const a: AtivacaoHead = { id: ativacaoId, ts: agora.toISOString(), motivo, saida: null, erro, criadas: [], rejeitadas: [], aprovacoes: [], tokens };
  return { ...e, ativacoes: [...e.ativacoes, a].slice(-20), ultimaAtivacaoEm: agora.toISOString(), uso: { ...e.uso, ativacoes: e.uso.ativacoes + (contar ? 1 : 0), tokensSaida: e.uso.tokensSaida + (tokens?.output ?? 0) } };
}

/** Tarefas prontas para entrega (atribuídas e sem dependência aberta), respeitando a concorrência global. */
export function tarefasParaEntregar(e: EstadoHead): TarefaHead[] {
  const emAndamento = e.tarefas.filter((t) => t.status === "iniciado").length;
  const livres = Math.max(0, e.config.maxConcorrencia - emAndamento);
  const abertas = new Set(e.tarefas.filter((t) => !["validado", "concluido", "cancelado", "falhou"].includes(t.status)).map((t) => t.id));
  return e.tarefas
    .filter((t) => t.status === "atribuido" && t.tentativas < e.config.maxTentativasTarefa && !t.dependencias.some((d) => abertas.has(d)))
    .sort((a, b) => a.prioridade.localeCompare(b.prioridade) || a.prazo.localeCompare(b.prazo))
    .slice(0, livres);
}

/** Texto enviado ao agente que recebe a tarefa. Só contém o contexto da própria conta. */
export function promptDaTarefa(t: TarefaHead): string {
  return [
    `TAREFA DELEGADA PELO HEAD DE CS (${t.id}, prioridade ${t.prioridade})`,
    `CONTA: ${t.bu}`,
    `RESULTADO ESPERADO: ${t.resultado}`,
    t.motivo ? `MOTIVO: ${t.motivo}` : "",
    t.contexto ? `CONTEXTO:\n${t.contexto}` : "",
    `PRAZO: ${new Date(t.prazo).toLocaleString("pt-BR")} | CHECKPOINT: ${new Date(t.checkpoint).toLocaleString("pt-BR")}`,
    t.permitidas.length ? `AÇÕES PERMITIDAS: ${t.permitidas.join("; ")}` : "AÇÕES PERMITIDAS: apenas gerar texto como rascunho",
    `AÇÕES PROIBIDAS: ${t.proibidas.join("; ")}`,
    `CRITÉRIOS DE ACEITE:\n${t.aceite.map((a) => `- ${a}`).join("\n")}`,
    `EVIDÊNCIA EXIGIDA:\n${t.evidencia.map((a) => `- ${a}`).join("\n")}`,
    t.escalar.length ? `ESCALE QUANDO: ${t.escalar.join("; ")}` : "",
    "Entregue em texto, como RASCUNHO, e liste ao final cada critério de aceite com a evidência correspondente. Se não conseguir atender algum, diga qual e por quê, sem inventar.",
  ].filter(Boolean).join("\n\n");
}

// ── Prompt do Head ─────────────────────────────────────────────────────────────

export const PROMPT_HEAD = `Você é o Head de Customer Success da AWQ. Você dirige a operação de CS, coordena agentes, protege compromissos, remove bloqueios e busca resultado comprovado para o cliente. Você só age quando é ativado, e isso não o torna passivo: a cada ativação execute um ciclo completo de liderança (observar, priorizar, decidir, delegar, acompanhar, verificar, registrar e programar a continuidade). Não use a falta de execução contínua como desculpa para esperar instruções, devolver a gestão ao gestor, deixar risco sem responsável ou tarefa sem próximo passo.

Ao ser ativado, responda internamente: por que fui ativado; o que mudou desde o último checkpoint; qual conta está mais exposta; o que está atrasado, bloqueado ou sem responsável; o que decido agora; o que delego; o que depende de aprovação; que evidência comprovará a conclusão; quando ou por qual evento devo ser ativado de novo. Não pergunte "o que você quer que eu faça?" quando o estado e as políticas já permitem uma decisão segura.

Prioridades: P0 segurança, privacidade, jurídico, reputação, incidente ou churn iminente; P1 cliente bloqueado, SLA ameaçado, compromisso crítico atrasado; P2 adoção baixa, onboarding parado, renovação controlável; P3 manutenção, playbook, melhoria. Desempate: prevenção de dano, compromisso assumido, urgência, desbloqueio de dependências, número de contas afetadas, reversibilidade, valor estratégico. Nenhum P0 ou P1 termina sem responsável, ação, prazo e próximo checkpoint. Para cada prioridade escolha explicitamente: executar agora, delegar, acompanhar, remover bloqueio, replanejar, solicitar aprovação, escalar, aguardar evento externo ou encerrar com conclusão comprovada.

Delegação (campo dispatches): cada uma exige agent_id (use exatamente um agent_id da lista de capacidade), account_id da mesma conta do agente, desired_outcome específico, reason e priority, context só da própria conta, due_at e checkpoint_at (ISO 8601 com fuso), dependencies, allowed_actions, prohibited_actions, acceptance_criteria objetivos, evidence_required, escalate_when e idempotency_key única e estável. Nunca delegue com "veja isso", "acompanhe" ou "resolva". Delegar não é concluir: solicitado, aceito, atribuído, iniciado, bloqueado, aguardando aprovação, concluído e validado são estados distintos. Tarefa "concluída" só vira "validada" depois que você confere as evidências do motor e a registra em validations (accepted true ou false; false reabre a tarefa com o motivo).

Em um checkpoint, compare progresso com o resultado esperado, examine as evidências, identifique o bloqueio real, remova dependências sob sua autoridade, reduza o escopo quando fizer sentido e só reatribua com justificativa. Não repita cobrança genérica: após duas tentativas sem avanço mude a abordagem; após três abordagens distintas sem solução, escale com diagnóstico e recomendação. Não crie tarefas só para manter agentes ocupados. Respeite capacidade livre, lease e competências.

Autoridade: você pode analisar a carteira, priorizar, criar e atribuir tarefas internas, pedir diagnósticos, cobrar checkpoints, atualizar registros internos e preparar respostas e planos. Exigem aprovação do gestor (Miguel): descontos, créditos e reembolsos; alterações contratuais; compromissos externos de prazo; incidentes graves; compartilhamento ou exclusão de dados; ações jurídicas, financeiras ou reputacionais; qualquer comunicação externa. Os agentes só geram texto: nada é enviado ou publicado. Nunca amplie sua autoridade.

Isolamento: você vê o estado operacional de cada conta, nunca o conteúdo das entregas nem dados de uma conta nas tarefas de outra. Sem dados pessoais, de menores ou de pacientes.

Honestidade: o estado lido lista o que este ambiente NÃO tem (SLAs, health score, adoção, mensagens de clientes etc.). Não invente esses dados nem monitoramento em tempo real. Quando faltar capacidade, preencha runtime_requirements com capacidade ausente, motivo, dados mínimos, ação solicitada e alternativa segura agora, e continue liderando com o que existe. Não declare conclusão sem evidência. Não diga que ficará monitorando em segundo plano: só o wakeup que você programar (wakeup.at e wakeup.on) vale, e ele só dispara enquanto a página do simulador estiver aberta.

Responda SOMENTE com um bloco \`\`\`json com este formato (listas vazias quando não houver itens):
{"activation_id":"","leader_state":"acting|stable|blocked|awaiting_approval","situation_summary":"","priorities":[{"level":"P0|P1|P2|P3","account_id":"","reason":"","decision":"","evidence_refs":[]}],"dispatches":[{"task_id":"","idempotency_key":"","agent_id":"","account_id":"","desired_outcome":"","reason":"","priority":"","context":"","due_at":"","checkpoint_at":"","dependencies":[],"allowed_actions":[],"prohibited_actions":[],"acceptance_criteria":[],"evidence_required":[],"escalate_when":[]}],"followups":[],"state_updates":[{"account_id":"","risk":"","owner":"","plan":"","due_at":"","note":""}],"approval_requests":[{"reason":"","request":""}],"escalations":[],"internal_messages":[{"to":"","text":""}],"validations":[{"task_id":"","accepted":true,"reason":"conferido contra os critérios e as evidências do motor"}],"runtime_requirements":[{"capability":"","reason":"","minimum_data":"","requested_action":"","safe_alternative":""}],"wakeup":{"at":"","on":[],"reason":""},"human_update":"situação atual, maior risco, decisões, tarefas distribuídas, aprovação necessária e próximo checkpoint, em poucas linhas"}`;

export function promptDoHead(p: { ativacaoId: string; motivo: string; agora: Date; estadoCS: unknown; capacidade: unknown }): string {
  return [
    PROMPT_HEAD,
    "---",
    `ATIVAÇÃO: ${p.ativacaoId}`,
    `MOTIVO DA ATIVAÇÃO: ${p.motivo}`,
    `AGORA: ${p.agora.toISOString()} (America/Sao_Paulo = UTC-3)`,
    `ESTADO LIDO (read_cs_state):\n${JSON.stringify(p.estadoCS)}`,
    `CAPACIDADE DOS AGENTES (list_agent_capacity):\n${JSON.stringify(p.capacidade)}`,
  ].join("\n\n");
}

/** Extrai o JSON da resposta (bloco ```json ou primeiro objeto). */
export function parseSaida(texto: string): SaidaHead | null {
  const bloco = texto.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
  if (!bloco) return null;
  try {
    const o = JSON.parse(bloco) as SaidaHead;
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}
