/**
 * Ponte entre o estado estruturado que o CS de cada conta devolve ao fim de uma ativação
 * (dispatch_requests, approval_requests, state_updates, checkpoint, wakeup, runtime_requirements)
 * e o motor do Head: os pedidos viram tarefas reais, validadas pelas mesmas regras (isolamento,
 * aceite e evidência obrigatórios, política, concorrência, idempotência, ação sensível →
 * aprovação do gestor). Só vale para a conta do próprio CS.
 */
import {
  atualizarConta, criarTarefa, mensagemInterna, pedirAprovacao, type AgenteInfo, type CtxMotor, type DespachoHead, type EstadoHead,
} from "./office-head";

export interface EstadoCS {
  account_id?: string;
  operational_state?: string;
  dispatch_requests?: (DespachoHead & { agent?: string; competence?: string })[];
  approval_requests?: { reason?: string; request?: string }[];
  state_updates?: { risk?: string; owner?: string; plan?: string; due_at?: string; note?: string }[];
  runtime_requirements?: { capability?: string; impact?: string; requested_action?: string; fallback_completed?: string }[];
  wakeup?: { at?: string | null; on?: string[]; reason?: string };
  checkpoint?: { current_objective?: string; open_tasks?: unknown[]; pending_decisions?: unknown[]; risks?: unknown[]; next_actions?: unknown[] };
  human_update?: string;
}

/** Último objeto JSON do texto que se pareça com o estado do CS; null se não houver. */
export function extrairEstadoCS(texto: string): EstadoCS | null {
  const blocos = [...texto.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  const ini = texto.indexOf("{"), fim = texto.lastIndexOf("}");
  if (ini >= 0 && fim > ini) blocos.push(texto.slice(ini, fim + 1));
  for (const b of blocos.reverse()) {
    try {
      const o = JSON.parse(b) as EstadoCS;
      if (o && typeof o === "object" && !Array.isArray(o) && ("dispatch_requests" in o || "checkpoint" in o || "wakeup" in o || "runtime_requirements" in o)) return o;
    } catch { /* tenta o próximo */ }
  }
  return null;
}

/** Resolve o agente pedido (id, papel ou nome da competência) dentro da própria conta. */
export function resolverAgente(pedido: string | undefined, bu: string, agentes: AgenteInfo[]): AgenteInfo | undefined {
  const doBu = agentes.filter((a) => a.bu === bu && a.role !== "cs");
  const p = (pedido ?? "").toLowerCase();
  if (!p) return undefined;
  const exato = doBu.find((a) => a.id.toLowerCase() === p || a.role === p || a.nome.toLowerCase() === p);
  if (exato) return exato;
  const papel = /refer|pesquis|estrat|brief|inteligên|inteligen/.test(p) ? "ref" : /criativ|redat|copy|design|edit|roteir|revis/.test(p) ? "criativo" : /m[ií]dia|public|agend|tr[aá]fego|anal[ií]t|m[eé]trica/.test(p) ? "midia" : null;
  return doBu.find((a) => a.role === papel);
}

export interface ResultadoEstadoCS {
  estado: EstadoHead;
  criadas: string[];
  rejeitadas: { chave: string; motivo: string }[];
  aprovacoes: string[];
  exigencias: string[];
}

const lista = (x: unknown[] | undefined, n = 3) => (x ?? []).slice(0, n).map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join("; ");

export function aplicarEstadoCS(estado: EstadoHead, s: EstadoCS, bu: string, nomeCS: string, ativacaoId: string, ctx: CtxMotor): ResultadoEstadoCS {
  let e = estado;
  const criadas: string[] = [], aprovacoes: string[] = [], exigencias: string[] = [];
  const rejeitadas: { chave: string; motivo: string }[] = [];
  for (const d of (s.dispatch_requests ?? []).slice(0, 6)) {
    const chave = d.idempotency_key ?? d.task_id ?? d.desired_outcome?.slice(0, 40) ?? "?";
    if (d.account_id && d.account_id !== bu && d.account_id.toLowerCase() !== (s.account_id ?? "").toLowerCase()) { rejeitadas.push({ chave, motivo: `isolamento: o CS de "${bu}" não despacha para a conta "${d.account_id}"` }); continue; }
    const ag = resolverAgente(d.agent_id ?? d.agent ?? d.competence, bu, ctx.agentes);
    if (!ag) { rejeitadas.push({ chave, motivo: `agente "${d.agent_id ?? d.agent ?? d.competence ?? "?"}" não existe nesta squad` }); continue; }
    const r = criarTarefa(e, { ...d, agent_id: ag.id, account_id: bu }, ativacaoId, ctx);
    e = r.estado;
    if (r.tarefa) criadas.push(r.tarefa.id); else rejeitadas.push({ chave, motivo: r.rejeicao ?? "inválida" });
    if (r.aprovacao) aprovacoes.push(r.aprovacao.id);
  }
  for (const a of (s.approval_requests ?? []).slice(0, 4)) {
    if (!a.request?.trim()) continue;
    const r = pedirAprovacao(e, a.reason ?? `Pedido do CS ${nomeCS} (${bu})`, a.request, undefined, ctx.agora);
    e = r.estado; aprovacoes.push(r.aprovacao.id);
  }
  const u = (s.state_updates ?? [])[0];
  const c = s.checkpoint;
  const wake = s.wakeup?.at ? ` Próxima ativação: ${s.wakeup.at}${s.wakeup.on?.length ? ` ou ${s.wakeup.on.slice(0, 3).join(", ")}` : ""}.` : s.wakeup?.on?.length ? ` Reativar em: ${s.wakeup.on.slice(0, 3).join(", ")}.` : "";
  if (u || c) {
    e = atualizarConta(e, bu, {
      risco: u?.risk ?? (lista(c?.risks, 1) || undefined),
      responsavel: u?.owner ?? nomeCS,
      plano: u?.plan ?? (lista(c?.next_actions) || undefined),
      prazo: u?.due_at,
      nota: `${u?.note ?? c?.current_objective ?? ""}${wake}`.trim() || undefined,
    }, ctx.agora);
  }
  for (const r of (s.runtime_requirements ?? []).slice(0, 5)) if (r.capability?.trim()) exigencias.push(`${r.capability}: ${r.requested_action ?? r.impact ?? ""}`.slice(0, 200));
  if (criadas.length || aprovacoes.length || exigencias.length) {
    e = mensagemInterna(e, nomeCS, "Head de CS", `${bu}: ${criadas.length} tarefa(s) registrada(s), ${aprovacoes.length} aprovação(ões) pendente(s)${exigencias.length ? `; capacidades pedidas: ${exigencias.slice(0, 2).join(" | ")}` : ""}.${wake}`, ctx.agora);
  }
  return { estado: e, criadas, rejeitadas, aprovacoes, exigencias };
}
