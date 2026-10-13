/**
 * Fase 2 do backend do Office: ciclo do Head de CS executado no servidor (sem página aberta).
 * Reaproveita o motor puro (lib/office-head.ts) e o estado durável (lib/office-store.ts).
 *
 * Travas (todas precisam estar abertas para gastar créditos):
 *  - env OFFICE_HEAD_TICK=1 e OFFICE_TICK_SECRET definido (a rota exige o segredo);
 *  - chave da Anthropic no servidor (ANTHROPIC_API_KEY);
 *  - "Modo autônomo" ligado no painel do Head (estado head.config.autonomo);
 *  - limites diários de ativações e tokens do próprio estado.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS as AGENTES_BU } from "./agents-config";
import { SOCIAL_SQUADS } from "./social-squad";
import {
  aplicarSaida, ativacaoDevida, atualizarTarefa, capacidadeDosAgentes, estadoInicial, lerEstadoCS, limiteDoDia, parseSaida,
  promptDaTarefa, promptDoHead, registrarEvento, registrarFalhaAtivacao, tarefasParaEntregar,
  type AgenteInfo, type EstadoHead,
} from "./office-head";
import { analisar } from "./office-analysis";
import { novoEvento, MAX_EVENTOS, type EventoOffice } from "./office-events";
import { chavePolitica, modoDe, type ModoAutonomia, type Politicas } from "./office-policy";
import { mesclarEventos, mesclarHead } from "./office-sync";
import type { Missao } from "./office-missions";
import type { PapelAgente } from "./office-scenarios";
import { gravarEstado, lerEstado } from "./office-store";

const MODELO = "claude-sonnet-5-5";
const SQUADS = SOCIAL_SQUADS;
const PAPEIS: PapelAgente[] = ["cs", "ref", "criativo", "midia"];

export type ResultadoTick = { status: "ignorado"; motivo: string } | { status: "ok"; ativado: string | null; entregues: number; erros: string[] };

export function tickHabilitado(): { ok: true } | { ok: false; motivo: string } {
  if (process.env.OFFICE_HEAD_TICK !== "1") return { ok: false, motivo: "OFFICE_HEAD_TICK não está ligado" };
  if (!process.env.OFFICE_TICK_SECRET) return { ok: false, motivo: "OFFICE_TICK_SECRET não definido" };
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k || k === "sk-ant-api03-placeholder") return { ok: false, motivo: "ANTHROPIC_API_KEY ausente no servidor" };
  return { ok: true };
}

function agentesDoServidor(): { info: AgenteInfo[]; system: Record<string, string> } {
  const info: AgenteInfo[] = [];
  const system: Record<string, string> = {};
  for (const a of SQUADS) {
    if (!a.id.startsWith("social-") || a.id.includes("teste-interno")) continue;
    const role = PAPEIS.find((r) => a.id.endsWith(`-${r}`));
    if (!role) continue;
    const id = `${a.bu}|${role}`;
    info.push({ id, bu: a.bu, role, nome: a.name.split(" · ")[0] });
    system[id] = a.system;
  }
  return { info, system };
}

async function chamar(client: Anthropic, system: string, prompt: string, maxTokens: number) {
  const r = await client.messages.create({ model: MODELO, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] });
  const texto = r.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  return { texto, usage: { input: r.usage?.input_tokens ?? 0, output: r.usage?.output_tokens ?? 0 } };
}

export async function executarTick(): Promise<ResultadoTick> {
  const hab = tickHabilitado();
  if (!hab.ok) return { status: "ignorado", motivo: hab.motivo };
  const leitura = await lerEstado();
  if (!leitura.ok) return { status: "ignorado", motivo: leitura.mensagem };
  const verHead = leitura.dados.head;
  if (!verHead) return { status: "ignorado", motivo: "Ainda não há estado do Head no servidor (abra o simulador uma vez com a migration aplicada)" };

  let head: EstadoHead = { ...estadoInicial(), ...(verHead.value as EstadoHead) };
  head.config = { ...estadoInicial().config, ...head.config };
  if (!head.config.autonomo) return { status: "ignorado", motivo: "Modo autônomo desligado no painel do Head" };
  const missoes = (leitura.dados.missions?.value as Missao[] | undefined) ?? [];
  let eventos = (leitura.dados.events?.value as EventoOffice[] | undefined) ?? [];
  const politicas = (leitura.dados.policies?.value as Politicas | undefined) ?? {};

  const { info, system } = agentesDoServidor();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const erros: string[] = [];
  const registrar = (e: Omit<EventoOffice, "id" | "ts">) => { eventos = [...eventos, novoEvento(e)].slice(-MAX_EVENTOS); };
  const ctx = () => ({ agentes: info, modoDe: (b: string, r: PapelAgente): ModoAutonomia => modoDe(politicas, b, r, "livre"), agora: new Date() });
  const statusDoAgente = (a: AgenteInfo) => {
    const ult = [...eventos].reverse().find((e) => e.bu === a.bu && e.ator === a.role && /^Action/.test(e.tipo));
    return !ult ? "disponível (sem atividade registrada)" : ult.tipo === "ActionFailed" ? "com falha na última ação" : "disponível";
  };

  // 1) Entrega das tarefas atribuídas (uma execução real por tarefa, respeitando a concorrência)
  let entregues = 0;
  for (const t of tarefasParaEntregar(head)) {
    head = atualizarTarefa(head, t.id, { status: "iniciado", tentativas: t.tentativas + 1, bloqueio: undefined }, new Date());
    registrar({ tipo: "TaskUpdated", bu: t.bu, ator: t.role, acao: `Iniciou: ${t.resultado.slice(0, 80)}`, origem: `Tarefa ${t.id} do Head de CS (servidor)` });
    try {
      const sys = system[t.agenteId];
      if (!sys) throw new Error("agente sem prompt de sistema");
      const prompt = promptDaTarefa(t);
      const { texto, usage } = await chamar(client, sys, prompt, 3000);
      const an = analisar("livre", texto, prompt, false);
      const altas = an.flags.filter((f) => f.severity === "alta").length;
      const evid = `${texto.length} caracteres; ${altas} alerta(s) alto(s) na análise do motor; ${usage.output} tokens de saída. O texto não é guardado nem lido pelo Head.`;
      const agora = new Date();
      head = registrarEvento(atualizarTarefa(head, t.id, { status: "concluido", evidenciasColetadas: evid, tokensSaida: usage.output }, agora), "task_completed", t.bu, agora);
      registrar({ tipo: "ActionCompleted", bu: t.bu, ator: t.role, acao: `Tarefa ${t.id} concluída (aguarda validação)`, origem: "Execução no servidor", tokens: usage });
      entregues++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      erros.push(`${t.id}: ${msg.slice(0, 120)}`);
      const agora = new Date();
      head = registrarEvento(atualizarTarefa(head, t.id, { status: "bloqueado", bloqueio: msg.slice(0, 200) }, agora), "task_blocked", t.bu, agora);
      registrar({ tipo: "ActionFailed", bu: t.bu, ator: t.role, acao: `Tarefa ${t.id} falhou`, origem: "Execução no servidor" });
    }
  }

  // 2) Ativação do Head, se devida (wakeup, eventos ou heartbeat) e dentro dos limites
  let ativado: string | null = null;
  const motivo = ativacaoDevida(head, new Date());
  if (motivo && !limiteDoDia(head)) {
    const lider = SQUADS.find((a) => a.id.startsWith("social-") && a.id.endsWith("-cs") && !a.id.includes("teste-interno"));
    const aid = `ativ-srv-${Date.now().toString(36)}`;
    const snap = {
      empresas: Array.from(new Set(info.map((a) => a.bu))).map((bu) => ({
        bu, nome: bu, trabalhando: 0, agentes: info.filter((a) => a.bu === bu).length,
        execs: eventos.filter((e) => e.bu === bu && e.tipo === "ActionCompleted").length, alta: 0,
      })),
      missoes: missoes.map((m) => ({ id: m.id, bu: m.bu, status: m.status, progresso: Math.round((m.criterios.filter((c) => c.ok).length / m.criterios.length) * 100), bloqueio: m.bloqueio, proxima: m.proximaAcao, tentativas: m.tentativas, max: m.maxTentativas })),
      eventosRecentes: eventos.slice(-15).map((e) => ({ ts: e.ts, tipo: e.tipo, bu: e.bu, ator: e.ator, acao: e.acao, erro: e.causa?.codigo })),
    };
    const c = ctx();
    registrar({ tipo: "LeaderActivated", bu: "AWQ", ator: "head", acao: "Head de CS ativado (servidor)", origem: `Motivo: ${motivo}` });
    try {
      if (!lider) throw new Error("nenhum CS configurado");
      const prompt = promptDoHead({ ativacaoId: aid, motivo, agora: c.agora, estadoCS: lerEstadoCS(head, snap), capacidade: capacidadeDosAgentes(head, info, statusDoAgente) });
      const { texto, usage } = await chamar(client, lider.system, prompt, 4096);
      const saida = parseSaida(texto);
      if (!saida) {
        head = registrarFalhaAtivacao(head, aid, motivo, "Resposta do Head fora do formato JSON; nada foi aplicado.", new Date(), usage);
        erros.push("Head: resposta fora do formato JSON");
      } else {
        const r = aplicarSaida(head, saida, aid, motivo, c, usage);
        head = r.estado;
        for (const id of r.ativacao.criadas) { const t = head.tarefas.find((x) => x.id === id); if (t) registrar({ tipo: "TaskCreated", bu: t.bu, ator: "head", acao: `${t.role}: ${t.resultado.slice(0, 80)}`, origem: `Delegada pelo Head (${t.prioridade}); status ${t.status}` }); }
        registrar({ tipo: "CheckpointSaved", bu: "AWQ", ator: "head", acao: "Checkpoint salvo (servidor)", origem: head.checkpoint?.wakeup.at ? `Próximo wakeup: ${head.checkpoint.wakeup.at}` : "Sem wakeup por horário" });
      }
      ativado = motivo;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      erros.push(`Head: ${msg.slice(0, 120)}`);
      head = registrarFalhaAtivacao(head, aid, motivo, msg.slice(0, 200), new Date());
    }
  }

  // 3) Grava com concorrência otimista; se o navegador gravou no meio, mescla e tenta de novo
  let tentativa = 0;
  let base = verHead.version;
  let aGravar = head;
  while (tentativa < 3) {
    const r = await gravarEstado("head", aGravar, base, "tick-servidor");
    if (r.ok) break;
    if (!r.conflito) { erros.push(`gravação: ${r.mensagem}`); break; }
    base = r.atual?.version ?? base;
    aGravar = r.atual ? mesclarHead(aGravar, r.atual.value as EstadoHead) : aGravar;
    tentativa++;
  }
  const evAtual = await lerEstado(["events"]);
  const evBase = evAtual.ok ? evAtual.dados.events : undefined;
  const evFinal = evBase ? mesclarEventos(eventos, evBase.value as EventoOffice[]) : eventos;
  await gravarEstado("events", evFinal, evBase?.version ?? 0, "tick-servidor");
  return { status: "ok", ativado, entregues, erros };
}

export { chavePolitica };
