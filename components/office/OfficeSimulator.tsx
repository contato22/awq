"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, Download, Key, Loader2, Megaphone, MessageSquare, Pencil,
  Play, Search, ShieldCheck, Trash2, User, X,
} from "lucide-react";
import { analisar, contaFlags, type Analise, type EntregaKind } from "@/lib/office-analysis";
import MiniMarkdown from "./MiniMarkdown";
import OfficeGame, { type MetricaAgente, type PainelTab } from "./OfficeGame";
import type { Empresa } from "@/lib/office-world";
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
  const [chat, setChat] = useState<Record<string, ChatMsg[]>>({});
  const [chatRole, setChatRole] = useState<PapelAgente>("cs");
  const [chatInput, setChatInput] = useState("");
  const [faseChat, setFaseChat] = useState<string | null>(null);
  const runsRef = useRef<RunRecord[]>([]);

  // Chave, execuções salvas e squads disponíveis
  useEffect(() => {
    setApiKey(localStorage.getItem(LS_KEY) || BUILTIN_KEY || null);
    try {
      const saved = JSON.parse(localStorage.getItem(LS_RUNS) ?? "[]") as RunRecord[];
      setRuns(saved);
      runsRef.current = saved;
    } catch { /* histórico corrompido: começa vazio */ }
    try {
      setChat(JSON.parse(localStorage.getItem(LS_CHAT) ?? "{}") as Record<string, ChatMsg[]>);
    } catch { /* conversa corrompida: começa vazia */ }

    fetch("/data/office/reports/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ReportMeta[]) => setReports(list))
      .catch(() => setReports([]));

    if (IS_STATIC) return;
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
  const rodar = useCallback(
    async (
      role: PapelAgente,
      kind: EntregaKind,
      task: string,
      opts: { aprovado?: boolean; scenarioId?: string } = {}
    ): Promise<RunRecord> => {
      const agent = squad?.agents[role];
      if (!agent || !apiKey) throw new Error("Squad ou chave de API indisponível.");

      setDesks((d) => ({ ...d, [role]: "working" }));
      setLive((l) => ({ ...l, [role]: "" }));
      const t0 = performance.now();
      let rec: RunRecord;
      try {
        const { text, usage } = await streamAgent(agent.id, task, apiKey, (full) =>
          setLive((l) => ({ ...l, [role]: full }))
        );
        const ms = performance.now() - t0;
        rec = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts: new Date().toISOString(),
          bu, role, agentId: agent.id, kind,
          scenarioId: opts.scenarioId, task, output: text, ms, usage,
          analise: analisar(kind, text, task, !!opts.aprovado),
        };
        setDesks((d) => ({ ...d, [role]: "done" }));
      } catch (e) {
        setDesks((d) => ({ ...d, [role]: "error" }));
        throw e;
      }
      salvarRuns([...runsRef.current, rec]);
      return rec;
    },
    [squad, apiKey, bu, salvarRuns]
  );

  // ── Ciclo editorial ───────────────────────────────────────────────────────────

  const pacoteTask = (c: { demanda: string }, briefing: string, peca: string, versao: number) =>
    `TAREFA: REVISÃO INTERNA E PACOTE DE APROVAÇÃO\nRevise a peça (v${versao}) contra o briefing, liste as ressalvas e monte o pacote de aprovação no formato obrigatório. Nada está aprovado; o estado é AGUARDANDO APROVAÇÃO.\n\nDEMANDA ORIGINAL DO GESTOR:\n${c.demanda}\n\nBRIEFING:\n${trecho(briefing)}\n\nPEÇA v${versao}:\n${trecho(peca)}`;

  const iniciarCiclo = async () => {
    if (!demanda.trim() || busy) return;
    setErro(null);
    setBusy(true);
    const base: Cycle = {
      id: `ciclo-${Date.now()}`, demanda: demanda.trim(), versao: 1, estado: "RASCUNHO",
      etapa: 0, outputs: {}, decisoes: [],
    };
    setCycle(base);
    try {
      const triagem = await rodar("cs", "triagem",
        `TAREFA: TRIAGEM DA DEMANDA\nO gestor enviou a demanda abaixo. Registre a solicitação original, classifique a prioridade (P0 a P4), diga se está no escopo, liste as lacunas de informação e escreva o pedido de briefing para o agente de Referências e Inteligência. Seja objetivo.\n\nDEMANDA DO GESTOR:\n${base.demanda}`);
      setCycle((c) => c && { ...c, estado: "EM PRODUÇÃO", etapa: 1, outputs: { ...c.outputs, triagem: triagem.output } });

      const briefing = await rodar("ref", "briefing",
        `TAREFA: BRIEFING\nProduza o briefing no formato obrigatório para a demanda abaixo. Se não puder consultar fontes, diga isso e não cite links.\n\nDEMANDA DO GESTOR:\n${base.demanda}\n\nTRIAGEM DO HEADCOUNT/CS:\n${trecho(triagem.output)}`);
      setCycle((c) => c && { ...c, etapa: 2, outputs: { ...c.outputs, briefing: briefing.output } });

      const peca = await rodar("criativo", "peca",
        `TAREFA: PRODUZIR PEÇA (versão 1)\nProduza a peça completa no formato obrigatório de entrega, com status EM REVISÃO INTERNA.\n\nDEMANDA DO GESTOR:\n${base.demanda}\n\nBRIEFING:\n${trecho(briefing.output)}`);
      setCycle((c) => c && { ...c, estado: "EM REVISÃO INTERNA", etapa: 3, outputs: { ...c.outputs, peca: peca.output } });

      const pacote = await rodar("cs", "aprovacao", pacoteTask(base, briefing.output, peca.output, 1));
      setCycle((c) => c && { ...c, estado: "AGUARDANDO APROVAÇÃO", etapa: 4, outputs: { ...c.outputs, pacote: pacote.output } });
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
          { aprovado: true });
        setCycle((c) => c && { ...c, etapa: 6, outputs: { ...c.outputs, execucao: exec.output } });
        setFeedback("");
        return;
      }

      // Ajustes: Criativo gera nova versão, CS refaz o pacote
      const novaVersao = cycle.versao + 1;
      setCycle({ ...cycle, estado: "AJUSTES SOLICITADOS", etapa: 2, versao: novaVersao, decisoes: [...cycle.decisoes, registro] });
      const peca = await rodar("criativo", "peca",
        `TAREFA: APLICAR AJUSTES (versão ${novaVersao})\nO gestor solicitou alterações. Aplique o feedback, preserve a versão anterior, registre o que mudou e devolva no formato obrigatório com status EM REVISÃO INTERNA. Se houver instruções conflitantes, sinalize.\n\nFEEDBACK DO GESTOR:\n${registro.feedback}\n\nBRIEFING:\n${trecho(cycle.outputs.briefing)}\n\nVERSÃO ANTERIOR (v${cycle.versao}):\n${trecho(cycle.outputs.peca)}`);
      setCycle((c) => c && { ...c, estado: "EM REVISÃO INTERNA", etapa: 3, outputs: { ...c.outputs, peca: peca.output } });
      const pacote = await rodar("cs", "aprovacao", pacoteTask(cycle, cycle.outputs.briefing ?? "", peca.output, novaVersao));
      setCycle((c) => c && { ...c, estado: "AGUARDANDO APROVAÇÃO", etapa: 4, outputs: { ...c.outputs, pacote: pacote.output } });
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

  const salvarChat = (next: Record<string, ChatMsg[]>) => {
    setChat(next);
    try { localStorage.setItem(LS_CHAT, JSON.stringify(next)); } catch { /* cota estourada: segue só em memória */ }
  };

  const nomeCS = squad?.agents.cs?.name.split(" · ")[0] ?? "CS";
  const rotuloPapel = (r: PapelAgente) => (r === "cs" ? `${nomeCS} · CS` : PAPEIS.find((x) => x.role === r)?.label ?? r);

  const enviarChat = async () => {
    const texto = chatInput.trim();
    if (!texto || busy || !squad || !apiKey) return;
    setErro(null);
    setBusy(true);
    setChatInput("");
    const historico = conversa.slice(-12);
    const comNova: Record<string, ChatMsg[]> = {
      ...chat,
      [chatKey]: [...conversa, { de: "gestor", texto, ts: new Date().toISOString() }],
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
          historico.map((m) => `${m.de === "gestor" ? "Gestor" : "Você"}: ${m.texto}`).join("\n")
      );
    }
    partes.push(`NOVA MENSAGEM DO GESTOR:\n${texto}`);

    const adicionar = (msg: ChatMsg) =>
      salvarChat({ ...comNova, [chatKey]: [...comNova[chatKey], msg] });

    try {
      setFaseChat(ehCS ? `${nomeCS} está pensando` : null);
      const r1 = await rodar(chatRole, "livre", partes.join("\n\n"));

      const pedidos = ehCS
        ? Array.from(r1.output.matchAll(BLOCO_DELEGAR))
            .map((m) => ({ agente: m[1] as "ref" | "criativo" | "midia", tarefa: m[2].trim() }))
            .filter((d, i, arr) => d.tarefa && arr.findIndex((x) => x.agente === d.agente) === i)
            .slice(0, 3)
        : [];

      if (pedidos.length === 0) {
        adicionar({ de: "agente", texto: r1.output.replace(BLOCO_DELEGAR, "").trim(), ts: new Date().toISOString() });
        return;
      }

      const plano = r1.output.replace(BLOCO_DELEGAR, "").trim();
      setFaseChat(`${nomeCS} delegou a ${pedidos.map((d) => ROTULO_AGENTE[d.agente].split(" ")[0]).join(", ")}`);
      const recebidos: Delegacao[] = await Promise.all(
        pedidos.map(async (d) => {
          const tipo: EntregaKind = d.agente === "ref" ? "briefing" : d.agente === "criativo" ? "peca" : "livre";
          const tarefa = `TAREFA DELEGADA POR ${nomeCS} (Headcount/CS)\n${d.tarefa}\n\nDEMANDA ORIGINAL DO GESTOR:\n${texto}${reportMd ? `\n\nRELATÓRIO DA MANHÃ:\n${trecho(reportMd, 3500)}` : ""}\n\nEntregue em texto, como RASCUNHO. Você não publica nem envia nada.`;
          try {
            const rec = await rodar(d.agente, tipo, tarefa);
            return { agente: d.agente, tarefa: d.tarefa, resposta: rec.output, ms: rec.ms };
          } catch (e) {
            return { agente: d.agente, tarefa: d.tarefa, resposta: `[falhou: ${e instanceof Error ? e.message : "erro"}]`, ms: 0 };
          }
        })
      );

      setFaseChat(`${nomeCS} está consolidando`);
      const consolidacao =
        `CONSOLIDAÇÃO DA DELEGAÇÃO (você é ${nomeCS})\nO gestor pediu: ${texto}\n\nVocê delegou e recebeu:\n` +
        recebidos
          .map((r) => `### ${ROTULO_AGENTE[r.agente as "ref" | "criativo" | "midia"]}\nTarefa pedida: ${r.tarefa}\nResposta:\n${trecho(r.resposta, 5000)}`)
          .join("\n\n") +
        "\n\nRevise o que os agentes entregaram, aponte falhas ou riscos que você encontrou e responda ao gestor de forma direta: o que ficou pronto, o que depende de decisão dele e o próximo passo. Não delegue de novo. Não atribua aos agentes nada que não esteja nas respostas acima. Tudo continua como RASCUNHO até a aprovação explícita do gestor.";
      const r2 = await rodar("cs", "livre", consolidacao);
      adicionar({
        de: "agente", texto: r2.output.replace(BLOCO_DELEGAR, "").trim(), ts: new Date().toISOString(),
        plano: plano || undefined, delegacoes: recebidos,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na conversa.");
    } finally {
      setFaseChat(null);
      setBusy(false);
    }
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
    };
  });

  return (
    <div className="space-y-3">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-400">
          Uma sala por cliente, cada uma com a sua squad. Os agentes só geram texto: nada é publicado, enviado ou gasto.
        </span>
        {apiKey && (
          <button
            className="ml-auto text-xs text-gray-400 hover:text-gray-700"
            onClick={() => { localStorage.removeItem(LS_KEY); setApiKey(BUILTIN_KEY || null); }}
          >
            Trocar chave
          </button>
        )}
      </div>

      {!apiKey && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <Key size={16} className="text-gray-500" />
          <span className="text-xs text-gray-600">
            Sem chave da Anthropic neste navegador: dá para ler os relatórios e o histórico, mas não rodar agentes. A chave fica só no localStorage e é a mesma do /agents e do OpenClaw.
          </span>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-64"
          />
          <button
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium disabled:opacity-40"
            disabled={!keyInput.trim().startsWith("sk-")}
            onClick={() => { localStorage.setItem(LS_KEY, keyInput.trim()); setApiKey(keyInput.trim()); setKeyInput(""); }}
          >
            Salvar chave
          </button>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{erro}</span>
        </div>
      )}

      {/* Mundo jogável */}
      <OfficeGame
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
        onPainel={(aberto, t) => { if (t) setTab(t); setPainelAberto(aberto); }}
        temRelatorio={!!reportDaSquad}
        pendencias={cycle?.estado === "AGUARDANDO APROVAÇÃO" ? 1 : 0}
      >
      {/* Painéis (gaveta sobre o mundo) */}
      <div className="h-full flex flex-col bg-white">
        <div className="flex gap-1 border-b border-gray-100 pl-3 pr-12 pt-3 overflow-x-auto shrink-0">
          {([["ciclo", "Ciclo"], ["conversa", "Conversar"], ["relatorio", "Relatório da manhã"], ["analise", "Análise"], ["cenarios", "Cenários de estresse"], ["registros", "Registros"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm rounded-t-lg whitespace-nowrap ${tab === k ? "text-brand-700 font-semibold border-b-2 border-brand-500" : "text-gray-500"}`}>
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
            disabled={busy || !demanda.trim() || !squad || !apiKey}
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

          {tab === "conversa" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {PAPEIS.map((p) => {
                  const Icon = p.icon;
                  const ativo = p.role === chatRole;
                  return (
                    <button
                      key={p.role}
                      onClick={() => setChatRole(p.role)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        ativo ? p.cor : "border-gray-200 text-gray-500 bg-white"}`}
                    >
                      <Icon size={13} /> {rotuloPapel(p.role)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400">
                {chatRole === "cs"
                  ? `Fale com ${nomeCS}, o CS desta sala. Chame pelo nome e peça o que precisa: o CS decide o que resolver sozinho e o que delegar a Referências, Criativo e Mídia, acompanha as entregas e consolida o resultado. `
                  : "Conversa direta com o agente da sala. "}
                Eles não têm acesso a Drive, Notion nem redes: respondem só com o contexto desta tela (relatório da manhã e ciclo em andamento, quando houver). Nada é publicado ou enviado.
              </p>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-3 max-h-[420px] overflow-y-auto">
                {conversa.length === 0 && (
                  <p className="text-xs text-gray-400">
                    Nenhuma mensagem ainda. Pergunte, por exemplo, &ldquo;qual é a prioridade desta semana?&rdquo; ou &ldquo;resuma o que está pendente de aprovação&rdquo;.
                  </p>
                )}
                {conversa.map((m, i) => (
                  <div key={i} className={`flex ${m.de === "gestor" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.de === "gestor" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
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
                      <div className={`text-[10px] mt-1 ${m.de === "gestor" ? "text-white/60" : "text-gray-400"}`}>
                        {m.de === "gestor" ? "Você" : rotuloPapel(chatRole)} · {new Date(m.ts).toLocaleTimeString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))}
                {busy && (faseChat || desks[chatRole] === "working") && (
                  <div className="flex justify-start">
                    <div className="rounded-xl px-3 py-2 text-sm bg-white border border-gray-200 text-gray-500 inline-flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin" />
                      {faseChat ? `${faseChat}…` : live[chatRole] ? live[chatRole]!.slice(-160) : "pensando…"}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void enviarChat(); } }}
                  rows={2}
                  placeholder={apiKey ? (chatRole === "cs" ? `Fale com ${nomeCS} (Cmd/Ctrl + Enter envia)` : "Escreva para o agente (Cmd/Ctrl + Enter envia)") : "Cole a chave da Anthropic no topo da página para conversar"}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  disabled={busy || !apiKey}
                />
                <button
                  onClick={() => void enviarChat()}
                  disabled={busy || !chatInput.trim() || !squad || !apiKey}
                  className="px-4 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
                >
                  Enviar
                </button>
              </div>
              {conversa.length > 0 && (
                <button
                  className="text-[11px] text-gray-400 hover:text-gray-700"
                  onClick={() => { const { [chatKey]: _descartada, ...resto } = chat; void _descartada; salvarChat(resto); }}
                >
                  Limpar esta conversa
                </button>
              )}
            </div>
          )}

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
                <button onClick={rodarTodos} disabled={busy || !squad || !apiKey}
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
                        <button onClick={() => rodarCenario(c)} disabled={busy || !squad || !apiKey}
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
      </OfficeGame>
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
