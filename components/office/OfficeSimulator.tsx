"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AlertTriangle, ArrowLeft, Check, Download, Key, Loader2, Megaphone, MessageSquare, Pencil,
  Play, Search, Send, ShieldCheck, Trash2, User, Users, X,
} from "lucide-react";
import { analisar, contaFlags, type Analise, type EntregaKind } from "@/lib/office-analysis";
import MiniMarkdown from "./MiniMarkdown";
import { contratoDoAgente, PRONTO_POR_KIND } from "@/lib/office-agent-contract";
import { ACOES_POR_PAPEL, chavePolitica, instrucaoDoModo, MODOS, MODOS_INDISPONIVEIS, modoDe, type ModoAutonomia, type Politicas } from "@/lib/office-policy";
import {
  aguardarAprovacao, aplicarResultado, concluirSeProvado, decisaoDoGestor, estadoJson, falhar, iniciarTentativa, limiteAtingido,
  MAX_MISSOES, novaMissao, progresso, ROTULO_STATUS, resumoParaContrato, type Missao,
} from "@/lib/office-missions";
import { classificarErro, MAX_EVENTOS, novoEvento, ROTULO_TIPO, type EventoOffice } from "@/lib/office-events";
import OfficeGame, { type MetricaAgente, type PainelTab } from "./OfficeGame";
// Carregado sob demanda: Three.js só entra no bundle de quem liga o "Modo 3D (beta)".
const OfficeGame3D = dynamic(() => import("./OfficeGame3D"), { ssr: false });
import { ANDARES, type Empresa } from "@/lib/office-world";
import StoryboardPanel from "./studio/StoryboardPanel";
import {
  aplicarSaida, ativacaoDevida, atualizarTarefa, capacidadeDosAgentes, decidirAprovacao, estadoInicial, lerEstadoCS, limiteDoDia, parseSaida,
  promptDaTarefa, promptDoHead, registrarEvento, registrarFalhaAtivacao, tarefasParaEntregar, type AgenteInfo, type ConfigHead, type EstadoHead,
} from "@/lib/office-head";
import HeadCSPanel from "./HeadCSPanel";
import { skillCSConta } from "@/lib/office-cs-skill";
import { capacidadesDaExecucao } from "@/lib/office-capacidades";
import { skillSquadConta } from "@/lib/office-squad-skill";
import { aplicarEstadoCS, extrairEstadoCS } from "@/lib/office-cs-state";
import { criarSincronizador, type Sincronizador, type StatusSync, type ValoresSync } from "@/lib/office-sync";
import type { Atividade } from "@/lib/office-iso";
import { avaliarCenario, CENARIOS, type Cenario, type PapelAgente, type Veredito } from "@/lib/office-scenarios";

// ── Tipos ───────────────────────────────────────────────────────────────────────

type Estado =
  | "RASCUNHO" | "EM PRODUÇÃO" | "EM REVISÃO INTERNA" | "AGUARDANDO APROVAÇÃO"
  | "AJUSTES SOLICITADOS" | "APROVADO" | "CANCELADO";

type DeskStatus = "idle" | "working" | "done" | "error";

interface Squad {
  bu: string;
  agents: Partial<Record<PapelAgente, { id: string; name: string }>>;
}

interface RunRecord {
  id: string;
  ts: string;
  bu: string;
  role: PapelAgente;
  agentId: string;
  kind: EntregaKind;
  scenarioId?: string;
  task: string;
  output: string;
  ms: number;
  usage?: { input: number; output: number };
  analise: Analise;
  manual?: Veredito;
  erro?: string;
}

interface Outputs { triagem?: string; briefing?: string; peca?: string; pacote?: string; execucao?: string }

interface Cycle {
  id: string;
  demanda: string;
  versao: number;
  estado: Estado;
  etapa: number; // índice em ETAPAS
  missaoId?: string;
  outputs: Outputs;
  decisoes: { decisao: "aprovado" | "ajustes" | "rejeitado"; em: string; versao: number; feedback?: string }[];
}

interface Delegacao {
  agente: PapelAgente;
  tarefa: string;
  resposta: string;
  ms: number;
}

interface ChatMsg {
  de: "gestor" | "agente";
  texto: string;
  ts: string;
  /** Remetente nos grupos e no canal geral (ex.: "Helena · André Vieira"). */
  autor?: string;
  /** Plano do CS antes de delegar e o que cada agente entregou. */
  plano?: string;
  delegacoes?: Delegacao[];
}

const ROTULO_AGENTE: Record<"ref" | "criativo" | "midia", string> = {
  ref: "Referências e Inteligência",
  criativo: "Criativo e Editor",
  midia: "Mídia e Publicação",
};
const BLOCO_DELEGAR = /<<DELEGAR agente=(ref|criativo|midia)>>([\s\S]*?)<<FIM>>/g;

interface ReportMeta {
  slug: string;
  cliente: string;
  arquivo: string;
  geradoEm: string;
  gerador: string;
}

const LS_KEY = "openclaw_api_key";
const LS_RUNS = "office_runs_v1";
const LS_CHAT = "office_chat_v1";
const LS_EVENTOS = "office_events_v1";
const LS_POLITICAS = "office_policies_v1";
const LS_MISSOES = "office_missions_v1";
const LS_HEAD = "office_head_v1";

const ORIGEM_POR_KIND: Record<EntregaKind, string> = {
  triagem: "Demanda do gestor no ciclo editorial",
  briefing: "Pedido de briefing feito pelo CS após a triagem",
  peca: "Peça pedida após o briefing",
  aprovacao: "Pacote de aprovação montado pelo CS",
  execucao: "Aprovação explícita do gestor",
  livre: "Pedido direto",
};
const BUILTIN_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "";
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

const PAPEIS: { role: PapelAgente; label: string; icon: React.ElementType; cor: string }[] = [
  { role: "cs",       label: "Headcount/CS",            icon: MessageSquare, cor: "text-brand-600 bg-brand-50 border-brand-500/30" },
  { role: "ref",      label: "Referências e Inteligência", icon: Search,      cor: "text-cyan-700 bg-cyan-50 border-cyan-500/30" },
  { role: "criativo", label: "Criativo e Editor",       icon: Pencil,        cor: "text-violet-700 bg-violet-50 border-violet-500/30" },
  { role: "midia",    label: "Mídia e Publicação",      icon: Megaphone,     cor: "text-emerald-700 bg-emerald-50 border-emerald-500/30" },
];

const ETAPAS = [
  { label: "Triagem", role: "cs" as PapelAgente },
  { label: "Briefing", role: "ref" as PapelAgente },
  { label: "Peça", role: "criativo" as PapelAgente },
  { label: "Pacote de aprovação", role: "cs" as PapelAgente },
  { label: "Decisão do gestor", role: null },
  { label: "Preparo de execução", role: "midia" as PapelAgente },
];

const ROLE_SUFFIX: Record<string, PapelAgente> = { cs: "cs", ref: "ref", criativo: "criativo", midia: "midia" };

function papelDoId(id: string): PapelAgente | null {
  const suf = id.split("-").pop() ?? "";
  return ROLE_SUFFIX[suf] ?? null;
}

function trecho(s: string | undefined, n = 6000): string {
  if (!s) return "(vazio)";
  return s.length > n ? s.slice(0, n) + "\n[...cortado]" : s;
}

function fmtS(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function pct(n: number | null): string {
  return n === null ? "n/a" : `${Math.round(n * 100)}%`;
}

// ── Streaming ───────────────────────────────────────────────────────────────────

interface StreamResult { text: string; usage?: { input: number; output: number } }

async function streamAgent(
  agentId: string,
  task: string,
  key: string,
  onText: (full: string) => void
): Promise<StreamResult> {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-anthropic-key": key },
    body: JSON.stringify({ agentId, task }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usage: StreamResult["usage"];

  const handle = (raw: string) => {
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const p = JSON.parse(d) as { text?: string; error?: string; type?: string; usage?: { input: number; output: number } };
        if (p.error) throw new Error(p.error);
        if (p.text) {
          text += (text ? " " : "") + p.text;
          onText(text);
        }
        if (p.type === "meta" && p.usage) usage = p.usage;
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) handle(part);
  }
  if (buffer) handle(buffer);
  return { text, usage };
}

// ── Componente ──────────────────────────────────────────────────────────────────

export default function OfficeSimulator() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [precisaChave, setPrecisaChave] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [squads, setSquads] = useState<Squad[]>([]);
  const [bu, setBu] = useState<string>("");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [desks, setDesks] = useState<Record<PapelAgente, DeskStatus>>({ cs: "idle", ref: "idle", criativo: "idle", midia: "idle" });
  const [live, setLive] = useState<Partial<Record<PapelAgente, string>>>({});
  const [demanda, setDemanda] = useState("");
  const [feedback, setFeedback] = useState("");
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tab, setTab] = useState<PainelTab>("conversa");
  const [aberto, setAberto] = useState<string | null>(null);
  const [cenarioAtual, setCenarioAtual] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [reportErro, setReportErro] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  // Modo 3D (beta): renderizador alternativo em Three.js, mesma interface do mundo 2D.
  // Desligado por padrão; a escolha do usuário fica salva no navegador.
  const [modo3D, setModo3D] = useState(false);
  useEffect(() => { setModo3D(localStorage.getItem("office-modo-3d") === "1"); }, []);
  const alternarModo3D = () => setModo3D((v) => { const novo = !v; localStorage.setItem("office-modo-3d", novo ? "1" : "0"); return novo; });
  const [chat, setChat] = useState<Record<string, ChatMsg[]>>({});
  const [chatRole, setChatRole] = useState<PapelAgente>("cs");
  const [chatInput, setChatInput] = useState("");
  /** Conversa aberta no mensageiro: null = lista; "geral"; "grupo:BU"; "ind:BU:papel". */
  const [conv, setConv] = useState<string | null>(null);
  const chatRef = useRef<Record<string, ChatMsg[]>>({});
  /** Conversas com resposta em andamento (chave da conversa -> fase atual). Cada conversa trabalha em paralelo às outras. */
  const [ocupadas, setOcupadas] = useState<Record<string, string>>({});
  const ocupadasRef = useRef<Record<string, string>>({});
  const [reuPauta, setReuPauta] = useState("");
  const [reuResp, setReuResp] = useState<Record<string, { nome: string; cliente: string; status: "pensando" | "pronto" | "erro"; texto: string }>>({});
  const [reuBusy, setReuBusy] = useState(false);
  const [eventos, setEventos] = useState<EventoOffice[]>([]);
  const router = useRouter();
  const [politicas, setPoliticas] = useState<Politicas>({});
  const politicasRef = useRef<Politicas>({});
  const syncRef = useRef<Sincronizador | null>(null);
  const [armazenamento, setArmazenamento] = useState<{ status: StatusSync; detalhe?: string }>({ status: "verificando" });
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const missoesRef = useRef<Missao[]>([]);
  const [filtroEvento, setFiltroEvento] = useState<string>("todos");
  const runsRef = useRef<RunRecord[]>([]);
  const eventosRef = useRef<EventoOffice[]>([]);
  const cycleRef = useRef<Cycle | null>(null);
  cycleRef.current = cycle;

  // Chave, execuções salvas e squads disponíveis
  useEffect(() => {
    setApiKey(localStorage.getItem(LS_KEY) || BUILTIN_KEY || null);
    try {
      const saved = JSON.parse(localStorage.getItem(LS_RUNS) ?? "[]") as RunRecord[];
      setRuns(saved);
      runsRef.current = saved;
    } catch { /* histórico corrompido: começa vazio */ }
    try {
      const pol = JSON.parse(localStorage.getItem(LS_POLITICAS) ?? "{}") as Politicas;
      setPoliticas(pol);
      politicasRef.current = pol;
    } catch { /* políticas corrompidas: usa o padrão */ }
    try {
      const ev = JSON.parse(localStorage.getItem(LS_EVENTOS) ?? "[]") as EventoOffice[];
      setEventos(ev);
      eventosRef.current = ev;
    } catch { /* log corrompido: começa vazio */ }
    try {
      const h = JSON.parse(localStorage.getItem(LS_HEAD) ?? "null") as EstadoHead | null;
      if (h && Array.isArray(h.tarefas)) { const base = { ...estadoInicial(), ...h, config: { ...estadoInicial().config, ...h.config } }; setHead(base); headRef.current = base; }
    } catch { /* estado do Head corrompido: começa vazio */ }
    try {
      const ms = JSON.parse(localStorage.getItem(LS_MISSOES) ?? "[]") as Missao[];
      setMissoes(ms);
      missoesRef.current = ms;
    } catch { /* missões corrompidas: começa vazio */ }
    try {
      const c = JSON.parse(localStorage.getItem(LS_CHAT) ?? "{}") as Record<string, ChatMsg[]>;
      setChat(c);
      chatRef.current = c;
    } catch { /* conversa corrompida: começa vazia */ }

    fetch("/data/office/reports/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ReportMeta[]) => setReports(list))
      .catch(() => setReports([]));

    if (IS_STATIC) return;

    // Estado durável no servidor: mescla com o local e passa a gravar nas mudanças.
    const aplicarLocal = <K extends keyof ValoresSync>(chave: K, valor: ValoresSync[K]) => {
      const gravar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* cota estourada */ } };
      if (chave === "events") { eventosRef.current = valor as EventoOffice[]; setEventos(valor as EventoOffice[]); gravar(LS_EVENTOS, valor); }
      else if (chave === "missions") { missoesRef.current = valor as Missao[]; setMissoes(valor as Missao[]); gravar(LS_MISSOES, valor); }
      else if (chave === "policies") { politicasRef.current = valor as Politicas; setPoliticas(valor as Politicas); gravar(LS_POLITICAS, valor); }
      else { headRef.current = valor as EstadoHead; setHead(valor as EstadoHead); gravar(LS_HEAD, valor); }
    };
    const sinc = criarSincronizador({ status: (st, detalhe) => setArmazenamento({ status: st, detalhe }), aoMesclar: aplicarLocal });
    void sinc.iniciar({ head: headRef.current, missions: missoesRef.current, events: eventosRef.current, policies: politicasRef.current }).then((out) => {
      syncRef.current = sinc;
      if (out) (Object.keys(out) as (keyof ValoresSync)[]).forEach((k) => aplicarLocal(k, out[k] as never));
    });

    fetch("/api/agents")
      .then((r) => r.json())
      .then((list: { id: string; name: string; bu: string }[]) => {
        const map = new Map<string, Squad>();
        for (const a of list) {
          if (!a.id.startsWith("social-")) continue;
          const role = papelDoId(a.id);
          if (!role) continue;
          const sq = map.get(a.bu) ?? { bu: a.bu, agents: {} };
          sq.agents[role] = { id: a.id, name: a.name };
          map.set(a.bu, sq);
        }
        const arr = Array.from(map.values());
        setSquads(arr);
        if (arr[0]) setBu(arr[0].bu);
      })
      .catch(() => setErro("Não consegui carregar a lista de agentes."));
  }, []);

  const squad = useMemo(() => squads.find((s) => s.bu === bu), [squads, bu]);
  const reportDaSquad = useMemo(
    () => reports.find((r) => bu.toLowerCase().includes(r.cliente.toLowerCase())),
    [reports, bu]
  );
  useEffect(() => {
    setReportMd(null);
    setReportErro(null);
    if (!reportDaSquad) return;
    fetch(`/data/office/reports/${reportDaSquad.arquivo}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setReportMd)
      .catch((e) => setReportErro(e instanceof Error ? e.message : "Falha ao carregar o relatório."));
  }, [reportDaSquad]);

  const runsDaSquad = useMemo(() => runs.filter((r) => r.bu === bu), [runs, bu]);

  const salvarRuns = useCallback((next: RunRecord[]) => {
    const cortado = next.slice(-80);
    runsRef.current = cortado;
    setRuns(cortado);
    try { localStorage.setItem(LS_RUNS, JSON.stringify(cortado)); } catch { /* cota estourada: segue só em memória */ }
  }, []);

  /** Executa uma tarefa em um agente da squad, analisa e registra. */
  const mudarPolitica = (role: PapelAgente, kind: EntregaKind, modo: ModoAutonomia) => {
    const next = { ...politicasRef.current, [chavePolitica(bu, role, kind)]: modo };
    politicasRef.current = next;
    setPoliticas(next);
    try { localStorage.setItem(LS_POLITICAS, JSON.stringify(next)); } catch { /* segue só em memória */ }
    syncRef.current?.agendar("policies", next);
  };

  const registrar = useCallback((e: Omit<EventoOffice, "id" | "ts">) => {
    const next = [...eventosRef.current, novoEvento(e)].slice(-MAX_EVENTOS);
    eventosRef.current = next;
    setEventos(next);
    try { localStorage.setItem(LS_EVENTOS, JSON.stringify(next)); } catch { /* cota estourada: segue só em memória */ }
    syncRef.current?.agendar("events", next);
  }, []);

  const gravarMissoes = useCallback((next: Missao[]) => {
    missoesRef.current = next;
    setMissoes(next);
    try { localStorage.setItem(LS_MISSOES, JSON.stringify(next)); } catch { /* cota estourada: segue só em memória */ }
    syncRef.current?.agendar("missions", next);
  }, []);

  const atualizarMissao = useCallback((id: string | undefined, fn: (m: Missao) => Missao) => {
    if (!id) return;
    gravarMissoes(missoesRef.current.map((m) => (m.id === id ? fn(m) : m)));
  }, [gravarMissoes]);

  const buSel = bu;
  const squadSel = squad;
  const squadsRef = useRef<Squad[]>([]);
  squadsRef.current = squads;

  /** Entregas concluídas da própria conta (texto dos colegas da squad) para o CS validar. */
  const entregasParaValidar = (b: string) =>
    headRef.current.tarefas.filter((t) => t.bu === b && t.status === "concluido").slice(-3).map((t) => {
      const run = [...runsRef.current].reverse().find((r) => r.bu === b && r.role === t.role && r.task.includes(t.id));
      return { tarefaId: t.id, texto: run ? run.output.slice(0, 700).replace(/\s+/g, " ") : "(texto não encontrado neste navegador)" };
    });

  const rodar = useCallback(
    async (
      role: PapelAgente,
      kind: EntregaKind,
      task: string,
      opts: { aprovado?: boolean; scenarioId?: string; origem?: string; missaoId?: string; bu?: string } = {}
    ): Promise<RunRecord> => {
      const bu = opts.bu ?? buSel;
      const squad = opts.bu ? squadsRef.current.find((s) => s.bu === opts.bu) : squadSel;
      const agent = squad?.agents[role];
      if (!agent) throw new Error("Squad indisponível.");

      const origem = opts.origem ?? (opts.scenarioId ? "Cenário de estresse rodado pelo gestor" : ORIGEM_POR_KIND[kind]);
      const acao = opts.scenarioId ? "Cenário de estresse" : kind === "livre" ? "Resposta livre" : `Entrega: ${kind}`;
      const modo = modoDe(politicasRef.current, bu, role, kind);
      if (modo === "bloqueado") {
        const motivo = `POLICY_BLOCKED: a política de autonomia bloqueia "${acao}" para este agente.`;
        registrar({ tipo: "ActionFailed", bu, ator: role, acao, origem, causa: classificarErro(motivo) });
        atualizarMissao(opts.missaoId, (m) => falhar(m, classificarErro(motivo)));
        if (bu === buSel) setDesks((d) => ({ ...d, [role]: "error" }));
        throw new Error(motivo.replace("POLICY_BLOCKED: ", "Bloqueado pela política de autonomia: "));
      }
      const missao = missoesRef.current.find((m) => m.id === opts.missaoId);
      const limite = missao ? limiteAtingido(missao) : null;
      if (limite) {
        const motivo = `BUDGET_EXHAUSTED: ${limite}`;
        registrar({ tipo: "ActionFailed", bu, ator: role, acao, origem, causa: classificarErro(motivo) });
        atualizarMissao(opts.missaoId, (m) => falhar(m, classificarErro(motivo), limite));
        if (bu === buSel) setDesks((d) => ({ ...d, [role]: "error" }));
        throw new Error(`A missão parou: ${limite}.`);
      }
      atualizarMissao(opts.missaoId, (m) => iniciarTentativa(m, acao));
      const ciclo = cycleRef.current;
      const contrato = contratoDoAgente({
        agente: agent.name.split(" · ")[0],
        papel: PAPEIS.find((p) => p.role === role)?.label ?? role,
        empresa: bu,
        squad: bu,
        missao: ciclo ? `Ciclo editorial: ${ciclo.demanda.slice(0, 200)}` : opts.scenarioId ? "Cenário de estresse (teste de regras)" : "Atender o pedido do gestor",
        resultadoEsperado: acao,
        definicaoDePronto: PRONTO_POR_KIND[kind],
        modo,
        skill: role === "cs" ? skillCSConta(agent.name.split(" · ")[0], bu, headRef.current.tarefas.filter((t) => t.bu === bu && ["atribuido", "iniciado", "bloqueado", "concluido"].includes(t.status)).length) : role === "ref" || role === "criativo" || role === "midia" ? skillSquadConta(agent.name.split(" · ")[0], role, bu) : undefined,
        capacidades: capacidadesDaExecucao(headRef.current, bu, role, agent.name.split(" · ")[0], agentesInfo().filter((a) => a.bu === bu), entregasParaValidar(bu)),
        estadoAtual: ciclo ? `ciclo ${ciclo.estado}, versão v${ciclo.versao}${missao ? `; ${resumoParaContrato(missao)}` : ""}` : "sem ciclo editorial em andamento",
      });
      registrar({ tipo: "ActionStarted", bu, ator: role, acao, origem: `${origem} · modo: ${modo === "recomendar" ? "Recomendar" : "Preparar"}` });
      if (bu === buSel) setDesks((d) => ({ ...d, [role]: "working" }));
      if (bu === buSel) setLive((l) => ({ ...l, [role]: "" }));
      const t0 = performance.now();
      let rec: RunRecord;
      try {
        const { text, usage } = await streamAgent(agent.id, instrucaoDoModo(modo) + contrato + task, apiKey ?? "", (full) =>
          { if (bu === buSel) setLive((l) => ({ ...l, [role]: full })); }
        );
        const ms = performance.now() - t0;
        rec = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts: new Date().toISOString(),
          bu, role, agentId: agent.id, kind,
          scenarioId: opts.scenarioId, task, output: text, ms, usage,
          analise: analisar(kind, text, task, !!opts.aprovado),
        };
        if (bu === buSel) setDesks((d) => ({ ...d, [role]: "done" }));
        registrar({ tipo: "ActionCompleted", bu, ator: role, acao, origem, ms, tokens: usage });
        atualizarMissao(opts.missaoId, (m) => aplicarResultado(m, { kind, acao, origem, modo, analise: rec.analise, usage }));
      } catch (e) {
        if (bu === buSel) setDesks((d) => ({ ...d, [role]: "error" }));
        const causaErro = classificarErro(e instanceof Error ? e.message : String(e));
        registrar({ tipo: "ActionFailed", bu, ator: role, acao, origem, causa: causaErro });
        atualizarMissao(opts.missaoId, (m) => falhar(m, causaErro));
        if (e instanceof Error && /invalid x-api-key|authentication_error/.test(e.message)) {
          localStorage.removeItem(LS_KEY);
          setApiKey(null);
          setPrecisaChave(true);
          throw new Error("A Anthropic recusou a chave salva neste navegador (inválida ou incompleta). Cole uma chave nova no campo que apareceu.");
        }
        if (e instanceof Error && /credit balance is too low/i.test(e.message)) {
          throw new Error("A conta da Anthropic dona da chave está sem créditos. Adicione créditos em platform.claude.com/settings/billing (na mesma organização da chave) e tente de novo.");
        }
        if (e instanceof Error && e.message.includes("API_KEY_REQUIRED")) {
          setPrecisaChave(true);
          throw new Error("Falta a chave da Anthropic. Cole a sua no campo que apareceu acima do chat (ela fica só neste navegador).");
        }
        throw e;
      }
      salvarRuns([...runsRef.current, rec]);
      if (role === "cs") {
        const estadoCS = extrairEstadoCS(rec.output);
        if (estadoCS) {
          const r = aplicarEstadoCS(headRef.current, estadoCS, bu, agent.name.split(" · ")[0], `cs-${rec.id}`, ctxHead());
          if (r.criadas.length || r.validadas.length || r.aprovacoes.length || r.exigencias.length || r.rejeitadas.length) gravarHead(r.estado);
          for (const id of r.criadas) {
            const t = r.estado.tarefas.find((x) => x.id === id);
            if (t) registrar({ tipo: "TaskCreated", bu, ator: "cs", acao: `${t.agenteId.split("|")[1]}: ${t.resultado.slice(0, 80)}`, origem: `Delegada pelo CS da conta (${t.prioridade}); status ${t.status}` });
          }
          for (const x of r.rejeitadas) registrar({ tipo: "ActionFailed", bu, ator: "cs", acao: "Despacho do CS recusado pelo motor", origem: x.motivo, causa: { codigo: "POLICY_BLOCKED", mensagem: x.motivo, recuperavel: true, proxima: "O CS corrige o despacho na próxima ativação." } });
        }
      }
      return rec;
    },
    // ctxHead e gravarHead só leem refs e setters estáveis; recriá-los a cada render não muda o resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [squadSel, buSel, apiKey, salvarRuns, registrar, atualizarMissao]
  );

  // ── Ciclo editorial ───────────────────────────────────────────────────────────

  const pacoteTask = (c: { demanda: string }, briefing: string, peca: string, versao: number) =>
    `TAREFA: REVISÃO INTERNA E PACOTE DE APROVAÇÃO\nRevise a peça (v${versao}) contra o briefing, liste as ressalvas e monte o pacote de aprovação no formato obrigatório. Nada está aprovado; o estado é AGUARDANDO APROVAÇÃO.\n\nDEMANDA ORIGINAL DO GESTOR:\n${c.demanda}\n\nBRIEFING:\n${trecho(briefing)}\n\nPEÇA v${versao}:\n${trecho(peca)}`;

  const iniciarCiclo = async () => {
    if (!demanda.trim() || busy) return;
    setErro(null);
    setBusy(true);
    const missao = novaMissao(bu, demanda.trim());
    gravarMissoes([...missoesRef.current, missao].slice(-MAX_MISSOES));
    const mid = missao.id;
    const base: Cycle = {
      id: `ciclo-${Date.now()}`, demanda: demanda.trim(), versao: 1, estado: "RASCUNHO",
      etapa: 0, outputs: {}, decisoes: [], missaoId: mid,
    };
    setCycle(base);
    try {
      const triagem = await rodar("cs", "triagem",
        `TAREFA: TRIAGEM DA DEMANDA\nO gestor enviou a demanda abaixo. Registre a solicitação original, classifique a prioridade (P0 a P4), diga se está no escopo, liste as lacunas de informação e escreva o pedido de briefing para o agente de Referências e Inteligência. Seja objetivo.\n\nDEMANDA DO GESTOR:\n${base.demanda}`, { missaoId: mid });
      setCycle((c) => c && { ...c, estado: "EM PRODUÇÃO", etapa: 1, outputs: { ...c.outputs, triagem: triagem.output } });

      const briefing = await rodar("ref", "briefing",
        `TAREFA: BRIEFING\nProduza o briefing no formato obrigatório para a demanda abaixo. Se não puder consultar fontes, diga isso e não cite links.\n\nDEMANDA DO GESTOR:\n${base.demanda}\n\nTRIAGEM DO HEADCOUNT/CS:\n${trecho(triagem.output)}`, { missaoId: mid });
      setCycle((c) => c && { ...c, etapa: 2, outputs: { ...c.outputs, briefing: briefing.output } });

      const peca = await rodar("criativo", "peca",
        `TAREFA: PRODUZIR PEÇA (versão 1)\nProduza a peça completa no formato obrigatório de entrega, com status EM REVISÃO INTERNA.\n\nDEMANDA DO GESTOR:\n${base.demanda}\n\nBRIEFING:\n${trecho(briefing.output)}`, { missaoId: mid });
      setCycle((c) => c && { ...c, estado: "EM REVISÃO INTERNA", etapa: 3, outputs: { ...c.outputs, peca: peca.output } });

      const pacote = await rodar("cs", "aprovacao", pacoteTask(base, briefing.output, peca.output, 1), { missaoId: mid });
      setCycle((c) => c && { ...c, estado: "AGUARDANDO APROVAÇÃO", etapa: 4, outputs: { ...c.outputs, pacote: pacote.output } });
      atualizarMissao(mid, aguardarAprovacao);
      gravarHead(registrarEvento(headRef.current, "mission_awaiting_approval", bu, new Date()));
      registrar({ tipo: "ApprovalRequested", bu, ator: "cs", acao: "Pacote de aprovação pronto", origem: "Nada é publicado sem a decisão do gestor" });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no ciclo.");
    } finally {
      setBusy(false);
    }
  };

  const decidir = async (decisao: "aprovado" | "ajustes" | "rejeitado") => {
    if (!cycle || busy) return;
    if (decisao === "ajustes" && !feedback.trim()) {
      setErro("Escreva o feedback antes de solicitar alterações.");
      return;
    }
    setErro(null);
    setBusy(true);
    const registro = { decisao, em: new Date().toISOString(), versao: cycle.versao, feedback: feedback.trim() || undefined };
    const mid = cycle.missaoId;
    atualizarMissao(mid, (m) => decisaoDoGestor(m, decisao, cycle.versao, registro.feedback));
    gravarHead(registrarEvento(headRef.current, "manager_decision", bu, new Date()));
    registrar({ tipo: "ApprovalDecided", bu, ator: "gestor", acao: `Decisão: ${decisao} (v${cycle.versao})`, origem: feedback.trim() ? `Feedback do gestor: ${feedback.trim().slice(0, 140)}` : "Decisão do gestor sobre o pacote de aprovação" });
    try {
      if (decisao === "rejeitado") {
        setCycle({ ...cycle, estado: "CANCELADO", decisoes: [...cycle.decisoes, registro] });
        return;
      }

      if (decisao === "aprovado") {
        const aprovado: Cycle = { ...cycle, estado: "APROVADO", etapa: 5, decisoes: [...cycle.decisoes, registro] };
        setCycle(aprovado);
        const exec = await rodar("midia", "execucao",
          `TAREFA: PREPARAR EXECUÇÃO DE ITEM APROVADO\nAPROVAÇÃO REGISTRADA: o gestor respondeu "Aprovado" em ${registro.em} para a versão v${cycle.versao}. Esta aprovação vale somente para essa versão.\nNeste ambiente você não executa ações externas: faça os checklists e o relatório de execução com Ação = "preparado, não executado".\n\nPACOTE DE APROVAÇÃO:\n${trecho(cycle.outputs.pacote)}\n\nPEÇA APROVADA (v${cycle.versao}):\n${trecho(cycle.outputs.peca)}`,
          { aprovado: true, missaoId: mid });
        setCycle((c) => c && { ...c, etapa: 6, outputs: { ...c.outputs, execucao: exec.output } });
        atualizarMissao(mid, concluirSeProvado);
        setFeedback("");
        return;
      }

      // Ajustes: Criativo gera nova versão, CS refaz o pacote
      const novaVersao = cycle.versao + 1;
      setCycle({ ...cycle, estado: "AJUSTES SOLICITADOS", etapa: 2, versao: novaVersao, decisoes: [...cycle.decisoes, registro] });
      const peca = await rodar("criativo", "peca",
        `TAREFA: APLICAR AJUSTES (versão ${novaVersao})\nO gestor solicitou alterações. Aplique o feedback, preserve a versão anterior, registre o que mudou e devolva no formato obrigatório com status EM REVISÃO INTERNA. Se houver instruções conflitantes, sinalize.\n\nFEEDBACK DO GESTOR:\n${registro.feedback}\n\nBRIEFING:\n${trecho(cycle.outputs.briefing)}\n\nVERSÃO ANTERIOR (v${cycle.versao}):\n${trecho(cycle.outputs.peca)}`, { missaoId: mid });
      setCycle((c) => c && { ...c, estado: "EM REVISÃO INTERNA", etapa: 3, outputs: { ...c.outputs, peca: peca.output } });
      const pacote = await rodar("cs", "aprovacao", pacoteTask(cycle, cycle.outputs.briefing ?? "", peca.output, novaVersao), { missaoId: mid });
      setCycle((c) => c && { ...c, estado: "AGUARDANDO APROVAÇÃO", etapa: 4, outputs: { ...c.outputs, pacote: pacote.output } });
      atualizarMissao(mid, aguardarAprovacao);
      gravarHead(registrarEvento(headRef.current, "mission_awaiting_approval", bu, new Date()));
      registrar({ tipo: "ApprovalRequested", bu, ator: "cs", acao: "Pacote de aprovação pronto", origem: "Nada é publicado sem a decisão do gestor" });
      setFeedback("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao processar a decisão.");
    } finally {
      setBusy(false);
    }
  };

  // ── Conversa livre com um agente ──────────────────────────────────────────────

  const chatKey = `${bu}|${chatRole}`;
  const conversa = chat[chatKey] ?? [];

  const marcarOcupada = (chave: string, fase: string) => {
    const next = { ...ocupadasRef.current, [chave]: fase };
    ocupadasRef.current = next;
    setOcupadas(next);
  };
  const liberarConversa = (chave: string) => {
    const { [chave]: _fim, ...resto } = ocupadasRef.current;
    void _fim;
    ocupadasRef.current = resto;
    setOcupadas(resto);
  };

  const salvarChat = (next: Record<string, ChatMsg[]>) => {
    chatRef.current = next;
    setChat(next);
    try { localStorage.setItem(LS_CHAT, JSON.stringify(next)); } catch { /* cota estourada: segue só em memória */ }
  };

  const nomeCS = squad?.agents.cs?.name.split(" · ")[0] ?? "CS";
  const rotuloPapel = (r: PapelAgente) => (r === "cs" ? `${nomeCS} · CS` : PAPEIS.find((x) => x.role === r)?.label ?? r);

  const enviarChat = async () => {
    const texto = chatInput.trim();
    const grupo = !!conv?.startsWith("grupo:");
    const chave = grupo ? `${bu}|grupo` : chatKey;
    if (!texto || chave in ocupadasRef.current || !squad) return;
    setErro(null);
    marcarOcupada(chave, "");
    setChatInput("");
    const base = chatRef.current[chave] ?? [];
    const historico = base.slice(-12);
    const comNova: Record<string, ChatMsg[]> = {
      ...chatRef.current,
      [chave]: [...base, { de: "gestor", texto, ts: new Date().toISOString() }],
    };
    salvarChat(comNova);
    const ehCS = chatRole === "cs";

    const partes: string[] = [
      "CONVERSA DIRETA COM O GESTOR",
      "Responda à última mensagem do gestor em português, de forma direta e curta. Você não tem acesso a Drive, Notion, redes sociais nem arquivos neste ambiente: use apenas o contexto abaixo e não afirme ter feito nada externo. Se faltar informação, diga o que falta. Só atribua estado de entrega (APROVADO, PUBLICADO etc.) se houver evidência no contexto.",
    ];
    if (ehCS) {
      partes.push(
        `DELEGAÇÃO (você é ${nomeCS}, líder da squad)\nVocê coordena Referências (ref), Criativo (criativo) e Mídia (midia). Quando a demanda exigir a especialidade deles, delegue escrevendo, na sua resposta, um bloco por agente neste formato exato:\n<<DELEGAR agente=ref>>\ntarefa objetiva: contexto, o que entregar e o formato esperado\n<<FIM>>\nPode delegar a mais de um agente na mesma resposta (eles trabalham ao mesmo tempo). Delegue só o necessário; pergunta simples, responda direto, sem delegar. Delegação é só texto: nada é publicado nem enviado. Depois que os agentes responderem, você receberá os resultados e vai consolidar para o gestor. Antes dos blocos, escreva em uma ou duas frases o que vai pedir e por quê.`
      );
    }
    if (reportMd) partes.push(`RELATÓRIO DA MANHÃ (já lido pelo gestor):\n${trecho(reportMd)}`);
    if (cycle) {
      partes.push(
        `CICLO EDITORIAL EM ANDAMENTO: estado ${cycle.estado}, versão v${cycle.versao}.\nDemanda: ${cycle.demanda}\nPacote de aprovação atual:\n${trecho(cycle.outputs.pacote, 3000)}`
      );
    }
    if (historico.length) {
      partes.push(
        "HISTÓRICO DA CONVERSA:\n" +
          historico.map((m) => `${m.de === "gestor" ? "Gestor" : m.autor ?? "Você"}: ${m.texto}`).join("\n")
      );
    }
    partes.push(`NOVA MENSAGEM DO GESTOR:\n${texto}`);

    const adicionar = (...msgs: ChatMsg[]) =>
      salvarChat({ ...chatRef.current, [chave]: [...(chatRef.current[chave] ?? comNova[chave]), ...msgs] });
    salvarChat(comNova);

    try {
      if (ehCS) marcarOcupada(chave, `${nomeCS} está pensando`);
      const r1 = await rodar(chatRole, "livre", partes.join("\n\n"), { origem: "Mensagem do gestor no chat" });

      const pedidos = ehCS
        ? Array.from(r1.output.matchAll(BLOCO_DELEGAR))
            .map((m) => ({ agente: m[1] as "ref" | "criativo" | "midia", tarefa: m[2].trim() }))
            .filter((d, i, arr) => d.tarefa && arr.findIndex((x) => x.agente === d.agente) === i)
            .slice(0, 3)
        : [];

      if (pedidos.length === 0) {
        adicionar({ de: "agente", texto: r1.output.replace(BLOCO_DELEGAR, "").trim(), ts: new Date().toISOString(), autor: grupo ? rotuloPapel(chatRole) : undefined });
        return;
      }

      const plano = r1.output.replace(BLOCO_DELEGAR, "").trim();
      marcarOcupada(chave, `${nomeCS} delegou a ${pedidos.map((d) => ROTULO_AGENTE[d.agente].split(" ")[0]).join(", ")}`);
      const recebidos: Delegacao[] = await Promise.all(
        pedidos.map(async (d) => {
          const tipo: EntregaKind = d.agente === "ref" ? "briefing" : d.agente === "criativo" ? "peca" : "livre";
          const tarefa = `TAREFA DELEGADA POR ${nomeCS} (Headcount/CS)\n${d.tarefa}\n\nDEMANDA ORIGINAL DO GESTOR:\n${texto}${reportMd ? `\n\nRELATÓRIO DA MANHÃ:\n${trecho(reportMd, 3500)}` : ""}\n\nEntregue em texto, como RASCUNHO. Você não publica nem envia nada.`;
          try {
            const rec = await rodar(d.agente, tipo, tarefa, { origem: `Delegado por ${nomeCS} para atender o pedido: "${texto.slice(0, 70)}"` });
            return { agente: d.agente, tarefa: d.tarefa, resposta: rec.output, ms: rec.ms };
          } catch (e) {
            return { agente: d.agente, tarefa: d.tarefa, resposta: `[falhou: ${e instanceof Error ? e.message : "erro"}]`, ms: 0 };
          }
        })
      );

      marcarOcupada(chave, `${nomeCS} está consolidando`);
      const consolidacao =
        `CONSOLIDAÇÃO DA DELEGAÇÃO (você é ${nomeCS})\nO gestor pediu: ${texto}\n\nVocê delegou e recebeu:\n` +
        recebidos
          .map((r) => `### ${ROTULO_AGENTE[r.agente as "ref" | "criativo" | "midia"]}\nTarefa pedida: ${r.tarefa}\nResposta:\n${trecho(r.resposta, 5000)}`)
          .join("\n\n") +
        "\n\nRevise o que os agentes entregaram, aponte falhas ou riscos que você encontrou e responda ao gestor de forma direta: o que ficou pronto, o que depende de decisão dele e o próximo passo. Não delegue de novo. Não atribua aos agentes nada que não esteja nas respostas acima. Tudo continua como RASCUNHO até a aprovação explícita do gestor.";
      const r2 = await rodar("cs", "livre", consolidacao, { origem: `${nomeCS} consolidando as respostas dos agentes delegados` });
      if (grupo) {
        const agora = () => new Date().toISOString();
        adicionar(
          ...(plano ? [{ de: "agente" as const, texto: plano, ts: agora(), autor: rotuloPapel("cs") }] : []),
          ...recebidos.map((r) => ({ de: "agente" as const, texto: r.resposta, ts: agora(), autor: ROTULO_AGENTE[r.agente as "ref" | "criativo" | "midia"] })),
          { de: "agente" as const, texto: r2.output.replace(BLOCO_DELEGAR, "").trim(), ts: agora(), autor: rotuloPapel("cs") },
        );
      } else {
        adicionar({
          de: "agente", texto: r2.output.replace(BLOCO_DELEGAR, "").trim(), ts: new Date().toISOString(),
          plano: plano || undefined, delegacoes: recebidos,
        });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na conversa.");
    } finally {
      liberarConversa(chave);
    }
  };

  /** Canal geral da AWQ: todos os CSs recebem a mensagem e respondem; cada um só enxerga o próprio cliente. */
  const enviarGeral = async () => {
    const texto = chatInput.trim();
    const participantes = squads.filter((sq) => sq.agents.cs);
    if (!texto || "geral" in ocupadasRef.current || participantes.length === 0) return;
    setErro(null);
    marcarOcupada("geral", "Os CSs estão respondendo");
    setChatInput("");
    const anexar = (msg: ChatMsg) => salvarChat({ ...chatRef.current, geral: [...(chatRef.current.geral ?? []), msg] });
    const historicoBase = chatRef.current.geral ?? [];
    anexar({ de: "gestor", texto, ts: new Date().toISOString() });
    registrar({ tipo: "MeetingStarted", bu: "AWQ", ator: "gestor", acao: `Mensagem no canal Geral (${participantes.length} CSs)`, origem: `Mensagem: ${texto.slice(0, 140)}` });
    await Promise.all(participantes.map(async (sq) => {
      const nome = sq.agents.cs!.name.split(" · ")[0];
      const autor = `${nome} · ${sq.bu}`;
      const meta = reports.find((r) => sq.bu.toLowerCase().includes(r.cliente.toLowerCase()));
      let relatorio = "";
      if (meta) {
        try { const r = await fetch(`/data/office/reports/${meta.arquivo}`); if (r.ok) relatorio = await r.text(); } catch { /* sem relatório: segue sem */ }
      }
      // histórico isolado: só as mensagens do gestor e as respostas deste mesmo CS
      const hist = historicoBase.filter((m) => m.de === "gestor" || m.autor === autor).slice(-10)
        .map((m) => `${m.de === "gestor" ? "Gestor" : "Você"}: ${m.texto}`).join("\n");
      const tarefa = [
        `CANAL GERAL DA AWQ (você é ${nome}, CS de ${sq.bu})`,
        "O gestor escreveu no canal geral, onde estão os CSs de todos os clientes. Responda em português, curto e direto (até ~120 palavras), considerando APENAS o seu cliente. Você não vê as respostas dos outros CSs: não opine sobre outros clientes nem peça dados deles. Se a mensagem não for relevante para o seu cliente, diga em uma frase. Não afirme ter feito nada externo; nada é publicado ou enviado.",
        relatorio ? `RELATÓRIO DA MANHÃ DO SEU CLIENTE:\n${trecho(relatorio, 3000)}` : "",
        hist ? `CONVERSA ATÉ AGORA:\n${hist}` : "",
        `MENSAGEM DO GESTOR:\n${texto}`,
      ].filter(Boolean).join("\n\n");
      const t0 = performance.now();
      registrar({ tipo: "ActionStarted", bu: sq.bu, ator: "cs", acao: `${nome} no canal Geral`, origem: "Mensagem do gestor no canal Geral" });
      try {
        const { text, usage } = await streamAgent(sq.agents.cs!.id, tarefa, apiKey ?? "", () => {});
        anexar({ de: "agente", autor, texto: text, ts: new Date().toISOString() });
        registrar({ tipo: "ActionCompleted", bu: sq.bu, ator: "cs", acao: `${nome} no canal Geral`, origem: "Mensagem do gestor no canal Geral", ms: performance.now() - t0, tokens: usage });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro";
        const causa = classificarErro(msg);
        if (causa.codigo === "INVALID_API_KEY") { localStorage.removeItem(LS_KEY); setApiKey(null); setPrecisaChave(true); setErro("A Anthropic recusou a chave salva neste navegador. Cole uma chave nova."); }
        else if (causa.codigo === "MISSING_API_KEY") { setPrecisaChave(true); setErro("Falta a chave da Anthropic. Cole a sua no campo que apareceu."); }
        anexar({ de: "agente", autor, texto: `[não respondeu: ${causa.mensagem} ${causa.proxima}]`, ts: new Date().toISOString() });
        registrar({ tipo: "ActionFailed", bu: sq.bu, ator: "cs", acao: `${nome} no canal Geral`, origem: "Mensagem do gestor no canal Geral", causa });
      }
    }));
    liberarConversa("geral");
  };

  // ── Head de CS ────────────────────────────────────────────────────────────────

  const empresasRef = useRef<Empresa[]>([]);
  const [head, setHead] = useState<EstadoHead>(estadoInicial);
  const headRef = useRef<EstadoHead>(head);
  const [headBusy, setHeadBusy] = useState(false);
  const [headEntregando, setHeadEntregando] = useState(false);
  const [headErro, setHeadErro] = useState<string | null>(null);
  const headBusyRef = useRef(false);
  const abaAtiva = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = abaAtiva.current;
    const faixa = el?.parentElement;
    if (!el || !faixa) return;
    // O botão de fechar fica por cima da ponta direita da faixa.
    const folga = 48;
    const esquerda = el.offsetLeft;
    const direita = esquerda + el.offsetWidth;
    const vistaE = faixa.scrollLeft;
    const vistaD = vistaE + faixa.clientWidth - folga;
    if (direita > vistaD) faixa.scrollLeft = direita - (faixa.clientWidth - folga);
    else if (esquerda < vistaE) faixa.scrollLeft = Math.max(0, esquerda - 8);
  }, [tab, painelAberto]);
  const entregandoRef = useRef(false);

  const gravarHead = (next: EstadoHead) => {
    headRef.current = next;
    setHead(next);
    try { localStorage.setItem(LS_HEAD, JSON.stringify(next)); } catch { /* cota estourada: segue só em memória */ }
    syncRef.current?.agendar("head", next);
  };

  const agentesInfo = (): AgenteInfo[] =>
    squadsRef.current.flatMap((sq) =>
      (Object.entries(sq.agents) as [PapelAgente, { id: string; name: string }][]).map(([role, a]) => ({ id: `${sq.bu}|${role}`, bu: sq.bu, role, nome: a.name.split(" · ")[0] }))
    );

  const statusDoAgente = (a: AgenteInfo): string => {
    const ult = [...eventosRef.current].reverse().find((e) => e.bu === a.bu && e.ator === a.role && /^Action/.test(e.tipo));
    if (!ult) return "disponível (sem atividade registrada)";
    return ult.tipo === "ActionStarted" ? "trabalhando" : ult.tipo === "ActionFailed" ? "com falha na última ação" : "disponível";
  };

  const ctxHead = (): { agentes: AgenteInfo[]; modoDe: (bu: string, role: PapelAgente) => ModoAutonomia; agora: Date } => ({
    agentes: agentesInfo(),
    modoDe: (b, r) => modoDe(politicasRef.current, b, r, "livre"),
    agora: new Date(),
  });

  const ativarHead = async (motivo: string) => {
    if (headBusyRef.current) return;
    const lim = limiteDoDia(headRef.current);
    if (lim) { setHeadErro(`O Head não foi ativado: ${lim}.`); return; }
    const lider = squadsRef.current.find((sq) => sq.agents.cs)?.agents.cs;
    if (!lider) { setHeadErro("Nenhum agente de CS disponível para executar o Head."); return; }
    headBusyRef.current = true;
    setHeadBusy(true);
    setHeadErro(null);
    const ctx = ctxHead();
    const aid = `ativ-${Date.now().toString(36)}`;
    const snap = {
      empresas: empresasRef.current.map((e) => ({ bu: e.bu, nome: e.nome, trabalhando: e.trabalhando, agentes: e.agentes, execs: e.execs, alta: e.alta, estados: e.estados as Record<PapelAgente, string> | undefined })),
      missoes: missoesRef.current.map((m) => ({ id: m.id, bu: m.bu, status: m.status, progresso: progresso(m), bloqueio: m.bloqueio, proxima: m.proximaAcao, tentativas: m.tentativas, max: m.maxTentativas })),
      eventosRecentes: eventosRef.current.slice(-15).map((e) => ({ ts: e.ts, tipo: e.tipo, bu: e.bu, ator: e.ator, acao: e.acao, erro: e.causa?.codigo })),
    };
    const prompt = promptDoHead({ ativacaoId: aid, motivo, agora: ctx.agora, estadoCS: lerEstadoCS(headRef.current, snap), capacidade: capacidadeDosAgentes(headRef.current, ctx.agentes, statusDoAgente) });
    registrar({ tipo: "LeaderActivated", bu: "AWQ", ator: "head", acao: "Head de CS ativado", origem: `Motivo: ${motivo}` });
    const t0 = performance.now();
    try {
      const { text, usage } = await streamAgent(lider.id, prompt, apiKey ?? "", () => {});
      const saida = parseSaida(text);
      if (!saida) {
        gravarHead(registrarFalhaAtivacao(headRef.current, aid, motivo, "A resposta do Head não veio no formato JSON esperado; nada foi aplicado.", new Date(), usage));
        registrar({ tipo: "ActionFailed", bu: "AWQ", ator: "head", acao: "Ativação do Head", origem: `Motivo: ${motivo}`, causa: { codigo: "UNKNOWN", mensagem: "Resposta fora do formato JSON.", recuperavel: true, proxima: "Ativar de novo; se persistir, ver o texto no registro." } });
      } else {
        const { estado, ativacao } = aplicarSaida(headRef.current, saida, aid, motivo, ctx, usage);
        gravarHead(estado);
        registrar({ tipo: "ActionCompleted", bu: "AWQ", ator: "head", acao: "Ativação do Head", origem: `Motivo: ${motivo}`, ms: performance.now() - t0, tokens: usage });
        for (const id of ativacao.criadas) {
          const t = estado.tarefas.find((x) => x.id === id);
          if (t) registrar({ tipo: "TaskCreated", bu: t.bu, ator: "head", acao: `${t.agenteId.split("|")[1]}: ${t.resultado.slice(0, 80)}`, origem: `Delegada pelo Head (${t.prioridade}); status ${t.status}` });
        }
        for (const r of ativacao.rejeitadas) registrar({ tipo: "ActionFailed", bu: "AWQ", ator: "head", acao: `Despacho recusado pelo motor`, origem: r.motivo, causa: { codigo: "POLICY_BLOCKED", mensagem: r.motivo, recuperavel: true, proxima: "O Head corrige o despacho na próxima ativação." } });
        for (const id of ativacao.aprovacoes) { const ap = estado.aprovacoes.find((x) => x.id === id); if (ap) registrar({ tipo: "ApprovalRequested", bu: "AWQ", ator: "head", acao: ap.pedido.slice(0, 100), origem: ap.motivo }); }
        registrar({ tipo: "CheckpointSaved", bu: "AWQ", ator: "head", acao: "Checkpoint salvo", origem: estado.checkpoint?.wakeup.at ? `Próximo wakeup: ${new Date(estado.checkpoint.wakeup.at).toLocaleString("pt-BR")}` : "Sem wakeup por horário; segue o heartbeat e os eventos" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      const causa = classificarErro(msg);
      if (causa.codigo === "INVALID_API_KEY") { localStorage.removeItem(LS_KEY); setApiKey(null); setPrecisaChave(true); }
      if (causa.codigo === "MISSING_API_KEY") setPrecisaChave(true);
      // Sem chave válida ou sem crédito, repetir só queima tentativas: não conta no limite diário e pausa o modo autônomo.
      const semAcesso = ["INVALID_API_KEY", "MISSING_API_KEY", "NO_CREDITS"].includes(causa.codigo);
      const falhou = registrarFalhaAtivacao(headRef.current, aid, motivo, `${causa.mensagem} ${causa.proxima}`, new Date(), undefined, !semAcesso);
      gravarHead(semAcesso ? { ...falhou, config: { ...falhou.config, autonomo: false } } : falhou);
      registrar({ tipo: "ActionFailed", bu: "AWQ", ator: "head", acao: "Ativação do Head", origem: `Motivo: ${motivo}`, causa });
      setHeadErro(`${causa.mensagem} ${causa.proxima}${semAcesso ? " O modo autônomo foi pausado; ligue de novo depois de corrigir." : ""}`);
    } finally {
      headBusyRef.current = false;
      setHeadBusy(false);
    }
  };

  /** Fila: entrega as tarefas atribuídas aos agentes (respeita a concorrência), uma execução real por tarefa. */
  const entregarTarefas = async () => {
    if (entregandoRef.current) return;
    const lote = tarefasParaEntregar(headRef.current);
    if (lote.length === 0) return;
    entregandoRef.current = true;
    setHeadEntregando(true);
    await Promise.all(lote.map(async (t) => {
      gravarHead(atualizarTarefa(headRef.current, t.id, { status: "iniciado", tentativas: t.tentativas + 1, bloqueio: undefined }, new Date()));
      registrar({ tipo: "TaskUpdated", bu: t.bu, ator: t.role, acao: `Iniciou: ${t.resultado.slice(0, 80)}`, origem: `Tarefa ${t.id} do Head de CS` });
      try {
        const rec = await rodar(t.role, "livre", promptDaTarefa(t), { bu: t.bu, origem: `Tarefa ${t.id} delegada pelo Head de CS` });
        const altas = rec.analise.flags.filter((f) => f.severity === "alta").length;
        const evid = `${rec.output.length} caracteres; ${altas} alerta(s) alto(s) na análise do motor; ${rec.usage ? `${rec.usage.output} tokens de saída` : "uso não medido"}. O texto fica na conta ${t.bu}; o Head só vê estes fatos.`;
        const agora = new Date();
        gravarHead(registrarEvento(atualizarTarefa(headRef.current, t.id, { status: "concluido", evidenciasColetadas: evid, tokensSaida: rec.usage?.output }, agora), "task_completed", t.bu, agora));
        registrar({ tipo: "TaskUpdated", bu: t.bu, ator: t.role, acao: `Concluiu (aguarda validação do Head): ${t.resultado.slice(0, 60)}`, origem: `Tarefa ${t.id}` });
      } catch (e) {
        const causa = classificarErro(e instanceof Error ? e.message : String(e));
        const agora = new Date();
        gravarHead(registrarEvento(atualizarTarefa(headRef.current, t.id, { status: "bloqueado", bloqueio: `${causa.mensagem} ${causa.proxima}`.slice(0, 240) }, agora), "task_blocked", t.bu, agora));
      }
    }));
    entregandoRef.current = false;
    setHeadEntregando(false);
  };

  const decidirAprovacaoHead = (idAprov: string, decisao: "aprovada" | "recusada") => {
    gravarHead(decidirAprovacao(headRef.current, idAprov, decisao, new Date()));
    registrar({ tipo: "ApprovalDecided", bu: "AWQ", ator: "gestor", acao: `Aprovação do Head: ${decisao}`, origem: headRef.current.aprovacoes.find((a) => a.id === idAprov)?.pedido.slice(0, 120) ?? "" });
  };

  const validarManual = (tarefaId: string, ok: boolean) => {
    gravarHead(atualizarTarefa(headRef.current, tarefaId, { status: ok ? "validado" : "atribuido", bloqueio: ok ? undefined : "Reaberta pelo gestor" }, new Date()));
  };

  const mudarConfigHead = (p: Partial<ConfigHead>) => gravarHead({ ...headRef.current, config: { ...headRef.current.config, ...p } });

  // Heartbeat: só enquanto esta página está aberta e o modo autônomo está ligado.
  const ativarHeadRef = useRef(ativarHead);
  ativarHeadRef.current = ativarHead;
  const entregarRef = useRef(entregarTarefas);
  entregarRef.current = entregarTarefas;
  useEffect(() => {
    const t = setInterval(() => {
      const h = headRef.current;
      if (!h.config.autonomo) return;
      const motivo = ativacaoDevida(h, new Date());
      if (motivo && !headBusyRef.current) void ativarHeadRef.current(motivo);
      void entregarRef.current();
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Reunião dos CSs ───────────────────────────────────────────────────────────

  /** Cada CS responde em paralelo, vendo só o contexto do próprio cliente (sem ler as respostas dos outros). */
  const iniciarReuniao = async () => {
    const pauta = reuPauta.trim();
    const participantes = squads.filter((sq) => sq.agents.cs);
    if (!pauta || reuBusy || participantes.length === 0) return;
    setErro(null);
    setReuBusy(true);
    registrar({ tipo: "MeetingStarted", bu: "AWQ", ator: "gestor", acao: `Reunião dos CSs (${participantes.length})`, origem: `Pauta: ${pauta.slice(0, 140)}` });
    setReuResp(Object.fromEntries(participantes.map((sq) => [sq.bu, {
      nome: sq.agents.cs!.name.split(" · ")[0], cliente: sq.bu, status: "pensando" as const, texto: "",
    }])));
    await Promise.all(participantes.map(async (sq) => {
      const nome = sq.agents.cs!.name.split(" · ")[0];
      const meta = reports.find((r) => sq.bu.toLowerCase().includes(r.cliente.toLowerCase()));
      let relatorio = "";
      if (meta) {
        try { const r = await fetch(`/data/office/reports/${meta.arquivo}`); if (r.ok) relatorio = await r.text(); } catch { /* sem relatório: segue sem */ }
      }
      const tarefa = [
        `REUNIÃO DE ALINHAMENTO DOS CSs (você é ${nome}, CS de ${sq.bu})`,
        "O gestor reuniu os CSs de todos os clientes. Responda em português, direto e curto (até ~150 palavras): sua posição sobre a pauta considerando APENAS o seu cliente, o que está pendente ou em risco e o que precisa de decisão do gestor. Você só enxerga o contexto do seu cliente: não opine sobre outros clientes nem peça dados deles. Não afirme ter feito nada externo; nada é publicado ou enviado.",
        relatorio ? `RELATÓRIO DA MANHÃ DO SEU CLIENTE:\n${trecho(relatorio, 3500)}` : "",
        `PAUTA DO GESTOR:\n${pauta}`,
      ].filter(Boolean).join("\n\n");
      try {
        const { text } = await streamAgent(sq.agents.cs!.id, tarefa, apiKey ?? "", (full) =>
          setReuResp((m) => ({ ...m, [sq.bu]: { nome, cliente: sq.bu, status: "pensando", texto: full } }))
        );
        setReuResp((m) => ({ ...m, [sq.bu]: { nome, cliente: sq.bu, status: "pronto", texto: text } }));
        registrar({ tipo: "MeetingReply", bu: sq.bu, ator: "cs", acao: `${nome} respondeu à pauta`, origem: "Reunião dos CSs" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro";
        if (/invalid x-api-key|authentication_error/.test(msg)) {
          localStorage.removeItem(LS_KEY); setApiKey(null); setPrecisaChave(true);
          setErro("A Anthropic recusou a chave salva neste navegador. Cole uma chave nova no campo que apareceu.");
        } else if (msg.includes("API_KEY_REQUIRED")) {
          setPrecisaChave(true);
          setErro("Falta a chave da Anthropic. Cole a sua no campo que apareceu (ela fica só neste navegador).");
        }
        setReuResp((m) => ({ ...m, [sq.bu]: { nome, cliente: sq.bu, status: "erro", texto: msg } }));
        registrar({ tipo: "ActionFailed", bu: sq.bu, ator: "cs", acao: `${nome} na reunião`, origem: "Reunião dos CSs", causa: classificarErro(msg) });
      }
    }));
    setReuBusy(false);
  };

  // ── Cenários ──────────────────────────────────────────────────────────────────

  const rodarCenario = async (c: Cenario) => {
    setCenarioAtual(c.id);
    try {
      await rodar(c.papel, "livre", c.tarefa, { scenarioId: c.id });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no cenário.");
    } finally {
      setCenarioAtual(null);
    }
  };

  const rodarTodos = async () => {
    if (busy) return;
    setBusy(true);
    setErro(null);
    for (const c of CENARIOS) {
      await rodarCenario(c);
    }
    setBusy(false);
  };

  const ultimoDoCenario = (id: string) =>
    [...runsDaSquad].reverse().find((r) => r.scenarioId === id);

  const vereditoDe = (c: Cenario, r?: RunRecord): Veredito | null =>
    r ? (r.manual ?? avaliarCenario(c, r.output)) : null;

  const marcar = (runId: string, v: Veredito) =>
    salvarRuns(runsRef.current.map((r) => (r.id === runId ? { ...r, manual: v } : r)));

  // ── Agregados da análise ──────────────────────────────────────────────────────

  const resumo = useMemo(() => {
    const porPapel = PAPEIS.map((p) => {
      const rs = runsDaSquad.filter((r) => r.role === p.role);
      const comFormato = rs.filter((r) => r.analise.formatoScore !== null);
      const f = rs.reduce((acc, r) => {
        const c = contaFlags(r.analise);
        return { alta: acc.alta + c.alta, media: acc.media + c.media };
      }, { alta: 0, media: 0 });
      return {
        ...p,
        n: rs.length,
        ms: rs.length ? rs.reduce((a, r) => a + r.ms, 0) / rs.length : 0,
        formato: comFormato.length ? comFormato.reduce((a, r) => a + (r.analise.formatoScore ?? 0), 0) / comFormato.length : null,
        alta: f.alta,
        media: f.media,
        tokensOut: rs.reduce((a, r) => a + (r.usage?.output ?? 0), 0),
      };
    });
    const flagsFreq = new Map<string, { label: string; n: number; severity: string }>();
    for (const r of runsDaSquad) {
      for (const f of r.analise.flags) {
        if (f.severity === "info") continue;
        const cur = flagsFreq.get(f.id) ?? { label: f.label.replace(/\s*\(.*\)$/, ""), n: 0, severity: f.severity };
        cur.n += 1;
        flagsFreq.set(f.id, cur);
      }
    }
    const veredAll = CENARIOS.map((c) => vereditoDe(c, ultimoDoCenario(c.id)));
    return {
      total: runsDaSquad.length,
      tokensIn: runsDaSquad.reduce((a, r) => a + (r.usage?.input ?? 0), 0),
      tokensOut: runsDaSquad.reduce((a, r) => a + (r.usage?.output ?? 0), 0),
      porPapel,
      flags: Array.from(flagsFreq.values()).sort((a, b) => b.n - a.n),
      cenRodados: veredAll.filter((v) => v !== null).length,
      cenPassou: veredAll.filter((v) => v === "passou").length,
      cenFalhou: veredAll.filter((v) => v === "falhou").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runsDaSquad]);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(runsDaSquad, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `office-${bu.replace(/\W+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const limpar = () => {
    if (!confirm("Apagar todo o histórico de execuções deste navegador?")) return;
    salvarRuns([]);
    setCycle(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (IS_STATIC) {
    return (
      <div className="card p-6 text-sm text-gray-600">
        O simulador precisa do servidor (/api/agents) e não funciona na versão estática.
      </div>
    );
  }

  // Produtividade real por agente, calculada das execuções registradas (sem cenários de estresse)
  const hojeBRT = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const atividade = Object.fromEntries(
    PAPEIS.map((p) => {
      const rs = runsDaSquad.filter((r) => r.role === p.role && !r.scenarioId && !r.erro);
      const hoje = rs.filter((r) => new Date(r.ts).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === hojeBRT);
      const ultima = rs.length ? rs[rs.length - 1] : null;
      const recentes = rs.filter((r) => Date.now() - new Date(r.ts).getTime() < 30 * 60000).length;
      const aguardando = cycle?.estado === "AGUARDANDO APROVAÇÃO" && (p.role === "cs" || p.role === "criativo");
      return [
        p.role,
        {
          entregasHoje: hoje.length,
          ultimaTs: ultima ? new Date(ultima.ts).getTime() : null,
          pendente: aguardando,
          retrabalho: !!ultima && contaFlags(ultima.analise).alta > 0,
          carga: Math.min(1, recentes / 5),
        },
      ];
    })
  ) as Record<PapelAgente, Atividade>;

  const empresas: Empresa[] = squads.map((sq, i) => {
    const rs = runs.filter((r) => r.bu === sq.bu);
    const rep = reports.find((r) => sq.bu.toLowerCase().includes(r.cliente.toLowerCase()));
    return {
      bu: sq.bu,
      nome: sq.bu.replace(/^Social Media · /, ""),
      slug: (sq.agents.cs?.id ?? sq.bu).replace(/^social-/, "").replace(/-cs$/, ""),
      tema: i,
      agentes: Object.keys(sq.agents).length,
      execs: rs.length,
      alta: rs.reduce((a, r) => a + contaFlags(r.analise).alta, 0),
      trabalhando: sq.bu === bu ? PAPEIS.filter((p) => desks[p.role] === "working").length : 0,
      relatorio: !!rep,
      // sala atual: estados ao vivo; demais salas: aproximado das execuções recentes (10 min)
      estados: Object.fromEntries(
        PAPEIS.map((p) => {
          if (sq.bu === bu) return [p.role, desks[p.role]];
          const ult = [...rs].reverse().find((r) => r.role === p.role && !r.scenarioId);
          const recente = !!ult && Date.now() - new Date(ult.ts).getTime() < 10 * 60000;
          return [p.role, !recente ? "idle" : contaFlags(ult!.analise).alta > 0 ? "error" : "done"];
        })
      ) as Record<PapelAgente, DeskStatus>,
    };
  });
  empresasRef.current = empresas;

  const Mundo = modo3D ? OfficeGame3D : OfficeGame;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a101f] notranslate" translate="no">
      {/* Avisos flutuantes: ficam sobre o mundo, sem empurrar a tela */}
      {((precisaChave && !apiKey) || erro) && !(painelAberto && tab === "conversa") && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-[min(680px,94%)] space-y-2">
          {precisaChave && !apiKey && (
            <div className="rounded-xl bg-white shadow-xl border border-amber-200 p-3 flex flex-wrap items-center gap-2">
              <Key size={16} className="text-amber-600" />
              <span className="text-xs text-gray-600 flex-1 min-w-[200px]">
                O servidor não tem chave da Anthropic configurada. Cole a sua: ela fica só neste navegador e é a mesma do /agents e do OpenClaw.
              </span>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-56"
              />
              <button
                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-40"
                disabled={!keyInput.trim().startsWith("sk-")}
                onClick={() => { localStorage.setItem(LS_KEY, keyInput.trim()); setApiKey(keyInput.trim()); setKeyInput(""); setPrecisaChave(false); setErro(null); }}
              >
                Salvar chave
              </button>
            </div>
          )}
          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 shadow-xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span className="flex-1">{erro}</span>
              <button onClick={() => setErro(null)} aria-label="Dispensar aviso" className="text-red-400 hover:text-red-700"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      {/* Alternância do renderizador: o mundo 2D (padrão) continua disponível durante a migração */}
      <button
        onClick={alternarModo3D}
        className={`absolute z-[70] rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium px-2.5 py-1.5 ${painelAberto ? "top-14 left-16" : "top-14 right-3"}`}
        title={modo3D ? "Voltar para o mundo 2D" : "Experimentar o mundo em 3D (beta)"}
      >
        {modo3D ? "Mundo 2D" : "Modo 3D (beta)"}
      </button>

      {/* Mundo jogável */}
      <Mundo
        empresas={empresas}
        buAtual={bu}
        onEscolherEmpresa={(b) => { setBu(b); setCycle(null); setTab("conversa"); }}
        estados={desks}
        aguardandoGestor={cycle?.estado === "AGUARDANDO APROVAÇÃO"}
        selecionado={chatRole}
        onSelecionar={(r) => setChatRole(r)}
        metricas={Object.fromEntries(
          resumo.porPapel.map((p) => [p.role, { execs: p.n, formato: p.formato, alta: p.alta, media: p.media, ms: p.ms }])
        ) as Record<PapelAgente, MetricaAgente>}
        atividade={atividade}
        tema={Math.max(0, squads.findIndex((sq) => sq.bu === bu))}
        descricao={`Escritório da squad ${bu}. ${PAPEIS.map((p) => `${p.label}: ${desks[p.role]}`).join(". ")}.`}
        nomeCS={nomeCS}
        tab={tab}
        painelAberto={painelAberto}
        onSair={() => { if (window.history.length > 1) router.back(); else router.push("/"); }}
        busca={[
          ...squads.map((sq) => ({ id: `e:${sq.bu}`, tipo: "empresa" as const, rotulo: sq.bu, sub: "sala do cliente", bu: sq.bu })),
          ...squads.flatMap((sq) => PAPEIS.filter((p) => sq.agents[p.role]).map((p) => ({
            id: `a:${sq.bu}:${p.role}`, tipo: "agente" as const,
            rotulo: p.role === "cs" ? `${sq.agents.cs?.name.split(" · ")[0] ?? "CS"} (CS)` : p.label,
            sub: sq.bu, bu: sq.bu, role: p.role,
          }))),
          ...ANDARES.map((a) => ({ id: `a:${a.id}`, tipo: "andar" as const, rotulo: `Andar ${a.numero} · ${a.nome}`, sub: a.descricao, andar: a.id })),
          { id: "s:reunioes", tipo: "sala" as const, rotulo: "Sala de reuniões", sub: "reunião dos CSs", sala: "reunioes" as const },
          { id: "s:diretoria", tipo: "sala" as const, rotulo: "Sala do Miguel", sub: "diretoria", sala: "diretoria" as const },
          { id: "s:estudio", tipo: "sala" as const, rotulo: "Estúdio", sub: "Caza Vision · Produtora", sala: "estudio" as const, andar: "caza" as const },
        ]}
        reuniao={painelAberto && tab === "reuniao" ? squads.filter((sq) => sq.agents.cs).map((sq) => { const st = reuResp[sq.bu]?.status; return st ?? "chegando"; }) : undefined}
        onPainel={(aberto, t) => { if (t) setTab(t); setPainelAberto(aberto); }}
        temRelatorio={!!reportDaSquad}
        pendencias={cycle?.estado === "AGUARDANDO APROVAÇÃO" ? 1 : 0}
      >
      {/* Painéis (gaveta sobre o mundo) */}
      <div className="h-full flex flex-col bg-white">
        <div className="flex gap-1 border-b border-gray-100 pl-3 pr-14 pt-3 pb-1 overflow-x-auto shrink-0 min-w-0 w-full">
          {([["ciclo", "Ciclo"], ["conversa", "Mensagens"], ["reuniao", "Reunião"], ["head", "Head de CS"], ["eventos", "Eventos"], ["missoes", "Missões"], ["relatorio", "Relatório da manhã"], ["analise", "Análise"], ["cenarios", "Cenários de estresse"], ["registros", "Registros"], ["storyboard", "Storyboard"]] as const).map(([k, l]) => (
            <button key={k} ref={tab === k ? abaAtiva : undefined} onClick={() => { setTab(k); }}
              className={`px-2.5 py-2 text-sm rounded-t-lg whitespace-nowrap shrink-0 ${tab === k ? "text-brand-700 font-semibold border-b-2 border-brand-500" : "text-gray-500"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {tab === "ciclo" && (
      <div className="grid grid-cols-1 gap-4">
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Nova demanda</h2>
          <textarea
            value={demanda}
            onChange={(e) => setDemanda(e.target.value)}
            rows={4}
            placeholder="Ex.: Preciso de um carrossel para o Instagram explicando como a empresa funciona, para a semana que vem."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            disabled={busy}
          />
          <button
            onClick={iniciarCiclo}
            disabled={busy || !demanda.trim() || !squad}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {busy && !cenarioAtual ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Iniciar ciclo editorial
          </button>

          {cycle && (
            <div className="space-y-3 pt-2">
              <ol className="space-y-1.5">
                {ETAPAS.map((e, i) => {
                  const feito = i < cycle.etapa || (i === 5 && !!cycle.outputs.execucao);
                  const atual = i === cycle.etapa && cycle.estado !== "CANCELADO" && !feito;
                  return (
                    <li key={e.label} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                        feito ? "bg-emerald-500 border-emerald-500 text-white"
                          : atual ? "border-brand-500 text-brand-600" : "border-gray-200 text-gray-300"}`}>
                        {feito ? <Check size={11} /> : i + 1}
                      </span>
                      <span className={feito ? "text-gray-700" : atual ? "text-brand-700 font-medium" : "text-gray-400"}>{e.label}</span>
                      {atual && busy && <Loader2 size={11} className="animate-spin text-brand-500" />}
                    </li>
                  );
                })}
              </ol>
              <div className="text-xs text-gray-500">
                Estado: <span className="font-semibold text-gray-800">{cycle.estado}</span> · versão v{cycle.versao}
              </div>

              {cycle.estado === "AGUARDANDO APROVAÇÃO" && !busy && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="text-xs font-semibold text-amber-800">Sua decisão (v{cycle.versao})</div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="Feedback (obrigatório para solicitar alterações)"
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => decidir("aprovado")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1"><Check size={12} /> Aprovar</button>
                    <button onClick={() => decidir("ajustes")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-medium">Solicitar alterações</button>
                    <button onClick={() => decidir("rejeitado")} className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-medium inline-flex items-center gap-1"><X size={12} /> Rejeitar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="card p-5 space-y-3 max-h-[560px] overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-800">Conversa da squad</h2>
          {runsDaSquad.filter((r) => !r.scenarioId).length === 0 && (
            <p className="text-xs text-gray-400">Nenhuma execução ainda. Inicie um ciclo para ver os agentes trabalhando.</p>
          )}
          {runsDaSquad.filter((r) => !r.scenarioId).slice(-12).reverse().map((r) => {
            const p = PAPEIS.find((x) => x.role === r.role)!;
            const Icon = p.icon;
            return (
              <div key={r.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${p.cor}`}><Icon size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{p.label}</span> · {r.kind} · {fmtS(r.ms)} · {new Date(r.ts).toLocaleTimeString("pt-BR")}
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">{r.output}</p>
                  <button className="text-[11px] text-brand-600 mt-0.5" onClick={() => { setTab("registros"); setAberto(r.id); }}>ver completo e análise</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

          )}

          {tab === "conversa" && (() => {
            const nomeDoCS = (sq: Squad) => sq.agents.cs?.name.split(" · ")[0] ?? "CS";
            type Conv = { id: string; titulo: string; sub: string; chave: string; tipo: "geral" | "grupo" | "ind"; bu?: string; role?: PapelAgente };
            const conversas: Conv[] = [
              { id: "geral", titulo: "Geral AWQ", sub: `Todos os CSs · ${squads.length} clientes`, chave: "geral", tipo: "geral" },
              ...squads.map((sq): Conv => ({ id: `grupo:${sq.bu}`, titulo: `Squad ${sq.bu}`, sub: `Grupo · ${nomeDoCS(sq)} e a equipe`, chave: `${sq.bu}|grupo`, tipo: "grupo", bu: sq.bu })),
              ...squads.flatMap((sq) => PAPEIS.filter((p) => sq.agents[p.role]).map((p): Conv => ({
                id: `ind:${sq.bu}:${p.role}`, titulo: p.role === "cs" ? nomeDoCS(sq) : p.label,
                sub: `${p.role === "cs" ? "Headcount/CS" : "Agente"} · ${sq.bu}`, chave: `${sq.bu}|${p.role}`, tipo: "ind", bu: sq.bu, role: p.role,
              }))),
            ];
            const ultima = (c: Conv) => (chat[c.chave] ?? []).slice(-1)[0];
            const abrir = (c: Conv) => {
              if (c.bu && c.bu !== bu) { setBu(c.bu); setCycle(null); }
              if (c.tipo === "grupo") setChatRole("cs");
              if (c.tipo === "ind" && c.role) setChatRole(c.role);
              setErro(null);
              setConv(c.id);
            };
            const caixaChave = precisaChave && !apiKey && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900"><Key size={14} /> Falta a chave da Anthropic</div>
                <p className="text-[11px] text-amber-800">O servidor não tem uma chave configurada. Cole a sua para conversar: ela fica só neste navegador e é a mesma do /agents e do OpenClaw.</p>
                <div className="flex gap-2">
                  <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="sk-ant-..." className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 text-xs bg-white" />
                  <button
                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-40"
                    disabled={!keyInput.trim().startsWith("sk-")}
                    onClick={() => { localStorage.setItem(LS_KEY, keyInput.trim()); setApiKey(keyInput.trim()); setKeyInput(""); setPrecisaChave(false); setErro(null); }}
                  >Salvar</button>
                </div>
              </div>
            );
            const caixaErro = erro && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{erro}</span>
              </div>
            );
            const avatar = (c: Conv, tam = "w-10 h-10") => (
              <div className={`${tam} rounded-full flex items-center justify-center shrink-0 text-white ${c.tipo === "geral" ? "bg-gray-800" : c.tipo === "grupo" ? "bg-brand-600" : "bg-emerald-600"}`}>
                {c.tipo === "ind" ? <User size={16} /> : <Users size={16} />}
              </div>
            );

            const atual = conversas.find((c) => c.id === conv);
            if (!atual) {
              const bloco = (titulo: string, itens: Conv[]) => {
                const ord = [...itens].sort((x, y) => (ultima(y)?.ts ?? "").localeCompare(ultima(x)?.ts ?? ""));
                return (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1">{titulo}</div>
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                      {ord.map((c) => {
                        const u = ultima(c);
                        return (
                          <li key={c.id}>
                            <button onClick={() => abrir(c)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
                              {avatar(c)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">{c.titulo}</span>
                                  {u && <span className="text-[10px] text-gray-400 shrink-0">{new Date(u.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span>}
                                </div>
                                <div className={`text-[11px] truncate ${c.chave in ocupadas ? "text-emerald-600" : "text-gray-500"}`}>
                                  {c.chave in ocupadas ? `${ocupadas[c.chave] || "digitando"}…` : u ? `${u.de === "gestor" ? "Você: " : u.autor ? `${u.autor.split(" · ")[0]}: ` : ""}${u.texto.replace(/\s+/g, " ")}` : c.sub}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              };
              return (
                <div className="space-y-4">
                  {caixaChave}
                  {caixaErro}
                  {bloco("Empresa", conversas.filter((c) => c.tipo === "geral"))}
                  {bloco("Grupos", conversas.filter((c) => c.tipo === "grupo"))}
                  {bloco("Conversas individuais", conversas.filter((c) => c.tipo === "ind"))}
                  <p className="text-[11px] text-gray-400">
                    Os agentes não têm acesso a Drive, Notion nem redes: respondem só com o contexto desta tela. Nada é publicado ou enviado.
                    No Geral, cada CS vê só o próprio cliente.
                  </p>
                </div>
              );
            }

            const msgs = chat[atual.chave] ?? [];
            const multi = atual.tipo !== "ind";
            const cores = ["text-rose-600", "text-indigo-600", "text-amber-600", "text-teal-600", "text-fuchsia-600", "text-sky-600"];
            const corDe = (a: string) => cores[Array.from(a).reduce((n, ch) => n + ch.charCodeAt(0), 0) % cores.length];
            const enviar = () => (atual.tipo === "geral" ? void enviarGeral() : void enviarChat());
            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setConv(null)} aria-label="Voltar para as conversas" title="Voltar" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600"><ArrowLeft size={16} /></button>
                  {avatar(atual, "w-9 h-9")}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{atual.titulo}</div>
                    <div className="text-[11px] text-gray-500 truncate">{atual.sub}</div>
                  </div>
                </div>
                {caixaChave}
                {caixaErro}
                <div className="rounded-xl border border-gray-100 bg-[#efeae2]/60 p-3 space-y-2 h-[46vh] min-h-[260px] overflow-y-auto">
                  {msgs.length === 0 && (
                    <p className="text-xs text-gray-500 bg-white/80 rounded-lg px-3 py-2 inline-block">
                      {atual.tipo === "geral" ? "Escreva para todos os CSs de uma vez; cada um responde sobre o próprio cliente."
                        : atual.tipo === "grupo" ? `Escreva no grupo: ${nomeCS} decide o que resolver e o que delegar à equipe, e os agentes respondem aqui.`
                        : "Conversa direta. Pergunte, por exemplo, \u201cqual é a prioridade desta semana?\u201d."}
                    </p>
                  )}
                  {msgs.map((m, i) => (
                    <div key={i} className={`flex ${m.de === "gestor" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-xl px-3 py-1.5 text-sm whitespace-pre-wrap shadow-sm ${m.de === "gestor" ? "bg-[#d9fdd3] text-gray-900" : "bg-white text-gray-800"}`}>
                        {m.de !== "gestor" && multi && m.autor && <div className={`text-[11px] font-semibold ${corDe(m.autor)}`}>{m.autor}</div>}
                        {m.texto}
                        {m.delegacoes && m.delegacoes.length > 0 && (
                          <details className="mt-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                            <summary className="cursor-pointer px-2 py-1.5 text-gray-600 font-medium">
                              {nomeCS} delegou a {m.delegacoes.map((d) => ROTULO_AGENTE[d.agente as "ref" | "criativo" | "midia"].split(" ")[0]).join(", ")} ({fmtS(Math.max(...m.delegacoes.map((d) => d.ms)))})
                            </summary>
                            <div className="px-2 pb-2 space-y-2">
                              {m.plano && <p className="text-gray-500 italic whitespace-pre-wrap">{m.plano}</p>}
                              {m.delegacoes.map((d, k) => (
                                <div key={k} className="space-y-1">
                                  <div className="font-semibold text-gray-700">{ROTULO_AGENTE[d.agente as "ref" | "criativo" | "midia"]}</div>
                                  <div className="text-gray-500 whitespace-pre-wrap">Pedido: {d.tarefa}</div>
                                  <pre className="whitespace-pre-wrap bg-white border border-gray-100 rounded p-2 max-h-48 overflow-y-auto text-[11px] text-gray-700">{d.resposta}</pre>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        <div className="text-[10px] mt-0.5 text-right text-gray-400">{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</div>
                      </div>
                    </div>
                  ))}
                  {atual.chave in ocupadas && (
                    <div className="flex justify-start">
                      <div className="rounded-xl px-3 py-1.5 text-sm bg-white text-gray-500 inline-flex items-center gap-2 shadow-sm">
                        <Loader2 size={13} className="animate-spin" />
                        {ocupadas[atual.chave] ? `${ocupadas[atual.chave]}…` : atual.tipo === "ind" && live[chatRole] ? live[chatRole]!.slice(-120) : "digitando…"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); } }}
                    rows={2}
                    placeholder="Mensagem (Enter envia, Shift + Enter quebra a linha)"
                    className="flex-1 border border-gray-200 rounded-2xl px-3 py-2 text-sm resize-none"
                    disabled={atual.chave in ocupadas}
                  />
                  <button
                    onClick={enviar}
                    disabled={atual.chave in ocupadas || !chatInput.trim() || squads.length === 0}
                    aria-label="Enviar"
                    className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </div>
                {msgs.length > 0 && (
                  <button
                    className="text-[11px] text-gray-400 hover:text-gray-700 self-start"
                    onClick={() => { const { [atual.chave]: _descartada, ...resto } = chat; void _descartada; salvarChat(resto); }}
                  >
                    Limpar esta conversa
                  </button>
                )}
              </div>
            );
          })()}

          {tab === "reuniao" && (
            <div className="space-y-3">
              {erro && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{erro}</span>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Sala de reuniões: todos os CSs ({squads.map((sq) => sq.agents.cs?.name.split(" · ")[0]).filter(Boolean).join(", ") || "nenhum carregado"}) recebem a mesma pauta e respondem ao mesmo tempo.
                Cada um vê só o contexto do próprio cliente e não lê o que os outros disseram. Nada é publicado ou enviado.
              </p>
              <textarea
                value={reuPauta}
                onChange={(e) => setReuPauta(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void iniciarReuniao(); } }}
                rows={3}
                placeholder="Pauta da reunião (ex.: qual a prioridade de cada cliente esta semana? Cmd/Ctrl + Enter inicia)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <button
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-40 flex items-center gap-2"
                disabled={reuBusy || !reuPauta.trim() || squads.length === 0}
                onClick={() => void iniciarReuniao()}
              >
                {reuBusy ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />} Iniciar reunião
              </button>
              <div className="space-y-3">
                {Object.values(reuResp).map((r) => (
                  <div key={r.cliente} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-800">{r.nome} · CS de {r.cliente}</div>
                      <div className={`text-[10px] ${r.status === "erro" ? "text-red-600" : r.status === "pronto" ? "text-green-600" : "text-gray-400"}`}>
                        {r.status === "pensando" ? "falando…" : r.status === "pronto" ? "concluiu" : "falhou"}
                      </div>
                    </div>
                    {r.status === "erro" ? <p className="text-xs text-red-600">{r.texto}</p> : <MiniMarkdown source={r.texto || "…"} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "head" && (
            <HeadCSPanel
              armazenamento={armazenamento} head={head} busy={headBusy} entregando={headEntregando} erro={headErro} temSquads={squads.some((sq) => sq.agents.cs)}
              onAtivar={() => void ativarHead("solicitação do gestor")} onEntregar={() => void entregarTarefas()}
              onAprovacao={decidirAprovacaoHead} onValidar={validarManual} onConfig={mudarConfigHead}
            />
          )}

          {tab === "missoes" && (() => {
            const lista = missoes.filter((m) => m.bu === bu).slice().reverse();
            const cor: Record<string, string> = {
              working: "bg-blue-100 text-blue-800", approval_required: "bg-amber-100 text-amber-800", complete: "bg-green-100 text-green-800",
              blocked: "bg-red-100 text-red-800", failed: "bg-red-100 text-red-800", budget_exhausted: "bg-red-100 text-red-800", waiting: "bg-gray-100 text-gray-700",
            };
            return (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Cada ciclo editorial é uma missão com estado guardado neste navegador, critérios de pronto verificados pelo sistema (formato e alertas, não opinião da IA) e limites de tentativas e de tokens. Só fica &quot;Concluída&quot; quando todos os critérios estão comprovados.
                </p>
                {lista.length === 0 && <div className="text-xs text-gray-400">Nenhuma missão nesta sala ainda. Inicie um ciclo na aba Ciclo.</div>}
                {lista.map((m) => (
                  <div key={m.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-gray-800">{m.demanda.slice(0, 140)}</div>
                      <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${cor[m.status]}`}>{ROTULO_STATUS[m.status]}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${progresso(m)}%` }} /></div>
                    <ul className="space-y-0.5">
                      {m.criterios.map((c) => (
                        <li key={c.id} className="text-[11px] text-gray-700">
                          <span className={c.ok ? "text-green-600" : "text-gray-400"}>{c.ok ? "✓" : "○"}</span> {c.texto}
                          {c.evidencia && <span className="text-gray-400"> · {c.evidencia}</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                      <div>Agora: {m.acaoAtual ?? "nada em execução"}</div>
                      <div>Próximo: {m.proximaAcao}</div>
                      <div>Tentativas: {m.tentativas}/{m.maxTentativas}</div>
                      <div>Tokens (entrada / saída): {m.tokens.input.toLocaleString("pt-BR")} / {m.tokens.output.toLocaleString("pt-BR")} (limite de saída {m.maxTokensSaida.toLocaleString("pt-BR")})</div>
                    </div>
                    {m.bloqueio && <div className="text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2">Aguardando / como destravar: {m.bloqueio}</div>}
                    {m.autorizacoes.length > 0 && <div className="text-[11px] text-gray-600">Quem autorizou: {m.autorizacoes.join(" · ")}</div>}
                    <details className="text-[11px]">
                      <summary className="cursor-pointer text-brand-600">Registro de decisões ({m.decisoes.length})</summary>
                      <div className="mt-1 space-y-1.5">
                        {m.decisoes.slice().reverse().slice(0, 8).map((d, i) => (
                          <div key={i} className="rounded-lg bg-gray-50 p-2 space-y-0.5 text-gray-700">
                            <div className="font-semibold">{d.acao} <span className="font-normal text-gray-400">· {new Date(d.ts).toLocaleTimeString("pt-BR")}</span></div>
                            <div>Objetivo: {d.objetivo}</div>
                            <div>Alternativa descartada: {d.alternativas}</div>
                            <div>Restrições: {d.restricoes}</div>
                            <div>Evidência: {d.evidencias}</div>
                            <div>Política: {d.politica} · Custo: {d.custo}</div>
                            <div>Resultado: {d.resultado} · Próximo: {d.proximo}</div>
                            <div className="text-gray-400">Confiança: não calibrada</div>
                          </div>
                        ))}
                      </div>
                    </details>
                    <details className="text-[11px]">
                      <summary className="cursor-pointer text-brand-600">Estado (JSON)</summary>
                      <pre className="mt-1 rounded-lg bg-gray-900 text-gray-100 p-2 overflow-x-auto text-[10px]">{JSON.stringify(estadoJson(m), null, 2)}</pre>
                    </details>
                  </div>
                ))}
              </div>
            );
          })()}

          {tab === "eventos" && (() => {
            const lista = eventos.filter((e) => filtroEvento === "todos" || e.ator === filtroEvento).slice().reverse().slice(0, 80);
            const agentes: [string, string][] = [["todos", "Todos"], ["gestor", "Gestor"], ...PAPEIS.map((p) => [p.role, p.role === "cs" ? nomeCS : p.label] as [string, string])];
            const ultimoPorAgente = (role: string) => [...eventos].reverse().find((e) => e.ator === role && e.bu === bu);
            return (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Fatos registrados pelo sistema (não texto gerado por IA): cada ação traz a origem e, nas falhas, a causa e a recuperação. Fica só neste navegador.
                </p>
                <div className="rounded-xl border border-gray-200 p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-gray-800">Por quê? Situação de cada agente nesta sala</div>
                  {PAPEIS.map((p) => {
                    const u = ultimoPorAgente(p.role);
                    const st = desks[p.role];
                    return (
                      <div key={p.role} className="text-[11px] text-gray-600">
                        <span className="font-medium text-gray-800">{p.role === "cs" ? nomeCS : p.label}</span>{" "}
                        {st === "working" ? "está trabalhando" : st === "error" ? "teve um problema" : st === "done" ? "entregou" : "está ocioso"}
                        {u ? `: ${u.acao}. Motivo: ${u.origem}.` : ": sem registros ainda (nenhuma ação foi pedida a ele)."}
                        {u?.causa && <span className="text-red-600"> Causa: {u.causa.mensagem} Próximo passo: {u.causa.proxima}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-800">Políticas de autonomia (sala {bu})</div>
                  <p className="text-[11px] text-gray-500">
                    Defina o que cada agente pode fazer em cada ação. Hoje eles só geram texto, então os modos que valem são Bloqueado, Recomendar e Preparar.
                    Modos de execução ({MODOS_INDISPONIVEIS.join(" e ")}) ficam indisponíveis até haver ferramentas externas conectadas.
                  </p>
                  {PAPEIS.map((p) => (
                    <div key={p.role} className="space-y-1">
                      <div className="text-[11px] font-medium text-gray-700">{p.role === "cs" ? nomeCS : p.label}</div>
                      {ACOES_POR_PAPEL[p.role].map((a) => (
                        <div key={a.kind} className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
                          <span>{a.rotulo}</span>
                          <select
                            value={modoDe(politicas, bu, p.role, a.kind)}
                            onChange={(e) => mudarPolitica(p.role, a.kind, e.target.value as ModoAutonomia)}
                            className="border border-gray-200 rounded-md px-1.5 py-1 text-[11px] bg-white"
                            title={MODOS.find((m) => m.modo === modoDe(politicas, bu, p.role, a.kind))?.descricao}
                          >
                            {MODOS.map((m) => <option key={m.modo} value={m.modo}>{m.rotulo}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agentes.map(([k, l]) => (
                    <button key={k} onClick={() => setFiltroEvento(k)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border ${filtroEvento === k ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600"}`}>{l}</button>
                  ))}
                </div>
                {apiKey && (
                  <button className="text-[11px] text-gray-400 hover:text-gray-700" onClick={() => { localStorage.removeItem(LS_KEY); setApiKey(BUILTIN_KEY || null); }}>
                    Trocar a chave da Anthropic deste navegador
                  </button>
                )}
                {lista.length === 0 && <p className="text-xs text-gray-400">Nenhum evento ainda. Rode uma ação para ver o registro.</p>}
                <ul className="space-y-2">
                  {lista.map((e) => (
                    <li key={e.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.tipo === "ActionFailed" ? "bg-red-50 text-red-700" : e.tipo === "ActionCompleted" || e.tipo === "MeetingReply" ? "bg-green-50 text-green-700" : e.tipo === "ApprovalRequested" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{ROTULO_TIPO[e.tipo]}</span>
                        <span className="text-[10px] text-gray-400">{new Date(e.ts).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {e.bu}</span>
                      </div>
                      <div className="text-xs text-gray-800 mt-1">{e.acao}</div>
                      <div className="text-[11px] text-gray-500">Origem: {e.origem}</div>
                      {(e.ms || e.tokens) && (
                        <div className="text-[10px] text-gray-400">{e.ms ? fmtS(e.ms) : ""}{e.tokens ? ` · ${e.tokens.input} entrada / ${e.tokens.output} saída (tokens)` : ""}</div>
                      )}
                      {e.causa && (
                        <div className="mt-1 text-[11px] text-red-700 bg-red-50 rounded px-2 py-1">
                          <div><b>{e.causa.codigo}</b>: {e.causa.mensagem}</div>
                          <div>Recuperável: {e.causa.recuperavel ? "sim" : "não"} · Próxima ação: {e.causa.proxima}</div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {tab === "relatorio" && (
            <div className="space-y-3">
              {!reportDaSquad && (
                <p className="text-xs text-gray-400">
                  Esta sala não tem relatório da manhã neste ambiente. Os relatórios de clientes ficam fora do git (repositório público), em public/data/office/reports, apenas na máquina onde foram gerados.
                </p>
              )}
              {reportDaSquad && (
                <>
                  <div className="text-[11px] text-gray-400">
                    Gerado em {new Date(reportDaSquad.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília) por {reportDaSquad.gerador}.
                    Revisão humana pendente: nada neste relatório foi aprovado.
                  </div>
                  {reportErro && <p className="text-xs text-red-600">{reportErro}</p>}
                  {!reportMd && !reportErro && <p className="text-xs text-gray-400">Carregando…</p>}
                  {reportMd && <MiniMarkdown source={reportMd} />}
                </>
              )}
            </div>
          )}

          {tab === "analise" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Kpi label="Execuções" valor={String(resumo.total)} />
                <Kpi label="Tokens (entrada / saída)" valor={`${resumo.tokensIn.toLocaleString("pt-BR")} / ${resumo.tokensOut.toLocaleString("pt-BR")}`} />
                <Kpi label="Alertas altos" valor={String(resumo.porPapel.reduce((a, p) => a + p.alta, 0))} alerta />
                <Kpi label="Alertas médios" valor={String(resumo.porPapel.reduce((a, p) => a + p.media, 0))} />
                <Kpi label="Cenários OK / rodados" valor={`${resumo.cenPassou} / ${resumo.cenRodados}`} />
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-medium">Agente</th>
                    <th className="font-medium">Execuções</th>
                    <th className="font-medium">Tempo médio</th>
                    <th className="font-medium">Formato obrigatório</th>
                    <th className="font-medium">Alertas altos</th>
                    <th className="font-medium">Alertas médios</th>
                    <th className="font-medium">Tokens de saída</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.porPapel.map((p) => (
                    <tr key={p.role} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-800">{p.label}</td>
                      <td>{p.n}</td>
                      <td>{p.n ? fmtS(p.ms) : "-"}</td>
                      <td>{pct(p.formato)}</td>
                      <td className={p.alta ? "text-red-600 font-semibold" : ""}>{p.alta}</td>
                      <td>{p.media}</td>
                      <td>{p.tokensOut.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Alertas mais frequentes</h3>
                {resumo.flags.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum alerta nas execuções registradas.</p>
                ) : (
                  <ul className="space-y-1">
                    {resumo.flags.map((f) => (
                      <li key={f.label} className="text-xs flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${f.severity === "alta" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{f.severity}</span>
                        <span className="text-gray-700">{f.label}</span>
                        <span className="text-gray-400">× {f.n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Os alertas são heurísticos (campos do formato, afirmações de execução, números e links sem origem no contexto). Servem para triagem; a leitura da resposta continua sendo sua.
              </p>
            </div>
          )}

          {tab === "cenarios" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-500 flex-1">
                  Cada cenário tenta fazer um agente quebrar uma regra do contrato. Veredito automático por heurística; você pode corrigir.
                </p>
                <button onClick={rodarTodos} disabled={busy || !squad}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-40">
                  <ShieldCheck size={14} /> Rodar todos
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CENARIOS.map((c) => {
                  const r = ultimoDoCenario(c.id);
                  const v = vereditoDe(c, r);
                  const papel = PAPEIS.find((p) => p.role === c.papel)!;
                  return (
                    <div key={c.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{c.titulo}</span>
                        <span className="text-[10px] text-gray-400">· {papel.label}</span>
                        {v && <Selo v={v} />}
                      </div>
                      <p className="text-[11px] text-gray-500">Regra: {c.regra}</p>
                      <p className="text-[11px] text-gray-600 italic">&ldquo;{c.tarefa}&rdquo;</p>
                      {r && <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-5 bg-gray-50 rounded-lg p-2">{r.output}</p>}
                      <div className="flex items-center gap-2">
                        <button onClick={() => rodarCenario(c)} disabled={busy || !squad}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 inline-flex items-center gap-1">
                          {cenarioAtual === c.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Rodar
                        </button>
                        {r && (
                          <>
                            <span className="text-[10px] text-gray-400 ml-auto">marcar:</span>
                            <button onClick={() => marcar(r.id, "passou")} className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">passou</button>
                            <button onClick={() => marcar(r.id, "falhou")} className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700">falhou</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "storyboard" && <StoryboardPanel />}

          {tab === "registros" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={exportar} disabled={!runsDaSquad.length}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 inline-flex items-center gap-1 disabled:opacity-40"><Download size={12} /> Exportar JSON</button>
                <button onClick={limpar} disabled={!runs.length}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 inline-flex items-center gap-1 disabled:opacity-40"><Trash2 size={12} /> Limpar histórico</button>
              </div>
              {runsDaSquad.length === 0 && <p className="text-xs text-gray-400">Sem registros.</p>}
              {[...runsDaSquad].reverse().map((r) => {
                const p = PAPEIS.find((x) => x.role === r.role)!;
                const c = contaFlags(r.analise);
                const open = aberto === r.id;
                return (
                  <div key={r.id} className="border border-gray-100 rounded-xl">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left" onClick={() => setAberto(open ? null : r.id)}>
                      <span className="text-xs font-semibold text-gray-800">{p.label}</span>
                      <span className="text-[11px] text-gray-400">{r.scenarioId ? `cenário: ${r.scenarioId}` : r.kind}</span>
                      <span className="text-[11px] text-gray-400">{fmtS(r.ms)} · {r.usage ? `${r.usage.output} tok` : "sem uso"}</span>
                      <span className="text-[11px] text-gray-400">formato {pct(r.analise.formatoScore)}</span>
                      {c.alta > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{c.alta} alto</span>}
                      {c.media > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{c.media} médio</span>}
                      <span className="ml-auto text-[11px] text-gray-400">{new Date(r.ts).toLocaleString("pt-BR")}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                        {r.analise.flags.length > 0 && (
                          <ul className="space-y-1 pt-3">
                            {r.analise.flags.map((f, i) => (
                              <li key={i} className="text-xs">
                                <span className={`font-semibold ${f.severity === "alta" ? "text-red-600" : f.severity === "media" ? "text-amber-600" : "text-gray-500"}`}>{f.severity}</span>{" "}
                                {f.label}{f.evidence ? <span className="text-gray-400"> — {f.evidence}</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                        {r.analise.camposFaltando.length > 0 && (
                          <p className="text-xs text-gray-500">Campos não encontrados: {r.analise.camposFaltando.join(", ")}</p>
                        )}
                        <details>
                          <summary className="text-xs text-gray-500 cursor-pointer">Tarefa enviada</summary>
                          <pre className="text-[11px] text-gray-600 whitespace-pre-wrap mt-1">{r.task}</pre>
                        </details>
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{r.output}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </Mundo>
    </div>
  );
}

// ── Peças visuais ───────────────────────────────────────────────────────────────

function Kpi({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${alerta && valor !== "0" ? "text-red-600" : "text-gray-800"}`}>{valor}</div>
    </div>
  );
}

function Selo({ v }: { v: Veredito }) {
  const m = {
    passou: "bg-emerald-100 text-emerald-700",
    falhou: "bg-red-100 text-red-700",
    revisar: "bg-amber-100 text-amber-700",
  }[v];
  return <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${m}`}>{v}</span>;
}
